// Headless browser end-to-end test using Playwright + Chromium.
// Opens two independent browser contexts (= two separate "users" with
// separate sessionStorage), drives the React UI through a full match,
// and captures all console output + page errors so we can see exactly
// what's broken when something doesn't render.
//
// Run with the dev server up:  npx tsx src/game/__sim__/browser-test.ts

import { chromium, type ConsoleMessage, type Page } from 'playwright'

const URL = process.env.YUT_URL ?? 'http://localhost:3000'

const SHOTS_DIR = 'D:/Projects/yut/.test-shots'
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'tablet',  width: 720,  height: 900 },
  { name: 'mobile',  width: 360,  height: 640 }
]

function tagLog(tag: string) {
	return (msg: ConsoleMessage) => {
		const t = msg.type()
		if (t === 'debug' || t === 'info') return
		console.log(`[${tag} ${t}] ${msg.text()}`)
	}
}

async function captureViewports(page: Page, label: string) {
  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height })
    await page.waitForTimeout(120)
    const path = `${SHOTS_DIR}/redesign-${label}-${vp.name}.png`
    await page.screenshot({ path, fullPage: false }).catch((e) => {
      console.log(`screenshot failed for ${label}/${vp.name}: ${(e as Error).message}`)
    })
    console.log(`captured ${path}`)
  }
}

async function dumpDom(page: Page, label: string) {
	const summary = await page.evaluate(() => {
		const root = document.getElementById('root')
		const text = (root?.innerText ?? '').slice(0, 600)
		const html = (root?.innerHTML ?? '').slice(0, 800)
		return { text, html }
	})
	console.log(`---- DOM[${label}] ----`)
	console.log(`text: ${JSON.stringify(summary.text)}`)
	console.log(`html: ${summary.html}`)
}

