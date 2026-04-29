// Colyseus schema for a player in a Yut match.
// One YutPlayer per connected human (or one virtual entry for a bot).

import { Schema, type } from '@colyseus/schema'

export type TYutPlayerOptions = {
	sessionId: string
	userId: string
	name: string
	avatarUri: string
	isBot?: boolean
}

export class YutPlayer extends Schema {
	@type('string')
	public sessionId!: string

	@type('string')
	public userId!: string

	@type('string')
	public name!: string

	@type('string')
	public avatarUri!: string

	@type('string')
	public team: string = ''   // '' = unassigned/spectator, 'A' or 'B' once seated

	@type('boolean')
	public isBot: boolean = false

	@type('string')
	public botDifficulty: string = ''   // '' for humans, 'easy' | 'medium' | 'hard' for bots

	@type('boolean')
	public ready: boolean = false

	constructor(opts?: TYutPlayerOptions) {
		super()
		if (opts) {
			this.sessionId = opts.sessionId
			this.userId = opts.userId
			this.name = opts.name
			this.avatarUri = opts.avatarUri
			this.isBot = opts.isBot ?? false
		}
	}
}
