// Heuristic policies (easy / medium) and shared evaluator.
//
// The eval function computes a score for a GameState from the perspective of one team.
// Higher = better for that team. Captures, stacking, scoring are all expressed implicitly
// through these components:
//
//   homePoint      × (my home pieces − opponent home pieces)
//   progressPoint  × Σ progress-toward-home across all pieces (mine + / opponent −)
//   exposurePenalty× number of my pieces a single opponent throw could capture next turn
//   bonusOwedBonus when state.bonusOwed && state.currentTeam === perspective
//
// Capture is reflected via opponent progress collapsing to 0 when sent back to start.

import { ALL_STATIONS, FORWARD } from '../board.js'
import {
	applyBackMove,
	applyForwardMove,
	legalBackMoves,
	legalForwardMoves,
	type GameState
} from '../rules.js'
import { HOME, isHome, START, type Team } from '../types.js'
import { blunder, randomPolicy, type Decision, type Policy, type PolicyContext } from '../engine.js'

// ---------- precomputed distance tables ----------

// Shortest forward distance from a station to HOME (using optimal shortcuts).
const DIST_TO_HOME: Record<number, number> = computeDistToHome()
const MAX_DIST = DIST_TO_HOME[START] // largest "remaining distance" — used to define progress

// Shortest forward distance from a → b (capped at MAX_FORWARD_LOOKUP). undefined if unreachable in cap.
const MAX_FORWARD_LOOKUP = 5
const FORWARD_DIST: Record<number, Record<number, number>> = computeForwardDistTable(MAX_FORWARD_LOOKUP)

function computeDistToHome(): Record<number, number> {
	const dist: Record<number, number> = {}
	for (const s of ALL_STATIONS) dist[s] = Number.POSITIVE_INFINITY
	dist[HOME] = 0
	let changed = true
	while (changed) {
		changed = false
		for (const s of ALL_STATIONS) {
			const e = FORWARD[s]
			const candidates = [dist[e.next] + 1]
			if (e.alt !== undefined) candidates.push(dist[e.alt] + 1)
			const newDist = Math.min(...candidates)
			if (newDist < dist[s]) {
				dist[s] = newDist
				changed = true
			}
		}
	}
	return dist
}

function computeForwardDistTable(maxDepth: number): Record<number, Record<number, number>> {
	const out: Record<number, Record<number, number>> = {}
	for (const start of ALL_STATIONS) {
		const local: Record<number, number> = { [start]: 0 }
		const queue: [number, number][] = [[start, 0]]
		while (queue.length > 0) {
			const [s, d] = queue.shift()!
			if (d >= maxDepth) continue
			const e = FORWARD[s]
			if (!e || s === HOME) continue
			const nexts = e.alt !== undefined ? [e.next, e.alt] : [e.next]
			for (const n of nexts) {
				if (n === HOME) continue
				if (local[n] === undefined || d + 1 < local[n]) {
					local[n] = d + 1
					queue.push([n, d + 1])
				}
			}
		}
		out[start] = local
	}
	return out
}

// ---------- weights ----------

export interface EvalWeights {
	homePoint: number
	progressPoint: number
	exposurePenalty: number
	bonusOwedBonus: number
}

export const EASY_WEIGHTS: EvalWeights = {
	homePoint: 30,
	progressPoint: 1,
	exposurePenalty: 0,    // easy AI ignores threat
	bonusOwedBonus: 0
}

export const MEDIUM_WEIGHTS: EvalWeights = {
	homePoint: 100,
	progressPoint: 2,
	exposurePenalty: 6,
	bonusOwedBonus: 5
}

export const HARD_WEIGHTS: EvalWeights = MEDIUM_WEIGHTS  // expectimax adds the smarts

// ---------- evaluator ----------

