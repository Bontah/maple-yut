// Pure-TS turn driver for random play / AI / headless tests.
// Drives a GameState forward by alternating throws and spends until a winner exists.

import {
	applyBackMove,
	applyForwardMove,
	endTurn,
	type GameState,
	initialState,
	legalBackMoves,
	legalForwardMoves
} from './rules.js'
import { type Random } from './random.js'
import { STICK_GRANTS_BONUS, STICK_STEPS, type StickResult } from './types.js'
import { throwSticks } from './sticks.js'

export interface MatchStats {
	winner: 'A' | 'B'
	turns: number
	throws: number
	captures: number
	maxStackSize: number
}

export interface PolicyContext {
	state: GameState
	step: number       // the step value being spent (positive = forward, -1 = back-do)
	rng: Random
}

// A policy decides which legal move to play. Returns:
//   - { kind: 'forward', pieceId, optionIndex } for a forward step
//   - { kind: 'back', pieceId } for a back-do
//   - null when no legal move exists (the throw is wasted)
export type Decision =
	| { kind: 'forward'; pieceId: string; optionIndex: number }
	| { kind: 'back'; pieceId: string }
	| null

export type Policy = (ctx: PolicyContext) => Decision

// Wrap a base policy so that it falls through to `fallback` with probability `rate`.
// Used to inject blunders into a base "smart" policy, e.g. for an easy AI.
export function blunder(base: Policy, rate: number, fallback: Policy): Policy {
	return (ctx) => (ctx.rng.next() < rate ? fallback(ctx) : base(ctx))
}

// Random policy: pick a random legal move.
export function randomPolicy({ state, step, rng }: PolicyContext): Decision {
	if (step > 0) {
		const moves = legalForwardMoves(state, step)
		if (moves.length === 0) return null
		const m = moves[rng.nextInt(moves.length)]
		// Find the pieceId's first option (we already enumerated it),
		// but the random choice was by (pieceId, option) pair index, so just resolve to the matching option.
		const allForPiece = moves.filter((mm) => mm.pieceId === m.pieceId)
		const optionIndex = allForPiece.findIndex((mm) => mm.option === m.option)
		return { kind: 'forward', pieceId: m.pieceId, optionIndex }
	}
	if (step < 0) {
		const moves = legalBackMoves(state)
		if (moves.length === 0) return null
		const m = moves[rng.nextInt(moves.length)]
		return { kind: 'back', pieceId: m.pieceId }
	}
	return null
}

// Run a single match between two policies. Returns the final state and stats.
export function playMatch(
	policyA: Policy,
	policyB: Policy,
	rng: Random,
	maxTurns = 5000
): { state: GameState; stats: MatchStats } {
	let state = initialState('A')
	let turns = 0
	let throws = 0
	let captures = 0
	let maxStackSize = 1

	while (state.winner === null && turns < maxTurns) {
		const policy = state.currentTeam === 'A' ? policyA : policyB
		// Throw + spend cycle. Repeat while bonus is owed.
		let bonusOwed = true
		while (bonusOwed && state.winner === null) {
			throws++
			const t: StickResult = throwSticks(rng).result
			const step = STICK_STEPS[t]
			const wasBonusThrow = STICK_GRANTS_BONUS[t]
			const decision = policy({ state, step, rng })
			if (decision === null) {
				// Wasted throw: still respect Yut/Mo bonus rule (you get another throw even if you can't spend).
				bonusOwed = wasBonusThrow
				continue
			}
			if (decision.kind === 'forward') {
				const moves = legalForwardMoves(state, step).filter((m) => m.pieceId === decision.pieceId)
				const opt = moves[decision.optionIndex].option
				const r = applyForwardMove(state, decision.pieceId, opt, wasBonusThrow)
				state = r.state
				if (r.capturedPieceIds.length > 0) captures++
			} else {
				const r = applyBackMove(state, decision.pieceId, wasBonusThrow)
				state = r.state
				if (r.capturedPieceIds.length > 0) captures++
			}
			// Track max stack size after the move.
			const stackCounts = new Map<string, number>()
			for (const p of Object.values(state.pieces)) {
				if (p.path.length === 0) continue
				const cur = p.path[p.path.length - 1]
				if (cur === -1) continue
				const k = `${p.team}-${cur}`
				stackCounts.set(k, (stackCounts.get(k) ?? 0) + 1)
			}
			for (const c of stackCounts.values()) if (c > maxStackSize) maxStackSize = c
			bonusOwed = state.bonusOwed
		}
		if (state.winner !== null) break
		state = endTurn(state)
		turns++
	}

	if (state.winner === null) {
		throw new Error(`Match did not terminate within ${maxTurns} turns`)
	}
	return {
		state,
		stats: { winner: state.winner, turns, throws, captures, maxStackSize }
	}
}
