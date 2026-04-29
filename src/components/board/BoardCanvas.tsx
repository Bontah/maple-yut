import type { MoveOption } from '../../game/board.js'
import type { Team } from '../../game/types.js'
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
        {(() => {
          // Group on-board pieces by (team, station). Stable (path=[]) and home pieces don't render here.
          const stacks = new Map<string, YutPiece[]>()
          for (const p of pieces) {
            if (p.isHome) continue
            if (p.path.length === 0) continue
            const key = `${p.team}@${p.station}`
            const arr = stacks.get(key)
            if (arr) arr.push(p)
            else stacks.set(key, [p])
          }
          // Sort each stack by pieceId for deterministic representative selection.
          const stackEntries: { key: string; stack: YutPiece[] }[] = []
          for (const [key, stack] of stacks) {
            stack.sort((a, b) => a.pieceId.localeCompare(b.pieceId))
            stackEntries.push({ key, stack })
          }
          return stackEntries.map(({ key, stack }) => {
            const representative = stack[0]
            const station = representative.station
            const team = representative.team as Team
            const [x, y] = STATION_POS[station] ?? [0, 0]
            // Match the station's display radius so the piece fills the circle.
            const isCorner = station === 0 || station === 5 || station === 10 || station === 15
            const isCenter = station === 22
            const stationR = isCenter ? STATION_R + 6 : isCorner ? STATION_R + 3 : STATION_R
            // Selection / movability: any piece in the stack qualifies (rules-side they move together).
            const selected = stack.some((p) => selectedPieceId === p.pieceId)
            const movable = stack.some((p) => myMovablePieceIds.has(p.pieceId)) && team === myTeam && isMyTurn
            const rimColor = selected || movable ? 'var(--gold)' : TEAM_COLOR[team]
            const rimWidth = selected ? 4 : movable ? 3 : 2
            return (
              <g
                key={key}
                className="piece"
                style={{ transform: `translate(${x}px, ${y}px)`, cursor: movable ? 'pointer' : 'default' }}
                onClick={() => onPieceClick(representative)}
              >
                <circle r={stationR} fill="var(--wood-dark)" stroke={rimColor} strokeWidth={rimWidth} />
                <image
                  href={MASCOT_BY_TEAM[team]}
                  x={-stationR} y={-stationR}
                  width={stationR * 2} height={stationR * 2}
                />
                {stack.length > 1 && (
                  <g transform={`translate(${stationR - 6}, ${-stationR + 6})`}>
                    <circle r={10} fill="var(--gold)" stroke="var(--wood-rim)" strokeWidth={1.5} />
                    <text fontSize="11" fontWeight="800" textAnchor="middle" y={4} fill="var(--wood-dark)" fontFamily="var(--font-body)">×{stack.length}</text>
                  </g>
                )}
              </g>
            )
          })
        })()}
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
