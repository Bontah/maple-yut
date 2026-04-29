// SVG-based Yut Nori board with placeholder art (rectangles + circles + text).
// Renders the live YutState; lets the current player throw, pick a piece + destination,
// and use the two Maple psychic powers (Control Yut / Control Horses).

import { useMemo, useState } from 'react'
import type { MoveOption } from '../game/board.js'
import { legalBackMoves, legalForwardMoves, type GameState } from '../game/rules.js'
import type { Piece, Team } from '../game/types.js'
import type { YutPiece } from '../entities/YutPiece.js'
import type { YutState } from '../entities/YutState.js'
import { type ForcedThrow, useYutGame } from '../hooks/useYutGame.js'

// 6×6 logical grid mapped onto a 600×600 SVG canvas.
const PADDING = 50
const CELL = 100  // grid cell size in pixels
const STATION_R = 18

const STATION_POS: Record<number, [number, number]> = {
	0: gp(0, 5),
	1: gp(1, 5), 2: gp(2, 5), 3: gp(3, 5), 4: gp(4, 5),
	5: gp(5, 5),
	6: gp(5, 4), 7: gp(5, 3), 8: gp(5, 2), 9: gp(5, 1),
	10: gp(5, 0),
	11: gp(4, 0), 12: gp(3, 0), 13: gp(2, 0), 14: gp(1, 0),
	15: gp(0, 0),
	16: gp(0, 1), 17: gp(0, 2), 18: gp(0, 3), 19: gp(0, 4),
	20: gp(4, 1), 21: gp(3, 2), 22: gp(2.5, 2.5), 23: gp(2, 3), 24: gp(1, 4),
	25: gp(4, 4), 26: gp(3, 3), 27: gp(2, 2), 28: gp(1, 1)
}

function gp(col: number, row: number): [number, number] {
	return [PADDING + col * CELL, PADDING + row * CELL]
}

const SHORTCUTS: [number, number][] = [
	[10, 20], [20, 21], [21, 22], [22, 23], [23, 24], [24, 0],
	[5, 25], [25, 26], [26, 22], [22, 27], [27, 28], [28, 15]
]

const TEAM_COLOR: Record<Team, string> = { A: '#e15050', B: '#4a76d6' }

const STICK_RESULT_LABEL: Record<string, string> = {
	BACK_DO: '빽도 (Back-do, −1)',
	DO: '도 (Do, +1)',
	GAE: '개 (Gae, +2)',
	GEOL: '걸 (Geol, +3)',
	YUT: '윷 (Yut, +4)  +bonus',
	MO: '모 (Mo, +5)  +bonus'
}

// Map a result name → a 4-stick flat pattern. Index 0 is the back-marked stick.
const STICK_PATTERN: Record<string, boolean[]> = {
	BACK_DO: [true, false, false, false],
	DO: [false, true, false, false],
	GAE: [true, true, false, false],
	GEOL: [true, true, true, false],
	YUT: [true, true, true, true],
	MO: [false, false, false, false]
}

const FORCED_OPTIONS: { result: ForcedThrow; label: string }[] = [
	{ result: 'DO', label: '도 (+1)' },
	{ result: 'GAE', label: '개 (+2)' },
	{ result: 'GEOL', label: '걸 (+3)' },
	{ result: 'YUT', label: '윷 (+4)' },
	{ result: 'MO', label: '모 (+5)' }
]

