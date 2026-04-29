// Single source of truth for team mascot art. Other components import from
// here so swapping mascots (or letting players pick mascots later) is a
// one-file change.
//
// Vite's asset pipeline turns these imports into hashed URLs at build time
// and fails the build loudly if the PNG is missing.

import teamAUrl from './mascots/team-a.png'
import teamBUrl from './mascots/team-b.png'

import type { Team } from '../game/types.js'

export const MASCOT_BY_TEAM: Record<Team, string> = {
  A: teamAUrl,
  B: teamBUrl
}

export const MASCOT_NAME_BY_TEAM: Record<Team, string> = {
  A: 'Mushroom',
  B: 'Snail'
}
