// Authoritative Colyseus room for a single Yut Nori match.
//
// Source of truth is the pure-TS `GameState` (rules.ts). After every
// state transition we mirror into the Colyseus `YutState` schema so the
// binary diff sync pushes the change to all clients.
//
// Turn state machine:
//   lobby        → players join seats, host calls 'start'
//   await_throw  → currentTeam's player sends 'throw'; server rolls sticks
//   await_spend  → currentTeam's player sends 'spend' with a chosen piece+option
//   ended        → terminal; winner is set on YutState

import { Client, Room } from '@colyseus/core'
import { createRandom, type Random } from '../game/random.js'
import {
	applyBackMove,
	applyForwardMove,
	endTurn,
	type GameState,
	initialState,
	legalBackMoves,
	legalForwardMoves
} from '../game/rules.js'
import { throwSticks } from '../game/sticks.js'
import {
	STICK_GRANTS_BONUS,
	STICK_STEPS,
	type StickResult,
	type Team
} from '../game/types.js'
import { getPolicy, type Difficulty } from '../game/ai/index.js'
import type { Decision, Policy } from '../game/engine.js'
import { YutPlayer } from '../entities/YutPlayer.js'
import { YutState, type YutStateOptions } from '../entities/YutState.js'

export interface JoinOptions {
	userId: string
	name: string
	avatarUri: string
}

export interface CreateOptions extends YutStateOptions {
	seed?: number    // deterministic RNG for tests; otherwise Date.now()
	mode?: 'maple' | 'traditional'
}

interface ThrowMessage {}
interface SpendMessage {
	kind: 'forward' | 'back'
	pieceId: string
	optionIndex?: number   // forward only
}
interface JoinTeamMessage { team: 'A' | 'B' }
interface AddBotMessage { team: 'A' | 'B'; difficulty?: Difficulty }
interface StartMessage {}
interface UsePowerYutMessage { result: 'DO' | 'GAE' | 'GEOL' | 'YUT' | 'MO' }
interface UsePowerHorsesMessage { shift: -1 | 1 }
interface RematchMessage {}

const BOT_PREFIX = 'BOT:'
const BOT_THINK_DELAY_MS = 700

export class YutRoom extends Room<YutState> {
	maxClients = 8   // 2 players + spectators

	private game!: GameState
	private rng!: Random
	private hostSessionId: string | null = null

	onCreate(opts: CreateOptions) {
		const stateOpts: YutStateOptions = { roomName: opts.roomName, channelId: opts.channelId }
		this.setState(new YutState(stateOpts))
		this.state.mode = opts.mode ?? 'maple'

		this.rng = createRandom(opts.seed ?? Date.now())
		this.game = initialState('A')
		this.state.initPieces(this.game)
		this.state.syncFromGame(this.game)
		this.state.phase = 'lobby'

		this.onMessage('join_team', (client, data: JoinTeamMessage) => this.handleJoinTeam(client, data))
		this.onMessage('add_bot', (client, data: AddBotMessage) => this.handleAddBot(client, data))
		this.onMessage('start', (client, _data: StartMessage) => this.handleStart(client))
		this.onMessage('throw', (client, _data: ThrowMessage) => this.handleThrow(client))
		this.onMessage('spend', (client, data: SpendMessage) => this.handleSpend(client, data))
		this.onMessage('use_power_yut', (client, data: UsePowerYutMessage) => this.handleUsePowerYut(client, data))
		this.onMessage('use_power_horses', (client, data: UsePowerHorsesMessage) => this.handleUsePowerHorses(client, data))
		this.onMessage('rematch', (client, _data: RematchMessage) => this.handleRematch(client))
	}

	onAuth() {
		return true
	}

	onJoin(client: Client, opts: JoinOptions) {
		const player = new YutPlayer({
			sessionId: client.sessionId,
			userId: opts.userId,
			name: opts.name,
			avatarUri: opts.avatarUri,
			isBot: false
		})
		this.state.players.set(client.sessionId, player)
		if (this.hostSessionId === null) {
			this.hostSessionId = client.sessionId
			this.state.hostSessionId = client.sessionId
		}
	}

	onLeave(client: Client) {
		this.state.players.delete(client.sessionId)
		if (this.hostSessionId === client.sessionId) {
			// Promote the next non-bot player as host, if any.
			const next = Array.from(this.state.players.values()).find((p) => !p.isBot)
			this.hostSessionId = next ? next.sessionId : null
			this.state.hostSessionId = next ? next.sessionId : ''
		}
	}

	onDispose() {
		// no-op; logger lives on Robo's main process
	}

	// ---------- message handlers ----------

	private handleJoinTeam(client: Client, data: JoinTeamMessage) {
		if (this.state.phase !== 'lobby') return
		const me = this.state.players.get(client.sessionId)
		if (!me) return
		if (data.team !== 'A' && data.team !== 'B') return
		if (this.seatTaken(data.team)) return
		me.team = data.team
	}

