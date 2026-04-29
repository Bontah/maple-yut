// Pure predicates derived from the YutRoom message handlers in
// src/rooms/YutRoom.ts handleUsePowerYut/handleUsePowerHorses.

import type { Team } from '../../game/types.js'

export interface AbilityState {
  phase: string             // 'await_throw' | 'await_spend' | 'ended' | ...
  mode: string              // 'maple' | 'classic' | ...
  currentTeam: string       // the team whose turn it is right now
  powerUsedThisTurn: boolean
  pendingStep: number
}

export function canUseControlYut(state: AbilityState, myTeam: Team | '', powersRemaining: number): boolean {
  if (state.mode !== 'maple') return false
  if (myTeam === '' || state.currentTeam !== myTeam) return false
  if (state.phase !== 'await_throw') return false
  if (state.powerUsedThisTurn) return false
  if (powersRemaining <= 0) return false
  return true
}

export function canUseControlHorses(state: AbilityState, myTeam: Team | '', powersRemaining: number): boolean {
  if (state.mode !== 'maple') return false
  if (myTeam === '' || state.currentTeam !== myTeam) return false
  if (state.phase !== 'await_spend') return false
  if (state.powerUsedThisTurn) return false
  if (powersRemaining <= 0) return false
  if (state.pendingStep < 1 || state.pendingStep > 5) return false
  return true
}
