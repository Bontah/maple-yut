// Yut Nori game rules: state, move application, capture, stacking, win check.
//
// Design notes:
//   - Each piece carries its own `path` (history of stations). Last entry is current.
//     Empty path = piece is still at start. Path ending in HOME = piece has scored.
//   - Stacking is implicit: any teammate pieces sharing a station travel together.
//     When the player picks a piece to move, every teammate at the same source station
//     receives the same path extension.
//   - Capture: landing on opposing pieces sends ALL of them (the whole stack) back to start.
//   - Bonus throw is owed when the throw was Yut/Mo OR the move captured anyone.

import { applyBack, canAcceptBack, enumerateForward, type MoveOption } from './board.js'
import { HOME, isHome, pieceStation, START, type Piece, type Team } from './types.js'

export interface GameState {
	pieces: Record<string, Piece>
	currentTeam: Team
	pendingStep: number | null   // null = needs a throw; non-null = needs a spend
	bonusOwed: boolean           // true after Yut/Mo throw or capture; current team throws again
	winner: Team | null
}

export function initialState(starting: Team = 'A'): GameState {
	const pieces: Record<string, Piece> = {}
	for (const t of ['A', 'B'] as const) {
		for (let i = 1; i <= 4; i++) {
			pieces[`${t}${i}`] = { team: t, id: `${t}${i}`, path: [] }
		}
	}
	return { pieces, currentTeam: starting, pendingStep: null, bonusOwed: false, winner: null }
}

// Enumerate all (pieceId, option) pairs the current player could legally choose
// when spending a forward step. Pieces already home are excluded.
// Multiple pieces in the same stack will produce duplicate-looking moves; that is fine
// (any of them resolves to the same stack movement).
export interface LegalForwardMove {
	pieceId: string
	option: MoveOption
}

export function legalForwardMoves(state: GameState, step: number): LegalForwardMove[] {
	if (step <= 0) throw new Error(`legalForwardMoves expects positive step, got ${step}`)
	const out: LegalForwardMove[] = []
	for (const piece of Object.values(state.pieces)) {
		if (piece.team !== state.currentTeam) continue
		if (isHome(piece)) continue
		const opts = enumerateForward(piece, step)
		for (const opt of opts) {
			out.push({ pieceId: piece.id, option: opt })
		}
	}
	return out
}

// Pieces that can absorb a back-do (-1). A piece at start cannot move back.
export interface LegalBackMove {
	pieceId: string
	newPath: number[]
}

export function legalBackMoves(state: GameState): LegalBackMove[] {
	const out: LegalBackMove[] = []
	for (const piece of Object.values(state.pieces)) {
		if (piece.team !== state.currentTeam) continue
		if (!canAcceptBack(piece)) continue
		out.push({ pieceId: piece.id, newPath: applyBack(piece) })
	}
	return out
}

export interface MoveResult {
	state: GameState
	movedPieceIds: string[]
	capturedPieceIds: string[]
	scoredPieceIds: string[]
	bonusGranted: boolean
}