	private handleAddBot(client: Client, data: AddBotMessage) {
		if (this.state.phase !== 'lobby') return
		if (client.sessionId !== this.hostSessionId) return
		if (data.team !== 'A' && data.team !== 'B') return
		if (this.seatTaken(data.team)) return
		const difficulty: Difficulty = data.difficulty ?? 'medium'
		if (!['easy', 'medium', 'hard'].includes(difficulty)) return
		const sid = `${BOT_PREFIX}${data.team}-${Math.random().toString(36).slice(2, 8)}`
		const bot = new YutPlayer({
			sessionId: sid,
			userId: sid,
			name: `Bot ${data.team} (${difficulty})`,
			avatarUri: '',
			isBot: true
		})
		bot.team = data.team
		bot.botDifficulty = difficulty
		this.state.players.set(sid, bot)
	}

	private handleStart(client: Client) {
		if (this.state.phase !== 'lobby') return
		if (client.sessionId !== this.hostSessionId) return
		if (!this.seatTaken('A') || !this.seatTaken('B')) return
		this.applyModePowers()
		this.state.phase = 'await_throw'
		this.maybeAdvanceBot()
	}

	private applyModePowers() {
		const initial = this.state.mode === 'maple' ? 2 : 0
		this.state.powersRemainingA = initial
		this.state.powersRemainingB = initial
		this.state.powerUsedThisTurn = false
	}

	private handleThrow(client: Client) {
		if (this.state.phase !== 'await_throw') return
		if (!this.isCurrentTeamActor(client.sessionId)) return
		this.doThrow()
	}

	private handleSpend(client: Client, data: SpendMessage) {
		if (this.state.phase !== 'await_spend') return
		if (!this.isCurrentTeamActor(client.sessionId)) return
		this.doSpend(data)
	}

	private handleUsePowerYut(client: Client, data: UsePowerYutMessage) {
		if (this.state.phase !== 'await_throw') return
		if (!this.isCurrentTeamActor(client.sessionId)) return
		if (this.state.powerUsedThisTurn) return
		const team = this.game.currentTeam as Team
		if (this.powersRemaining(team) <= 0) return
		const valid = ['DO', 'GAE', 'GEOL', 'YUT', 'MO'] as const
		if (!valid.includes(data.result as (typeof valid)[number])) return
		this.spendPower(team)
		this.applyForcedThrow(data.result as StickResult)
	}

	private handleUsePowerHorses(client: Client, data: UsePowerHorsesMessage) {
		if (this.state.phase !== 'await_spend') return
		if (!this.isCurrentTeamActor(client.sessionId)) return
		if (this.state.powerUsedThisTurn) return
		const team = this.game.currentTeam as Team
		if (this.powersRemaining(team) <= 0) return
		if (data.shift !== -1 && data.shift !== 1) return
		const cur = this.game.pendingStep
		if (cur === null) return
		// Original step must be a normal positive throw (1..5); back-do can't be shifted.
		if (cur < 1 || cur > 5) return
		const next = cur + data.shift
		if (next < 1 || next > 5) return
		// Must yield at least one legal forward move at the new step.
		if (legalForwardMoves(this.game, next).length === 0) return
		this.spendPower(team)
		this.game = { ...this.game, pendingStep: next }
		this.state.pendingStep = next
		// Update bonus-throw status to reflect the final step (Yut/Mo grants bonus).
		this.pendingWasBonusThrow = next === 4 || next === 5
		this.state.syncFromGame(this.game)
	}

	private handleRematch(client: Client) {
		if (this.state.phase !== 'ended') return
		if (client.sessionId !== this.hostSessionId) return
		// Reset game state but keep players, mode, and host.
		this.game = initialState('A')
		this.state.initPieces(this.game)
		this.state.lastThrowResult = ''
		this.state.pendingStep = 0
		this.state.bonusOwed = false
		this.state.winner = ''
		this.applyModePowers()
		this.state.syncFromGame(this.game)
		this.state.phase = 'await_throw'
		this.pendingWasBonusThrow = false
		this.maybeAdvanceBot()
	}

	private powersRemaining(team: Team): number {
		return team === 'A' ? this.state.powersRemainingA : this.state.powersRemainingB
	}

	private spendPower(team: Team): void {
		if (team === 'A') this.state.powersRemainingA--
		else this.state.powersRemainingB--
		this.state.powerUsedThisTurn = true
	}

	private applyForcedThrow(result: StickResult): void {
		// Same flow as doThrow but with a chosen result instead of a random one.
		const step = STICK_STEPS[result]
		const wasBonusThrow = STICK_GRANTS_BONUS[result]
		this.state.lastThrowResult = result
		this.state.pendingStep = step
		const hasLegal = step > 0
			? legalForwardMoves(this.game, step).length > 0
			: legalBackMoves(this.game).length > 0
		if (!hasLegal) {
			this.game = { ...this.game, pendingStep: null, bonusOwed: wasBonusThrow }
			this.state.pendingStep = 0
			if (wasBonusThrow) {
				this.state.phase = 'await_throw'
				this.state.bonusOwed = true
			} else {
				this.game = endTurn(this.game)
				this.state.powerUsedThisTurn = false
				this.state.phase = 'await_throw'
			}
			this.state.syncFromGame(this.game)
			this.maybeAdvanceBot()
			return
		}
		this.game = { ...this.game, pendingStep: step, bonusOwed: false }
		this.pendingWasBonusThrow = wasBonusThrow
		this.state.phase = 'await_spend'
		this.state.syncFromGame(this.game)
	}

