// Integration test for YutRoom.
//
// Boots a Colyseus test server, registers YutRoom, connects two test clients,
// and drives a full match by sending throw/spend messages. With a fixed seed,
// the match is deterministic and terminates with a winner.

import { boot, ColyseusTestServer } from '@colyseus/testing'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
	legalBackMoves,
	legalForwardMoves,
	type GameState
} from '../../game/rules.js'
import type { Piece, Team } from '../../game/types.js'
import type { YutState } from '../../entities/YutState.js'
import { YutRoom } from '../YutRoom.js'

let colyseus: ColyseusTestServer

beforeAll(async () => {
	colyseus = await boot({
		options: {},
		initializeGameServer(server) {
			server.define('yut', YutRoom).filterBy(['channelId'])
		},
		initializeExpress() { /* not needed */ },
		beforeListen() { /* not needed */ }
	})
})

afterAll(async () => {
	await colyseus.shutdown()
})

// Build a minimal pure-TS GameState view from the synced schema, so the test client
// can ask the same legalMoves helpers the server uses.
function gameStateFromSchema(s: YutState): GameState {
	const pieces: Record<string, Piece> = {}
	s.pieces.forEach((p, key) => {
		pieces[key] = { team: p.team as Team, id: p.pieceId, path: Array.from(p.path) }
	})
	return {
		pieces,
		currentTeam: s.currentTeam as Team,
		pendingStep: s.pendingStep === 0 ? null : s.pendingStep,
		bonusOwed: s.bonusOwed,
		winner: (s.winner || null) as Team | null
	}
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

describe('YutRoom — full match integration', () => {
	it('two human clients can play a full match to a winner', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'test',
			channelId: 'test-channel',
			seed: 42
		})

		const c1 = await colyseus.connectTo(room, {
			userId: 'u1', name: 'Alice', avatarUri: ''
		})
		const c2 = await colyseus.connectTo(room, {
			userId: 'u2', name: 'Bob', avatarUri: ''
		})

		// Initial state: lobby, 8 pieces at start, no winner.
		await room.waitForNextPatch()
		expect((c1.state as YutState).phase).toBe('lobby')
		expect((c1.state as YutState).pieces.size).toBe(8)

		// Each client takes a team.
		c1.send('join_team', { team: 'A' })
		c2.send('join_team', { team: 'B' })
		await room.waitForNextPatch()

		// Host (c1, the first joiner) starts the match.
		c1.send('start', {})
		await room.waitForNextPatch()
		expect((c1.state as YutState).phase).toBe('await_throw')

		// Drive the match. Cap turns to avoid infinite loops if something is broken.
		const MAX_ACTIONS = 5000
		let actions = 0
		while ((c1.state as YutState).phase !== 'ended' && actions < MAX_ACTIONS) {
			const state = c1.state as YutState
			const team = state.currentTeam
			const client = team === 'A' ? c1 : c2

			if (state.phase === 'await_throw') {
				client.send('throw', {})
			} else if (state.phase === 'await_spend') {
				const game = gameStateFromSchema(state)
				const step = state.pendingStep
				if (step > 0) {
					const moves = legalForwardMoves(game, step)
					expect(moves.length).toBeGreaterThan(0)
					const pick = moves[0]
					const sameForPiece = moves.filter((m) => m.pieceId === pick.pieceId)
					const idx = sameForPiece.findIndex((m) => m.option === pick.option)
					client.send('spend', { kind: 'forward', pieceId: pick.pieceId, optionIndex: idx })
				} else if (step < 0) {
					const backs = legalBackMoves(game)
					expect(backs.length).toBeGreaterThan(0)
					client.send('spend', { kind: 'back', pieceId: backs[0].pieceId })
				}
			}

			await room.waitForNextPatch()
			await sleep(0)
			actions++
		}

		expect(actions).toBeLessThan(MAX_ACTIONS)
		const finalState = c1.state as YutState
		expect(finalState.phase).toBe('ended')
		expect(['A', 'B']).toContain(finalState.winner)

		// Winner has all 4 pieces home.
		const winner = finalState.winner
		const homeCount = Array.from(finalState.pieces.values()).filter(
			(p) => p.team === winner && p.isHome
		).length
		expect(homeCount).toBe(4)
	}, 30_000)
})

