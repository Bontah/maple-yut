import { useMemo } from 'react'
import { Mascot } from './Mascot.js'
import { ThrowButton } from './ThrowButton.js'
import type { Team } from '../../game/types.js'
import { MASCOT_NAME_BY_TEAM } from '../../assets/mascots.js'

const TEAM_COLOR: Record<Team, string> = { A: '#d65454', B: '#4a76d6' }
const CONFETTI_COUNT = 32

export interface EndOverlayProps {
  winner: Team
  homeA: number
  homeB: number
  canRematch: boolean
  onRematch: () => void
}

export function EndOverlay({ winner, homeA, homeB, canRematch, onRematch }: EndOverlayProps) {
  const confetti = useMemo(() => {
    const arr: { left: string; delay: string; bg: string }[] = []
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      arr.push({
        left: `${Math.random() * 100}%`,
        delay: `${Math.random() * 1.5}s`,
        bg: TEAM_COLOR[winner]
      })
    }
    return arr
  }, [winner])

  return (
    <div className="end-overlay">
      <div className="confetti">
        {confetti.map((c, i) => (
          <span key={i} style={{ left: c.left, animationDelay: c.delay, background: c.bg }} />
        ))}
      </div>
      <div className="end-overlay__plaque">
        <span className="wood-frame__bracket wood-frame__bracket--tl" />
        <span className="wood-frame__bracket wood-frame__bracket--tr" />
        <span className="wood-frame__bracket wood-frame__bracket--bl" />
        <span className="wood-frame__bracket wood-frame__bracket--br" />
        <h2 className="end-overlay__title">Victory!</h2>
        <div className="mascot-stage">
          <Mascot team={winner} size="hero" bob glow />
        </div>
        <p className="end-overlay__score">
          {MASCOT_NAME_BY_TEAM.A} — {homeA}/4 home · {MASCOT_NAME_BY_TEAM.B} — {homeB}/4 home
        </p>
        {canRematch ? (
          <ThrowButton enabled pulse onClick={onRematch} label="Rematch" />
        ) : (
          <p style={{ opacity: 0.7 }}>Waiting for host to rematch…</p>
        )}
      </div>
    </div>
  )
}
