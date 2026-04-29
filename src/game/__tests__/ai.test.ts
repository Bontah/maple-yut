import { describe, expect, it } from 'vitest'
import { enumerateForward } from '../board.js'
import { playMatch } from '../engine.js'
import { createRandom } from '../random.js'
import { applyForwardMove, initialState, legalBackMoves, legalForwardMoves } from '../rules.js'
import { HOME, type Piece } from '../types.js'
import { easyPolicy, hardPolicy, mediumPolicy } from '../ai/index.js'
import {
	evaluatePosition,
	HARD_WEIGHTS,
	MEDIUM_WEIGHTS,
	makeHeuristicPolicy
} from '../ai/heuristic.js'

function placePiece(s: ReturnType<typeof initialState>, id: string, path: number[]) {
	s.pieces[id] = { ...s.pieces[id], path } as Piece
}

describe('evaluatePosition', () => {
	it('a piece closer to home scores higher than one at start', () => {
		const a = initialState()
		const b = initialState()
		placePiece(b, 'A1', [1, 2, 3, 4, 5, 25, 26, 22, 23])
		expect(evaluatePosition(b, 'A', MEDIUM_WEIGHTS)).toBeGreaterThan(
			evaluatePosition(a, 'A', MEDIUM_WEIGHTS)
		)
	})

	it('having a piece home is worth a lot more than just being on the board', () => {
		const onBoard = initialState()
		placePiece(onBoard, 'A1', [1, 2, 3, 4, 5, 25, 26, 22, 23, 24])  // one step from home
		const home = initialState()
		placePiece(home, 'A1', [1, 2, 3, 4, 5, 25, 26, 22, 23, 24, HOME])
		expect(evaluatePosition(home, 'A', MEDIUM_WEIGHTS)).toBeGreaterThan(
			evaluatePosition(onBoard, 'A', MEDIUM_WEIGHTS)
		)
	})

	it('exposure penalty is applied when an opponent is within 5 forward steps', () => {
		// Hold the position fixed; isolate the exposure component by comparing eval
		// with vs without exposurePenalty.
		const s = initialState()
		placePiece(s, 'A1', [5])  // SE corner
		placePiece(s, 'B1', [3])  // can capture A1 in 2 forward steps
		const noPenalty = { ...MEDIUM_WEIGHTS, exposurePenalty: 0 }
		expect(evaluatePosition(s, 'A', noPenalty))
			.toBeGreaterThan(evaluatePosition(s, 'A', MEDIUM_WEIGHTS))
	})

	it('exposure penalty does NOT fire when opponent is unreachable forward', () => {
		const s = initialState()
		placePiece(s, 'A1', [5])
		placePiece(s, 'B1', [9])  // ahead of A1, can't reach it forward
		const noPenalty = { ...MEDIUM_WEIGHTS, exposurePenalty: 0 }
		expect(evaluatePosition(s, 'A', noPenalty))
			.toBe(evaluatePosition(s, 'A', MEDIUM_WEIGHTS))
	})

	it('returns a huge bonus when perspective wins', () => {
		const won = initialState()
		won.winner = 'A'
		const draw = initialState()
		expect(evaluatePosition(won, 'A', MEDIUM_WEIGHTS)).toBeGreaterThan(
			evaluatePosition(draw, 'A', MEDIUM_WEIGHTS) + 1000
		)
	})
})

