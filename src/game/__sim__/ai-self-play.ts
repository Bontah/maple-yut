// AI self-play harness. Runs N matches between each pair of difficulties,
// printing win rates so we can verify the difficulty ladder.
//
// Run: npx tsx src/game/__sim__/ai-self-play.ts [N]

import { playMatch, randomPolicy } from '../engine.js'
import { createRandom } from '../random.js'
import { easyPolicy, hardPolicy, mediumPolicy } from '../ai/index.js'
import type { Policy } from '../engine.js'

const N = Number(process.argv[2] ?? 200)

interface Lineup {
	name: string
	policy: Policy
}

const lineups: Lineup[] = [
	{ name: 'random', policy: randomPolicy },
	{ name: 'easy', policy: easyPolicy },
	{ name: 'medium', policy: mediumPolicy },
	{ name: 'hard', policy: hardPolicy }
]

const rng = createRandom(0xa15ee5)

interface MatchupResult {
	a: string
	b: string
	winsA: number
	winsB: number
	totalTurns: number
	totalCaptures: number
}

const results: MatchupResult[] = []
const start = Date.now()

for (let i = 0; i < lineups.length; i++) {
	for (let j = i + 1; j < lineups.length; j++) {
		const A = lineups[i]
		const B = lineups[j]
		let winsA = 0, winsB = 0, turns = 0, caps = 0
		for (let k = 0; k < N; k++) {
			// alternate seats so first-mover advantage cancels out
			const swap = k % 2 === 1
			const polA = swap ? B.policy : A.policy
			const polB = swap ? A.policy : B.policy
			const { stats } = playMatch(polA, polB, rng)
			const winnerName = stats.winner === 'A'
				? (swap ? B.name : A.name)
				: (swap ? A.name : B.name)
			if (winnerName === A.name) winsA++
			else winsB++
			turns += stats.turns
			caps += stats.captures
		}
		results.push({
			a: A.name, b: B.name,
			winsA, winsB,
			totalTurns: turns,
			totalCaptures: caps
		})
	}
}

const elapsed = Date.now() - start
console.log(`\n=== AI self-play — ${N} matches per pairing — ${elapsed}ms total ===\n`)
console.log('Pairing'.padEnd(22) + 'Wins (A vs B)'.padEnd(22) + 'AvgTurns  AvgCaps')
console.log('-'.repeat(64))
for (const r of results) {
	const total = r.winsA + r.winsB
	const pa = ((r.winsA / total) * 100).toFixed(1) + '%'
	const pb = ((r.winsB / total) * 100).toFixed(1) + '%'
	const turns = (r.totalTurns / total).toFixed(1)
	const caps = (r.totalCaptures / total).toFixed(2)
	console.log(`${r.a} vs ${r.b}`.padEnd(22) + `${pa} / ${pb}`.padEnd(22) + `${turns.padEnd(10)}${caps}`)
}
console.log()
