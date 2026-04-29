# Yut Wars — Visual Redesign

**Status:** approved (brainstorm phase)
**Date:** 2026-04-29
**Scope:** purely presentational. No game-logic changes except a 9-line pixel-position correction.

## Goal

Transform the current placeholder-art Yut Nori board into a Maple-Story-inspired "Yut Wars" experience matching the user's reference image. Apply the new visual language across every surface (lobby, board, side panels, sticks tray, powers, end-game overlay).

## Decisions locked

| Decision | Choice |
|---|---|
| Scope | Every surface — lobby, board, panels, sticks tray, powers, end-game |
| Asset strategy | Maple-inspired original art using CSS/SVG + provided mascot PNGs (not Nexon assets, no IP risk) |
| Layout | Responsive — wide 3-column above 900px, stacked single-column below |
| Character art | Discord avatars for player identity (small inset on name plate) + team mascot art for the visual hero and pieces |
| Team A mascot | `player_a.png` (green slime, provided by user) |
| Team B mascot | `player_b.png` (blue snail, provided by user) |
| Team A color | `#d65454` (red) — kept distinct from mascot color |
| Team B color | `#4a76d6` (blue) — happens to match mascot |
| Display font | Jua (Google Fonts; Korean-friendly Hangul coverage) |
| Body font | Inter (already in stack) |
| Wood texture | SVG `feTurbulence` filter as a CSS background-image overlay (zero asset weight) |
| Animation | Pure CSS keyframes + transitions; respects `prefers-reduced-motion` |

## Information architecture

### Wide layout (≥900px)

```
+-----------------------------------------------+
|  HEADER BANNER  ("Yut Wars · Team A's Throw") |
+----------+------------------+-----------------+
| LEFT     |     BOARD        |  RIGHT          |
| PANEL    |     (square,     |  PANEL          |
| (Team A) |     centered)    |  (Team B)       |
|          |                  |  + sticks tray  |
|          |                  |  + throw button |
+----------+------------------+-----------------+
```

3-column CSS grid (`1fr 1.5fr 1fr`). The viewer's panel is always on the right, the opponent's on the left, regardless of which team is which — so "your" controls (sticks tray + throw button) live consistently in the right column. (Spectators get a default view with Team A on the left, Team B on the right; they see no sticks tray.)

### Narrow layout (<900px)

```
+---------------------------+
|  HEADER BANNER            |
+---------------------------+
|  OPPONENT STRIP           |
|  (avatar+name+pieces row) |
+---------------------------+
|  BOARD (full width)       |
+---------------------------+
|  STICKS TRAY (horizontal) |  ← basket lying flat, 4 sticks rendered
|  + result ribbon          |    horizontally; sits between board and you
+---------------------------+
|  YOUR STRIP               |
|  (avatar+name+pieces row) |
|  + THROW BUTTON inline    |
+---------------------------+
|  POWERS ROW               |
+---------------------------+
```

Single column. Pieces strip is inline next to avatar (no separate row) since vertical space is the scarce resource. The sticks tray rotates 90° from the wide layout — basket lies horizontal, sticks render as horizontal bars — so it fits in a shorter strip without losing visual identity.

### Side panel anatomy (per team)

```
+----------- WoodFrame ------------+
|  [corner bracket]   [bracket]    |
|     +----------------+           |
|     |                |           |
|     |   MASCOT       |           |  ← mascot stage (130px tall)
|     |   (bobs when   |              radial team-color spotlight
|     |    active)     |              gold drop-shadow when active
|     +----------------+           |
|                                  |
|     [avatar][PlayerName]         |  ← name plate w/ Discord avatar inset
|         YOUR TURN                |  ← caption: "YOUR TURN" or "WAITING"
|                                  |
|  HORSES · 2 / 4 HOME             |
|  +---+ +---+ +---+ +---+         |  ← pieces strip (4 slots)
|  | 🐌| | 🐌| | 🐌| | 🐌|         |     home/onboard/start states
|  | ★ | | ★ | | 14| | dim|        |
|  +---+ +---+ +---+ +---+         |
|                                  |
|  ─────────────────────           |
|  POWERS         ●●               |  ← charge pips: filled = available, dim = spent
|                                  |     reflects state.powersRemainingA/B (max 2 in maple mode)
|  +-------+ +-------+             |
|  | ⚡Yut | |⚡Horse|              |  ← ability buttons w/ tooltips
|  +-------+ +-------+             |
|                                  |
|  [bracket]            [bracket]  |
+----------------------------------+
```

