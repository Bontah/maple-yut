// Colyseus schema for the entire Yut Nori match state.
// The pure-TS GameState in src/game/rules.ts is the source of truth; this schema
// is updated in-place from that state to drive Colyseus binary diff sync.

import { MapSchema, Schema, type } from '@colyseus/schema'
import type { GameState } from '../game/rules.js'
import { YutPiece } from './YutPiece.js'
import { YutPlayer } from './YutPlayer.js'

export type Phase = 'lobby' | 'await_throw' | 'await_spend' | 'ended'

export interface YutStateOptions {
	roomName: string
	channelId: string
}

export class YutState extends Schema {
	@type({ map: YutPlayer })
	public players = new MapSchema<YutPlayer>()

	@type({ map: YutPiece })
	public pieces = new MapSchema<YutPiece>()

	@type('string')
	public roomName!: string

	@type('string')
	public channelId!: string

	@type('string')
	public phase: Phase = 'lobby'

	@type('string')
	public currentTeam: string = 'A'   // 'A' | 'B'

	@type('number')
	public pendingStep: number = 0     // 0 if none pending; non-zero = the step value to spend

	@type('string')
	public lastThrowResult: string = '' // '' or one of the StickResult names; for animation

	@type('boolean')
	public bonusOwed: boolean = false

	@type('string')
	public winner: string = ''         // '' | 'A' | 'B'

	@type('string')
	public mode: string = 'maple'      // 'maple' | 'traditional'

	@type('string')
	public hostSessionId: string = ''  // session of the first joiner; only host can start / add bots

	// Maple psychic powers — 2 per team in 'maple' mode, 0 in 'traditional'.
	@type('number')
	public powersRemainingA: number = 0

	@type('number')
	public powersRemainingB: number = 0

	@type('boolean')
	public powerUsedThisTurn: boolean = false   // resets on endTurn

	constructor(opts?: YutStateOptions) {
		super()
		if (opts) {
			this.roomName = opts.roomName
			this.channelId = opts.channelId
		}
	}

	// Initialize the 8 piece schemas from a fresh game state.
	public initPieces(game: GameState): void {
		this.pieces.clear()
		for (const p of Object.values(game.pieces)) {
			const schema = new YutPiece(p.team, p.id)
			schema.syncFrom(p)
			this.pieces.set(p.id, schema)
		}
	}

	// Sync mutable fields from the pure-TS game state. Pieces are matched by id.
	public syncFromGame(game: GameState): void {
		this.currentTeam = game.currentTeam
		this.pendingStep = game.pendingStep ?? 0
		this.bonusOwed = game.bonusOwed
		this.winner = game.winner ?? ''
		for (const p of Object.values(game.pieces)) {
			let s = this.pieces.get(p.id)
			if (!s) {
				s = new YutPiece(p.team, p.id)
				this.pieces.set(p.id, s)
			}
			s.syncFrom(p)
		}
	}
}
