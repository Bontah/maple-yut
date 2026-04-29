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