export function Board() {
	const game = useYutGame()
	const { state, myPlayer, pieces } = game
	const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)
	const [showYutPicker, setShowYutPicker] = useState(false)
	const [showHorsesPicker, setShowHorsesPicker] = useState(false)

	if (!state || !myPlayer) return null

	const isMyTurn = myPlayer.team === state.currentTeam && myPlayer.team !== ''

	const gameView = useMemo(() => stateToGame(state), [state])
	const forwardMoves = useMemo(() => {
		if (state.phase !== 'await_spend' || state.pendingStep <= 0) return []
		return legalForwardMoves(gameView, state.pendingStep)
	}, [gameView, state.phase, state.pendingStep])
	const backMoves = useMemo(() => {
		if (state.phase !== 'await_spend' || state.pendingStep >= 0) return []
		return legalBackMoves(gameView)
	}, [gameView, state.phase, state.pendingStep])

	const myMovablePieceIds = useMemo(() => {
		const ids = new Set<string>()
		for (const m of forwardMoves) ids.add(m.pieceId)
		for (const m of backMoves) ids.add(m.pieceId)
		return ids
	}, [forwardMoves, backMoves])

	const optionsForSelected: MoveOption[] = useMemo(() => {
		if (!selectedPieceId) return []
		if (state.phase !== 'await_spend') return []
		if (state.pendingStep > 0) {
			return forwardMoves.filter((m) => m.pieceId === selectedPieceId).map((m) => m.option)
		}
		return []
	}, [selectedPieceId, forwardMoves, state.phase, state.pendingStep])

	function onPieceClick(piece: YutPiece) {
		if (!isMyTurn || state!.phase !== 'await_spend') return
		if (piece.team !== myPlayer!.team) return
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

	function onDestinationClick(opt: MoveOption) {
		if (!selectedPieceId) return
		const all = forwardMoves.filter((m) => m.pieceId === selectedPieceId).map((m) => m.option)
		const idx = all.indexOf(opt)
		if (idx < 0) return
		game.spendForward(selectedPieceId, idx)
		setSelectedPieceId(null)
	}

	const myPowersLeft = myPlayer.team === 'A' ? state.powersRemainingA : state.powersRemainingB
	const canUseYut = isMyTurn && state.phase === 'await_throw' && myPowersLeft > 0 && !state.powerUsedThisTurn && state.mode === 'maple'
	const canUseHorses = isMyTurn && state.phase === 'await_spend' && myPowersLeft > 0 && !state.powerUsedThisTurn && state.mode === 'maple' && state.pendingStep >= 1 && state.pendingStep <= 5

	return (
		<div className="board-screen">
			<HeaderBar state={state} myTeam={myPlayer.team} isMyTurn={isMyTurn} />
			<svg className="board-svg" viewBox="0 0 600 600" role="img" aria-label="Yut Nori board">
				<rect x="0" y="0" width="600" height="600" rx="12" fill="#f4ecda" />
				<polygon
					points={[[0, 5], [5, 5], [5, 0], [0, 0]].map(([c, r]) => `${PADDING + c * CELL},${PADDING + r * CELL}`).join(' ')}
					stroke="#9d6f3a" strokeWidth="2" fill="none"
				/>
				{SHORTCUTS.map(([a, b], i) => {
					const [x1, y1] = STATION_POS[a]
					const [x2, y2] = STATION_POS[b]
					return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c8a878" strokeWidth="2" />
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
								fill={isShortcut ? '#fff7e0' : '#ffffff'}
								stroke="#9d6f3a" strokeWidth={isShortcut ? 2 : 1}
							/>
							{sid === 0 && <text x={x} y={y + 4} fontSize="10" textAnchor="middle">START</text>}
							{isCenter && <text x={x} y={y + 4} fontSize="10" textAnchor="middle">★</text>}
						</g>
					)
				})}
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
							style={{ cursor: 'pointer' }}
						/>
					)
				})}
				{pieces.map((p) => {
					if (p.isHome) return null
					const [x, y] = STATION_POS[p.station] ?? [0, 0]
					const offsetIdx = pieceStackIndex(pieces, p)
					const dx = (offsetIdx % 2 === 0 ? -1 : 1) * Math.floor(offsetIdx / 2) * 7
					const dy = -Math.floor(offsetIdx / 2) * 7
					const movable = myMovablePieceIds.has(p.pieceId) && p.team === myPlayer.team && isMyTurn
					const selected = selectedPieceId === p.pieceId
					return (
						<g
							key={p.pieceId}
							className="piece"
							style={{ transform: `translate(${x + dx}px, ${y + dy}px)`, cursor: movable ? 'pointer' : 'default' }}
							onClick={() => onPieceClick(p)}
						>
							<circle
								r={selected ? 16 : 13}
								fill={TEAM_COLOR[p.team as Team]}
								stroke={selected ? '#222' : movable ? '#444' : '#000'}
								strokeWidth={selected ? 3 : movable ? 2 : 1}
							/>
							<text y={4} fontSize="10" textAnchor="middle" fill="#fff" fontWeight="bold">
								{p.pieceId.slice(1)}
							</text>
						</g>
					)
				})}
			</svg>

			<Sticks lastThrowResult={state.lastThrowResult} />

			<div className="board-controls">
				<button onClick={game.throwSticks} disabled={!(isMyTurn && state.phase === 'await_throw')}>
					{isMyTurn && state.phase === 'await_throw'
						? 'Throw sticks'
						: state.phase === 'await_spend'
							? 'Pick a piece'
							: 'Wait…'}
				</button>
				{state.lastThrowResult && (
					<div className="board-result">
						{STICK_RESULT_LABEL[state.lastThrowResult] ?? state.lastThrowResult}
						{state.pendingStep !== 0 && state.pendingStep !== STICK_STEP(state.lastThrowResult) && (
							<span className="board-result__shifted"> → step {state.pendingStep > 0 ? '+' : ''}{state.pendingStep}</span>
						)}
					</div>
				)}
			</div>

			{state.mode === 'maple' && (
				<PowersPanel
					state={state}
					myTeam={myPlayer.team as Team | ''}
					canUseYut={canUseYut}
					canUseHorses={canUseHorses}
					showYutPicker={showYutPicker}
					setShowYutPicker={setShowYutPicker}
					showHorsesPicker={showHorsesPicker}
					setShowHorsesPicker={setShowHorsesPicker}
					onYut={(r) => { game.usePowerYut(r); setShowYutPicker(false) }}
					onHorses={(s) => { game.usePowerHorses(s); setShowHorsesPicker(false) }}
				/>
			)}

			{state.phase === 'ended' && (
				<EndOverlay
					winner={state.winner as Team}
					canRematch={myPlayer.sessionId === state.hostSessionId}
					onRematch={game.rematch}
				/>
			)}
		</div>
	)
}