describe('YutRoom — psychic powers', () => {
	it('Control Yut: forces a chosen throw result and decrements powersRemaining', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'pyut', channelId: 'p-c1', seed: 1
		})
		const c1 = await colyseus.connectTo(room, { userId: 'u1', name: 'A', avatarUri: '' })
		const c2 = await colyseus.connectTo(room, { userId: 'u2', name: 'B', avatarUri: '' })
		c1.send('join_team', { team: 'A' })
		c2.send('join_team', { team: 'B' })
		await room.waitForNextPatch()
		c1.send('start', {})
		await room.waitForNextPatch()
		expect((c1.state as YutState).powersRemainingA).toBe(2)
		expect((c1.state as YutState).powersRemainingB).toBe(2)

		c1.send('use_power_yut', { result: 'MO' })
		await room.waitForNextPatch()
		const s = c1.state as YutState
		expect(s.lastThrowResult).toBe('MO')
		expect(s.pendingStep).toBe(5)
		expect(s.phase).toBe('await_spend')
		expect(s.powersRemainingA).toBe(1)
		expect(s.powerUsedThisTurn).toBe(true)
	})

	it('Control Horses: shifts the pending step and locks subsequent power use this turn', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'phorses', channelId: 'p-c2', seed: 2
		})
		const c1 = await colyseus.connectTo(room, { userId: 'u1', name: 'A', avatarUri: '' })
		const c2 = await colyseus.connectTo(room, { userId: 'u2', name: 'B', avatarUri: '' })
		c1.send('join_team', { team: 'A' })
		c2.send('join_team', { team: 'B' })
		await room.waitForNextPatch()
		c1.send('start', {})
		await room.waitForNextPatch()
		// Force the throw deterministically via Control Yut so we know what the step is.
		c1.send('use_power_yut', { result: 'GAE' })  // step = 2
		await room.waitForNextPatch()
		expect((c1.state as YutState).pendingStep).toBe(2)
		// Try to use Horses on the same turn — should be rejected.
		c1.send('use_power_horses', { shift: 1 })
		await room.waitForNextPatch()
		const blocked = c1.state as YutState
		expect(blocked.pendingStep).toBe(2)
		expect(blocked.powersRemainingA).toBe(1)   // unchanged
	})

	it('Powers reset across turns — second turn allows a power again', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'pturn', channelId: 'p-c3', seed: 3
		})
		const c1 = await colyseus.connectTo(room, { userId: 'u1', name: 'A', avatarUri: '' })
		const c2 = await colyseus.connectTo(room, { userId: 'u2', name: 'B', avatarUri: '' })
		c1.send('join_team', { team: 'A' })
		c2.send('join_team', { team: 'B' })
		await room.waitForNextPatch()
		c1.send('start', {})
		await room.waitForNextPatch()

		// A uses Control Yut, spends, turn ends.
		c1.send('use_power_yut', { result: 'GEOL' })
		await room.waitForNextPatch()
		const s1 = c1.state as YutState
		const game = gameStateFromSchema(s1)
		const moves = legalForwardMoves(game, s1.pendingStep)
		const pick = moves[0]
		const same = moves.filter((m) => m.pieceId === pick.pieceId)
		const idx = same.findIndex((m) => m.option === pick.option)
		c1.send('spend', { kind: 'forward', pieceId: pick.pieceId, optionIndex: idx })
		await room.waitForNextPatch()
		// Geol = 3, no bonus → turn passes to B
		expect((c1.state as YutState).currentTeam).toBe('B')
		expect((c1.state as YutState).powerUsedThisTurn).toBe(false)

		// B uses Control Yut now.
		c2.send('use_power_yut', { result: 'DO' })
		await room.waitForNextPatch()
		const s2 = c1.state as YutState
		expect(s2.lastThrowResult).toBe('DO')
		expect(s2.powersRemainingB).toBe(1)
	})

	it('Cannot use a power when none remain', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'pnone', channelId: 'p-c4', seed: 4
		})
		const c1 = await colyseus.connectTo(room, { userId: 'u1', name: 'A', avatarUri: '' })
		const c2 = await colyseus.connectTo(room, { userId: 'u2', name: 'B', avatarUri: '' })
		c1.send('join_team', { team: 'A' })
		c2.send('join_team', { team: 'B' })
		await room.waitForNextPatch()
		c1.send('start', {})
		await room.waitForNextPatch()

		// Use & spend on turn 1, then again on turn 3 (after B plays once); A has now used 2 powers.
		// Drive a deterministic flow: A uses a power and spends each available turn until she runs out.
		const playPowerTurn = async (client: typeof c1, choice: 'DO') => {
			client.send('use_power_yut', { result: choice })
			await room.waitForNextPatch()
			const s = c1.state as YutState
			if (s.phase !== 'await_spend') return
			const game = gameStateFromSchema(s)
			const moves = legalForwardMoves(game, s.pendingStep)
			const pick = moves[0]
			const same = moves.filter((m) => m.pieceId === pick.pieceId)
			const idx = same.findIndex((m) => m.option === pick.option)
			client.send('spend', { kind: 'forward', pieceId: pick.pieceId, optionIndex: idx })
			await room.waitForNextPatch()
		}
		const passTurn = async (client: typeof c1) => {
			client.send('throw', {})
			await room.waitForNextPatch()
			const s = c1.state as YutState
			if (s.phase === 'await_spend') {
				const game = gameStateFromSchema(s)
				const step = s.pendingStep
				if (step > 0) {
					const moves = legalForwardMoves(game, step)
					const pick = moves[0]
					const same = moves.filter((m) => m.pieceId === pick.pieceId)
					const idx = same.findIndex((m) => m.option === pick.option)
					client.send('spend', { kind: 'forward', pieceId: pick.pieceId, optionIndex: idx })
				} else {
					const backs = legalBackMoves(game)
					if (backs.length > 0) client.send('spend', { kind: 'back', pieceId: backs[0].pieceId })
				}
				await room.waitForNextPatch()
			}
		}

		// A turn 1: use power
		await playPowerTurn(c1, 'DO')
		// drive turns until it's A's turn again (twice)
		for (let i = 0; i < 100; i++) {
			const s = c1.state as YutState
			if (s.currentTeam === 'A' && s.phase === 'await_throw') break
			const cur = s.currentTeam === 'A' ? c1 : c2
			await passTurn(cur)
		}
		// A turn 2: use second power
		await playPowerTurn(c1, 'DO')
		// Now A has 0 powers. Get back to A's turn and try a 3rd use.
		for (let i = 0; i < 100; i++) {
			const s = c1.state as YutState
			if (s.currentTeam === 'A' && s.phase === 'await_throw') break
			const cur = s.currentTeam === 'A' ? c1 : c2
			await passTurn(cur)
		}
		expect((c1.state as YutState).powersRemainingA).toBe(0)
		c1.send('use_power_yut', { result: 'MO' })
		await room.waitForNextPatch()
		expect((c1.state as YutState).powersRemainingA).toBe(0)
		expect((c1.state as YutState).lastThrowResult).not.toBe('MO')
	}, 30_000)
})

