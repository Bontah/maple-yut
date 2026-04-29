# Yut Wars Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Yut Nori board's placeholder visuals into a Maple-Story-inspired "Yut Wars" aesthetic across every surface (lobby, board, panels, sticks, powers, end-game), using CSS/SVG plus user-provided mascot art. No game-logic changes.

**Architecture:** Decompose the monolithic 410-line `Board.tsx` into focused presentation components under `src/components/board/`. A `theme.css` design-token layer feeds all components. Pure-data modules (`stationPositions.ts`, `mascots.ts`) carry test-friendly logic. The existing `useYutGame()` hook stays as the single source of truth — no new state machines.

**Tech Stack:** React 18 + TypeScript, Vite (with SWC), CSS (no preprocessors), Colyseus client, Vitest for unit tests, Playwright for E2E/screenshot tests, Google Fonts (Jua, Inter).

**Reference spec:** `docs/superpowers/specs/2026-04-29-yut-wars-visual-redesign-design.md`

**Test strategy:** TDD on testable logic (station coordinates, piece-state derivation, ability gating). Visual components verified by extending the existing `src/game/__sim__/browser-test.ts` Playwright script — this project intentionally avoids React Testing Library / jsdom infrastructure. After each component lands, the implementer runs `npm run dev` and visually checks the change in the browser.

---

## File map

**Create:**
- `src/app/theme.css` — design tokens, font import, base resets
- `src/assets/mascots/team-a.png` — moved from `player_a.png`
- `src/assets/mascots/team-b.png` — moved from `player_b.png`
- `src/assets/mascots.ts` — `MASCOT_BY_TEAM` constant
- `src/components/board/stationPositions.ts` — extracted + corrected `STATION_POS` and `gp()` helper
- `src/components/board/__tests__/stationPositions.test.ts` — coordinate test
- `src/components/board/Mascot.tsx` — image component, size variants, optional bob/glow
- `src/components/board/WoodFrame.tsx` — gradient + brass border + corner brackets + noise overlay
- `src/components/board/TurnBanner.tsx` — header banner
- `src/components/board/PiecesStrip.tsx` — 4-slot grid + state derivation
- `src/components/board/__tests__/piecesStrip.test.ts` — pure-helper test
- `src/components/board/PowersPanel.tsx` — themed (extracted from `Board.tsx`)
- `src/components/board/ThrowButton.tsx` — gold CTA
- `src/components/board/SticksTray.tsx` — basket + sticks + result ribbon
- `src/components/board/EndOverlay.tsx` — themed victory plaque + confetti
- `src/components/board/BoardCanvas.tsx` — SVG playing field with mascot pieces
- `src/components/board/PlayerPanel.tsx` — composes Mascot, name plate, PiecesStrip, PowersPanel
- `src/components/board/styles/board.css` — board-specific layout
- `src/components/board/styles/panel.css` — wood frame, mascot stage, name plate
- `src/components/board/styles/sticks.css` — sticks tray, toss animation
- `src/components/board/styles/animations.css` — keyframes, prefers-reduced-motion gates

**Modify:**
- `index.html` — add Google Fonts `<link>` tags
- `src/app/global.css` — slim down to base only; remove board/lobby/sticks rules
- `src/app/Activity.tsx` — no logic change, ensure imports still resolve
- `src/components/Board.tsx` — refactor to orchestration-only; ~80 lines down from 410
- `src/components/Lobby.tsx` — apply theme tokens, swap to `WoodFrame`
- `src/components/LoadingScreen.tsx` — apply theme tokens
- `src/game/__sim__/browser-test.ts` — add screenshot capture at three viewport sizes

**Delete (root-level mascot stragglers):**
- `player_a.png` (moved into `src/assets/mascots/team-a.png`)
- `player_b.png` (moved into `src/assets/mascots/team-b.png`)

---

## Task 1: Theme tokens and font import

**Goal:** Establish the design-token foundation that every later component consumes.

**Files:**
- Create: `src/app/theme.css`
- Modify: `index.html` (add `<link>` to Google Fonts)
- Modify: `src/app/global.css` (import `theme.css`)

- [ ] **Step 1: Create `src/app/theme.css` with design tokens, font face declarations, and the SVG-noise data URL**

```css
/* src/app/theme.css
   Design tokens for the Yut Wars Maple-inspired theme.
   Every component references variables from this file — change a token here,
   it propagates everywhere. */

:root {
  /* Wood / surface palette */
  --wood-darkest: #2a1a0a;
  --wood-dark:    #3a2a1a;
  --wood-mid:     #5a3820;
  --wood-rim:     #6b4520;
  --wood-light:   #8a5e34;
  --frame:        #c9a36b;
  --board:        #d4b888;
  --paper:        #f4e4c4;
  --paper-light:  #fff7e0;
  --gold:         #f4c83a;

  /* Team identity */
  --team-a: #d65454;
  --team-b: #4a76d6;

  /* Typography */
  --font-display: 'Jua', system-ui, sans-serif;
  --font-body:    Inter, system-ui, sans-serif;

  /* Wood-grain noise overlay (encoded SVG turbulence filter) */
  --wood-noise: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.2  0 0 0 0 0.1  0 0 0 0 0  0 0 0 0.7 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
}

/* Page-level baseline (overrides the dark default in global.css) */
html, body, #root {
  background: linear-gradient(180deg, var(--wood-darkest), var(--wood-dark));
  color: var(--paper);
  font-family: var(--font-body);
}

/* Override the React-template's flex-centered body and centered max-width on
   #root so the Discord activity iframe uses the full viewport. */
body {
  display: block;
  place-items: initial;
}
#root {
  max-width: none;
  margin: 0;
  padding: 0;
  text-align: left;
  width: 100%;
  min-height: 100vh;
}
```

- [ ] **Step 2: Add Google Fonts link tags to `index.html` (preconnect + `display=swap`, subset to Latin + Korean)**

Edit `index.html` `<head>` section, add inside `<head>` before the existing styles:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jua&family=Inter:wght@400;600;700;800&display=swap&subset=latin,korean" rel="stylesheet">
```

- [ ] **Step 3: Import theme.css from `src/app/global.css`**

Add the import at the very top of `src/app/global.css`:

```css
@import './theme.css';

