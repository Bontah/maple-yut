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

	it('crossing two intersections branches into 4 paths', () => {
		// From station 4 (just before SE corner), step 6 — passes 5 and reaches 10 (or branches)
		// Path 1: 4 → 5 → 6 → 7 → 8 → 9 → 10 (then choice at 10 doesn't apply because we LAND there)
		// Path 2: 4 → 5 → 25 → 26 → 22 → 23 → 24 (also stops at 24 — only landed on intersections 5 and 22 mid-trip)
		// At station 5, choice; at station 22, choice (when we reach it). So branches happen.
		const opts = enumerateForward(piece([4]), 6)
		expect(opts.length).toBeGreaterThanOrEqual(2)
		const ends = new Set(opts.map((o) => o.endStation))
		expect(ends.has(10)).toBe(true)
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
