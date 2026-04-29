// Shared game types for Yut Nori.

export type Team = 'A' | 'B'

export const HOME = -1 as const
export const START = 0 as const

// One of the four mal (말, "horse") belonging to a team.
// `path` is the trail of stations visited; the last entry is the current station.
// An empty path means the piece is still at start (has not entered the board).
// `path = [HOME]` means the piece has scored and is off the board.
export interface Piece {
	team: Team
	id: string         // 'A1' | 'A2' | ... | 'B4'
	path: number[]     // history of stations; last is current
}

export function pieceStation(piece: Piece): number {
	if (piece.path.length === 0) return START
	return piece.path[piece.path.length - 1]
}

export function isHome(piece: Piece): boolean {
	return piece.path[piece.path.length - 1] === HOME
}

// One named outcome of a stick throw.
export type StickResult = 'BACK_DO' | 'DO' | 'GAE' | 'GEOL' | 'YUT' | 'MO'

export const STICK_STEPS: Record<StickResult, number> = {
	BACK_DO: -1,
	DO: 1,
	GAE: 2,
	GEOL: 3,
	YUT: 4,
	MO: 5
}

export const STICK_GRANTS_BONUS: Record<StickResult, boolean> = {
	BACK_DO: false,
	DO: false,
	GAE: false,
	GEOL: false,
	YUT: true,
	MO: true
}
