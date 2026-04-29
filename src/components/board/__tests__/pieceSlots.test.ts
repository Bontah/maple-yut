import { describe, it, expect } from 'vitest'
import { derivePieceSlots, type SlotState } from '../pieceSlots.js'
import type { YutPiece } from '../../../entities/YutPiece.js'

function makePiece(pieceId: string, team: 'A' | 'B', station: number, isHome: boolean, path: number[] = []): YutPiece {
  // Minimal duck-typed YutPiece for testing — we only need the fields read
  // by derivePieceSlots, not a full Colyseus schema instance.
  return { pieceId, team, station, isHome, path: path as unknown as YutPiece['path'] } as unknown as YutPiece
}

describe('derivePieceSlots', () => {
  it('returns 4 slots for a team with no pieces', () => {
    const slots = derivePieceSlots([], 'A')
    expect(slots).toHaveLength(4)
    expect(slots.every((s) => s.state === 'start')).toBe(true)
  })

  it('marks at-start pieces (station=0, path=[]) with state="start"', () => {
    // Schema invariant: a piece at start has station = START (0) and path = [].
    const pieces = [makePiece('A1', 'A', 0, false, [])]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots[0]).toMatchObject({ pieceId: 'A1', state: 'start' })
  })

  it('marks on-board pieces with state="onboard" and a station number', () => {
    // Schema invariant: on-board pieces have a non-empty path; station is path's last entry.
    const pieces = [makePiece('A2', 'A', 14, false, [0, 1, 2, 14])]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots[0]).toMatchObject({ pieceId: 'A2', state: 'onboard', station: 14 })
  })

  it('marks home pieces with state="home"', () => {
    // Schema invariant: home pieces have isHome=true (station may be anything).
    const pieces = [makePiece('A3', 'A', -1, true, [0, 5, 19])]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots[0]).toMatchObject({ pieceId: 'A3', state: 'home' })
  })

  it('only returns slots for the requested team', () => {
    const pieces = [
      makePiece('A1', 'A', 5, false, [0, 5]),
      makePiece('B1', 'B', 7, false, [0, 7])
    ]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots.filter((s) => s.pieceId === 'A1')).toHaveLength(1)
    expect(slots.filter((s) => s.pieceId === 'B1')).toHaveLength(0)
  })

  it('orders slots by pieceId so slot positions are stable across renders', () => {
    const pieces = [
      makePiece('A4', 'A', 0, false, []),
      makePiece('A1', 'A', 0, false, []),
      makePiece('A2', 'A', 0, false, []),
      makePiece('A3', 'A', 0, false, [])
    ]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots.map((s) => s.pieceId)).toEqual(['A1', 'A2', 'A3', 'A4'])
  })

  it('summarizes home count via the helper', () => {
    const pieces = [
      makePiece('A1', 'A', -1, true,  [0, 19]),
      makePiece('A2', 'A', -1, true,  [0, 5, 19]),
      makePiece('A3', 'A', 5,  false, [0, 5]),
      makePiece('A4', 'A', 0,  false, [])
    ]
    const slots = derivePieceSlots(pieces, 'A')
    const home = slots.filter((s) => s.state === 'home').length
    expect(home).toBe(2)
  })

  it('regression: classifies station=0 with empty path as start, NOT onboard with badge "0"', () => {
    // Bug-of-record: an earlier implementation classified by station===-1 only,
    // which made every freshly-spawned piece render as onboard at station 0.
    const pieces = [
      makePiece('A1', 'A', 0, false, []),
      makePiece('A2', 'A', 0, false, []),
      makePiece('A3', 'A', 0, false, []),
      makePiece('A4', 'A', 0, false, [])
    ]
    const slots = derivePieceSlots(pieces, 'A')
    expect(slots.every((s) => s.state === 'start')).toBe(true)
  })

  it('synthesized padding slots use __empty: prefix to avoid colliding with real pieceIds', () => {
    const slots = derivePieceSlots([], 'A')
    expect(slots.every((s) => s.pieceId.startsWith('__empty:'))).toBe(true)
  })
})

// Type assertion so the test file declares its dependency on the type union
const _stateValues: SlotState[] = ['start', 'onboard', 'home']
void _stateValues