Right panel adds below powers:

```
|  YUT STICKS                      |
|  ┌──────────┐                    |  ← basket frame
|  │  ═══ ═══ │                    |     4 sticks
|  │  ═══ ═══ │                    |
|  └──────────┘                    |
|  [    THROW STICKS    ]          |  ← gold CTA
|  ┌────────── result ribbon ──┐   |
|  │  도 (Do)  +1              │   |
|  └───────────────────────────┘   |
```

## Visual language (design tokens)

CSS variables in `theme.css`:

```css
:root {
  --wood-darkest: #2a1a0a;   /* page bg */
  --wood-dark:    #3a2a1a;   /* panel bg, ink */
  --wood-mid:     #5a3820;   /* panel gradient */
  --wood-rim:     #6b4520;   /* borders, depth */
  --wood-light:   #8a5e34;   /* button face */
  --frame:        #c9a36b;   /* brass frame */
  --board:        #d4b888;   /* play surface */
  --paper:        #f4e4c4;   /* name plate, body text */
  --paper-light:  #fff7e0;   /* center star, highlight */
  --gold:         #f4c83a;   /* CTA, your-turn glow */
  --team-a:       #d65454;
  --team-b:       #4a76d6;
}
```

Typography: `Jua` for display/UI headings (chunky Korean-friendly), `Inter` for body/numbers/labels (already in stack).

Wood texture: a single SVG `feTurbulence` filter encoded as a data URL, applied as `background-image` with `opacity: 0.18` overlay on panels.

Frame ornament: `WoodFrame` component renders 3px brass border + optional 18×18px gold corner brackets via absolutely-positioned `<div>`s with two adjacent borders.

Buttons:
- **Gold** (primary CTA: Throw, Rematch) — gold gradient, wood-rim border, `box-shadow: 0 3px 0 var(--wood-rim)` for tactile depth, Jua font, uppercase letterspacing.
- **Wood** (secondary: powers, lobby actions) — wood gradient, brass border, `box-shadow: 0 2px 0 var(--wood-dark)`, Jua font.

## Component breakdown

```
src/
  app/
    Activity.tsx                       (unchanged)
    global.css                         (slimmed: resets only)
    theme.css                          (NEW — design tokens, font @import)
  components/
    Board.tsx                          (CHANGED — orchestration only)
    Lobby.tsx                          (CHANGED — re-themed)
    LoadingScreen.tsx                  (CHANGED — re-themed)
    board/
      BoardCanvas.tsx                  (NEW — SVG playing field, stations, pieces, ghosts)
      PlayerPanel.tsx                  (NEW — wood frame, mascot, name plate, strip, powers)
      PiecesStrip.tsx                  (NEW — 4-slot grid, per-state styling)
      PowersPanel.tsx                  (CHANGED — themed, tooltips, charge pips)
      SticksTray.tsx                   (NEW — basket, sticks, toss animation, result ribbon)
      ThrowButton.tsx                  (NEW — gold CTA + disabled states)
      TurnBanner.tsx                   (NEW — header banner)
      EndOverlay.tsx                   (CHANGED — themed victory plaque + confetti)
      WoodFrame.tsx                    (NEW — reusable wrapper: gradient + brass border + brackets + noise)
      Mascot.tsx                       (NEW — image w/ optional bob/glow; size variants)
    board/styles/
      board.css                        (NEW)
      panel.css                        (NEW)
      sticks.css                       (NEW)
  components/
    board/
      stationPositions.ts              (NEW — extracted from Board.tsx; pure data + helper, testable in vitest)
  assets/
    mascots/
      team-a.png                       (NEW — slime)
      team-b.png                       (NEW — snail)
    mascots.ts                         (NEW — MASCOT_BY_TEAM map)
```

