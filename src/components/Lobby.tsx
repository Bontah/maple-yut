import { type BotDifficulty, useYutGame } from '../hooks/useYutGame.js'

export function Lobby() {
	const { state, myPlayer, players, joinTeam, addBot, startMatch } = useYutGame()
	if (!state || !myPlayer) return <div className="lobby">Connecting…</div>

	const seatA = players.find((p) => p.team === 'A')
	const seatB = players.find((p) => p.team === 'B')
	const spectators = players.filter((p) => p.team === '')
	const isHost = myPlayer.sessionId === state.hostSessionId
	const canStart = isHost && Boolean(seatA) && Boolean(seatB)

	return (
		<div className="lobby">
			<h1>Yut Nori</h1>
			<p className="lobby__roomname">Room: {state.roomName || '—'}</p>

			<div className="lobby__seats">
				<Seat label="Team A (red)" player={seatA} mySeat={myPlayer.team === 'A'}
					onJoin={() => joinTeam('A')}
					onAddBot={isHost ? (d) => addBot('A', d) : undefined}
					accent="#e15050" />
				<div className="lobby__vs">vs</div>
				<Seat label="Team B (blue)" player={seatB} mySeat={myPlayer.team === 'B'}
					onJoin={() => joinTeam('B')}
					onAddBot={isHost ? (d) => addBot('B', d) : undefined}
					accent="#4a76d6" />
			</div>

			{spectators.length > 0 && (
				<div className="lobby__spectators">
					Watching: {spectators.map((p) => p.name).join(', ')}
				</div>
			)}

			<div className="lobby__actions">
				<button onClick={startMatch} disabled={!canStart}>
					{isHost ? (canStart ? 'Start Match' : 'Waiting for both seats…') : 'Only host can start'}
				</button>
			</div>

			<details className="lobby__hint">
				<summary>How to test locally</summary>
				<p>Open this same URL in another browser tab — each tab gets a different mock user. One tab joins Team A, the other joins Team B, then the first tab starts.</p>
			</details>
		</div>
	)
}

interface SeatProps {
	label: string
	player: { name: string; isBot: boolean } | undefined
	mySeat: boolean
	onJoin: () => void
	onAddBot?: (difficulty: BotDifficulty) => void
	accent: string
}

function Seat({ label, player, mySeat, onJoin, onAddBot, accent }: SeatProps) {
	return (
		<div className="lobby__seat" style={{ borderColor: accent }}>
			<div className="lobby__seat-label" style={{ color: accent }}>{label}</div>
			{player ? (
				<div className="lobby__seat-occupant">
					{player.name}{mySeat ? ' ← you' : ''}
				</div>
			) : (
				<div className="lobby__seat-buttons">
					<button onClick={onJoin}>Join</button>
					{onAddBot && (
						<div className="lobby__bot-buttons">
							<span className="lobby__bot-label">Add bot:</span>
							<button onClick={() => onAddBot('easy')}>Easy</button>
							<button onClick={() => onAddBot('medium')}>Medium</button>
							<button onClick={() => onAddBot('hard')}>Hard</button>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
