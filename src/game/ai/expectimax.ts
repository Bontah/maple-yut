// Hard AI: depth-1 expectimax over opponent's stick outcomes.
//
// For each of my candidate moves, simulate it and then ask:
//   "What's the expected eval after the opponent's next throw + their best response?"
// Return the move that maximizes this expectation.
//
// Chance node = sticks (6 outcomes weighted by FAIR_PROBABILITIES).
// At the leaf, we use the same heuristic eval as easy/medium, so weight tuning is unified.

import {
	applyBackMove,
	applyForwardMove,
	endTurn,
	legalBackMoves,
	legalForwardMoves,
	type GameState
} from '../rules.js'
import { FAIR_PROBABILITIES } from '../sticks.js'
import { STICK_GRANTS_BONUS, STICK_STEPS, type StickResult, type Team } from '../types.js'
import type { Decision, Policy, PolicyContext } from '../engine.js'
import { evaluatePosition, HARD_WEIGHTS, type EvalWeights } from './heuristic.js'

const STICK_OUTCOMES: StickResult[] = ['BACK_DO', 'DO', 'GAE', 'GEOL', 'YUT', 'MO']

// Expected eval over opponent's next throw + their best response (for opponent),
// from `perspective`'s point of view. State must already have currentTeam = opponent.
function chanceOpponentTurn(state: GameState, perspective: Team, w: EvalWeights): number {
	if (state.winner) return evaluatePosition(state, perspective, w)
	let total = 0
	for (const outcome of STICK_OUTCOMES) {
		const prob = FAIR_PROBABILITIES[outcome]
		const step = STICK_STEPS[outcome]
		const wasBonus = STICK_GRANTS_BONUS[outcome]
		// Opponent's best response = MIN over our perspective.
		let worstForUs = Number.POSITIVE_INFINITY
		const moves = step > 0 ? legalForwardMoves(state, step) : []
		const backs = step < 0 ? legalBackMoves(state) : []
		if (moves.length === 0 && backs.length === 0) {
			// Wasted throw for opponent. Apply bonus accounting and evaluate.
			const after = wasBonus ? state : endTurn(state)
			total += prob * evaluatePosition(after, perspective, w)
			continue
		}
		for (const m of moves) {
			const r = applyForwardMove(state, m.pieceId, m.option, wasBonus)
			const next = r.state.bonusOwed ? r.state : endTurn(r.state)
			const v = evaluatePosition(next, perspective, w)
			if (v < worstForUs) worstForUs = v
		}
		for (const b of backs) {
			const r = applyBackMove(state, b.pieceId, wasBonus)
			const next = r.state.bonusOwed ? r.state : endTurn(r.state)
			const v = evaluatePosition(next, perspective, w)
			if (v < worstForUs) worstForUs = v
		}
		total += prob * worstForUs
	}
	return total
}

// Score after applying my move, accounting for whether I keep the turn (bonus) or hand it over.
function scoreAfterMyMove(afterState: GameState, perspective: Team, w: EvalWeights): number {
	if (afterState.winner) return evaluatePosition(afterState, perspective, w)
	if (afterState.bonusOwed) {
		// I get another throw — for simplicity, evaluate immediately (don't recurse on my own bonus throws,
		// the static eval already prefers states where bonus is owed).
		return evaluatePosition(afterState, perspective, w)
	}
	// My turn ends. Hand the (effective) state to the opponent's chance node.
	const handoff = endTurn(afterState)
	return chanceOpponentTurn(handoff, perspective, w)
}

export function makeExpectimaxPolicy(weights: EvalWeights = HARD_WEIGHTS): Policy {
	return ({ state, step }: PolicyContext): Decision => {
		const perspective = state.currentTeam as Team
		if (step > 0) {
			const moves = legalForwardMoves(state, step)
			if (moves.length === 0) return null
			const wasBonus = step === 4 || step === 5
			let best = -Infinity
			let bestMove = moves[0]
			for (const m of moves) {
				const after = applyForwardMove(state, m.pieceId, m.option, wasBonus).state
				const v = scoreAfterMyMove(after, perspective, weights)
				if (v > best) { best = v; bestMove = m }
			}
			const sameForPiece = moves.filter((mm) => mm.pieceId === bestMove.pieceId)
			const optionIndex = sameForPiece.findIndex((mm) => mm.option === bestMove.option)
			return { kind: 'forward', pieceId: bestMove.pieceId, optionIndex }
		}
		if (step < 0) {
			const backs = legalBackMoves(state)
			if (backs.length === 0) return null
			let best = -Infinity
			let bestBack = backs[0]
			for (const b of backs) {
				const after = applyBackMove(state, b.pieceId, false).state
				const v = scoreAfterMyMove(after, perspective, weights)
				if (v > best) { best = v; bestBack = b }
			}
			return { kind: 'back', pieceId: bestBack.pieceId }
		}
		return null
	}
}

export const hardPolicy: Policy = makeExpectimaxPolicy(HARD_WEIGHTS)
