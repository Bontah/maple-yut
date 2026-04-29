// Connect to YutRoom and bind to YutState reactively.
// Replaces the old usePlayers hook (which was wired for the voice-channel template).

import { Client, Room } from 'colyseus.js'
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useReducer,
	useRef,
	useState,
	type ReactNode
} from 'react'
import { GameName } from '../core/constants.js'
import type { YutPiece } from '../entities/YutPiece.js'
import type { YutPlayer } from '../entities/YutPlayer.js'
import type { YutState } from '../entities/YutState.js'
import { discordSdk, useDiscordSdk } from './useDiscordSdk.js'
import { getUserAvatarUrl, getUserDisplayName } from '../utils/discord.js'
import type { IGuildsMembersRead } from '../core/types.js'

const isEmbedded = new URLSearchParams(window.location.search).get('frame_id') != null

export type BotDifficulty = 'easy' | 'medium' | 'hard'

export type ForcedThrow = 'DO' | 'GAE' | 'GEOL' | 'YUT' | 'MO'

export interface YutGameContextValue {
	room: Room<YutState> | null
	state: YutState | null
	myPlayer: YutPlayer | null
	players: YutPlayer[]
	pieces: YutPiece[]
	connectError: string | null
	// actions
	joinTeam: (team: 'A' | 'B') => void
	addBot: (team: 'A' | 'B', difficulty: BotDifficulty) => void
	startMatch: () => void
	throwSticks: () => void
	spendForward: (pieceId: string, optionIndex: number) => void
	spendBack: (pieceId: string) => void
	usePowerYut: (result: ForcedThrow) => void
	usePowerHorses: (shift: -1 | 1) => void
	rematch: () => void
}

const Ctx = createContext<YutGameContextValue | null>(null)

export function YutGameProvider({ children }: { children: ReactNode }) {
	const value = useYutGameSetup()
	return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useYutGame(): YutGameContextValue {
	const v = useContext(Ctx)
	if (!v) throw new Error('useYutGame must be used inside <YutGameProvider>')
	return v
}

function useYutGameSetup(): YutGameContextValue {
	const { accessToken, session } = useDiscordSdk()
	const [room, setRoom] = useState<Room<YutState> | null>(null)
	const [connectError, setConnectError] = useState<string | null>(null)
	const [, forceRender] = useReducer((x: number) => x + 1, 0)
	const isConnecting = useRef(false)

	const connect = useCallback(async () => {
		if (!session?.user || isConnecting.current) return
		isConnecting.current = true
		try {
			let guildMember: IGuildsMembersRead | null = null
			if (isEmbedded && discordSdk.guildId != null && accessToken) {
				try {
					guildMember = await fetch(
						`https://discord.com/api/users/@me/guilds/${discordSdk.guildId}/member`,
						{ headers: { Authorization: `Bearer ${accessToken}` } }
					).then((r) => r.json())
				} catch {
					guildMember = null
				}
			}

			// In a Discord Activity, traffic is proxied through /.proxy/colyseus.
			// In plain browser dev, the room is on the same host with /colyseus prefix.
			const wsUrl = isEmbedded
				? `wss://${location.host}/.proxy/colyseus`
				: `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/colyseus`
			const client = new Client(wsUrl)

			let roomName = 'Yut Match'
			if (isEmbedded && discordSdk.channelId && discordSdk.guildId) {
				try {
					const channel = await discordSdk.commands.getChannel({ channel_id: discordSdk.channelId })
					if (channel.name) roomName = channel.name
				} catch { /* keep default */ }
			}

			const avatarUri = getUserAvatarUrl({ guildMember, user: session.user })
			const name = getUserDisplayName({ guildMember, user: session.user })

			const newRoom = await client.joinOrCreate<YutState>(GameName, {
				channelId: discordSdk.channelId ?? 'local',
				roomName,
				userId: session.user.id,
				name,
				avatarUri
			})

			// Re-render whenever the schema mutates. State is read directly from newRoom.state
			// so each render sees the latest values via the schema's getters.
			newRoom.onStateChange(() => forceRender())
			newRoom.onError((code, message) => {
				console.error('Colyseus room error', code, message)
				setConnectError(message ?? 'unknown error')
			})

			setRoom(newRoom)
		} catch (e) {
			console.error('Failed to connect to YutRoom', e)
			setConnectError(e instanceof Error ? e.message : String(e))
		} finally {
			isConnecting.current = false
		}
	}, [accessToken, session])

	useEffect(() => {
		if (session?.user && !room) connect()
	}, [session, room, connect])

	const send = useCallback((type: string, payload: object = {}) => {
		room?.send(type, payload)
	}, [room])

	const state = room?.state ?? null
	const players: YutPlayer[] = state ? Array.from(state.players.values()) : []
	const pieces: YutPiece[] = state ? Array.from(state.pieces.values()) : []
	const myPlayer = (room && state)
		? (state.players.get(room.sessionId) ?? null)
		: null

	return {
		room,
		state,
		myPlayer,
		players,
		pieces,
		connectError,
		joinTeam: (team) => send('join_team', { team }),
		addBot: (team, difficulty) => send('add_bot', { team, difficulty }),
		startMatch: () => send('start'),
		throwSticks: () => send('throw'),
		spendForward: (pieceId, optionIndex) => send('spend', { kind: 'forward', pieceId, optionIndex }),
		spendBack: (pieceId) => send('spend', { kind: 'back', pieceId }),
		usePowerYut: (result) => send('use_power_yut', { result }),
		usePowerHorses: (shift) => send('use_power_horses', { shift }),
		rematch: () => send('rematch')
	}
}
