// Colyseus schema for a single mal (piece) on the board.
// Mirrors the pure-TS Piece in src/game/types.ts but is decorated for binary diff sync.

import { ArraySchema, Schema, type } from '@colyseus/schema'
import { HOME, START, type Piece } from '../game/types.js'

export class YutPiece extends Schema {
	@type('string')
	public team!: string         // 'A' | 'B'

	@type('string')
	public pieceId!: string      // 'A1'..'A4' | 'B1'..'B4'

	@type('number')
	public station: number = START   // current station; -1 (HOME) means scored

	@type(['number'])
	public path = new ArraySchema<number>()

	@type('boolean')
	public isHome: boolean = false

	constructor(team?: string, pieceId?: string) {
		super()
		if (team !== undefined) this.team = team
		if (pieceId !== undefined) this.pieceId = pieceId
	}

	// Mutate this schema to mirror the supplied pure-TS piece. In-place mutation
	// is what produces efficient Colyseus deltas.
	public syncFrom(p: Piece): void {
		this.team = p.team
		this.pieceId = p.id
		this.station = p.path.length === 0 ? START : p.path[p.path.length - 1]
		this.isHome = this.station === HOME
		// Replace path contents in-place
		this.path.clear()
		for (const s of p.path) this.path.push(s)
	}
}