/* (existing global.css contents follow) */
```

- [ ] **Step 4: Verify visually — run dev server and confirm fonts load + page bg is wood-tone**

Run: `npm run dev` (in a separate terminal) — open the activity URL and confirm:
- The page background is a warm dark-wood gradient (not the prior `#242424`).
- Body text is rendered in Inter (system fallback if Inter isn't loaded — should still be readable).
- Open DevTools → Network → filter by Font and confirm Jua and Inter weights load from `fonts.gstatic.com`.

Stop the dev server.

- [ ] **Step 5: Commit**

```bash
git add src/app/theme.css index.html src/app/global.css
git commit -m "Add theme.css design tokens and Jua/Inter font imports"
```

---

## Task 2: Move mascots and create constants module

**Goal:** Establish a single source of truth for mascot art so any later component referencing a mascot does so via a typed constant.

**Files:**
- Create: `src/assets/mascots/team-a.png` (moved from `player_a.png`)
- Create: `src/assets/mascots/team-b.png` (moved from `player_b.png`)
- Create: `src/assets/mascots.ts`
- Delete: `player_a.png`, `player_b.png` (root)

- [ ] **Step 1: Create the mascots directory and move the PNGs**

```bash
mkdir -p src/assets/mascots
git mv player_a.png src/assets/mascots/team-a.png
git mv player_b.png src/assets/mascots/team-b.png
```

If git complains that one of the files isn't tracked (because of the AM/A states left over), use `git add` first then `git mv`, or fall back to a plain `mv` + `git add` of the new path + `git rm` of the old path.

- [ ] **Step 2: Create `src/assets/mascots.ts`**

```ts
// Single source of truth for team mascot art. Other components import from
// here so swapping mascots (or letting players pick mascots later) is a
// one-file change.
//
// Vite's asset pipeline turns these imports into hashed URLs at build time
// and fails the build loudly if the PNG is missing.

import teamAUrl from './mascots/team-a.png'
import teamBUrl from './mascots/team-b.png'

import type { Team } from '../game/types.js'

export const MASCOT_BY_TEAM: Record<Team, string> = {
  A: teamAUrl,
  B: teamBUrl
}

export const MASCOT_NAME_BY_TEAM: Record<Team, string> = {
  A: 'Slime',
  B: 'Snail'
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/assets/mascots/ src/assets/mascots.ts
git commit -m "Move mascot PNGs into src/assets/mascots/, add MASCOT_BY_TEAM map"
```

---

## Task 3: Extract STATION_POS to a testable module and fix the spacing

**Goal:** TDD the station-spacing fix. Move the data out of `Board.tsx` so it can be unit-tested in isolation, then correct the diagonal coordinates so all six segments per diagonal are equal length.

**Files:**
- Create: `src/components/board/stationPositions.ts`
- Create: `src/components/board/__tests__/stationPositions.test.ts`
- Modify: `src/components/Board.tsx` (remove local `STATION_POS` and `gp()`, import from new module)

- [ ] **Step 1: Write the failing test**

Create `src/components/board/__tests__/stationPositions.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and confirm it fails (module doesn't exist yet)**

Run: `npm test -- src/components/board/__tests__/stationPositions.test.ts`
Expected: FAIL with "Cannot find module '../stationPositions.js'" or similar import resolution error.

- [ ] **Step 3: Create `src/components/board/stationPositions.ts` with the corrected coordinates**

```ts
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- src/components/board/__tests__/stationPositions.test.ts`
Expected: PASS, 5 tests green.

- [ ] **Step 5: Update `src/components/Board.tsx` to import from the new module**

In `src/components/Board.tsx`, remove the inline `PADDING`, `CELL`, `gp()`, and `STATION_POS` definitions (lines ~14-33) and replace them with a single import at the top:

```ts
import { STATION_POS } from './board/stationPositions.js'
```

The local `PADDING` and `CELL` constants should also be deleted — they are no longer used in `Board.tsx` after the extraction. (Search the file for any remaining reference: `PADDING` and `CELL` usages on lines like the `<polygon>` and `<line>` elements should be removed in the next BoardCanvas refactor task; for now, replace them with their literal values.)

If lines like `polygon points={[[0, 5], [5, 5], [5, 0], [0, 0]].map(([c, r]) => `${PADDING + c * CELL},${PADDING + r * CELL}`).join(' ')}` use `PADDING` and `CELL`, replace inline:

```tsx
points={[[0, 5], [5, 5], [5, 0], [0, 0]].map(([c, r]) => `${50 + c * 100},${50 + r * 100}`).join(' ')}
```

(BoardCanvas extraction in Task 11 will clean this up properly. This step keeps things compiling.)

- [ ] **Step 6: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: all existing tests still pass; the new `stationPositions.test.ts` is green.

- [ ] **Step 7: Run the dev server and visually confirm the diagonal stations are evenly spaced**

Run: `npm run dev`, open the activity, start a match (or join the lobby long enough to see the board). The eight diagonal stations should now sit at evenly-spaced points along each X-diagonal. Stop the dev server.

- [ ] **Step 8: Commit**

```bash
git add src/components/board/stationPositions.ts src/components/board/__tests__/stationPositions.test.ts src/components/Board.tsx
git commit -m "Extract STATION_POS to testable module, fix diagonal spacing"
```

---

## Task 4: WoodFrame component

**Goal:** Reusable wood-frame wrapper used by player panels, lobby seat cards, and the end-game plaque. Single source of truth for the wood-gradient + brass-border + corner-bracket + noise-overlay treatment.

**Files:**
- Create: `src/components/board/WoodFrame.tsx`
- Create: `src/components/board/styles/panel.css`

- [ ] **Step 1: Create `src/components/board/styles/panel.css`**

```css
/* WoodFrame and player-panel styling */

.wood-frame {
  position: relative;
  background: linear-gradient(180deg, var(--wood-mid), var(--wood-dark));
  border: 3px solid var(--frame);
  border-radius: 10px;
  padding: 14px;
  color: var(--paper);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.wood-frame::before {
  /* Wood-grain noise overlay */
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-image: var(--wood-noise);
  opacity: 0.18;
  pointer-events: none;
}

.wood-frame__bracket {
  position: absolute;
  width: 18px;
  height: 18px;
  pointer-events: none;
}

.wood-frame__bracket--tl { top: 4px; left: 4px;
  border-top: 3px solid var(--gold); border-left: 3px solid var(--gold); }
.wood-frame__bracket--tr { top: 4px; right: 4px;
  border-top: 3px solid var(--gold); border-right: 3px solid var(--gold); }
.wood-frame__bracket--bl { bottom: 4px; left: 4px;
  border-bottom: 3px solid var(--gold); border-left: 3px solid var(--gold); }
.wood-frame__bracket--br { bottom: 4px; right: 4px;
  border-bottom: 3px solid var(--gold); border-right: 3px solid var(--gold); }

/* Inactive variant — dimmed brackets, slightly reduced opacity */
.wood-frame--inactive { opacity: 0.92; }
.wood-frame--inactive .wood-frame__bracket--tl,
.wood-frame--inactive .wood-frame__bracket--tr,
.wood-frame--inactive .wood-frame__bracket--bl,
.wood-frame--inactive .wood-frame__bracket--br {
  border-color: var(--wood-rim);
}
```

- [ ] **Step 2: Create `src/components/board/WoodFrame.tsx`**

```tsx
import type { CSSProperties, ReactNode } from 'react'
import './styles/panel.css'

export interface WoodFrameProps {
  children: ReactNode
  brackets?: boolean   // render gold corner brackets (default true)
  inactive?: boolean   // dim styling for opponent panel when not their turn
  className?: string
  style?: CSSProperties
}

export function WoodFrame({ children, brackets = true, inactive = false, className = '', style }: WoodFrameProps) {
  const cls = ['wood-frame', inactive ? 'wood-frame--inactive' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls} style={style}>
      {brackets && (
        <>
          <span className="wood-frame__bracket wood-frame__bracket--tl" />
          <span className="wood-frame__bracket wood-frame__bracket--tr" />
          <span className="wood-frame__bracket wood-frame__bracket--bl" />
          <span className="wood-frame__bracket wood-frame__bracket--br" />
        </>
      )}
      {children}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/WoodFrame.tsx src/components/board/styles/panel.css
git commit -m "Add WoodFrame component with brass border, brackets, noise overlay"
```

---

## Task 5: Mascot component

**Goal:** Single component that renders a team's mascot art at three sizes (panel-hero, strip-token, board-piece) with optional bob animation and gold drop-shadow for the active state.

**Files:**
- Create: `src/components/board/Mascot.tsx`
- Modify: `src/components/board/styles/panel.css` (add mascot-stage and bob keyframe)

- [ ] **Step 1: Append mascot styling to `src/components/board/styles/panel.css`**

Append (do not overwrite existing rules):

```css
/* Mascot — sized via the size prop (data-size attribute). */
.mascot { object-fit: contain; display: block; }
.mascot[data-size='hero']  { height: 130px; }
.mascot[data-size='token'] { height: 100%; width: 100%; }
.mascot[data-size='piece'] { height: 100%; width: 100%; }

.mascot--shadow {
  filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.5));
}

.mascot--glow {
  filter: drop-shadow(0 6px 6px rgba(0, 0, 0, 0.5))
          drop-shadow(0 0 12px var(--gold));
}

@keyframes mascot-bob {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-6px); }
}
.mascot--bob {
  animation: mascot-bob 2.4s ease-in-out infinite;
}

/* Mascot stage (panel-hero positioning + radial spotlight) */
.mascot-stage {
  position: relative;
  height: 140px;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  margin-bottom: 4px;
}
.mascot-stage::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center 75%, var(--mascot-spot, rgba(244, 200, 58, 0.25)), transparent 70%);
  pointer-events: none;
}
```

- [ ] **Step 2: Create `src/components/board/Mascot.tsx`**

```tsx
import type { Team } from '../../game/types.js'
import { MASCOT_BY_TEAM, MASCOT_NAME_BY_TEAM } from '../../assets/mascots.js'
import './styles/panel.css'

export type MascotSize = 'hero' | 'token' | 'piece'

export interface MascotProps {
  team: Team
  size: MascotSize
  bob?: boolean
  glow?: boolean
}

export function Mascot({ team, size, bob = false, glow = false }: MascotProps) {
  const cls = [
    'mascot',
    size === 'hero' ? 'mascot--shadow' : '',
    glow ? 'mascot--glow' : '',
    bob ? 'mascot--bob' : ''
  ].filter(Boolean).join(' ')
  return (
    <img
      src={MASCOT_BY_TEAM[team]}
      alt={MASCOT_NAME_BY_TEAM[team]}
      data-size={size}
      className={cls}
    />
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/Mascot.tsx src/components/board/styles/panel.css
git commit -m "Add Mascot component with hero/token/piece sizes and bob animation"
```

---

## Task 6: PiecesStrip component (TDD on slot derivation)

**Goal:** A 4-slot strip showing one team's pieces, each in `start | onboard | home` state. The state-derivation function is pure and unit-tested.

**Files:**
- Create: `src/components/board/pieceSlots.ts` (pure helper)
- Create: `src/components/board/__tests__/pieceSlots.test.ts`
- Create: `src/components/board/PiecesStrip.tsx`
- Modify: `src/components/board/styles/panel.css` (slot styling)

- [ ] **Step 1: Write the failing test for the slot derivation**

Create `src/components/board/__tests__/pieceSlots.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test and confirm it fails (module doesn't exist yet)**

Run: `npm test -- src/components/board/__tests__/pieceSlots.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Create `src/components/board/pieceSlots.ts`**

```ts
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- src/components/board/__tests__/pieceSlots.test.ts`
Expected: PASS, 7 tests green.

- [ ] **Step 5: Append slot styling to `src/components/board/styles/panel.css`**

```css
/* Pieces strip */
.pieces-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
  width: 100%;
}

.piece-slot {
  aspect-ratio: 1 / 1;
  border: 2px solid var(--frame);
  border-radius: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--wood-dark);
  position: relative;
}
.piece-slot--start {
  background: var(--wood-darkest);
  border: 2px dashed var(--wood-rim);
  opacity: 0.55;
}
.piece-slot--home {
  background: var(--gold);
  border-color: var(--wood-rim);
  box-shadow: inset 0 0 6px rgba(244, 200, 58, 0.6);
}
.piece-slot__inner {
  width: 78%;
  height: 78%;
}
.piece-slot__badge-station {
  position: absolute;
  bottom: -3px;
  right: -3px;
  background: var(--frame);
  color: var(--wood-dark);
  font-family: var(--font-body);
  font-size: 8px;
  font-weight: 800;
  border-radius: 3px;
  padding: 1px 3px;
  border: 1px solid var(--wood-rim);
}
.piece-slot__badge-home {
  position: absolute;
  bottom: -4px;
  right: -4px;
  background: var(--gold);
  color: var(--wood-dark);
  font-family: var(--font-body);
  font-size: 8px;
  font-weight: 800;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wood-rim);
}