describe('YutRoom — rematch', () => {
	it('host can rematch after a winner is declared; pieces reset, players preserved', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'rematch', channelId: 'rematch-c', seed: 99
		})
		const c1 = await colyseus.connectTo(room, { userId: 'u1', name: 'A', avatarUri: '' })
		const c2 = await colyseus.connectTo(room, { userId: 'u2', name: 'B', avatarUri: '' })
		c1.send('join_team', { team: 'A' })
		c2.send('join_team', { team: 'B' })
		await room.waitForNextPatch()
		c1.send('start', {})
		await room.waitForNextPatch()

		// Drive the match by greedy-first-legal-move until ended, like the main integration test.
		const MAX = 5000
		let i = 0
		while ((c1.state as YutState).phase !== 'ended' && i < MAX) {
			const s = c1.state as YutState
			const team = s.currentTeam
			const cl = team === 'A' ? c1 : c2
			if (s.phase === 'await_throw') cl.send('throw', {})
			else if (s.phase === 'await_spend') {
				const game = gameStateFromSchema(s)
				const step = s.pendingStep
				if (step > 0) {
					const moves = legalForwardMoves(game, step)
					if (moves.length > 0) {
						const pick = moves[0]
						const same = moves.filter((m) => m.pieceId === pick.pieceId)
						const idx = same.findIndex((m) => m.option === pick.option)
						cl.send('spend', { kind: 'forward', pieceId: pick.pieceId, optionIndex: idx })
					}
				} else {
					const backs = legalBackMoves(game)
					if (backs.length > 0) cl.send('spend', { kind: 'back', pieceId: backs[0].pieceId })
				}
			}
			await room.waitForNextPatch()
			i++
		}
		expect((c1.state as YutState).phase).toBe('ended')

		c1.send('rematch', {})
		await room.waitForNextPatch()
		const post = c1.state as YutState
		expect(post.phase).toBe('await_throw')
		expect(post.winner).toBe('')
		expect(post.lastThrowResult).toBe('')
		expect(post.pendingStep).toBe(0)
		// All 8 pieces back at start.
		for (const p of post.pieces.values()) {
			expect(p.path.length).toBe(0)
			expect(p.station).toBe(0)
			expect(p.isHome).toBe(false)
		}
		// Powers refilled.
		expect(post.powersRemainingA).toBe(2)
		expect(post.powersRemainingB).toBe(2)
		// Players preserved.
		expect(post.players.size).toBe(2)
	}, 30_000)
})

