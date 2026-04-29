// Pixel coordinates for the 29 Yut Nori stations on a 600×600 SVG canvas.
// Station IDs 0..28 are the rules-engine's identifiers (see src/game/board.ts);
// the rules engine works purely in IDs, so changing pixel positions here is a
// presentation-only change and never affects gameplay.
//
// Layout: 6×6 logical grid, PADDING + CELL pixels per cell. Diagonal stations
// are placed at multiples of 5/6 along each diagonal so all six segments per
// diagonal (corner → 2 stations → center → 2 stations → corner) are equal.

const PADDING = 50
const CELL = 100

export function gp(col: number, row: number): [number, number] {
  return [PADDING + col * CELL, PADDING + row * CELL]
}

export const STATION_POS: Record<number, [number, number]> = {
  // Perimeter, clockwise from SW corner
  0:  gp(0, 5),
  1:  gp(1, 5), 2: gp(2, 5), 3: gp(3, 5), 4: gp(4, 5),
  5:  gp(5, 5),
  6:  gp(5, 4), 7: gp(5, 3), 8: gp(5, 2), 9: gp(5, 1),
  10: gp(5, 0),
  11: gp(4, 0), 12: gp(3, 0), 13: gp(2, 0), 14: gp(1, 0),
  15: gp(0, 0),
  16: gp(0, 1), 17: gp(0, 2), 18: gp(0, 3), 19: gp(0, 4),

  // Center
  22: gp(2.5, 2.5),

  // Diagonal 1: 10 (NE) → 20 → 21 → 22 → 23 → 24 → 0 (SW)
  20: gp(25 / 6, 5 / 6),
  21: gp(20 / 6, 10 / 6),
  23: gp(10 / 6, 20 / 6),
  24: gp(5 / 6, 25 / 6),

  // Diagonal 2: 5 (SE) → 25 → 26 → 22 → 27 → 28 → 15 (NW)
  25: gp(25 / 6, 25 / 6),
  26: gp(20 / 6, 20 / 6),
  27: gp(10 / 6, 10 / 6),
  28: gp(5 / 6, 5 / 6)
}
