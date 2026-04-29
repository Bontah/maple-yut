// Headless live playthrough against the running dev server.
// Connects two real Colyseus clients over WebSocket, joins teams, drives a full
// match through the protocol, and uses each power at least once to verify the
// real network path (not the in-process integration test).
//
// Run with the dev server up:  npx tsx src/game/__sim__/play-live.ts

import { Client } from 'colyseus.js'
import { legalBackMoves, legalForwardMoves, type GameState } from '../rules.js'
import type { Piece, Team } from '../types.js'
import type { YutState } from '../../entities/YutState.js'

const WS_URL = process.env.YUT_WS ?? 'ws://localhost:3000/colyseus'

function gameStateFromSchema(s: YutState): GameState {
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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

async function waitFor(state: () => YutState, predicate: (s: YutState) => boolean, timeoutMs = 5000) {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		if (predicate(state())) return
		await sleep(20)
	}
	throw new Error(`waitFor timed out: phase=${state().phase} currentTeam=${state().currentTeam}`)
}

async function main() {
	console.log(`Connecting two clients to ${WS_URL}…`)
	const clientA = new Client(WS_URL)
	const clientB = new Client(WS_URL)

	const roomA = await clientA.joinOrCreate<YutState>('game', {
		channelId: 'live-test',
		roomName: 'live-test',
		userId: 'u-alice',
		name: 'Alice',
		avatarUri: ''
	})
	const roomB = await clientB.joinOrCreate<YutState>('game', {
		channelId: 'live-test',
		roomName: 'live-test',
		userId: 'u-bob',
		name: 'Bob',
		avatarUri: ''
	})
	console.log(`A sessionId=${roomA.sessionId}  B sessionId=${roomB.sessionId}`)

	// Wait until both rooms see both players in the lobby.
	await waitFor(() => roomA.state, (s) => s.players.size === 2)
	console.log(`Lobby has ${roomA.state.players.size} players, phase=${roomA.state.phase}`)

	roomA.send('join_team', { team: 'A' })
	roomB.send('join_team', { team: 'B' })
	await waitFor(() => roomA.state, (s) => {
		const a = Array.from(s.players.values()).find((p) => p.team === 'A')
		const b = Array.from(s.players.values()).find((p) => p.team === 'B')
		return Boolean(a) && Boolean(b)
	})
	console.log('Both teams seated.')

	roomA.send('start', {})
	await waitFor(() => roomA.state, (s) => s.phase === 'await_throw')
	console.log(`Match started. Powers: A=${roomA.state.powersRemainingA} B=${roomA.state.powersRemainingB}`)

	const stats = {
		throws: 0,
		yutPower: 0,
		horsesPower: 0,
		captures: 0,
		spends: 0
	}
	let lastPiecesAtStart = { A: 4, B: 4 }
	let usedYutOnce = false
	let usedHorsesOnce = false

	const MAX_ACTIONS = 5000
	let i = 0
	while (roomA.state.phase !== 'ended' && i < MAX_ACTIONS) {
		const s = roomA.state
		const team = s.currentTeam as Team
		const cur = team === 'A' ? roomA : roomB

		if (s.phase === 'await_throw') {
			// Once per match, exercise Control Yut on team A if available.
			if (!usedYutOnce && team === 'A' && s.powersRemainingA > 0 && !s.powerUsedThisTurn) {
				console.log(`[turn ${i}] A uses Control Yut → MO`)
				cur.send('use_power_yut', { result: 'MO' })
				stats.yutPower++
				usedYutOnce = true
				await waitFor(() => roomA.state, (st) => st.phase === 'await_spend' || st.lastThrowResult === 'MO')
				continue
			}
			cur.send('throw', {})
			stats.throws++
			await waitFor(() => roomA.state, (st) => st.phase !== 'await_throw' || st.currentTeam !== team)
			continue
		}

		if (s.phase === 'await_spend') {
			// Once per match, exercise Control Horses on team A if available and step is shiftable.
			if (
				!usedHorsesOnce && team === 'A' &&
				s.powersRemainingA > 0 && !s.powerUsedThisTurn &&
				s.pendingStep >= 1 && s.pendingStep <= 4
			) {
				console.log(`[turn ${i}] A uses Control Horses +1 (was step ${s.pendingStep})`)
				cur.send('use_power_horses', { shift: 1 })
				stats.horsesPower++
				usedHorsesOnce = true
				const before = s.pendingStep
				await waitFor(() => roomA.state, (st) => st.pendingStep === before + 1)
				continue
			}
			const game = gameStateFromSchema(s)
			const step = s.pendingStep
			const piecesAtStartBefore = countAtStart(game)
			if (step > 0) {
				const moves = legalForwardMoves(game, step)
				if (moves.length === 0) {
					console.log(`[turn ${i}] step=${step} but no legal forward moves`)
					await sleep(30)
					i++
					continue
				}
				const pick = moves[0]
				const same = moves.filter((m) => m.pieceId === pick.pieceId)
				const idx = same.findIndex((m) => m.option === pick.option)
				cur.send('spend', { kind: 'forward', pieceId: pick.pieceId, optionIndex: idx })
			} else if (step < 0) {
				const backs = legalBackMoves(game)
				if (backs.length === 0) {
					await sleep(30)
					i++
					continue
				}
				cur.send('spend', { kind: 'back', pieceId: backs[0].pieceId })
			}
			stats.spends++
			await waitFor(() => roomA.state, (st) => st.pendingStep !== step || st.phase === 'ended')

			// Detect captures by checking opponent piece counts at start increasing.
			const after = roomA.state
			const game2 = gameStateFromSchema(after)
			const piecesAtStartAfter = countAtStart(game2)
			const oppTeam = team === 'A' ? 'B' : 'A'
			const newlyCaptured = piecesAtStartAfter[oppTeam] - piecesAtStartBefore[oppTeam]
			if (newlyCaptured > 0) stats.captures += newlyCaptured
			lastPiecesAtStart = piecesAtStartAfter

			i++
			continue
		}

		await sleep(20)
		i++
	}

	// Snapshot end-of-match values BEFORE rematch (Colyseus state mutates in place).
	const endPhase = roomA.state.phase
	const endWinner = roomA.state.winner
	console.log()
	console.log('===== Result =====')
	console.log(`Phase: ${endPhase}`)
	console.log(`Winner: ${endWinner}`)
	console.log(`Throws: ${stats.throws}`)
	console.log(`Spends: ${stats.spends}`)
	console.log(`Captures: ${stats.captures}`)
	console.log(`Control Yut used: ${stats.yutPower}`)
	console.log(`Control Horses used: ${stats.horsesPower}`)
	console.log(`Powers remaining: A=${roomA.state.powersRemainingA} B=${roomA.state.powersRemainingB}`)
	console.log(`Pieces at start at end: A=${lastPiecesAtStart.A} B=${lastPiecesAtStart.B}`)

	// Test rematch.
	console.log()
	console.log('Testing rematch…')
	roomA.send('rematch', {})
	await waitFor(() => roomA.state, (s) => s.phase === 'await_throw' && s.winner === '')
	console.log(`After rematch: phase=${roomA.state.phase}, powers A=${roomA.state.powersRemainingA} B=${roomA.state.powersRemainingB}`)
	const allAtStart = Array.from(roomA.state.pieces.values()).every((p) => p.path.length === 0)
	console.log(`All pieces back at start: ${allAtStart}`)

	roomA.leave()
	roomB.leave()

	const ok = endPhase === 'ended'
		&& (endWinner === 'A' || endWinner === 'B')
		&& stats.yutPower === 1
		&& stats.horsesPower === 1
		&& allAtStart
	console.log()
	console.log(ok ? '✅ Live playthrough passed' : '❌ Live playthrough FAILED')
	process.exit(ok ? 0 : 1)
}

function countAtStart(game: GameState): Record<'A' | 'B', number> {
	let a = 0, b = 0
	for (const p of Object.values(game.pieces)) {
		if (p.path.length === 0) {
			if (p.team === 'A') a++
			else b++
		}
	}
	return { A: a, B: b }
}

main().catch((e) => {
	console.error('Live playthrough crashed:', e)
	process.exit(1)
})
