// AI difficulty selector and exports.

import type { Policy } from '../engine.js'
import { easyPolicy, mediumPolicy } from './heuristic.js'
import { hardPolicy } from './expectimax.js'

export type Difficulty = 'easy' | 'medium' | 'hard'

const POLICIES: Record<Difficulty, Policy> = {
	easy: easyPolicy,
	medium: mediumPolicy,
	hard: hardPolicy
}

export function getPolicy(difficulty: Difficulty): Policy {
	return POLICIES[difficulty]
}

export { easyPolicy, mediumPolicy, hardPolicy }
export { evaluatePosition, EASY_WEIGHTS, MEDIUM_WEIGHTS, HARD_WEIGHTS } from './heuristic.js'
export { makeExpectimaxPolicy } from './expectimax.js'