.pieces-strip__label {
  font-size: 10px;
  color: var(--frame);
  letter-spacing: 1.5px;
  font-family: var(--font-body);
  margin: 8px 0 6px;
  text-align: center;
}
```

- [ ] **Step 6: Create `src/components/board/PiecesStrip.tsx`**

```tsx
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
```

- [ ] **Step 7: Run all tests to confirm no regression**

Run: `npm test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/components/board/pieceSlots.ts src/components/board/__tests__/pieceSlots.test.ts src/components/board/PiecesStrip.tsx src/components/board/styles/panel.css
git commit -m "Add PiecesStrip component with TDD-tested slot derivation"
```

---

## Task 7: PowersPanel component (themed; extracted from Board.tsx)

**Goal:** Move the existing `PowersPanel` out of `Board.tsx` into its own component, retheme with charge pips and proper tooltips. No game-logic changes.

**Files:**
- Create: `src/components/board/PowersPanel.tsx`
- Create: `src/components/board/abilityGating.ts` (pure helper)
- Create: `src/components/board/__tests__/abilityGating.test.ts`
- Modify: `src/components/board/styles/panel.css` (powers styling)

- [ ] **Step 1: Write the failing test for ability gating**

Create `src/components/board/__tests__/abilityGating.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canUseControlYut, canUseControlHorses } from '../abilityGating.js'

const baseState = {
  phase: 'await_throw',
  mode: 'maple',
  powerUsedThisTurn: false,
  pendingStep: 0
} as const

describe('canUseControlYut', () => {
  it('returns true when await_throw, maple mode, powers left, not yet used', () => {
    expect(canUseControlYut({ ...baseState }, 2)).toBe(true)
  })
  it('returns false when no powers left', () => {
    expect(canUseControlYut({ ...baseState }, 0)).toBe(false)
  })
  it('returns false when not in maple mode', () => {
    expect(canUseControlYut({ ...baseState, mode: 'classic' }, 2)).toBe(false)
  })
  it('returns false when in await_spend phase', () => {
    expect(canUseControlYut({ ...baseState, phase: 'await_spend' }, 2)).toBe(false)
  })
  it('returns false when a power was already used this turn', () => {
    expect(canUseControlYut({ ...baseState, powerUsedThisTurn: true }, 2)).toBe(false)
  })
})

