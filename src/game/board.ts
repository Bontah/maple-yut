// Yut Nori board: 29 stations (0-28) + HOME (-1).
//
// Layout (stations clockwise around the perimeter, then diagonals):
//   0  = SW corner / start
//   1..4 = south side perimeter
//   5  = SE corner (shortcut entry into diagonal-2)
//   6..9 = east side perimeter
//   10 = NE corner (shortcut entry into diagonal-1)
//   11..14 = north side perimeter
//   15 = NW corner
//   16..19 = west side perimeter
//   20-21 = diagonal-1 inner (NE → center)
//   22 = center (shared by both diagonals)
//   23-24 = diagonal-1 inner (center → SW)
//   25-26 = diagonal-2 inner (SE → center)
//   27-28 = diagonal-2 inner (center → NW)
//
// Forward direction is "toward home". Each station has one default next station,
// and a few stations have an alternative ("alt") shortcut next.
// Stations 5, 10, and 22 are the three intersection points where the player chooses.

import { HOME, START, type Piece } from './types.js'

export interface Edges {
	next: number  // default forward step
	alt?: number  // optional alternative forward step
}

// Forward edges (toward HOME). Order matters only for reading clarity.
export const FORWARD: Record<number, Edges> = {
	0: { next: 1 },
	1: { next: 2 },
	2: { next: 3 },
	3: { next: 4 },
	4: { next: 5 },
	5: { next: 6, alt: 25 },        // SE corner: alt enters diagonal-2
	6: { next: 7 },
	7: { next: 8 },
	8: { next: 9 },
	9: { next: 10 },
	10: { next: 11, alt: 20 },      // NE corner: alt enters diagonal-1
	11: { next: 12 },
	12: { next: 13 },
	13: { next: 14 },
	14: { next: 15 },
	15: { next: 16 },               // NW corner: no shortcut (would lead away from home)
	16: { next: 17 },
	17: { next: 18 },
	18: { next: 19 },
	19: { next: HOME },             // last perimeter station; one more step exits
	20: { next: 21 },
	21: { next: 22 },
	22: { next: 23, alt: 27 },      // center: default toward SW (home), alt toward NW
	23: { next: 24 },
	24: { next: HOME },             // SW exit from diagonal-1
	25: { next: 26 },
	26: { next: 22 },
	27: { next: 28 },
	28: { next: 15 }
}

export const ALL_STATIONS: number[] = Object.keys(FORWARD).map(Number)
export const SHORTCUT_STATIONS: number[] = ALL_STATIONS.filter((s) => FORWARD[s].alt !== undefined)

// Result of a single hypothetical forward path.
export interface MoveOption {
	endPath: number[]      // the piece's new full path (including the prefix it started with)
	endStation: number     // convenience: last entry of endPath (HOME if scored)
}

// Enumerate every distinct forward path of exactly `steps` (>0) starting from `piece`.
// The piece's existing `path` is the prefix; we append `steps` stations.
// Branches at intersections (stations with `alt`) are explored.
export function enumerateForward(piece: Piece, steps: number): MoveOption[] {
	if (steps <= 0) throw new Error(`enumerateForward expects positive steps, got ${steps}`)
	const out: MoveOption[] = []
	const startStation = piece.path.length === 0 ? START : piece.path[piece.path.length - 1]
	const dfs = (station: number, remaining: number, suffix: number[]) => {
		if (station === HOME) {
			// Already scored mid-path; can't continue.
			if (remaining === 0) out.push({ endPath: [...piece.path, ...suffix], endStation: HOME })
			return
		}
		if (remaining === 0) {
			out.push({ endPath: [...piece.path, ...suffix], endStation: station })
			return
		}
		const edges = FORWARD[station]
		if (!edges) return
		// Maple Story rule 1: a piece can only take a shortcut (alt edge) if it STARTS
		// its move at the intersection. Passing through 5, 10, or 22 mid-move follows
		// the default next edge — no branching.
		const isFirstStep = station === startStation

		// Maple Story rule 2: the edge 22 → 23 (center toward SW/home exit) is gated.
		// Only pieces whose move STARTED at center 22 or anywhere on diagonal-1 (10/20/21)
		// may traverse it. Pieces from diagonal-2 (5/25/26) can reach 22 but must STOP
		// there — they can't continue to 23/24/HOME in the same move.
		const SW_GATE_STARTS = startStation === 22 || startStation === 21 || startStation === 20 || startStation === 10
		const blockSwGate = station === 22 && edges.next === 23 && !SW_GATE_STARTS

		const candidates: number[] = []
		if (!blockSwGate) candidates.push(edges.next)
		if (isFirstStep && edges.alt !== undefined) candidates.push(edges.alt)
		for (const n of candidates) {
			dfs(n, remaining - 1, [...suffix, n])
		}
	}
	dfs(startStation, steps, [])
	return out
}

// Apply a single back-do (-1) step. Returns the new path.
// Rules:
//   - If the piece is still at start (empty path), it cannot move back — return unchanged.
//   - If the piece is HOME (scored), back-do cannot resurrect it — return unchanged.
//   - Otherwise, pop one entry from the path. The new current station is the previous one
//     (or START if the path becomes empty).
export function applyBack(piece: Piece): number[] {
	if (piece.path.length === 0) return piece.path
	const last = piece.path[piece.path.length - 1]
	if (last === HOME) return piece.path
	return piece.path.slice(0, -1)
}

// Convenience predicate.
export function canAcceptBack(piece: Piece): boolean {
	if (piece.path.length === 0) return false
	return piece.path[piece.path.length - 1] !== HOME
}
