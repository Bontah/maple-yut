import { describe, it, expect } from 'vitest'
import { STATION_POS } from '../stationPositions.js'

describe('STATION_POS', () => {
  it('has exactly 29 stations indexed 0..28', () => {
    for (let i = 0; i < 29; i++) {
      expect(STATION_POS[i], `station ${i} missing`).toBeDefined()
    }
    expect(Object.keys(STATION_POS).length).toBe(29)
  })

  it('places the center (22) at the geometric center of the SVG', () => {
    const [x, y] = STATION_POS[22]
    expect(x).toBe(300)
    expect(y).toBe(300)
  })

  it('spaces diagonal-1 (corner 10 → center 22 → corner 0) evenly', () => {
    // Path: 10 → 20 → 21 → 22 → 23 → 24 → 0 — six segments.
    const path = [10, 20, 21, 22, 23, 24, 0]
    const segments: number[] = []
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = STATION_POS[path[i]]
      const [x2, y2] = STATION_POS[path[i + 1]]
      segments.push(Math.hypot(x2 - x1, y2 - y1))
    }
    const expectedLen = segments[0]
    for (const len of segments) {
      expect(len).toBeCloseTo(expectedLen, 5)
    }
  })

  it('spaces diagonal-2 (corner 5 → center 22 → corner 15) evenly', () => {
    const path = [5, 25, 26, 22, 27, 28, 15]
    const segments: number[] = []
    for (let i = 0; i < path.length - 1; i++) {
      const [x1, y1] = STATION_POS[path[i]]
      const [x2, y2] = STATION_POS[path[i + 1]]
      segments.push(Math.hypot(x2 - x1, y2 - y1))
    }
    const expectedLen = segments[0]
    for (const len of segments) {
      expect(len).toBeCloseTo(expectedLen, 5)
    }
  })

  it('places the four corners at the four expected positions', () => {
    expect(STATION_POS[0]).toEqual([50, 550])    // SW
    expect(STATION_POS[5]).toEqual([550, 550])   // SE
    expect(STATION_POS[10]).toEqual([550, 50])   // NE
    expect(STATION_POS[15]).toEqual([50, 50])    // NW
  })
})
