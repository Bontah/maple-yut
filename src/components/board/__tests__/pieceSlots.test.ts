import { describe, it, expect } from 'vitest'
import { derivePieceSlots, type SlotState } from '../pieceSlots.js'
import type { YutPiece } from '../../../entities/YutPiece.js'

function makePiece(pieceId: string, team: 'A' | 'B', station: number, isHome: boolean): YutPiece {
  // Minimal duck-typed YutPiece for testing — we only need the fields read
  // by derivePieceSlots, not a full Colyseus schema instance.
  return { pieceId, team, station, isHome, path: [] as unknown as YutPiece['path'] } as unknown as YutPiece
}

describe('derivePieceSlots', () => {
  it('returns 4 slots for a team with no pieces', () => {
    const slots = derivePieceSlots([], 'A')
    expect(slots).toHaveLength(4)
    expect(slots.every((s) => s.state === 'start')).toBe(true)
  })

  it('marks at-start pieces with state="start"', () => {
    const pieces = [makePiece('A1', 'A', -1, false)]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots[0]).toMatchObject({ pieceId: 'A1', state: 'start' })
  })

  it('marks on-board pieces with state="onboard" and a station number', () => {
    const pieces = [makePiece('A2', 'A', 14, false)]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots[0]).toMatchObject({ pieceId: 'A2', state: 'onboard', station: 14 })
  })

  it('marks home pieces with state="home"', () => {
    const pieces = [makePiece('A3', 'A', -1, true)]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots[0]).toMatchObject({ pieceId: 'A3', state: 'home' })
  })

  it('only returns slots for the requested team', () => {
    const pieces = [
      makePiece('A1', 'A', 5, false),
      makePiece('B1', 'B', 7, false)
    ]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots.filter((s) => s.pieceId === 'A1')).toHaveLength(1)
    expect(slots.filter((s) => s.pieceId === 'B1')).toHaveLength(0)
  })

  it('orders slots by pieceId so slot positions are stable across renders', () => {
    const pieces = [
      makePiece('A4', 'A', -1, false),
      makePiece('A1', 'A', -1, false),
      makePiece('A2', 'A', -1, false),
      makePiece('A3', 'A', -1, false)
    ]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots.map((s) => s.pieceId)).toEqual(['A1', 'A2', 'A3', 'A4'])
  })

  it('summarizes home count as "X / 4 home" via the helper', () => {
    const pieces = [
      makePiece('A1', 'A', -1, true),
      makePiece('A2', 'A', -1, true),
      makePiece('A3', 'A', 5, false),
      makePiece('A4', 'A', -1, false)
    ]
    const slots = derivePieceSlots(pieces, 'A')
    const home = slots.filter((s) => s.state === 'home').length
    expect(home).toBe(2)
  })
})

// Type assertion so the test file declares its dependency on the type union
const _stateValues: SlotState[] = ['start', 'onboard', 'home']
void _stateValues
