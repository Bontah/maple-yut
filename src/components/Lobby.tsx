import { Mascot } from './board/Mascot.js'
import { ThrowButton } from './board/ThrowButton.js'
import { WoodFrame } from './board/WoodFrame.js'
import { type BotDifficulty, useYutGame } from '../hooks/useYutGame.js'
import type { Team } from '../game/types.js'
import './lobby.css'

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
      <h1 className="lobby__title">Yut Wars</h1>
      <p className="lobby__subtitle">Room: {state.roomName || '—'}</p>

      <div className="lobby__seats">
        <Seat
          team="A"
          player={seatA}
          mySeat={myPlayer.team === 'A'}
          onJoin={() => joinTeam('A')}
          onAddBot={isHost ? (d) => addBot('A', d) : undefined}
        />
        <div className="lobby__vs">VS</div>
        <Seat
          team="B"
          player={seatB}
          mySeat={myPlayer.team === 'B'}
          onJoin={() => joinTeam('B')}
          onAddBot={isHost ? (d) => addBot('B', d) : undefined}
        />
      </div>

      {spectators.length > 0 && (
        <div className="lobby__spectators">
          Watching: {spectators.map((p) => p.name).join(', ')}
        </div>
      )}

      <div style={{ margin: '24px 0' }}>
        {isHost ? (
          <ThrowButton
            enabled={canStart}
            onClick={startMatch}
            label={canStart ? 'Start Match' : 'Waiting for both seats…'}
          />
        ) : (
          <button className="wood-button" disabled>Only host can start</button>
        )}
      </div>

      <details className="lobby__hint">
        <summary>How to test locally</summary>
        <p>Open this same URL in another browser tab — each tab gets a different mock user. One tab joins Team A, the other joins Team B, then the first tab starts.</p>
      </details>
    </div>
  )
}

interface SeatProps {
  team: Team
  player: { name: string; isBot: boolean } | undefined
  mySeat: boolean
  onJoin: () => void
  onAddBot?: (difficulty: BotDifficulty) => void
}

function Seat({ team, player, mySeat, onJoin, onAddBot }: SeatProps) {
  const teamColor = team === 'A' ? 'var(--team-a)' : 'var(--team-b)'
  return (
    <WoodFrame
      className="lobby__seat"
      style={{ ['--team' as string]: teamColor } as React.CSSProperties}
    >
      <div className="mascot-stage" style={{ height: 110 }}>
        <span className={player ? '' : 'lobby__seat-mascot--silhouette'}>
          <Mascot team={team} size="hero" />
        </span>
      </div>
      {player ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div className="name-plate" style={{ ['--team' as string]: teamColor } as React.CSSProperties}>
            <span>{player.name}{mySeat ? ' (you)' : ''}</span>
          </div>
        </div>
      ) : (
        <div className="lobby__seat-empty">
          <ThrowButton enabled onClick={onJoin} label="Join" />
          {onAddBot && (
            <div className="lobby__bot-buttons">
              <span>Add bot:</span>
              <button className="wood-button" onClick={() => onAddBot('easy')}>Easy</button>
              <button className="wood-button" onClick={() => onAddBot('medium')}>Medium</button>
              <button className="wood-button" onClick={() => onAddBot('hard')}>Hard</button>
            </div>
          )}
        </div>
      )}
    </WoodFrame>
  )
}
