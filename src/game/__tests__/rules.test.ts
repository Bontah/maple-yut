import { describe, expect, it } from 'vitest'
import { enumerateForward } from '../board.js'
import {
	applyBackMove,
	applyForwardMove,
	detectWinner,
	initialState,
	legalBackMoves,
	legalForwardMoves
} from '../rules.js'
import { HOME, type Piece } from '../types.js'

// Helper: place piece manually for scenario tests
function placePiece(state: ReturnType<typeof initialState>, id: string, path: number[]) {
	state.pieces[id] = { ...state.pieces[id], path } as Piece
}

describe('initialState', () => {
	it('has 8 pieces (4 per team) all at start', () => {
		const s = initialState()
		expect(Object.keys(s.pieces)).toHaveLength(8)
		for (const p of Object.values(s.pieces)) {
			expect(p.path).toEqual([])
		}
		expect(s.currentTeam).toBe('A')
		expect(s.winner).toBeNull()
	})
})

describe('legalForwardMoves', () => {
	it('returns 4 options when team A has 4 pieces at start (all identical)', () => {
		const s = initialState()
		const moves = legalForwardMoves(s, 1)
		expect(moves).toHaveLength(4)
		for (const m of moves) {
			expect(m.option.endStation).toBe(1)
		}
	})

	it('excludes home pieces and opponent pieces', () => {
		const s = initialState()
		placePiece(s, 'A1', [19, HOME])
		placePiece(s, 'B1', [5])
		const moves = legalForwardMoves(s, 1)
		const ids = new Set(moves.map((m) => m.pieceId))
		expect(ids.has('A1')).toBe(false)  // home
		expect(ids.has('B1')).toBe(false)  // opponent
		// A2-A4 (still at start) should each appear
		expect(ids).toContain('A2')
		expect(ids).toContain('A3')
		expect(ids).toContain('A4')
	})
})

describe('applyForwardMove: capture', () => {
	it('landing on opponent station sends opponent back to start and grants bonus', () => {
		const s = initialState()
		placePiece(s, 'B1', [3])
		placePiece(s, 'A1', [2])
		const opt = enumerateForward(s.pieces['A1'], 1)[0]
		const result = applyForwardMove(s, 'A1', opt, false)
		expect(result.capturedPieceIds).toEqual(['B1'])
		expect(result.state.pieces['B1'].path).toEqual([])
		expect(result.bonusGranted).toBe(true)
	})

	it('capturing an entire opponent stack returns all of them to start', () => {
		const s = initialState()
		placePiece(s, 'B1', [3])
		placePiece(s, 'B2', [3])
		placePiece(s, 'B3', [3])
		placePiece(s, 'A1', [2])
		const opt = enumerateForward(s.pieces['A1'], 1)[0]
		const result = applyForwardMove(s, 'A1', opt, false)
		expect(new Set(result.capturedPieceIds)).toEqual(new Set(['B1', 'B2', 'B3']))
		for (const id of ['B1', 'B2', 'B3']) {
			expect(result.state.pieces[id].path).toEqual([])
		}
	})
})

describe('applyForwardMove: stacking', () => {
	it('teammates at the source station travel together', () => {
		const s = initialState()
		placePiece(s, 'A1', [5])
		placePiece(s, 'A2', [5])
		const opt = enumerateForward(s.pieces['A1'], 1).find((o) => o.endStation === 6)!
		const result = applyForwardMove(s, 'A1', opt, false)
		expect(result.movedPieceIds.sort()).toEqual(['A1', 'A2'])
		expect(result.state.pieces['A1'].path).toEqual([5, 6])
		expect(result.state.pieces['A2'].path).toEqual([5, 6])
	})

	it('teammates still at start do NOT travel with the entering piece (regression)', () => {
		// Bug: stackmates filter used to include all teammates with pieceStation === START,
		// which made all 4 at-start pieces enter the board together on the first throw.
		const s = initialState()
		// All A pieces start with path = []
		const opt = enumerateForward(s.pieces['A1'], 1)[0]
		const result = applyForwardMove(s, 'A1', opt, false)
		expect(result.movedPieceIds).toEqual(['A1'])
		expect(result.state.pieces['A1'].path).toEqual([1])
		expect(result.state.pieces['A2'].path).toEqual([])
		expect(result.state.pieces['A3'].path).toEqual([])
		expect(result.state.pieces['A4'].path).toEqual([])
	})

	it('a teammate at a DIFFERENT station does NOT travel together', () => {
		const s = initialState()
		placePiece(s, 'A1', [5])
		placePiece(s, 'A2', [4])
		const opt = enumerateForward(s.pieces['A1'], 1).find((o) => o.endStation === 6)!
		const result = applyForwardMove(s, 'A1', opt, false)
		expect(result.movedPieceIds).toEqual(['A1'])
		expect(result.state.pieces['A2'].path).toEqual([4])
	})
})

describe('applyForwardMove: scoring', () => {
	it('moving to HOME marks the piece as scored', () => {
		const s = initialState()
		placePiece(s, 'A1', [19])
		const opt = enumerateForward(s.pieces['A1'], 1)[0]
		const result = applyForwardMove(s, 'A1', opt, false)
		expect(result.scoredPieceIds).toEqual(['A1'])
		expect(result.state.pieces['A1'].path[result.state.pieces['A1'].path.length - 1]).toBe(HOME)
	})

	it('bonus is granted because Yut/Mo (wasBonusThrow=true) even without capture', () => {
		const s = initialState()
		placePiece(s, 'A1', [3])
		const opt = enumerateForward(s.pieces['A1'], 1)[0]
		const result = applyForwardMove(s, 'A1', opt, true)
		expect(result.bonusGranted).toBe(true)
	})
})

describe('applyBackMove', () => {
	it('back-do pops one station', () => {
		const s = initialState()
		placePiece(s, 'A1', [1, 2, 3])
		const result = applyBackMove(s, 'A1', false)
		expect(result.state.pieces['A1'].path).toEqual([1, 2])
	})

	it('back-do can capture (e.g., piece at 6 going back lands on opponent at 5)', () => {
		const s = initialState()
		placePiece(s, 'A1', [4, 5, 6])
		placePiece(s, 'B1', [5])
		const result = applyBackMove(s, 'A1', false)
		expect(result.state.pieces['A1'].path).toEqual([4, 5])
		expect(result.capturedPieceIds).toEqual(['B1'])
		expect(result.bonusGranted).toBe(true)
	})

	it('legalBackMoves excludes pieces at start and at home', () => {
		const s = initialState()
		placePiece(s, 'A1', [])              // at start
		placePiece(s, 'A2', [19, HOME])      // home
		placePiece(s, 'A3', [4])
		placePiece(s, 'A4', [10])
		const moves = legalBackMoves(s)
		const ids = moves.map((m) => m.pieceId).sort()
		expect(ids).toEqual(['A3', 'A4'])
	})
})

describe('detectWinner', () => {
	it('returns null when no team has all home', () => {
		const s = initialState()
		placePiece(s, 'A1', [19, HOME])
		placePiece(s, 'A2', [19, HOME])
		placePiece(s, 'A3', [19, HOME])
		placePiece(s, 'A4', [10])
		expect(detectWinner(s)).toBeNull()
	})

	it('returns "A" when all 4 of A are home', () => {
		const s = initialState()
		for (const id of ['A1', 'A2', 'A3', 'A4']) placePiece(s, id, [19, HOME])
		expect(detectWinner(s)).toBe('A')
	})
})
