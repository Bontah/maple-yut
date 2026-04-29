import { describe, expect, it } from 'vitest'
import { ALL_STATIONS, applyBack, canAcceptBack, enumerateForward, FORWARD, SHORTCUT_STATIONS } from '../board.js'
import { HOME, START, type Piece } from '../types.js'

const piece = (path: number[]): Piece => ({ team: 'A', id: 'A1', path })

describe('FORWARD edges', () => {
	it('has exactly 29 stations', () => {
		expect(ALL_STATIONS).toHaveLength(29)
	})

	it('shortcut intersections are exactly stations 5, 10, and 22', () => {
		expect(SHORTCUT_STATIONS.sort((a, b) => a - b)).toEqual([5, 10, 22])
	})

	it('station 19 leads to HOME (last perimeter step)', () => {
		expect(FORWARD[19].next).toBe(HOME)
	})

	it('station 24 leads to HOME (diagonal-1 SW exit)', () => {
		expect(FORWARD[24].next).toBe(HOME)
	})
})

describe('enumerateForward', () => {
	it('a single step from start returns one option ending at station 1', () => {
		const opts = enumerateForward(piece([]), 1)
		expect(opts).toEqual([{ endPath: [1], endStation: 1 }])
	})

	it('a piece landing exactly on corner 5 with steps=5 from start has only one path (since we LAND on 5, not pass it)', () => {
		const opts = enumerateForward(piece([]), 5)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(5)
		expect(opts[0].endPath).toEqual([1, 2, 3, 4, 5])
	})

	it('from corner 5 with steps=1, the player can go to station 6 OR station 25 (shortcut)', () => {
		const opts = enumerateForward(piece([1, 2, 3, 4, 5]), 1)
		const ends = opts.map((o) => o.endStation).sort((a, b) => a - b)
		expect(ends).toEqual([6, 25])
	})

	it('from corner 10 with steps=1, options are stations 11 and 20', () => {
		const opts = enumerateForward(piece([10]), 1)
		const ends = opts.map((o) => o.endStation).sort((a, b) => a - b)
		expect(ends).toEqual([11, 20])
	})

	it('from center (22) with steps=1, options are stations 23 (toward home) and 27 (toward NW)', () => {
		const opts = enumerateForward(piece([22]), 1)
		const ends = opts.map((o) => o.endStation).sort((a, b) => a - b)
		expect(ends).toEqual([23, 27])
	})

	it('a piece on station 19 with steps=1 scores (endStation=HOME)', () => {
		const opts = enumerateForward(piece([19]), 1)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(HOME)
	})

	it('crossing intersections without starting on one stays on the perimeter', () => {
		// From station 4 with step 6: passes through 5 (a shortcut intersection) but does NOT branch.
		// Path is uniquely 4 → 5 → 6 → 7 → 8 → 9 → 10.
		const opts = enumerateForward(piece([4]), 6)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(10)
		expect(opts[0].endPath).toEqual([4, 5, 6, 7, 8, 9, 10])
	})

	it('passing through corner 5 (e.g. step 2 from station 4) does NOT branch — must START at the corner to take a shortcut', () => {
		const opts = enumerateForward(piece([4]), 2)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(6)
		expect(opts[0].endPath).toEqual([4, 5, 6])
	})

	it('passing through center 22 (e.g. step 2 from station 21) does NOT branch — must START at the center to choose exit', () => {
		const opts = enumerateForward(piece([21]), 2)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(23)
		expect(opts[0].endPath).toEqual([21, 22, 23])
	})

	it('piece at corner 5 with step 4: diagonal is blocked (would cross 22→23 from a forbidden start), only perimeter offered', () => {
		const opts = enumerateForward(piece([5]), 4)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(9)
		expect(opts[0].endPath).toEqual([5, 6, 7, 8, 9])
	})

	it('piece at corner 5 with step 5: same — diagonal blocked, only perimeter to corner 10', () => {
		const opts = enumerateForward(piece([5]), 5)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(10)
		expect(opts[0].endPath).toEqual([5, 6, 7, 8, 9, 10])
	})

	it('piece at 26 (mid-diagonal-2) with step 1 lands at 22', () => {
		const opts = enumerateForward(piece([5, 25, 26]), 1)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(22)
	})

	it('piece at 26 with step 2 has NO legal move (would traverse 22→23 from a forbidden start)', () => {
		const opts = enumerateForward(piece([5, 25, 26]), 2)
		expect(opts).toHaveLength(0)
	})

	it('piece at 25 with step 2 lands at 22', () => {
		const opts = enumerateForward(piece([5, 25]), 2)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(22)
	})

	it('piece at 25 with step 3 has NO legal move (would traverse 22→23 from a forbidden start)', () => {
		const opts = enumerateForward(piece([5, 25]), 3)
		expect(opts).toHaveLength(0)
	})

	it('piece at 21 (diagonal-1) with step 2 reaches 23 — the gate is open from diagonal-1 starts', () => {
		const opts = enumerateForward(piece([10, 20, 21]), 2)
		expect(opts).toHaveLength(1)
		expect(opts[0].endStation).toBe(23)
		expect(opts[0].endPath).toEqual([10, 20, 21, 22, 23])
	})

	it('piece at corner 10 with step 4 (via diagonal-1) reaches 23', () => {
		const opts = enumerateForward(piece([10]), 4)
		// Two paths: perimeter to 14, or diagonal-1 through 22 to 23.
		const ends = new Set(opts.map((o) => o.endStation))
		expect(ends.has(14)).toBe(true)
		expect(ends.has(23)).toBe(true)
	})

	it('piece at center 22 with step 3 can reach HOME (via 23/24) or 15 (via 27/28) — gate is open from 22', () => {
		const opts = enumerateForward(piece([22]), 3)
		const ends = new Set(opts.map((o) => o.endStation))
		// Both 0/HOME (via 23→24→HOME) and 15 (via 27→28→15) should be present.
		expect(ends.has(HOME)).toBe(true)
		expect(ends.has(15)).toBe(true)
	})
})

describe('applyBack and canAcceptBack', () => {
	it('back-do at start is a no-op (path stays empty)', () => {
		const p = piece([])
		expect(canAcceptBack(p)).toBe(false)
		expect(applyBack(p)).toEqual([])
	})

	it('back-do pops the last station', () => {
		const p = piece([1, 2, 3])
		expect(canAcceptBack(p)).toBe(true)
		expect(applyBack(p)).toEqual([1, 2])
	})

	it('back-do from one-step trail returns to start', () => {
		const p = piece([1])
		expect(applyBack(p)).toEqual([])
	})

	it('back-do on a HOME piece is rejected', () => {
		const p = piece([19, HOME])
		expect(canAcceptBack(p)).toBe(false)
		expect(applyBack(p)).toEqual([19, HOME])
	})

	it('back-do from station 25 (mid-diagonal-2) returns to corner 5, preserving "trail" semantics', () => {
		// Piece took shortcut from 5 → 25. Back-do should send it to 5, not 4 (perimeter).
		const p = piece([1, 2, 3, 4, 5, 25])
		expect(applyBack(p)).toEqual([1, 2, 3, 4, 5])
	})

	it(START === 0 ? 'START is 0 (sanity)' : 'START is the start station', () => {
		expect(START).toBe(0)
	})
})