describe('mediumPolicy', () => {
	it('prefers the capturing move over a non-capturing alternative', () => {
		// A1 at station 4, opponent B1 at station 5. With +1 step, A1 lands on B1 → capture.
		// Alternative move: any other piece advancing 1 from start.
		const s = initialState()
		placePiece(s, 'A1', [1, 2, 3, 4])
		placePiece(s, 'B1', [5])
		const ctx = { state: s, step: 1, rng: createRandom(0) }
		const decision = mediumPolicy(ctx)
		expect(decision).not.toBeNull()
		expect(decision!.kind).toBe('forward')
		if (decision!.kind === 'forward') {
			expect(decision!.pieceId).toBe('A1')   // the capture move
		}
	})

	it('avoids landing in opponent capture range when a safer alternative exists', () => {
		// A1 about to enter the board; B1 is 3 steps ahead of station 1 → can capture A1 next turn if A1 lands at 1.
		// A2 is at station 19 (one step from home). With +1 step, sending A2 home is much better than A1 entering at 1.
		const s = initialState()
		placePiece(s, 'A2', [19])
		placePiece(s, 'B1', [3])  // would threaten A1 at station 1 if A1 entered there
		const ctx = { state: s, step: 1, rng: createRandom(0) }
		const decision = mediumPolicy(ctx)
		expect(decision).not.toBeNull()
		if (decision!.kind === 'forward') {
			expect(decision!.pieceId).toBe('A2')
		}
	})
})

describe('AI smoke matches', () => {
	// Yut's heavy RNG limits how dominant a smarter policy can be vs a slightly worse one.
	// The thresholds below were chosen empirically from the self-play sim; they're loose
	// enough not to be flaky but tight enough that a real regression (e.g. the AI ignoring
	// captures) would fail the test.
	const N = 200

	it('hard vs easy: hard wins ≥ 65% over 200 matches', () => {
		const rng = createRandom(0xA1)
		let wins = 0
		for (let i = 0; i < N; i++) {
			const onA = i % 2 === 0
			const { stats } = playMatch(onA ? hardPolicy : easyPolicy, onA ? easyPolicy : hardPolicy, rng)
			if ((stats.winner === 'A') === onA) wins++
		}
		expect(wins / N).toBeGreaterThanOrEqual(0.65)
	}, 60_000)

	it('medium vs easy: medium wins ≥ 65% over 200 matches', () => {
		const rng = createRandom(0xA2)
		let wins = 0
		for (let i = 0; i < N; i++) {
			const onA = i % 2 === 0
			const { stats } = playMatch(onA ? mediumPolicy : easyPolicy, onA ? easyPolicy : mediumPolicy, rng)
			if ((stats.winner === 'A') === onA) wins++
		}
		expect(wins / N).toBeGreaterThanOrEqual(0.65)
	}, 60_000)

	it('hard vs random: hard wins ≥ 80% (validates leaf eval is strong vs no strategy)', () => {
		const rng = createRandom(0xA3)
		let wins = 0
		for (let i = 0; i < N; i++) {
			const onA = i % 2 === 0
			const { stats } = playMatch(
				onA ? hardPolicy : ((ctx) => randomMove(ctx)),
				onA ? ((ctx) => randomMove(ctx)) : hardPolicy,
				rng
			)
			if ((stats.winner === 'A') === onA) wins++
		}
		expect(wins / N).toBeGreaterThanOrEqual(0.8)
	}, 60_000)
})

// inline a random policy for the smoke test without importing engine internals
function randomMove(ctx: { state: ReturnType<typeof initialState>; step: number; rng: { nextInt: (n: number) => number } }) {
	const { state, step, rng } = ctx
	if (step > 0) {
		const moves = legalForwardMoves(state, step)
		if (moves.length === 0) return null
		const m = moves[rng.nextInt(moves.length)]
		const same = moves.filter((mm) => mm.pieceId === m.pieceId)
		const optionIndex = same.findIndex((mm) => mm.option === m.option)
		return { kind: 'forward' as const, pieceId: m.pieceId, optionIndex }
	}
	if (step < 0) {
		const backs = legalBackMoves(state)
		if (backs.length === 0) return null
		const b = backs[rng.nextInt(backs.length)]
		return { kind: 'back' as const, pieceId: b.pieceId }
	}
	return null
}

// keep a couple imports referenced
void enumerateForward
void applyForwardMove
void HARD_WEIGHTS
void makeHeuristicPolicy