// Apply a forward move: piece (and any same-team stackmates at its source)
// follow the chosen path. Resolve capture and home-scoring.
// `wasBonusThrow` indicates the spent step was from a Yut/Mo (which grants another throw).
export function applyForwardMove(
	state: GameState,
	pieceId: string,
	option: MoveOption,
	wasBonusThrow: boolean
): MoveResult {
	const moving = state.pieces[pieceId]
	if (!moving) throw new Error(`Unknown pieceId: ${pieceId}`)
	if (moving.team !== state.currentTeam) throw new Error(`Piece ${pieceId} is not the current team's`)
	if (isHome(moving)) throw new Error(`Piece ${pieceId} is already home`)

	const fromStation = pieceStation(moving)
	const newPieces: Record<string, Piece> = { ...state.pieces }

	// Find the whole stack at fromStation (same team, same current station).
	// Exception: pieces still at start (empty path) are "off-board" and do not stack
	// with each other — they enter the board one at a time. Only the moving piece
	// itself is included if its path is empty.
	const stackmates = Object.values(state.pieces).filter((p) => {
		if (p.team !== moving.team) return false
		if (isHome(p)) return false
		if (p.id === moving.id) return true
		if (p.path.length === 0) return false
		return pieceStation(p) === fromStation
	})
	const movedIds: string[] = []
	for (const p of stackmates) {
		newPieces[p.id] = { ...p, path: [...option.endPath] }
		movedIds.push(p.id)
	}

	// Resolve capture: any opponent pieces standing at the destination (non-HOME).
	let capturedIds: string[] = []
	if (option.endStation !== HOME) {
		const opponents = Object.values(newPieces).filter(
			(p) => p.team !== moving.team && !isHome(p) && pieceStation(p) === option.endStation
		)
		capturedIds = opponents.map((p) => p.id)
		for (const op of opponents) {
			newPieces[op.id] = { ...op, path: [] }
		}
	}

	const scoredIds = option.endStation === HOME ? movedIds.slice() : []
	const bonus = wasBonusThrow || capturedIds.length > 0

	const newState: GameState = {
		...state,
		pieces: newPieces,
		pendingStep: null,
		bonusOwed: bonus,
		winner: detectWinner({ ...state, pieces: newPieces })
	}

	return {
		state: newState,
		movedPieceIds: movedIds,
		capturedPieceIds: capturedIds,
		scoredPieceIds: scoredIds,
		bonusGranted: bonus
	}
}

// Apply a back-do move on a chosen piece. Same-team stackmates at the same station travel back too.
export function applyBackMove(
	state: GameState,
	pieceId: string,
	wasBonusThrow: boolean
): MoveResult {
	const moving = state.pieces[pieceId]
	if (!moving) throw new Error(`Unknown pieceId: ${pieceId}`)
	if (!canAcceptBack(moving)) throw new Error(`Piece ${pieceId} cannot accept back-do`)

	const fromStation = pieceStation(moving)
	const newPath = applyBack(moving)
	const newPieces: Record<string, Piece> = { ...state.pieces }

	// Stackmates exclude off-board pieces (see applyForwardMove for rationale).
	const stackmates = Object.values(state.pieces).filter((p) => {
		if (p.team !== moving.team) return false
		if (isHome(p)) return false
		if (p.id === moving.id) return true
		if (p.path.length === 0) return false
		return pieceStation(p) === fromStation
	})
	const movedIds: string[] = []
	for (const p of stackmates) {
		newPieces[p.id] = { ...p, path: [...newPath] }
		movedIds.push(p.id)
	}

	const newStation = newPath.length === 0 ? START : newPath[newPath.length - 1]

	let capturedIds: string[] = []
	if (newStation !== HOME && newStation !== START) {
		const opponents = Object.values(newPieces).filter(
			(p) => p.team !== moving.team && !isHome(p) && pieceStation(p) === newStation
		)
		capturedIds = opponents.map((p) => p.id)
		for (const op of opponents) {
			newPieces[op.id] = { ...op, path: [] }
		}
	}

	const bonus = wasBonusThrow || capturedIds.length > 0

	const newState: GameState = {
		...state,
		pieces: newPieces,
		pendingStep: null,
		bonusOwed: bonus,
		winner: detectWinner({ ...state, pieces: newPieces })
	}

	return {
		state: newState,
		movedPieceIds: movedIds,
		capturedPieceIds: capturedIds,
		scoredPieceIds: [],
		bonusGranted: bonus
	}
}

export function detectWinner(state: Pick<GameState, 'pieces'>): Team | null {
	for (const team of ['A', 'B'] as const) {
		const teamPieces = Object.values(state.pieces).filter((p) => p.team === team)
		if (teamPieces.every(isHome)) return team
	}
	return null
}

// Switch turn to the other team and clear bonus.
export function endTurn(state: GameState): GameState {
	return {
		...state,
		currentTeam: state.currentTeam === 'A' ? 'B' : 'A',
		pendingStep: null,
		bonusOwed: false
	}
}
