// Phase 1 verification: Monte Carlo of random-vs-random matches.
// Run with: pnpm sim   (or: npx tsx src/game/__sim__/random-vs-random.ts [N])

import { playMatch, randomPolicy } from '../engine.js'
import { createRandom } from '../random.js'

const N = Number(process.argv[2] ?? 100_000)

let winsA = 0
let winsB = 0
let totalTurns = 0
let totalThrows = 0
let totalCaptures = 0
let maxObservedStack = 0
let maxObservedTurns = 0

const rng = createRandom(0x59757470)  // 'Yutp'
const start = Date.now()

for (let i = 0; i < N; i++) {
	const { stats } = playMatch(randomPolicy, randomPolicy, rng)
	if (stats.winner === 'A') winsA++
	else winsB++
	totalTurns += stats.turns
	totalThrows += stats.throws
	totalCaptures += stats.captures
	if (stats.maxStackSize > maxObservedStack) maxObservedStack = stats.maxStackSize
	if (stats.turns > maxObservedTurns) maxObservedTurns = stats.turns
}

const elapsedMs = Date.now() - start

console.log(`\n=== Yut Nori — Random vs Random — ${N.toLocaleString()} matches ===\n`)
console.log(`Elapsed: ${elapsedMs}ms (${(N / (elapsedMs / 1000)).toFixed(0)} matches/sec)`)
console.log(`Win rate A (goes first): ${((winsA / N) * 100).toFixed(2)}%`)
console.log(`Win rate B            : ${((winsB / N) * 100).toFixed(2)}%`)
console.log(`Mean turns/match     : ${(totalTurns / N).toFixed(2)}`)
console.log(`Mean throws/match    : ${(totalThrows / N).toFixed(2)}`)
console.log(`Mean captures/match  : ${(totalCaptures / N).toFixed(2)}`)
console.log(`Max turns observed   : ${maxObservedTurns}`)
console.log(`Max stack observed   : ${maxObservedStack}`)
console.log()