	// ---------- core engine ----------

	// Issue a stick throw. Sets pendingStep and lastThrowResult, then transitions phase
	// based on whether the result can actually be spent.
	private doThrow() {
		const t: StickResult = throwSticks(this.rng).result
		const step = STICK_STEPS[t]
		const wasBonusThrow = STICK_GRANTS_BONUS[t]
		this.state.lastThrowResult = t
		this.state.pendingStep = step

		// Detect wasted throws (no legal move to absorb the step).
		const hasLegal = step > 0
			? legalForwardMoves(this.game, step).length > 0
			: legalBackMoves(this.game).length > 0

		if (!hasLegal) {
			// Throw is wasted. Apply bonus rule: Yut/Mo grants another throw even if wasted.
			this.game = { ...this.game, pendingStep: null, bonusOwed: wasBonusThrow }
			this.state.pendingStep = 0
			if (wasBonusThrow) {
				this.state.phase = 'await_throw'
				this.state.bonusOwed = true
			} else {
				this.game = endTurn(this.game)
				this.state.phase = 'await_throw'
			}
			this.state.syncFromGame(this.game)
			this.maybeAdvanceBot()
			return
		}

		// We have a legal move; remember whether the throw was a bonus throw so spend
		// applies the proper bonus accounting.
		this.game = { ...this.game, pendingStep: step, bonusOwed: false }
		this.pendingWasBonusThrow = wasBonusThrow
		this.state.phase = 'await_spend'
		this.state.syncFromGame(this.game)
	}

	private pendingWasBonusThrow = false

	private doSpend(data: SpendMessage) {
		const step = this.game.pendingStep
		if (step === null) return

		try {
			if (data.kind === 'forward') {
				if (step <= 0) return
				const moves = legalForwardMoves(this.game, step).filter((m) => m.pieceId === data.pieceId)
				const idx = data.optionIndex ?? 0
				const move = moves[idx]
				if (!move) return
				const r = applyForwardMove(this.game, data.pieceId, move.option, this.pendingWasBonusThrow)
				this.game = r.state
			} else {
				if (step >= 0) return
				const backs = legalBackMoves(this.game)
				if (!backs.some((b) => b.pieceId === data.pieceId)) return
				const r = applyBackMove(this.game, data.pieceId, this.pendingWasBonusThrow)
				this.game = r.state
			}
		} catch {
			// Validation failure; ignore
			return
		}

		// Resolve next phase.
		if (this.game.winner) {
			this.state.phase = 'ended'
			this.state.syncFromGame(this.game)
			return
		}
		if (this.game.bonusOwed) {
			this.state.phase = 'await_throw'
		} else {
			this.game = endTurn(this.game)
			this.state.powerUsedThisTurn = false   // reset per-turn power lock
			this.state.phase = 'await_throw'
		}
		this.state.syncFromGame(this.game)
		this.maybeAdvanceBot()
	}

	// ---------- bot driver ----------

	private maybeAdvanceBot() {
		if (this.state.phase !== 'await_throw' && this.state.phase !== 'await_spend') return
		const seat = this.findSeat(this.game.currentTeam as Team)
		if (!seat || !seat.isBot) return
		// Schedule the bot's action so clients see the state transition first.
		this.clock.setTimeout(() => this.runBotStep(), BOT_THINK_DELAY_MS)
	}

	private runBotStep() {
		if (this.state.phase === 'await_throw') {
			this.doThrow()
			return
		}
		if (this.state.phase !== 'await_spend') return
		const step = this.game.pendingStep
		if (step === null) return
		const seat = this.findSeat(this.game.currentTeam as Team)
		if (!seat || !seat.isBot) return
		const policy: Policy = getPolicy(this.botDifficulty(seat))
		const decision: Decision = policy({ state: this.game, step, rng: this.rng })
		if (decision === null) return  // wasted throw — noop on the spend step
		if (decision.kind === 'forward') {
			this.doSpend({ kind: 'forward', pieceId: decision.pieceId, optionIndex: decision.optionIndex })
		} else {
			this.doSpend({ kind: 'back', pieceId: decision.pieceId })
		}
	}

	private botDifficulty(p: YutPlayer): Difficulty {
		const d = p.botDifficulty
		if (d === 'easy' || d === 'medium' || d === 'hard') return d
		return 'medium'
	}

	// ---------- helpers ----------

	private seatTaken(team: 'A' | 'B'): boolean {
		for (const p of this.state.players.values()) {
			if (p.team === team) return true
		}
		return false
	}

	private findSeat(team: Team): YutPlayer | null {
		for (const p of this.state.players.values()) {
			if (p.team === team) return p
		}
		return null
	}

	private isCurrentTeamActor(sessionId: string): boolean {
		const p = this.state.players.get(sessionId)
		if (!p) return false
		return p.team === this.game.currentTeam
	}
}
