import type { ReactNode } from 'react'
import { Mascot } from './Mascot.js'
import { PiecesStrip } from './PiecesStrip.js'
import { PowersPanel, type ForcedThrow } from './PowersPanel.js'
import { WoodFrame } from './WoodFrame.js'
import type { YutPiece } from '../../entities/YutPiece.js'
import type { YutPlayer } from '../../entities/YutPlayer.js'
import type { YutState } from '../../entities/YutState.js'
import type { Team } from '../../game/types.js'

const TEAM_COLOR: Record<Team, string> = { A: '#d65454', B: '#4a76d6' }
const TEAM_SPOT: Record<Team, string>  = {
  A: 'rgba(214, 84, 84, 0.18)',
  B: 'rgba(74, 118, 214, 0.18)'
}

export interface PlayerPanelProps {
  team: Team
  player: YutPlayer | undefined
  state: YutState
  pieces: YutPiece[]
  isViewerOwnPanel: boolean
  isActive: boolean       // is this team currently the acting team?
  myTeam: Team | ''
  powersRemaining: number
  // Strip interaction (only the viewer's own panel binds these)
  movablePieceIds?: Set<string>
  selectedPieceId?: string | null
  onSlotClick?: (pieceId: string) => void
  onYut?: (result: ForcedThrow) => void
  onHorses?: (shift: -1 | 1) => void
  children?: ReactNode  // slot for SticksTray + ThrowButton on viewer's panel
}

export function PlayerPanel({
  team, player, state, pieces, isViewerOwnPanel, isActive, myTeam, powersRemaining,
  movablePieceIds, selectedPieceId, onSlotClick,
  onYut, onHorses, children
}: PlayerPanelProps) {
  const teamColor = TEAM_COLOR[team]
  const showHalo = isActive
  const captionText = isActive ? (isViewerOwnPanel ? 'YOUR TURN' : 'THEIR TURN') : 'WAITING'
  const captionMod = isActive ? 'active' : 'waiting'

  return (
    <WoodFrame
      inactive={!isActive}
      style={{
        ['--team' as string]: teamColor,
        ['--mascot-spot' as string]: TEAM_SPOT[team]
      } as React.CSSProperties}
    >
      <div className="mascot-stage">
        <Mascot team={team} size="hero" bob={isActive} glow={isActive} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div className={`name-plate${showHalo ? ' name-plate--active' : ''}`}>
          {player?.avatarUri ? (
            <img
              className="name-plate__avatar"
              src={player.avatarUri}
              alt={player.name || team}
            />
          ) : (
            <span className="name-plate__avatar" aria-hidden="true" />
          )}
          <span>{player?.name ?? `Team ${team}`}{isViewerOwnPanel ? ' (you)' : ''}</span>
        </div>
      </div>
      <p className={`your-turn-caption your-turn-caption--${captionMod}`}>{captionText}</p>

      <PiecesStrip
        pieces={pieces}
        team={team}
        isInteractive={isViewerOwnPanel}
        movablePieceIds={movablePieceIds}
        selectedPieceId={selectedPieceId}
        onSlotClick={onSlotClick}
      />

      <hr style={{ border: 'none', borderTop: '1px solid var(--wood-rim)', margin: '12px 0 6px' }} />

      <PowersPanel
        state={state}
        myTeam={myTeam}
        powersRemaining={powersRemaining}
        onYut={onYut ?? (() => {})}
        onHorses={onHorses ?? (() => {})}
      />

      {children}
    </WoodFrame>
  )
}