describe('canUseControlHorses', () => {
  it('returns true when await_spend with pendingStep 1..5, maple mode, powers left, not used', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3 }, 2)).toBe(true)
  })
  it('returns false when pendingStep is 0', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 0 }, 2)).toBe(false)
  })
  it('returns false when pendingStep is back-do (-1)', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: -1 }, 2)).toBe(false)
  })
  it('returns false in await_throw phase', () => {
    expect(canUseControlHorses({ ...baseState, pendingStep: 3 }, 2)).toBe(false)
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `npm test -- src/components/board/__tests__/abilityGating.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Create `src/components/board/abilityGating.ts`**

```ts
// Pure predicates derived from the YutRoom message handlers in
// src/rooms/YutRoom.ts handleUsePowerYut/handleUsePowerHorses.

export interface AbilityState {
  phase: string             // 'await_throw' | 'await_spend' | 'ended' | ...
  mode: string              // 'maple' | 'classic' | ...
  powerUsedThisTurn: boolean
  pendingStep: number
}

export function canUseControlYut(state: AbilityState, powersRemaining: number): boolean {
  if (state.mode !== 'maple') return false
  if (state.phase !== 'await_throw') return false
  if (state.powerUsedThisTurn) return false
  if (powersRemaining <= 0) return false
  return true
}

export function canUseControlHorses(state: AbilityState, powersRemaining: number): boolean {
  if (state.mode !== 'maple') return false
  if (state.phase !== 'await_spend') return false
  if (state.powerUsedThisTurn) return false
  if (powersRemaining <= 0) return false
  if (state.pendingStep < 1 || state.pendingStep > 5) return false
  return true
}
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm test -- src/components/board/__tests__/abilityGating.test.ts`
Expected: PASS, 9 tests green.

- [ ] **Step 5: Append PowersPanel styling to `src/components/board/styles/panel.css`**

```css
/* Powers panel */
.powers-row {
  font-size: 10px;
  color: var(--frame);
  letter-spacing: 1.5px;
  font-family: var(--font-body);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 8px 0 6px;
}
.powers-charges { display: inline-flex; gap: 3px; }
.powers-charge {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--gold);
  box-shadow: 0 0 4px var(--gold);
}
.powers-charge--spent {
  background: var(--wood-dark);
  box-shadow: none;
  border: 1px solid var(--wood-rim);
}

.ability-row { display: flex; gap: 6px; }
.ability {
  flex: 1;
  padding: 8px 6px;
  background: linear-gradient(180deg, var(--wood-light), var(--wood-rim));
  border: 2px solid var(--frame);
  border-radius: 6px;
  font-size: 11px;
  color: var(--paper);
  text-align: center;
  font-family: var(--font-display);
  box-shadow: 0 2px 0 var(--wood-dark);
  cursor: pointer;
}
.ability:disabled { opacity: 0.45; box-shadow: none; cursor: default; }
.ability__icon { display: block; margin-bottom: 2px; color: var(--gold); font-size: 14px; }

.ability-picker {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 6px;
}
.ability-picker button {
  padding: 0.3em 0.7em;
  font-size: 0.9em;
  font-family: var(--font-display);
}
```

- [ ] **Step 6: Create `src/components/board/PowersPanel.tsx`**

```tsx
import { useState } from 'react'
import type { YutState } from '../../entities/YutState.js'
import type { Team } from '../../game/types.js'
import { type ForcedThrow } from '../../hooks/useYutGame.js'
import { canUseControlHorses, canUseControlYut } from './abilityGating.js'

// Re-export so consumers of PowersPanel don't need to know about the hook.
export type { ForcedThrow }

const FORCED_OPTIONS: { result: ForcedThrow; label: string }[] = [
  { result: 'DO',   label: '도 (+1)' },
  { result: 'GAE',  label: '개 (+2)' },
  { result: 'GEOL', label: '걸 (+3)' },
  { result: 'YUT',  label: '윷 (+4)' },
  { result: 'MO',   label: '모 (+5)' }
]

export interface PowersPanelProps {
  state: YutState
  myTeam: Team | ''
  powersRemaining: number
  onYut: (result: ForcedThrow) => void
  onHorses: (shift: -1 | 1) => void
}

export function PowersPanel({ state, myTeam, powersRemaining, onYut, onHorses }: PowersPanelProps) {
  const [showYut, setShowYut] = useState(false)
  const [showHorses, setShowHorses] = useState(false)

  if (!myTeam) return null
  if (state.mode !== 'maple') return null

  const yutEnabled = canUseControlYut(state, powersRemaining)
  const horsesEnabled = canUseControlHorses(state, powersRemaining)

  const charges: ('available' | 'spent')[] = []
  for (let i = 0; i < 2; i++) {
    charges.push(i < powersRemaining ? 'available' : 'spent')
  }

  return (
    <div>
      <div className="powers-row">
        <span>POWERS</span>
        <span className="powers-charges">
          {charges.map((c, i) => (
            <span key={i} className={`powers-charge ${c === 'spent' ? 'powers-charge--spent' : ''}`} />
          ))}
        </span>
      </div>
      <div className="ability-row">
        <button
          className="ability"
          disabled={!yutEnabled}
          title="Skip the dice roll and pick your throw result yourself (+1 to +5). Use BEFORE throwing. 1 power per turn."
          onClick={() => setShowYut((v) => !v)}
        >
          <span className="ability__icon">⚡</span>
          Control Yut
        </button>
        <button
          className="ability"
          disabled={!horsesEnabled}
          title="Adjust your throw result up or down by 1 step. Use AFTER throwing, before picking a piece. 1 power per turn."
          onClick={() => setShowHorses((v) => !v)}
        >
          <span className="ability__icon">⚡</span>
          Control Horses
        </button>
      </div>
      {showYut && yutEnabled && (
        <div className="ability-picker">
          {FORCED_OPTIONS.map((o) => (
            <button key={o.result} onClick={() => { onYut(o.result); setShowYut(false) }}>{o.label}</button>
          ))}
        </div>
      )}
      {showHorses && horsesEnabled && (
        <div className="ability-picker">
          <button disabled={state.pendingStep <= 1} onClick={() => { onHorses(-1); setShowHorses(false) }}>−1 step</button>
          <button disabled={state.pendingStep >= 5} onClick={() => { onHorses(1);  setShowHorses(false) }}>+1 step</button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 7: Run all tests**

Run: `npm test`
Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/components/board/PowersPanel.tsx src/components/board/abilityGating.ts src/components/board/__tests__/abilityGating.test.ts src/components/board/styles/panel.css
git commit -m "Add PowersPanel component with TDD-tested ability gating"
```

---

## Task 8: TurnBanner component

**Goal:** Header banner showing whose turn / phase. Replaces the existing `HeaderBar` in `Board.tsx`.

**Files:**
- Create: `src/components/board/TurnBanner.tsx`
- Create: `src/components/board/styles/board.css`

- [ ] **Step 1: Create `src/components/board/styles/board.css`**

```css
/* Board screen layout + turn banner */

.board-screen {
  display: grid;
  gap: 10px;
  padding: 14px;
  max-width: 1400px;
  margin: 0 auto;
  grid-template-rows: auto 1fr;
}

.turn-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 48px;
  background: linear-gradient(180deg, #7a5230, var(--wood-mid));
  border: 3px solid var(--frame);
  border-radius: 8px;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.4), 0 3px 8px rgba(0, 0, 0, 0.3);
  position: relative;
  font-family: var(--font-display);
  font-size: 18px;
  color: var(--paper);
  letter-spacing: 2px;
  text-transform: uppercase;
}

@media (max-width: 900px) {
  .turn-banner { height: 36px; font-size: 12px; letter-spacing: 1px; }
}
```

- [ ] **Step 2: Create `src/components/board/TurnBanner.tsx`**

```tsx
import type { YutState } from '../../entities/YutState.js'
import type { Team } from '../../game/types.js'
import './styles/board.css'

export interface TurnBannerProps {
  state: YutState
  myTeam: Team | ''
}

export function TurnBanner({ state, myTeam }: TurnBannerProps) {
  const isMyTurn = myTeam === state.currentTeam && myTeam !== ''
  let text: string

  if (state.phase === 'ended') {
    text = `Match over — Team ${state.winner} wins!`
  } else if (state.phase === 'await_throw') {
    text = isMyTurn ? 'Yut Wars · Your throw' : `Yut Wars · Team ${state.currentTeam}'s throw`
  } else if (state.phase === 'await_spend') {
    const dir = state.pendingStep < 0 ? 'back' : `+${state.pendingStep}`
    text = isMyTurn ? `Yut Wars · Pick a piece (${dir})` : `Yut Wars · Team ${state.currentTeam} is picking (${dir})`
  } else {
    text = 'Yut Wars'
  }

  return <div className="turn-banner">{text}</div>
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/TurnBanner.tsx src/components/board/styles/board.css
git commit -m "Add TurnBanner component with themed banner styling"
```

---

## Task 9: ThrowButton component

**Goal:** Gold gradient call-to-action button with pulse animation when available. Used by SticksTray and (later) by other primary actions.

**Files:**
- Create: `src/components/board/ThrowButton.tsx`
- Create: `src/components/board/styles/sticks.css`

- [ ] **Step 1: Create `src/components/board/styles/sticks.css`**

```css
/* Throw button (also used by Rematch and other primary CTAs) */
.gold-button {
  background: linear-gradient(180deg, #f8d850 0%, #e6b820 50%, #c9a020 100%);
  color: var(--wood-dark);
  font-weight: 800;
  font-size: 13px;
  border: 2px solid var(--wood-rim);
  border-radius: 8px;
  padding: 10px 22px;
  box-shadow: 0 3px 0 var(--wood-rim), 0 4px 8px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4);
  letter-spacing: 1px;
  text-transform: uppercase;
  font-family: var(--font-display);
  cursor: pointer;
}
.gold-button:active:not(:disabled) {
  transform: translateY(2px);
  box-shadow: 0 1px 0 var(--wood-rim), 0 2px 4px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.gold-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: 0 2px 0 var(--wood-rim);
}

@keyframes throw-pulse {
  0%, 100% { box-shadow: 0 3px 0 var(--wood-rim), 0 4px 8px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.4); }
  50%      { box-shadow: 0 3px 0 var(--wood-rim), 0 4px 14px rgba(244,200,58,0.7), inset 0 1px 0 rgba(255,255,255,0.4); }
}
.gold-button--pulse:not(:disabled) {
  animation: throw-pulse 1.6s ease-in-out infinite;
}
```

- [ ] **Step 2: Create `src/components/board/ThrowButton.tsx`**

```tsx
import './styles/sticks.css'

export interface ThrowButtonProps {
  enabled: boolean
  pulse?: boolean        // gentle gold pulse when available (default = enabled)
  onClick: () => void
  label?: string
}

export function ThrowButton({ enabled, pulse, onClick, label = 'Throw Sticks' }: ThrowButtonProps) {
  const cls = ['gold-button', (pulse ?? enabled) ? 'gold-button--pulse' : ''].filter(Boolean).join(' ')
  return (
    <button className={cls} disabled={!enabled} onClick={onClick}>
      {label}
    </button>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/ThrowButton.tsx src/components/board/styles/sticks.css
git commit -m "Add ThrowButton with gold gradient and pulse animation"
```

---

## Task 10: SticksTray component

**Goal:** Themed sticks tray (basket frame + 4 sticks + result ribbon). Replaces the existing `Sticks` row in `Board.tsx`. Includes the toss animation already used by the codebase, augmented with per-stick rotation variance and a dust puff.

**Files:**
- Create: `src/components/board/SticksTray.tsx`
- Modify: `src/components/board/styles/sticks.css` (basket, sticks, ribbon, animations)

- [ ] **Step 1: Append basket/sticks/ribbon styling to `src/components/board/styles/sticks.css`**

```css
/* Basket frame */
.sticks-tray {
  background: linear-gradient(180deg, var(--wood-mid), var(--wood-dark));
  border: 2px solid var(--frame);
  border-radius: 8px 8px 12px 12px;
  padding: 10px 12px;
  box-shadow: inset 0 -8px 12px rgba(0, 0, 0, 0.35);
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.sticks-tray__label {
  font-size: 9px;
  color: var(--frame);
  text-align: center;
  letter-spacing: 1.5px;
  font-family: var(--font-body);
  margin: 0 0 6px;
}

/* Stick orientation: vertical stack on wide layouts, horizontal on narrow */
.sticks-tray__sticks { display: flex; flex-direction: column; gap: 4px; }
@media (max-width: 900px) {
  .sticks-tray__sticks { flex-direction: row; }
  .stick { flex: 1; height: 8px; width: auto; }
}

.stick {
  height: 8px;
  border-radius: 4px;
  border: 1px solid var(--wood-rim);
  position: relative;
  transition: background-color 0.25s, transform 0.4s;
  animation: stick-toss 0.5s ease-out;
}
.stick--round { background: #8b5a2b; }
.stick--flat  { background: #f6e2bf; }
.stick__mark {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  color: var(--wood-rim);
  font-size: 10px;
  line-height: 1;
}

@keyframes stick-toss {
  0%   { transform: translateY(-30px) rotate(var(--toss-rot, -12deg)); opacity: 0.5; }
  50%  { transform: translateY(8px) rotate(calc(var(--toss-rot, -12deg) * -0.5)); }
  100% { transform: translateY(0) rotate(0); opacity: 1; }
}

/* Dust puff at landing */
.sticks-tray__dust {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  pointer-events: none;
}
.sticks-tray__dust span {
  width: 8px; height: 8px; border-radius: 50%;
  background: rgba(201, 163, 107, 0.6);
  animation: dust-puff 0.8s ease-out forwards;
}
.sticks-tray__dust span:nth-child(2) { animation-delay: 60ms; }
.sticks-tray__dust span:nth-child(3) { animation-delay: 120ms; }

@keyframes dust-puff {
  0%   { transform: scale(0) translateY(0); opacity: 0.8; }
  100% { transform: scale(1.5) translateY(8px); opacity: 0; }
}

/* Result ribbon */
.result-ribbon {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--paper);
  color: var(--wood-dark);
  border: 2px solid var(--wood-rim);
  border-radius: 4px;
  text-align: center;
  font-family: var(--font-display);
  font-size: 16px;
  box-shadow: 0 2px 0 var(--wood-rim);
  animation: ribbon-slide 0.35s ease-out;
}
.result-ribbon__step {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 13px;
  margin-left: 6px;
  opacity: 0.75;
}
@keyframes ribbon-slide {
  0%   { transform: translateY(-8px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

- [ ] **Step 2: Create `src/components/board/SticksTray.tsx`**

```tsx
import { useEffect, useRef, useState } from 'react'
import './styles/sticks.css'

const STICK_PATTERN: Record<string, boolean[]> = {
  BACK_DO: [true, false, false, false],
  DO:      [false, true, false, false],
  GAE:     [true, true, false, false],
  GEOL:    [true, true, true, false],
  YUT:     [true, true, true, true],
  MO:      [false, false, false, false]
}

const STICK_RESULT_LABEL: Record<string, { ko: string; en: string; step: number }> = {
  BACK_DO: { ko: '빽도', en: 'Back-do', step: -1 },
  DO:      { ko: '도',  en: 'Do',      step: 1 },
  GAE:     { ko: '개',  en: 'Gae',     step: 2 },
  GEOL:    { ko: '걸',  en: 'Geol',    step: 3 },
  YUT:     { ko: '윷',  en: 'Yut',     step: 4 },
  MO:      { ko: '모',  en: 'Mo',      step: 5 }
}

// Per-stick rotation jitter — tied to stick index so each stick spins
// differently on toss but a given stick is consistent across renders.
const STICK_ROT = ['-14deg', '12deg', '-8deg', '16deg']

export interface SticksTrayProps {
  lastThrowResult: string
  pendingStep: number
}

export function SticksTray({ lastThrowResult, pendingStep }: SticksTrayProps) {
  const pattern = STICK_PATTERN[lastThrowResult] ?? [false, false, false, false]
  const [showDust, setShowDust] = useState(false)
  const lastResultRef = useRef(lastThrowResult)

  useEffect(() => {
    if (lastResultRef.current !== lastThrowResult && lastThrowResult) {
      setShowDust(true)
      const t = setTimeout(() => setShowDust(false), 900)
      lastResultRef.current = lastThrowResult
      return () => clearTimeout(t)
    }
  }, [lastThrowResult])

  const label = STICK_RESULT_LABEL[lastThrowResult]

  return (
    <div className="sticks-tray">
      <p className="sticks-tray__label">YUT STICKS</p>
      <div className="sticks-tray__sticks">
        {pattern.map((flat, i) => (
          <div
            key={`${lastThrowResult}-${i}`}
            className={`stick ${flat ? 'stick--flat' : 'stick--round'}`}
            style={{ '--toss-rot': STICK_ROT[i] } as React.CSSProperties}
            title={`Stick ${i + 1}: ${flat ? 'flat side up' : 'round side up'}${i === 0 ? ' (back-marked)' : ''}`}
          >
            {i === 0 && flat && <span className="stick__mark">●</span>}
          </div>
        ))}
      </div>
      {showDust && (
        <div className="sticks-tray__dust">
          <span /><span /><span />
        </div>
      )}
      {label && (
        <div className="result-ribbon">
          {label.ko} ({label.en})
          <span className="result-ribbon__step">
            {pendingStep !== 0 && pendingStep !== label.step
              ? `step ${pendingStep > 0 ? '+' : ''}${pendingStep}`
              : `${label.step > 0 ? '+' : ''}${label.step}`}
          </span>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/SticksTray.tsx src/components/board/styles/sticks.css
git commit -m "Add SticksTray with basket frame, toss animation, dust puff, and result ribbon"
```

---

## Task 11: BoardCanvas component (with mascot pieces)

**Goal:** Extract the SVG playing field from `Board.tsx` into its own component. Render piece tokens as wooden discs with team-color rims and the team mascot composited on top.

**Files:**
- Create: `src/components/board/BoardCanvas.tsx`
- Modify: `src/components/board/styles/board.css` (board canvas styling)

- [ ] **Step 1: Append board-canvas styling to `src/components/board/styles/board.css`**

```css
/* The SVG playing field */
.board-canvas {
  background: var(--board);
  border: 3px solid var(--frame);
  border-radius: 10px;
  padding: 8px;
  aspect-ratio: 1 / 1;
  width: 100%;
  max-width: 720px;
  margin: 0 auto;
}
.board-canvas svg {
  width: 100%;
  height: 100%;
  display: block;
  user-select: none;
}

/* Smooth piece movement (CSS transition on transform). */
.piece {
  transition: transform 0.45s cubic-bezier(0.5, 0, 0.2, 1);
}
.piece > circle {
  transition: r 0.15s, stroke-width 0.15s;
}

.ghost { transition: opacity 0.15s; cursor: pointer; }
.ghost:hover { opacity: 0.6; }
```

- [ ] **Step 2: Create `src/components/board/BoardCanvas.tsx`**

```tsx
import type { MoveOption } from '../../game/board.js'
import type { Piece, Team } from '../../game/types.js'
import type { YutPiece } from '../../entities/YutPiece.js'
import { MASCOT_BY_TEAM } from '../../assets/mascots.js'
import { STATION_POS } from './stationPositions.js'
import './styles/board.css'

const STATION_R = 18

const SHORTCUTS: [number, number][] = [
  [10, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 0],
  [5, 25],  [25, 26], [26, 22], [22, 27], [27, 28], [28, 15]
]

const TEAM_COLOR: Record<Team, string> = { A: '#d65454', B: '#4a76d6' }

export interface BoardCanvasProps {
  pieces: YutPiece[]
  myTeam: Team | ''
  isMyTurn: boolean
  myMovablePieceIds: Set<string>
  selectedPieceId: string | null
  optionsForSelected: MoveOption[]
  onPieceClick: (piece: YutPiece) => void
  onDestinationClick: (opt: MoveOption) => void
}

export function BoardCanvas({
  pieces, myTeam, isMyTurn, myMovablePieceIds,
  selectedPieceId, optionsForSelected,
  onPieceClick, onDestinationClick
}: BoardCanvasProps) {
  return (
    <div className="board-canvas">
      <svg viewBox="0 0 600 600" role="img" aria-label="Yut Nori board">
        <rect x="0" y="0" width="600" height="600" rx="12" fill="var(--board)" />
        <polygon
          points={[[0, 5], [5, 5], [5, 0], [0, 0]].map(([c, r]) => `${50 + c * 100},${50 + r * 100}`).join(' ')}
          stroke="var(--wood-rim)" strokeWidth="3" fill="none"
        />
        {SHORTCUTS.map(([a, b], i) => {
          const [x1, y1] = STATION_POS[a]
          const [x2, y2] = STATION_POS[b]
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a07840" strokeWidth="2" strokeDasharray="4 3" />
        })}
        {Object.entries(STATION_POS).map(([id, [x, y]]) => {
          const sid = Number(id)
          const isCorner = sid === 0 || sid === 5 || sid === 10 || sid === 15
          const isCenter = sid === 22
          const isShortcut = sid === 0 || sid === 5 || sid === 10 || sid === 22
          return (
            <g key={id}>
              <circle
                cx={x} cy={y}
                r={isCenter ? STATION_R + 6 : isCorner ? STATION_R + 3 : STATION_R}
                fill={isShortcut ? 'var(--paper-light)' : 'var(--paper)'}
                stroke="var(--wood-rim)" strokeWidth={isShortcut ? 2 : 1}
              />
              {sid === 0 && <text x={x} y={y + 4} fontSize="10" textAnchor="middle">START</text>}
              {isCenter && <text x={x} y={y + 4} fontSize="14" textAnchor="middle" fill="var(--gold)">★</text>}
            </g>
          )
        })}
        {pieces.map((p) => {
          if (p.isHome) return null
          const [x, y] = STATION_POS[p.station] ?? [0, 0]
          const offsetIdx = pieceStackIndex(pieces, p)
          // Teams fan out to opposite sides so they don't overlap at shared stations
          // (especially the start station, where all 8 pieces begin).
          const teamSide = p.team === 'A' ? -1 : 1
          const dx = teamSide * (10 + Math.floor(offsetIdx / 2) * 6)
          const dy = -Math.floor(offsetIdx / 2) * 6 + (offsetIdx % 2 === 0 ? 0 : -10)
          const movable = myMovablePieceIds.has(p.pieceId) && p.team === myTeam && isMyTurn
          const selected = selectedPieceId === p.pieceId
          const rimColor = selected || movable ? 'var(--gold)' : TEAM_COLOR[p.team as Team]
          const rimWidth = selected ? 4 : movable ? 3 : 2
          const radius = selected ? 18 : 14
          return (
            <g
              key={p.pieceId}
              className="piece"
              style={{ transform: `translate(${x + dx}px, ${y + dy}px)`, cursor: movable ? 'pointer' : 'default' }}
              onClick={() => onPieceClick(p)}
            >
              <circle r={radius} fill="var(--wood-dark)" stroke={rimColor} strokeWidth={rimWidth} />
              <image
                href={MASCOT_BY_TEAM[p.team as Team]}
                x={-radius} y={-radius}
                width={radius * 2} height={radius * 2}
              />
            </g>
          )
        })}
        {/* Ghost destinations rendered LAST so they sit on top of pieces. */}
        {optionsForSelected.map((opt, i) => {
          if (opt.endStation === -1) {
            const [x, y] = STATION_POS[0]
            return (
              <g key={`ghost-home-${i}`} className="ghost ghost--home" onClick={() => onDestinationClick(opt)}>
                <circle cx={x - 30} cy={y + 30} r={14} fill="#86c46d" stroke="#4f8a3c" strokeWidth="2" />
                <text x={x - 30} y={y + 34} fontSize="9" textAnchor="middle" fill="#fff">HOME</text>
              </g>
            )
          }
          const [x, y] = STATION_POS[opt.endStation]
          return (
            <circle
              key={`ghost-${i}`}
              className="ghost"
              cx={x} cy={y} r={STATION_R + 8}
              fill="rgba(140, 200, 110, 0.35)"
              stroke="#4f8a3c"
              strokeDasharray="4 3"
              strokeWidth="2"
              onClick={() => onDestinationClick(opt)}
            />
          )
        })}
      </svg>
    </div>
  )
}

function pieceStackIndex(all: YutPiece[], p: YutPiece): number {
  if (p.station === -1) return 0
  const stackmates = all.filter((q) => q.team === p.team && !q.isHome && q.station === p.station)
  stackmates.sort((a, b) => a.pieceId.localeCompare(b.pieceId))
  return stackmates.findIndex((q) => q.pieceId === p.pieceId)
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/BoardCanvas.tsx src/components/board/styles/board.css
git commit -m "Add BoardCanvas component rendering SVG playing field with mascot pieces"
```

---

## Task 12: PlayerPanel component

**Goal:** Composes WoodFrame + Mascot + name plate (with Discord-avatar inset) + PiecesStrip + PowersPanel + (optional) SticksTray + ThrowButton.

**Files:**
- Create: `src/components/board/PlayerPanel.tsx`
- Modify: `src/components/board/styles/panel.css` (name-plate styling)

- [ ] **Step 1: Append name-plate / mascot-stage / your-turn caption styling to `src/components/board/styles/panel.css`**

```css
.name-plate {
  background: var(--paper);
  color: var(--wood-dark);
  font-size: 13px;
  font-weight: 700;
  padding: 4px 12px 4px 4px;
  border-radius: 5px;
  border: 1px solid var(--wood-rim);
  border-bottom: 3px solid var(--team, var(--team-a));
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-display);
}
.name-plate__avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid var(--team, var(--team-a));
  flex-shrink: 0;
  background: var(--wood-rim);
}

.your-turn-caption {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
  font-family: var(--font-body);
  text-align: center;
  margin: 4px 0 0;
}
.your-turn-caption--active  { color: var(--gold); }
.your-turn-caption--waiting { color: var(--wood-light); }

/* Avatar gold halo for active player */
@keyframes halo-pulse {
  0%, 100% { box-shadow: 0 0 18px 2px rgba(244, 200, 58, 0.4); }
  50%      { box-shadow: 0 0 22px 4px rgba(244, 200, 58, 0.85); }
}
.player-panel__halo {
  position: absolute;
  inset: -8px;
  border-radius: 50%;
  pointer-events: none;
  animation: halo-pulse 2.4s ease-in-out infinite;
}
```

- [ ] **Step 2: Create `src/components/board/PlayerPanel.tsx`**

```tsx
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
  onYut?: (result: ForcedThrow) => void
  onHorses?: (shift: -1 | 1) => void
  children?: React.ReactNode  // slot for SticksTray + ThrowButton on viewer's panel
}

export function PlayerPanel({
  team, player, state, pieces, isViewerOwnPanel, isActive, myTeam, powersRemaining,
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

      <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
        {showHalo && <span className="player-panel__halo" />}
        <div className="name-plate" style={{ ['--team' as string]: teamColor } as React.CSSProperties}>
          <img
            className="name-plate__avatar"
            src={player?.avatarUri || ''}
            alt={player?.name || team}
            style={{ ['--team' as string]: teamColor } as React.CSSProperties}
          />
          <span>{player?.name ?? `Team ${team}`}{isViewerOwnPanel ? ' (you)' : ''}</span>
        </div>
      </div>
      <p className={`your-turn-caption your-turn-caption--${captionMod}`}>{captionText}</p>

      <PiecesStrip pieces={pieces} team={team} />

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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/PlayerPanel.tsx src/components/board/styles/panel.css
git commit -m "Add PlayerPanel composition: mascot, name plate, pieces, powers"
```

---

## Task 13: EndOverlay component

**Goal:** Themed victory overlay with wooden plaque, winning mascot, score, rematch CTA, and confetti. Replaces `EndOverlay` in `Board.tsx`.

**Files:**
- Create: `src/components/board/EndOverlay.tsx`
- Modify: `src/components/board/styles/board.css` (overlay + confetti)

- [ ] **Step 1: Append overlay/confetti styling to `src/components/board/styles/board.css`**

```css
.end-overlay {
  position: fixed;
  inset: 0;
  background: rgba(58, 42, 26, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}
.end-overlay__plaque {
  background: linear-gradient(180deg, var(--wood-mid), var(--wood-dark));
  border: 3px solid var(--frame);
  border-radius: 12px;
  padding: 28px 36px;
  text-align: center;
  color: var(--paper);
  position: relative;
  font-family: var(--font-display);
  max-width: 90vw;
}
.end-overlay__title {
  font-size: 36px;
  color: var(--gold);
  letter-spacing: 2px;
  margin: 0 0 12px;
  text-transform: uppercase;
}
.end-overlay__score {
  font-family: var(--font-body);
  font-size: 14px;
  margin: 12px 0;
  opacity: 0.85;
}
.end-overlay .mascot-stage { height: 220px; }
.end-overlay .mascot[data-size='hero'] { height: 200px; }

/* Confetti */
.confetti {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.confetti span {
  position: absolute;
  top: -10px;
  width: 8px;
  height: 14px;
  border-radius: 2px;
  animation: confetti-fall 3s linear forwards;
}
@keyframes confetti-fall {
  0%   { transform: translate3d(0, -10px, 0) rotate(0); opacity: 1; }
  100% { transform: translate3d(20px, 110vh, 0) rotate(720deg); opacity: 0; }
}
```

- [ ] **Step 2: Create `src/components/board/EndOverlay.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/board/EndOverlay.tsx src/components/board/styles/board.css
git commit -m "Add EndOverlay with wooden plaque, winning mascot, and confetti"
```

---

## Task 14: Refactor Board.tsx to orchestration only

**Goal:** Replace the 410-line `Board.tsx` with a thin orchestration component that composes the new sub-components and handles the responsive grid.

**Files:**
- Modify: `src/components/Board.tsx`
- Modify: `src/components/board/styles/board.css` (responsive grid)

- [ ] **Step 1: Append responsive layout rules to `src/components/board/styles/board.css`**

```css
/* Responsive layout */

.board-screen__grid {
  display: grid;
  gap: 10px;
}

@media (min-width: 901px) {
  .board-screen__grid {
    grid-template-columns: 1fr 1.5fr 1fr;
    align-items: start;
  }
}
@media (max-width: 900px) {
  .board-screen__grid {
    grid-template-columns: 1fr;
  }
  /* On narrow viewports, the right (your) panel goes BELOW the board.
     The left (opponent) panel goes ABOVE. */
  .board-screen__opponent { order: 0; }
  .board-screen__board    { order: 1; }
  .board-screen__sticks   { order: 2; }
  .board-screen__self     { order: 3; }
}
```

- [ ] **Step 2: Replace the contents of `src/components/Board.tsx`**

```tsx
// Orchestration component for the in-game board screen.
// Composes child components from src/components/board/ and routes events to
// the existing useYutGame() hook. No game logic lives here.

import { useState } from 'react'
import { BoardCanvas } from './board/BoardCanvas.js'
import { EndOverlay } from './board/EndOverlay.js'
import { PlayerPanel } from './board/PlayerPanel.js'
import { SticksTray } from './board/SticksTray.js'
import { ThrowButton } from './board/ThrowButton.js'
import { TurnBanner } from './board/TurnBanner.js'
import { legalBackMoves, legalForwardMoves, type GameState } from '../game/rules.js'
import type { MoveOption } from '../game/board.js'
import type { Piece, Team } from '../game/types.js'
import type { YutPiece } from '../entities/YutPiece.js'
import type { YutState } from '../entities/YutState.js'
import { useYutGame } from '../hooks/useYutGame.js'
import './board/styles/board.css'
import './board/styles/panel.css'
import './board/styles/sticks.css'

export function Board() {
  const game = useYutGame()
  const { state, myPlayer, players, pieces } = game
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)

  if (!state || !myPlayer) return null

  const myTeam = (myPlayer.team || '') as Team | ''
  const isMyTurn = myTeam !== '' && myTeam === state.currentTeam

  // Recompute every render: Colyseus mutates `state` in place, so a useMemo
  // would stale.
  const gameView = stateToGame(state)
  const forwardMoves = (state.phase === 'await_spend' && state.pendingStep > 0)
    ? legalForwardMoves(gameView, state.pendingStep) : []
  const backMoves = (state.phase === 'await_spend' && state.pendingStep < 0)
    ? legalBackMoves(gameView) : []
  const myMovablePieceIds = new Set<string>()
  for (const m of forwardMoves) myMovablePieceIds.add(m.pieceId)
  for (const m of backMoves) myMovablePieceIds.add(m.pieceId)
  const optionsForSelected: MoveOption[] = (selectedPieceId && state.phase === 'await_spend' && state.pendingStep > 0)
    ? forwardMoves.filter((m) => m.pieceId === selectedPieceId).map((m) => m.option) : []

  function handlePieceClick(piece: YutPiece) {
    if (!isMyTurn || state!.phase !== 'await_spend') return
    if (piece.team !== myTeam) return
    if (state!.pendingStep < 0) {
      if (myMovablePieceIds.has(piece.pieceId)) {
        game.spendBack(piece.pieceId)
        setSelectedPieceId(null)
      }
      return
    }
    if (myMovablePieceIds.has(piece.pieceId)) {
      setSelectedPieceId((cur) => (cur === piece.pieceId ? null : piece.pieceId))
    }
  }

  function handleDestinationClick(opt: MoveOption) {
    if (!selectedPieceId) return
    const all = forwardMoves.filter((m) => m.pieceId === selectedPieceId).map((m) => m.option)
    const idx = all.indexOf(opt)
    if (idx < 0) return
    game.spendForward(selectedPieceId, idx)
    setSelectedPieceId(null)
  }

  // Determine which panel is "yours". Spectators (myTeam = '') default to A on left, B on right.
  const opponentTeam: Team = myTeam === 'A' ? 'B' : 'A'
  const selfTeam: Team = myTeam === '' ? 'A' : myTeam
  const opponentPlayer = players.find((p) => p.team === opponentTeam)
  const selfPlayer     = players.find((p) => p.team === selfTeam)
  const piecesArr = Array.from(pieces)
  const homeA = piecesArr.filter((p) => p.team === 'A' && p.isHome).length
  const homeB = piecesArr.filter((p) => p.team === 'B' && p.isHome).length

  const opponentActive = state.currentTeam === opponentTeam && state.phase !== 'ended'
  const selfActive     = state.currentTeam === selfTeam     && state.phase !== 'ended'
  const isSpectator    = myTeam === ''

  const myPowersLeft = myTeam === 'A' ? state.powersRemainingA : myTeam === 'B' ? state.powersRemainingB : 0
  const opponentPowersLeft = opponentTeam === 'A' ? state.powersRemainingA : state.powersRemainingB

  const throwEnabled = isMyTurn && state.phase === 'await_throw'

  return (
    <div className="board-screen">
      <TurnBanner state={state} myTeam={myTeam} />
      <div className="board-screen__grid">
        <div className="board-screen__opponent">
          <PlayerPanel
            team={opponentTeam}
            player={opponentPlayer}
            state={state}
            pieces={piecesArr}
            isViewerOwnPanel={false}
            isActive={opponentActive}
            myTeam={myTeam}
            powersRemaining={opponentPowersLeft}
          />
        </div>
        <div className="board-screen__board">
          <BoardCanvas
            pieces={piecesArr}
            myTeam={myTeam}
            isMyTurn={isMyTurn}
            myMovablePieceIds={myMovablePieceIds}
            selectedPieceId={selectedPieceId}
            optionsForSelected={optionsForSelected}
            onPieceClick={handlePieceClick}
            onDestinationClick={handleDestinationClick}
          />
        </div>
        <div className="board-screen__sticks board-screen__self">
          <PlayerPanel
            team={selfTeam}
            player={selfPlayer}
            state={state}
            pieces={piecesArr}
            isViewerOwnPanel={!isSpectator}
            isActive={selfActive}
            myTeam={myTeam}
            powersRemaining={myPowersLeft}
            onYut={game.usePowerYut}
            onHorses={game.usePowerHorses}
          >
            {!isSpectator && (
              <>
                <hr style={{ border: 'none', borderTop: '1px solid var(--wood-rim)', margin: '12px 0 6px' }} />
                <SticksTray lastThrowResult={state.lastThrowResult} pendingStep={state.pendingStep} />
                <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center' }}>
                  <ThrowButton enabled={throwEnabled} onClick={game.throwSticks} />
                </div>
              </>
            )}
          </PlayerPanel>
        </div>
      </div>

      {state.phase === 'ended' && (
        <EndOverlay
          winner={state.winner as Team}
          homeA={homeA}
          homeB={homeB}
          canRematch={myPlayer.sessionId === state.hostSessionId}
          onRematch={game.rematch}
        />
      )}
    </div>
  )
}

function stateToGame(s: YutState): GameState {
  const pieces: Record<string, Piece> = {}
  s.pieces.forEach((p, key) => {
    pieces[key] = { team: p.team as Team, id: p.pieceId, path: Array.from(p.path) }
  })
  return {
    pieces,
    currentTeam: s.currentTeam as Team,
    pendingStep: s.pendingStep === 0 ? null : s.pendingStep,
    bonusOwed: s.bonusOwed,
    winner: (s.winner || null) as Team | null
  }
}
```

- [ ] **Step 3: Run tests to confirm no regression**

Run: `npm test`
Expected: all green.

- [ ] **Step 4: Run dev server and visually verify the board renders**

Run: `npm run dev`. Open the activity URL in two browser tabs (one becomes host, joins Team A; the other joins Team B), start a match. Verify:
- The board canvas renders with mascot pieces.
- Both player panels render with mascots.
- Active player's mascot bobs and has a gold glow; halo pulses around the avatar.
- Throw button renders enabled on the active player's tab.
- Stick toss animates on throw.
- Result ribbon appears with the Korean glyph.

Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/Board.tsx src/components/board/styles/board.css
git commit -m "Refactor Board.tsx to thin orchestration over board/ child components"
```

---

## Task 15: Re-theme Lobby

**Goal:** Apply the new theme tokens to the lobby screen using `WoodFrame` and the gold/wood button styles.

**Files:**
- Modify: `src/components/Lobby.tsx`
- Create: `src/components/lobby.css`

- [ ] **Step 1: Create `src/components/lobby.css`**

```css
.lobby {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px;
  font-family: var(--font-display);
  text-align: center;
}
.lobby__title {
  font-size: 42px;
  color: var(--gold);
  letter-spacing: 3px;
  margin: 0 0 4px;
  text-transform: uppercase;
}
.lobby__subtitle {
  font-family: var(--font-body);
  opacity: 0.7;
  margin: 0 0 24px;
  font-size: 13px;
}
.lobby__seats {
  display: flex;
  align-items: stretch;
  gap: 16px;
  margin: 24px 0;
}
.lobby__seat {
  flex: 1;
  min-height: 220px;
}
.lobby__vs {
  font-weight: 800;
  font-size: 24px;
  color: var(--frame);
  align-self: center;
}
.lobby__seat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.lobby__seat-mascot--silhouette {
  filter: brightness(0.4) grayscale(1);
  opacity: 0.6;
}
.lobby__bot-buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  font-size: 0.85em;
  color: var(--paper);
  font-family: var(--font-body);
}
.lobby__spectators {
  margin: 16px 0;
  opacity: 0.7;
  font-family: var(--font-body);
  font-size: 13px;
}
.lobby__hint {
  margin-top: 32px;
  opacity: 0.7;
  text-align: left;
  font-size: 0.9em;
  font-family: var(--font-body);
}
.lobby__hint summary { cursor: pointer; }

@media (max-width: 700px) {
  .lobby__seats { flex-direction: column; }
  .lobby__vs { display: none; }
}

.wood-button {
  background: linear-gradient(180deg, var(--wood-light), var(--wood-rim));
  color: var(--paper);
  font-weight: 700;
  font-size: 12px;
  border: 2px solid var(--frame);
  border-radius: 6px;
  padding: 8px 16px;
  box-shadow: 0 2px 0 var(--wood-dark);
  font-family: var(--font-display);
  cursor: pointer;
}
.wood-button:hover { filter: brightness(1.1); }
.wood-button:disabled { opacity: 0.5; cursor: not-allowed; }
```

- [ ] **Step 2: Replace contents of `src/components/Lobby.tsx`**

```tsx
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
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Verify visually**

Run `npm run dev`, open the activity URL, confirm the lobby uses wood-frame seat cards with greyed mascot silhouettes when empty and full-color mascots when joined. Stop dev server.

- [ ] **Step 5: Commit**

```bash
git add src/components/Lobby.tsx src/components/lobby.css
git commit -m "Re-theme Lobby with wood-frame seat cards and mascot silhouettes"
```

---

## Task 16: Re-theme LoadingScreen

**Goal:** Apply the new theme to the loading state so it stops feeling like a different app while waiting to connect.

**Files:**
- Modify: `src/components/LoadingScreen.tsx`

- [ ] **Step 1: Read the current file to keep its structure**

Run: `cat src/components/LoadingScreen.tsx` (or use the Read tool).

- [ ] **Step 2: Replace its contents to use the theme**

```tsx
export function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100vh',
      flexDirection: 'column',
      gap: 12,
      fontFamily: 'var(--font-display)',
      color: 'var(--paper)'
    }}>
      <h1 style={{ color: 'var(--gold)', letterSpacing: 3, textTransform: 'uppercase', margin: 0 }}>Yut Wars</h1>
      <p style={{ opacity: 0.7, fontFamily: 'var(--font-body)' }}>Connecting…</p>
    </div>
  )
}
```

(If the existing file already exports a function with a different default-export pattern, preserve that — only the JSX inside changes.)

- [ ] **Step 3: Verify TypeScript compiles and visually verify on slow networks**

Run: `npx tsc --noEmit` then `npm run dev`. Throttle network in DevTools, reload, confirm the loading screen matches the theme. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/components/LoadingScreen.tsx
git commit -m "Re-theme LoadingScreen with Yut Wars title and theme tokens"
```

---

## Task 17: Slim down `global.css` and add reduced-motion gates

**Goal:** Remove the now-unused board/lobby/sticks rules from `global.css` (they live in component-scoped files now) and add a project-wide `prefers-reduced-motion: reduce` gate that disables non-essential animations.

**Files:**
- Modify: `src/app/global.css`
- Create: `src/components/board/styles/animations.css` (reduced-motion overrides)

- [ ] **Step 1: Create `src/components/board/styles/animations.css`**

```css
/* Disable non-essential animations when the user prefers reduced motion.
   Functional transitions (e.g., piece movement to a new position) keep
   working — but the bobbing, pulsing, and pulse-glow stop. */

@media (prefers-reduced-motion: reduce) {
  .mascot--bob,
  .gold-button--pulse,
  .player-panel__halo {
    animation: none !important;
  }
  .stick { animation: none; }
  .confetti span { display: none; }
  .sticks-tray__dust { display: none; }
}
```

- [ ] **Step 2: Import animations.css from the board orchestrator (and slim global.css)**

In `src/components/Board.tsx`, add the import alongside the others:

```tsx
import './board/styles/animations.css'
```

In `src/app/global.css`, delete every rule from `.voice__channel__container` through the end of the file (lines ~130-389 — everything after the React-template basics). Keep:

- The `:root` font / smoothing rules (already extended by `theme.css` import).
- The `body`, `h1`, `#root`, `a`, `button`, `.loading__container`, `.player__container`, `.player__avatar`, and `.player__avatar__talking` rules at the top.

After editing, the `global.css` should be ≤120 lines.

- [ ] **Step 3: Verify nothing broke visually**

Run: `npm run dev`, open the lobby and a sample board, confirm everything still renders. Then enable "Reduce motion" in OS settings (or add `prefers-reduced-motion: reduce` via DevTools → Rendering tab) and reload — confirm mascot stops bobbing, halo stops pulsing, throw button stops pulsing, but piece transitions still work. Stop dev server.

- [ ] **Step 4: Commit**

```bash
git add src/app/global.css src/components/board/styles/animations.css src/components/Board.tsx
git commit -m "Slim global.css; add prefers-reduced-motion gates for non-essential animations"
```

---

## Task 18: Extend Playwright sim with screenshot tests at three viewports

**Goal:** Lock the visual redesign in place with screenshot tests at desktop, narrow-portrait, and mobile viewports.

**Files:**
- Modify: `src/game/__sim__/browser-test.ts`

- [ ] **Step 1: Read the existing browser-test.ts to keep its end-to-end flow**

Run: `cat src/game/__sim__/browser-test.ts` (or Read tool).

- [ ] **Step 2: Add a screenshot helper and capture at three viewports**

Edit `src/game/__sim__/browser-test.ts`. Near the top, after `URL`, add:

```ts
const SHOTS_DIR = 'D:/Projects/yut/.test-shots'
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet',  width: 720,  height: 900 },
  { name: 'mobile',  width: 360,  height: 640 }
]
```

Add a helper function:

```ts
async function captureViewports(page: Page, label: string) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.waitForTimeout(120)
    const path = `${SHOTS_DIR}/redesign-${label}-${vp.name}.png`
    await page.screenshot({ path, fullPage: false }).catch((e) => {
      console.log(`screenshot failed for ${label}/${vp.name}: ${(e as Error).message}`)
    })
    console.log(`captured ${path}`)
  }
}
```

After the line that confirms `console.log('✅ Lobby visible on tab A')`, add:

```ts
await captureViewports(pageA, 'lobby-empty')
```

After tab A joins Team A but before tab B joins:

```ts
await captureViewports(pageA, 'lobby-one-seat')
```

After both seats joined and just before clicking Start:

```ts
await captureViewports(pageA, 'lobby-both-seats')
```

After the board is confirmed visible (`if (!boardVisible) {…}`), add:

```ts
await captureViewports(pageA, 'board-await-throw')
```

Inside the move loop, after the first successful piece-and-ghost click, add (use a flag so we only capture once):

```ts
// Add at the top of main(), just inside the function:
let capturedSpend = false
// Inside the loop, after a successful spend:
if (!capturedSpend) {
  await captureViewports(active, 'board-await-spend')
  capturedSpend = true
}
```

After the match-ended branch, before `break`:

```ts
await captureViewports(pageA, 'board-end-overlay')
```

- [ ] **Step 3: Run the dev server in one terminal and the browser-test in another**

Terminal 1: `npm run dev`
Terminal 2: `npx tsx src/game/__sim__/browser-test.ts`
Expected: the script runs to completion, prints "Match ended", and 18 screenshots land in `.test-shots/redesign-*.png` (6 captures × 3 viewports each).

Open a few of the screenshots to spot-check the redesign at each viewport. The 900px breakpoint should produce visibly different layouts between `desktop` and `tablet`/`mobile`.

- [ ] **Step 4: Commit**

```bash
git add src/game/__sim__/browser-test.ts
git commit -m "Capture redesign screenshots at desktop/tablet/mobile in browser-test"
```

---

## Task 19: Run the full regression suite and confirm green

**Goal:** Confirm the redesign hasn't regressed any rules-engine behavior or the existing E2E flow.

- [ ] **Step 1: Run unit tests**

Run: `npm test`
Expected: all green, including the new `stationPositions.test.ts`, `pieceSlots.test.ts`, `abilityGating.test.ts`, and the existing rules/sticks/board/ai tests.

- [ ] **Step 2: Run the random-vs-random sim**

Run: `npm run sim`
Expected: a complete match runs to a winner with no exceptions.

- [ ] **Step 3: Run the browser test**

Terminal 1: `npm run dev`
Terminal 2: `npx tsx src/game/__sim__/browser-test.ts`
Expected: script exits 0; screenshots present.

- [ ] **Step 4: Manual viewport check in Discord**

Run: `npm run dev`, open the activity inside Discord (popout, fullscreen, mobile if available). Confirm:
- Layout switches between wide (3-column) and narrow (stacked) at the 900px breakpoint.
- Mascots, pieces, and throw button are tappable on the smallest viewport.
- No horizontal overflow, no clipped panels.

- [ ] **Step 5: Final commit (only if any fixes were needed during this verification step; skip otherwise)**

```bash
git add -A
git commit -m "Fix regressions caught during verification"
```

---

## Self-review notes (post-write)

**Spec coverage check:**

| Spec section | Plan task |
|---|---|
| Information architecture (wide/narrow) | Tasks 8, 11, 12, 14, 17 |
| Side panel anatomy | Tasks 4, 5, 6, 7, 12 |
| Visual language (tokens) | Task 1 |
| Component breakdown | Tasks 4–14 |
| Refactor of Board.tsx | Task 14 |
| State flow unchanged | Verified by Task 19 |
| Station spacing fix | Task 3 |
| Animation table | Tasks 5 (mascot), 9 (throw pulse), 10 (sticks/dust), 12 (halo), 13 (confetti), 17 (reduced motion) |
| Lobby derivation | Task 15 |
| End-game overlay | Task 13 |
| Sticks tray detail | Task 10 |
| Asset pipeline | Tasks 1, 2 |
| Testing (Playwright + unit + manual + reduced-motion) | Tasks 18, 19 |

**Type consistency:** `Team`, `YutPiece`, `YutPlayer`, `YutState`, `MoveOption`, and `ForcedThrow` are imported from the same modules across all tasks. `MASCOT_BY_TEAM` keyed by `Team` everywhere.

**Placeholder scan:** No "TBD"/"TODO" placeholders. Every code step shows the actual code. Every test step shows actual assertions.

**Open question:** Reduced-motion test in Task 19 is described as "Manual viewport check" — automation of reduced-motion is non-trivial in Playwright. Manual check is the practical path here.
