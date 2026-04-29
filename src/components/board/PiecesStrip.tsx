import { Mascot } from './Mascot.js'
import { derivePieceSlots } from './pieceSlots.js'
import type { YutPiece } from '../../entities/YutPiece.js'
import type { Team } from '../../game/types.js'

export interface PiecesStripProps {
  pieces: Iterable<YutPiece>
  team: Team
}

export function PiecesStrip({ pieces, team }: PiecesStripProps) {
  const slots = derivePieceSlots(pieces, team)
  const homeCount = slots.filter((s) => s.state === 'home').length

  return (
    <div>
      <p className="pieces-strip__label">HORSES · {homeCount} / 4 HOME</p>
      <div className="pieces-strip">
        {slots.map((slot) => (
          <div key={slot.pieceId} className={`piece-slot piece-slot--${slot.state}`}>
            <div className="piece-slot__inner">
              <Mascot team={team} size="token" />
            </div>
            {slot.state === 'onboard' && <span className="piece-slot__badge-station">{slot.station}</span>}
            {slot.state === 'home' && <span className="piece-slot__badge-home">★</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
