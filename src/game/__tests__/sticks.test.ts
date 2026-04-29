import { describe, expect, it } from 'vitest'
import { createRandom } from '../random.js'
import { BACK_MARKED_STICK, classifyFlats, FAIR_PROBABILITIES, throwSticks } from '../sticks.js'
import type { StickResult } from '../types.js'

describe('classifyFlats', () => {
	it('all round (0 flat) → MO', () => {
		expect(classifyFlats([false, false, false, false])).toBe('MO')
	})
	it('all flat (4 flat) → YUT', () => {
		expect(classifyFlats([true, true, true, true])).toBe('YUT')
	})
	it('3 flat → GEOL', () => {
		expect(classifyFlats([true, true, true, false])).toBe('GEOL')
	})
	it('2 flat → GAE', () => {
		expect(classifyFlats([true, true, false, false])).toBe('GAE')
	})
	it('1 flat (the marked stick is flat) → BACK_DO', () => {
		const flats = [false, false, false, false]
		flats[BACK_MARKED_STICK] = true
		expect(classifyFlats(flats)).toBe('BACK_DO')
	})
	it('1 flat (a non-marked stick is flat) → DO', () => {
		const flats = [false, false, false, false]
		// Pick any stick that is NOT the back-marked one
		const idx = BACK_MARKED_STICK === 0 ? 1 : 0
		flats[idx] = true
		expect(classifyFlats(flats)).toBe('DO')
	})
})

describe('FAIR_PROBABILITIES', () => {
	it('sums to exactly 1', () => {
		const sum = Object.values(FAIR_PROBABILITIES).reduce((a, b) => a + b, 0)
		expect(sum).toBeCloseTo(1, 10)
	})
	it('matches the documented table', () => {
		expect(FAIR_PROBABILITIES.BACK_DO).toBe(1 / 16)
		expect(FAIR_PROBABILITIES.DO).toBe(3 / 16)
		expect(FAIR_PROBABILITIES.GAE).toBe(6 / 16)
		expect(FAIR_PROBABILITIES.GEOL).toBe(4 / 16)
		expect(FAIR_PROBABILITIES.YUT).toBe(1 / 16)
		expect(FAIR_PROBABILITIES.MO).toBe(1 / 16)
	})
})

describe('throwSticks empirical distribution', () => {
	it('over 200k throws, each outcome frequency is within 1% of theoretical', () => {
		const rng = createRandom(0xC0FFEE)
		const N = 200_000
		const counts: Record<StickResult, number> = {
			BACK_DO: 0, DO: 0, GAE: 0, GEOL: 0, YUT: 0, MO: 0
		}
		for (let i = 0; i < N; i++) {
			counts[throwSticks(rng).result]++
		}
		const tolerance = 0.01
		for (const [k, expected] of Object.entries(FAIR_PROBABILITIES) as [StickResult, number][]) {
			const actual = counts[k] / N
			expect(Math.abs(actual - expected)).toBeLessThan(tolerance)
		}
	})

	it('is deterministic with the same seed', () => {
		const a = createRandom(99)
		const b = createRandom(99)
		const seqA = Array.from({ length: 100 }, () => throwSticks(a).result)
		const seqB = Array.from({ length: 100 }, () => throwSticks(b).result)
		expect(seqA).toEqual(seqB)
	})
})