describe('YutRoom — lobby behavior', () => {
	it('rejects joining a taken seat', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'lobby-test',
			channelId: 'lobby-chan',
			seed: 7
		})
		const c1 = await colyseus.connectTo(room, { userId: 'u1', name: 'A', avatarUri: '' })
		const c2 = await colyseus.connectTo(room, { userId: 'u2', name: 'B', avatarUri: '' })

		c1.send('join_team', { team: 'A' })
		await room.waitForNextPatch()
		c2.send('join_team', { team: 'A' })   // already taken
		await room.waitForNextPatch()

		const state = c1.state as YutState
		const me1 = state.players.get(c1.sessionId)
		const me2 = state.players.get(c2.sessionId)
		expect(me1?.team).toBe('A')
		expect(me2?.team).toBe('')
	})

	it('non-host cannot start the match', async () => {
		const room = await colyseus.createRoom('yut', {
			roomName: 'host-test',
			channelId: 'host-chan',
			seed: 8
		})
		const c1 = await colyseus.connectTo(room, { userId: 'u1', name: 'A', avatarUri: '' })
		const c2 = await colyseus.connectTo(room, { userId: 'u2', name: 'B', avatarUri: '' })
		c1.send('join_team', { team: 'A' })
		c2.send('join_team', { team: 'B' })
		await room.waitForNextPatch()

		// c2 (non-host) tries to start.
		c2.send('start', {})
		await room.waitForNextPatch()
		expect((c1.state as YutState).phase).toBe('lobby')

		// c1 (host) starts successfully.
		c1.send('start', {})
		await room.waitForNextPatch()
		expect((c1.state as YutState).phase).toBe('await_throw')
	})
})