### Component responsibilities

- **`BoardCanvas`** — owns the SVG. Renders stations, shortcut paths, piece tokens (wood-disc + team-rim + mascot composition), ghost destinations. Reads `gameView`, `selectedPieceId`, `myMovablePieceIds` via props. Knows nothing about side panels, sticks, or lobby.
- **`PlayerPanel`** — one team's column. Composes `WoodFrame`, `Mascot` (panel-hero size), name plate (Discord avatar inset), `PiecesStrip`, `PowersPanel`. Two instances render side-by-side or top/bottom.
- **`PiecesStrip`** — 4-slot grid. Each slot is `Mascot` (token size) + state styling (home / on-board / start) + station-number badge or ★.
- **`SticksTray`** — basket frame, 4 sticks rendered from `STICK_PATTERN`, toss animation on result change, result ribbon.
- **`WoodFrame`** — the *only* component knowing about the brass border + corner brackets + noise overlay. Both `PlayerPanel` and lobby seat cards use it.
- **`Mascot`** — the *only* consumer of mascot PNG paths. Three size variants: panel-hero (130px, optional bob+glow), strip-token (~32px), board-piece (~40px). Mascot art comes from `MASCOT_BY_TEAM` constants.

### Refactor of `Board.tsx`

Becomes orchestration only — read state via `useYutGame()`, distribute to children. Target ~80 lines (down from 410).

### State flow

Unchanged. All components read from the existing `useYutGame()` hook. No new context, no new state machine. Server-side game logic, Colyseus schemas, AI, and rules engine are untouched.

## Station spacing fix

`STATION_POS` in `src/components/Board.tsx:18-29` places diagonal stations at integer cells while the center is at (2.5, 2.5), producing two half-length segments adjacent to the center. **Fix:** extract `STATION_POS` to `src/components/board/stationPositions.ts` (pure data + a `gp(col, row)` helper), correct the diagonal coordinates so all six segments per diagonal are equal length, and unit-test the result with vitest.

```ts
// Before
20: gp(4, 1),     21: gp(3, 2),     22: gp(2.5, 2.5),
23: gp(2, 3),     24: gp(1, 4),
25: gp(4, 4),     26: gp(3, 3),     27: gp(2, 2),     28: gp(1, 1)

// After
20: gp(25/6, 5/6),    21: gp(20/6, 10/6),   22: gp(2.5, 2.5),
23: gp(10/6, 20/6),   24: gp(5/6, 25/6),
25: gp(25/6, 25/6),   26: gp(20/6, 20/6),
27: gp(10/6, 10/6),   28: gp(5/6, 5/6)
```

`STATION_POS` is the only consumer of these coordinates. `SHORTCUTS` (in `Board.tsx`), `src/game/board.ts`, and the move/path logic do not reference them — they all work in station IDs (0..28). Zero rules-engine impact.

## Animation & interaction

Pure CSS keyframes + transitions. No animation libraries. All effects gated on `prefers-reduced-motion: no-preference`.

| Trigger | Effect |
|---|---|
| Active player's mascot | Continuous bob (`translateY 0 → -6px`, 2.4s ease-in-out infinite) + gold drop-shadow |
| Turn start | Avatar gold halo pulses (1s) |
| Stick toss | Existing `@keyframes stickToss` + per-stick rotation variance + dust puff (3 SVG circles scaling 0→1.5 + fading) |
| Piece movement | Existing transform transition (450ms cubic-bezier(0.5, 0, 0.2, 1)) + arrival bounce (overshoot 4px, settle) |
| Capture | Captured piece fades + scales to 0 at station; dust burst plays; strip slot animates on-board → at-start with shake |
| Home arrival | Strip slot transitions dark → gold-fill; inner ★ scales 0→1 (300ms ease-out) |
| Throw button | Gold pulse when available; press-down compresses 2px and removes drop-shadow |
| Ability use | Button flashes gold then dims; charge pip transitions filled → spent |
| Win | Overlay fades in; winning mascot scales up to 200px and bobs; team-color confetti SVG particles drift down |

