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
import './board/styles/animations.css'

export function Board() {
  const game = useYutGame()
  const { state, myPlayer, players, pieces } = game
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)

  if (!state || !myPlayer) return null

  const myTeam = (myPlayer.team || '') as Team | ''
  const isMyTurn = myTeam !== '' && myTeam === state.currentTeam

  const piecesArr = Array.from(pieces)

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

  function handleStripClick(pieceId: string) {
    const piece = piecesArr.find((p) => p.pieceId === pieceId)
    if (piece) handlePieceClick(piece)
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
  const selfTeam: Team = myTeam === 'A' ? 'A' : 'B'      // your team, or default to B for spectators
  const opponentTeam: Team = selfTeam === 'A' ? 'B' : 'A' // the other side
  const opponentPlayer = players.find((p) => p.team === opponentTeam)
  const selfPlayer     = players.find((p) => p.team === selfTeam)
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
            movablePieceIds={myMovablePieceIds}
            selectedPieceId={selectedPieceId}
            onSlotClick={handleStripClick}
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
