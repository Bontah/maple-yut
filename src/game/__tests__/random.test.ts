import { describe, expect, it } from 'vitest'
import { createRandom } from '../random.js'

describe('createRandom', () => {
	it('is deterministic for the same seed', () => {
		const a = createRandom(42)
		const b = createRandom(42)
		const seqA = Array.from({ length: 10 }, () => a.next())
		const seqB = Array.from({ length: 10 }, () => b.next())
		expect(seqA).toEqual(seqB)
	})

	it('produces different sequences for different seeds', () => {
		const a = createRandom(1)
		const b = createRandom(2)
		expect(a.next()).not.toBe(b.next())
	})

	it('returns floats in [0, 1)', () => {
		const r = createRandom(123)
		for (let i = 0; i < 10000; i++) {
			const v = r.next()
			expect(v).toBeGreaterThanOrEqual(0)
			expect(v).toBeLessThan(1)
		}
	})

	it('nextInt covers the full range without going out of bounds', () => {
		const r = createRandom(7)
		const seen = new Set<number>()
		for (let i = 0; i < 10000; i++) {
			const v = r.nextInt(6)
			expect(v).toBeGreaterThanOrEqual(0)
			expect(v).toBeLessThan(6)
			seen.add(v)
		}
		expect(seen.size).toBe(6)
	})
})
