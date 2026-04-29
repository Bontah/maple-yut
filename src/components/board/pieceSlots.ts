import type { YutPiece } from '../../entities/YutPiece.js'
import type { Team } from '../../game/types.js'

export type SlotState = 'start' | 'onboard' | 'home'

export interface PieceSlot {
  pieceId: string
  state: SlotState
  station: number   // -1 if start or home
}

/**
 * Derive 4 ordered slots for a team's pieces.
 * Slots are sorted by pieceId so a given piece always lives in the same slot
 * across renders (stable visual position even as state changes).
 *
 * If fewer than 4 pieces exist for the team (shouldn't happen in real play
 * but defensible for tests), the remaining slots are filled with synthesized
 * "start"-state placeholders so the strip always renders a 4-cell grid.
 */
export function derivePieceSlots(pieces: Iterable<YutPiece>, team: Team): PieceSlot[] {
  const teamPieces = Array.from(pieces).filter((p) => p.team === team)
  teamPieces.sort((a, b) => a.pieceId.localeCompare(b.pieceId))

  const slots: PieceSlot[] = teamPieces.map((p) => ({
    pieceId: p.pieceId,
    state: p.isHome ? 'home' : p.station === -1 ? 'start' : 'onboard',
    station: p.isHome ? -1 : p.station
  }))

  while (slots.length < 4) {
    slots.push({ pieceId: `${team}${slots.length + 1}`, state: 'start', station: -1 })
  }
  return slots.slice(0, 4)
}