async function main() {
	console.log(`Launching headless Chromium against ${URL}…`)
	const browser = await chromium.launch({ headless: true })
	const ctxA = await browser.newContext()
	const ctxB = await browser.newContext()
	const pageA = await ctxA.newPage()
	const pageB = await ctxB.newPage()

	pageA.on('console', tagLog('A'))
	pageB.on('console', tagLog('B'))
	pageA.on('pageerror', (e) => console.log(`[A pageerror] ${e.message}\n${e.stack}`))
	pageB.on('pageerror', (e) => console.log(`[B pageerror] ${e.message}\n${e.stack}`))
	pageA.on('requestfailed', (r) => console.log(`[A reqfail] ${r.url()} — ${r.failure()?.errorText}`))
	pageB.on('requestfailed', (r) => console.log(`[B reqfail] ${r.url()} — ${r.failure()?.errorText}`))
	pageA.on('crash', () => console.log('[A] PAGE CRASHED'))
	pageB.on('crash', () => console.log('[B] PAGE CRASHED'))

	console.log('--- Loading tab A ---')
	await pageA.goto(URL, { waitUntil: 'domcontentloaded' })
	console.log('--- Loading tab B ---')
	await pageB.goto(URL, { waitUntil: 'domcontentloaded' })

	// Wait briefly for React to hydrate + Discord SDK ready + Colyseus connect.
	await pageA.waitForTimeout(1500)
	await dumpDom(pageA, 'A after load')

	// Try to find the lobby. If it's not there, dump and bail.
	const lobbyVisibleA = await pageA.locator('.lobby').isVisible().catch(() => false)
	if (!lobbyVisibleA) {
		console.log('!! Lobby not visible on tab A. Dumping and aborting.')
		await dumpDom(pageA, 'A bail')
		await browser.close()
		process.exit(2)
	}
	console.log('✅ Lobby visible on tab A')
	await captureViewports(pageA, 'lobby-empty')

	const lobbyVisibleB = await pageB.locator('.lobby').isVisible().catch(() => false)
	console.log(`Lobby visible on tab B: ${lobbyVisibleB}`)

	// Join Team A on tab A. The Seat component for Team A has label 'Team A (red)'.
	console.log('--- Tab A joins Team A ---')
	await pageA.locator('.lobby__seat', { hasText: 'Team A' }).getByRole('button', { name: 'Join' }).click()
	await pageA.waitForTimeout(500)
	await captureViewports(pageA, 'lobby-one-seat')

	console.log('--- Tab B joins Team B ---')
	await pageB.locator('.lobby__seat', { hasText: 'Team B' }).getByRole('button', { name: 'Join' }).click()
	await pageB.waitForTimeout(500)
	await captureViewports(pageA, 'lobby-both-seats')

	// Tab A is host (first joiner) → click Start Match.
	console.log('--- Tab A starts the match ---')
	const startBtn = pageA.getByRole('button', { name: /Start Match/i })
	await startBtn.click()
	await pageA.waitForTimeout(800)

	// Wait for the board to appear.
	const boardVisible = await pageA.locator('.board-svg').isVisible().catch(() => false)
	console.log(`Board visible on tab A: ${boardVisible}`)
	if (!boardVisible) {
		await dumpDom(pageA, 'A no board')
		await browser.close()
		process.exit(3)
	}
	await captureViewports(pageA, 'board-await-throw')

	// Drive the match by repeatedly:
	//   - On the active player's tab, click "Throw sticks" if enabled.
	//   - On their tab, click any movable piece (.piece with cursor pointer).
	//   - Click any visible destination ghost.
	const MAX_ROUNDS = 30
	let actionsTaken = 0
	let stuckRounds = 0
	let capturedSpend = false
	for (let i = 0; i < MAX_ROUNDS; i++) {
		if (i % 5 === 0) {
			const aBanner = await pageA.locator('.board-header__banner').textContent().catch(() => '?')
			const bBanner = await pageB.locator('.board-header__banner').textContent().catch(() => '?')
			console.log(`[round ${i}] A=${JSON.stringify(aBanner)}  B=${JSON.stringify(bBanner)}  actions=${actionsTaken}`)
		}
		// Decide which tab is current. The header shows "Your throw" / "Pick a piece" on the active tab.
		// Active tab's banner is either "Your throw" or "Pick a piece (...)".
		const isMineRe = /^(Your throw|Pick a piece)/i
		const aIsMine = await pageA.locator('.board-header__banner', { hasText: isMineRe }).count() > 0
		const bIsMine = await pageB.locator('.board-header__banner', { hasText: isMineRe }).count() > 0
		const ended = await pageA.locator('.board-end').isVisible().catch(() => false)
		if (ended) {
			console.log('✅ Match ended.')
			const winnerText = await pageA.locator('.board-end__inner h2').textContent()
			console.log(`Winner banner: ${winnerText}`)
			await captureViewports(pageA, 'board-end-overlay')
			break
		}

		const active = aIsMine ? pageA : bIsMine ? pageB : null
		const activeName = aIsMine ? 'A' : bIsMine ? 'B' : '?'
		if (!active) {
			stuckRounds++
			if (stuckRounds > 20) {
				console.log('!! Neither tab thinks it is their turn. Dumping.')
				await dumpDom(pageA, 'stuck A')
				await dumpDom(pageB, 'stuck B')
				break
			}
			await pageA.waitForTimeout(200)
			continue
		}
		stuckRounds = 0

		// Click Throw if enabled.
		const throwBtn = active.getByRole('button', { name: /Throw sticks/i })
		if (await throwBtn.isEnabled().catch(() => false)) {
			await throwBtn.click()
			actionsTaken++
			await active.waitForTimeout(150)
			continue
		}

		// Otherwise we're in await_spend — click first movable piece, then first ghost.
		// Pieces stack visually so the click target may be obscured by another sibling
		// piece on top; use force:true to bypass Playwright's hit-test (any movable A
		// piece is a valid selection, and the rules let stacks travel together).
		const pieces = active.locator('.piece[style*="cursor: pointer"]')
		const pieceCount = await pieces.count()
		console.log(`[round ${i}] active=${activeName}, ${pieceCount} movable pieces`)
		if (pieceCount > 0) {
			try { await active.screenshot({ path: `D:/Projects/yut/.test-shots/before-click-${activeName}-${i}.png` }) } catch {}
			await pieces.first().click({ force: true })
			await active.waitForTimeout(150)
			try { await active.screenshot({ path: `D:/Projects/yut/.test-shots/after-click-${activeName}-${i}.png` }) } catch {}
			const ghosts = active.locator('.ghost')
			const ghostCount = await ghosts.count()
			console.log(`[round ${i}] ${ghostCount} ghost destinations`)
			if (ghostCount > 0) {
				await ghosts.first().click({ force: true })
				actionsTaken++
				await active.waitForTimeout(150)
				if (!capturedSpend) {
					await captureViewports(active, 'board-await-spend')
					capturedSpend = true
				}
			} else {
				// Back-do path: clicking the piece directly resolves the move.
				actionsTaken++
			}
			continue
		}
		// Couldn't find a movable piece — wait and retry.
		await active.waitForTimeout(200)
	}

	console.log(`Total actions taken: ${actionsTaken}`)
	const ended = await pageA.locator('.board-end').isVisible().catch(() => false)
	console.log(`Match ended: ${ended}`)

	await browser.close()
	process.exit(ended ? 0 : 1)
}

main().catch((e) => {
	console.error('Browser test crashed:', e)
	process.exit(1)
})