export function evaluatePosition(state: GameState, perspective: Team, w: EvalWeights): number {
	let myHome = 0, oppHome = 0
	let myProgress = 0, oppProgress = 0
	let myExposure = 0

	const allPieces = Object.values(state.pieces)
	const myPieces = allPieces.filter((p) => p.team === perspective)
	const oppPieces = allPieces.filter((p) => p.team !== perspective)

	for (const p of myPieces) {
		if (isHome(p)) { myHome++; continue }
		const stn = p.path.length === 0 ? START : p.path[p.path.length - 1]
		myProgress += MAX_DIST - DIST_TO_HOME[stn]
	}
	for (const p of oppPieces) {
		if (isHome(p)) { oppHome++; continue }
		const stn = p.path.length === 0 ? START : p.path[p.path.length - 1]
		oppProgress += MAX_DIST - DIST_TO_HOME[stn]
	}

	if (w.exposurePenalty > 0) {
		for (const my of myPieces) {
			if (isHome(my) || my.path.length === 0) continue
			const myStn = my.path[my.path.length - 1]
			for (const op of oppPieces) {
				if (isHome(op) || op.path.length === 0) continue
				const oppStn = op.path[op.path.length - 1]
				const d = FORWARD_DIST[oppStn]?.[myStn]
				if (d !== undefined && d >= 1 && d <= MAX_FORWARD_LOOKUP) {
					myExposure++
					break  // only count each of MY pieces once even if multiple opponents threaten
				}
			}
		}
	}

	let score = 0
	score += w.homePoint * (myHome - oppHome)
	score += w.progressPoint * (myProgress - oppProgress)
	score -= w.exposurePenalty * myExposure
	if (state.bonusOwed && state.currentTeam === perspective) score += w.bonusOwedBonus

	// Winning is terminal; clamp to a huge value so search prefers the win immediately.
	if (state.winner === perspective) score += 100_000
	if (state.winner && state.winner !== perspective) score -= 100_000

	return score
}

// ---------- policies ----------

// Greedy policy: pick the move that maximizes the eval of the resulting state.
// `randomTiebreak`: if true, choose uniformly among moves within `tieEps` of the best score
// (used to give "easy" some non-determinism).
export function makeHeuristicPolicy(weights: EvalWeights, opts: { randomTiebreak?: boolean; tieEps?: number } = {}): Policy {
	const tieEps = opts.tieEps ?? 1
	return ({ state, step, rng }: PolicyContext): Decision => {
		if (step > 0) {
			const moves = legalForwardMoves(state, step)
			if (moves.length === 0) return null
			const wasBonusThrow = step === 4 || step === 5
			const scored = moves.map((m) => {
				const after = applyForwardMove(state, m.pieceId, m.option, wasBonusThrow).state
				return { m, score: evaluatePosition(after, state.currentTeam as Team, weights) }
			})
			const best = pickBest(scored, opts.randomTiebreak ?? false, tieEps, rng)
			const sameForPiece = moves.filter((mm) => mm.pieceId === best.m.pieceId)
			const optionIndex = sameForPiece.findIndex((mm) => mm.option === best.m.option)
			return { kind: 'forward', pieceId: best.m.pieceId, optionIndex }
		}
		if (step < 0) {
			const backs = legalBackMoves(state)
			if (backs.length === 0) return null
			const scored = backs.map((b) => {
				const after = applyBackMove(state, b.pieceId, false).state
				return { b, score: evaluatePosition(after, state.currentTeam as Team, weights) }
			})
			const best = pickBestBack(scored, opts.randomTiebreak ?? false, tieEps, rng)
			return { kind: 'back', pieceId: best.b.pieceId }
		}
		return null
	}
}

function pickBest<T extends { score: number }>(
	items: T[],
	randomTiebreak: boolean,
	tieEps: number,
	rng: { nextInt: (n: number) => number }
): T {
	let best = items[0]
	for (const it of items) if (it.score > best.score) best = it
	if (!randomTiebreak) return best
	const tied = items.filter((it) => it.score >= best.score - tieEps)
	return tied[rng.nextInt(tied.length)]
}

function pickBestBack<T extends { score: number }>(
	items: T[],
	randomTiebreak: boolean,
	tieEps: number,
	rng: { nextInt: (n: number) => number }
): T {
	return pickBest(items, randomTiebreak, tieEps, rng)
}

// ---------- presets ----------

// Easy = greedy heuristic, but blunders to a random legal move ~half the time.
// This produces "beginner mistakes" rather than "consistently bad strategy".
export const easyPolicy: Policy = blunder(makeHeuristicPolicy(EASY_WEIGHTS), 0.5, randomPolicy)
export const mediumPolicy: Policy = makeHeuristicPolicy(MEDIUM_WEIGHTS)
