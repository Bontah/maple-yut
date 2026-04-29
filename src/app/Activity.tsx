import { Board } from '../components/Board.js'
import { Lobby } from '../components/Lobby.js'
import { useYutGame } from '../hooks/useYutGame.js'

export const Activity = () => {
	const { state, connectError } = useYutGame()

	if (connectError) {
		return (
			<div className="error-screen">
				<h2>Could not connect</h2>
				<p>{connectError}</p>
			</div>
		)
	}

	if (!state) {
		return <div className="loading__container">Connecting to room…</div>
	}

	return state.phase === 'lobby' ? <Lobby /> : <Board />
}
