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
        {pieces.map((p) => {
          if (p.isHome) return null
          if (p.path.length === 0) return null   // stable — rendered in the side-panel strip
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
