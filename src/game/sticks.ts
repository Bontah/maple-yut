// Stick-throw simulator and probability table.
//
// Convention: 4 sticks, each has 1 round side and 1 flat side, fair (P(flat) = 0.5).
// One of the 4 sticks is "back-marked" — when only that stick is flat-up, the
// throw is BACK_DO instead of DO.
//
// Outcome by # of flat sides up (out of 4):
//   0 flat → MO   (1/16, +5, bonus throw)
//   1 flat → DO (3/16) or BACK_DO (1/16 if only the marked stick is flat)
//   2 flat → GAE  (6/16, +2)
//   3 flat → GEOL (4/16, +3)
//   4 flat → YUT  (1/16, +4, bonus throw)

import type { Random } from './random.js'
import type { StickResult } from './types.js'

export const BACK_MARKED_STICK = 0  // index of the back-marked stick

export interface ThrowResult {
	result: StickResult
	flats: boolean[]  // length 4; flats[i] = true if stick i landed flat-side up
}

export function throwSticks(rng: Random): ThrowResult {
	const flats = [
		rng.next() < 0.5,
		rng.next() < 0.5,
		rng.next() < 0.5,
		rng.next() < 0.5
	]
	return { result: classifyFlats(flats), flats }
}

export function classifyFlats(flats: boolean[]): StickResult {
	const flatCount = flats.reduce((acc, f) => acc + (f ? 1 : 0), 0)
	if (flatCount === 0) return 'MO'
	if (flatCount === 4) return 'YUT'
	if (flatCount === 3) return 'GEOL'
	if (flatCount === 2) return 'GAE'
	// flatCount === 1: BACK_DO if the marked stick is the lone flat, else DO
	return flats[BACK_MARKED_STICK] ? 'BACK_DO' : 'DO'
}

// Theoretical probability of each outcome under fair sticks.
// Sums to 16/16 = 1.
export const FAIR_PROBABILITIES: Record<StickResult, number> = {
	BACK_DO: 1 / 16,
	DO: 3 / 16,
	GAE: 6 / 16,
	GEOL: 4 / 16,
	YUT: 1 / 16,
	MO: 1 / 16
}