## Lobby (themed derivation)

- Wood-frame container with **"YUT WARS"** banner in Jua/gold.
- Two `WoodFrame` seat cards side-by-side (stacked on narrow). Each shows: mascot silhouette (grey when empty, full color when joined) → name plate when seated, gold "Join" button, wood "Add Bot · Easy/Medium/Hard" buttons (host only).
- Brass "vs" divider between cards.
- Spectator row at bottom: Discord avatars + names, no frame chrome.
- Gold "Start Match" CTA enabled only when both seats filled (host); non-host sees a wood "Only host can start" placeholder.
- Existing `<details>` "How to test locally" copy preserved; just restyled.

## End-game overlay

- Full-screen translucent wood backdrop (`rgba(58, 42, 26, 0.85)`).
- Wooden plaque centered with corner brackets containing: **"VICTORY!"** in Jua, winning mascot scaled to 200px (bobbing), score line (`"Slime — 4/4 home, Snail — 1/4 home"`), gold "Rematch" button (host) or wood "Waiting for host…" (others).
- Confetti SVG particles drifting down in winning-team color.

## Sticks tray detail

- 4 sticks rendered vertically in a basket frame: wooden U-shape with brass rivets at top corners.
- **Idle:** sticks shown in last-throw pattern (existing `STICK_PATTERN` lookup).
- **Toss:** sticks lift, each rotates a slightly different angle, settle into new pattern.
- **Result ribbon:** parchment-style ribbon slides out from behind the basket on result, showing the Korean glyph (도/개/걸/윷/모) large in Jua, English label + step count smaller. Persists until next throw or end of spend phase.
- Throw button sits directly below the basket as the gold CTA.

## Asset pipeline

- `src/assets/mascots/team-a.png` and `team-b.png` — provided by the user.
- `src/assets/mascots.ts` exports `MASCOT_BY_TEAM: Record<Team, string>` mapping team → image URL. Single source of truth; swapping or extending mascots later is a one-file change.
- Mascot images are imported via Vite's asset pipeline (`import slimeUrl from '../assets/mascots/team-a.png'`) so they get hashed/cached and the import fails loudly if missing.
- Fonts loaded from Google Fonts via `<link>` in `index.html` (preconnect + `display=swap`). Subset to Latin + Korean (`text=` parameter or `&subset=latin,korean`) to keep the Jua download small.
- SVG noise filter is inlined as a data URL in `theme.css`. No additional HTTP request.

## Testing strategy

| Layer | Approach |
|---|---|
| Visual regression | Extend Playwright sim with screenshot tests at 1280×720, 720×900, 360×640 viewports. Cover lobby (empty / one seat / both seats) and board (await_throw / await_spend with selection / capture frame / win). |
| Unit | Snapshot test for `BoardCanvas` confirming 29 station circles render at the new even-spacing coordinates. |
| Game-logic regression | Run existing `YutRoom.test.ts` post-refactor. No changes expected. |
| Reduced motion | Smoke test that animations disable cleanly under `prefers-reduced-motion: reduce`. |
| Manual | Discord activity in popout (~640×360), fullscreen (~1280×720), and mobile (~360×640). Confirm 900px breakpoint transitions cleanly. |

## Out of scope (deferred)

- Mascot picker in the lobby (architecture supports it; UI not in this redesign).
- Sound effects / music.
- Spectator chat or emote system.
- Animated mascot sprites (current mascots are static PNGs; bob is a CSS transform, not an animation cycle).
- 2v2 mode visuals (current code is 1v1 + spectators).

## Risks / open questions

- **Mascot color vs team color** — Team A is red but the slime is green. Decision: keep them split (mascot art = personality, team color = identity). Acknowledged at design-review time.
- **Bundle size** — two mascot PNGs + Jua font subset. Should fit comfortably under any sane budget but worth measuring after first build.
- **Accessibility** — `aria-label`s preserved on the SVG board; tooltips on ability buttons accessible via keyboard focus; `prefers-reduced-motion` respected. Color isn't the only signal: name + caption + frame all carry team identity.
