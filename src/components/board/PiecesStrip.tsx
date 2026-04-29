import { Mascot } from './Mascot.js'
import { derivePieceSlots } from './pieceSlots.js'
import type { YutPiece } from '../../entities/YutPiece.js'
import type { Team } from '../../game/types.js'

export interface PiecesStripProps {
  pieces: Iterable<YutPiece>
  team: Team
  // When the strip is showing the viewer's own team and we're in await_spend,
  // these props let the strip act as a click target equivalent to clicking the
  // piece on the board.
  isInteractive?: boolean
  movablePieceIds?: Set<string>
  selectedPieceId?: string | null
  onSlotClick?: (pieceId: string) => void
}

export function PiecesStrip({
  pieces, team,
  isInteractive = false, movablePieceIds, selectedPieceId, onSlotClick
}: PiecesStripProps) {
  const slots = derivePieceSlots(pieces, team)
  const homeCount = slots.filter((s) => s.state === 'home').length

  return (
    <div>
      <p className="pieces-strip__label">HORSES · {homeCount} / 4 HOME</p>
      <div className="pieces-strip">
        {slots.map((slot) => {
          const isSynthesized = slot.pieceId.startsWith('__empty:')
          const movable = isInteractive && !isSynthesized && (movablePieceIds?.has(slot.pieceId) ?? false)
          const selected = !isSynthesized && selectedPieceId === slot.pieceId
          const className = [
            'piece-slot',
            `piece-slot--${slot.state}`,
            movable ? 'piece-slot--movable' : '',
            selected ? 'piece-slot--selected' : ''
          ].filter(Boolean).join(' ')
          return (
            <div
              key={slot.pieceId}
              className={className}
              onClick={movable && onSlotClick ? () => onSlotClick(slot.pieceId) : undefined}
              role={movable ? 'button' : undefined}
              tabIndex={movable ? 0 : undefined}
              onKeyDown={movable && onSlotClick ? (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSlotClick(slot.pieceId)
                }
              } : undefined}
            >
              <div className="piece-slot__inner">
                <Mascot team={team} size="token" />
              </div>
              {slot.state === 'onboard' && <span className="piece-slot__badge-station">{slot.station}</span>}
              {slot.state === 'home' && <span className="piece-slot__badge-home">★</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