function STICK_STEP(r: string): number {
	switch (r) {
		case 'BACK_DO': return -1
		case 'DO': return 1
		case 'GAE': return 2
		case 'GEOL': return 3
		case 'YUT': return 4
		case 'MO': return 5
		default: return 0
	}
}

function HeaderBar({ state, myTeam, isMyTurn }: { state: YutState; myTeam: string; isMyTurn: boolean }) {
	let banner: string
	if (state.phase === 'ended') banner = `Match over — Team ${state.winner} wins!`
	else if (state.phase === 'await_throw') {
		banner = isMyTurn ? 'Your throw' : `Team ${state.currentTeam}'s throw`
	}
	else if (state.phase === 'await_spend') {
		const dir = state.pendingStep < 0 ? 'back' : `+${state.pendingStep}`
		banner = isMyTurn ? `Pick a piece (${dir})` : `Team ${state.currentTeam} is picking (${dir})`
	}
	else banner = ''
	return (
		<div className="board-header">
			<div className="board-header__banner">{banner}</div>
			<div className="board-header__teams">
				<span style={{ color: TEAM_COLOR.A }}>● Team A</span>
				<span style={{ color: TEAM_COLOR.B }}>● Team B</span>
				{myTeam && <span className="board-header__me">You: Team {myTeam}</span>}
			</div>
		</div>
	)
}

function Sticks({ lastThrowResult }: { lastThrowResult: string }) {
	const pattern = STICK_PATTERN[lastThrowResult] ?? [false, false, false, false]
	return (
		<div className="board-sticks-row">
			{pattern.map((flat, i) => (
				<div
					key={`${lastThrowResult}-${i}`}
					className={`stick stick--${flat ? 'flat' : 'round'}`}
					title={`Stick ${i + 1}: ${flat ? 'flat side up' : 'round side up'}${i === 0 ? ' (back-marked)' : ''}`}
				>
					{i === 0 && flat && <span className="stick__mark">●</span>}
				</div>
			))}
		</div>
	)
}

interface PowersPanelProps {
	state: YutState
	myTeam: Team | ''
	canUseYut: boolean
	canUseHorses: boolean
	showYutPicker: boolean
	setShowYutPicker: (b: boolean) => void
	showHorsesPicker: boolean
	setShowHorsesPicker: (b: boolean) => void
	onYut: (r: ForcedThrow) => void
	onHorses: (s: -1 | 1) => void
}

function PowersPanel({
	state, myTeam, canUseYut, canUseHorses,
	showYutPicker, setShowYutPicker, showHorsesPicker, setShowHorsesPicker,
	onYut, onHorses
}: PowersPanelProps) {
	return (
		<div className="board-powers">
			<div className="board-powers__counts">
				Powers — <span style={{ color: TEAM_COLOR.A }}>A: {state.powersRemainingA}</span>
				{' / '}
				<span style={{ color: TEAM_COLOR.B }}>B: {state.powersRemainingB}</span>
				{state.powerUsedThisTurn && <span className="board-powers__used"> · power used this turn</span>}
			</div>
			{myTeam && (
				<div className="board-powers__buttons">
					<div>
						<button onClick={() => setShowYutPicker(!showYutPicker)} disabled={!canUseYut}>
							Control Yut{showYutPicker ? ' ▾' : ' ▸'}
						</button>
						{showYutPicker && canUseYut && (
							<div className="board-powers__picker">
								{FORCED_OPTIONS.map((o) => (
									<button key={o.result} onClick={() => onYut(o.result)}>{o.label}</button>
								))}
							</div>
						)}
					</div>
					<div>
						<button onClick={() => setShowHorsesPicker(!showHorsesPicker)} disabled={!canUseHorses}>
							Control Horses{showHorsesPicker ? ' ▾' : ' ▸'}
						</button>
						{showHorsesPicker && canUseHorses && (
							<div className="board-powers__picker">
								<button onClick={() => onHorses(-1)} disabled={state.pendingStep <= 1}>−1 step</button>
								<button onClick={() => onHorses(1)} disabled={state.pendingStep >= 5}>+1 step</button>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	)
}

function EndOverlay({ winner, canRematch, onRematch }: { winner: Team; canRematch: boolean; onRematch: () => void }) {
	return (
		<div className="board-end">
			<div className="board-end__inner">
				<h2>Team {winner} wins!</h2>
				{canRematch ? (
					<button onClick={onRematch}>Rematch</button>
				) : (
					<p style={{ opacity: 0.7 }}>Waiting for host to rematch…</p>
				)}
			</div>
		</div>
	)
}

// ---------- helpers ----------

function pieceStackIndex(all: YutPiece[], p: YutPiece): number {
	if (p.station === -1) return 0
	const stackmates = all.filter((q) => q.team === p.team && !q.isHome && q.station === p.station)
	stackmates.sort((a, b) => a.pieceId.localeCompare(b.pieceId))
	return stackmates.findIndex((q) => q.pieceId === p.pieceId)
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
