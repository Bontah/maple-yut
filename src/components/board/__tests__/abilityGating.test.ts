import { describe, it, expect } from 'vitest'
import { canUseControlYut, canUseControlHorses } from '../abilityGating.js'

const baseState = {
  phase: 'await_throw',
  mode: 'maple',
  currentTeam: 'A',
  powerUsedThisTurn: false,
  pendingStep: 0
} as const

describe('canUseControlYut', () => {
  it('returns true when await_throw, maple mode, my turn, powers left, not yet used', () => {
    expect(canUseControlYut({ ...baseState }, 'A', 2)).toBe(true)
  })
  it('returns false when not my turn (currentTeam is opponent)', () => {
    expect(canUseControlYut({ ...baseState, currentTeam: 'B' }, 'A', 2)).toBe(false)
  })
  it('returns false for spectators (myTeam is empty string)', () => {
    expect(canUseControlYut({ ...baseState }, '', 2)).toBe(false)
  })
  it('returns false when no powers left', () => {
    expect(canUseControlYut({ ...baseState }, 'A', 0)).toBe(false)
  })
  it('returns false when not in maple mode', () => {
    expect(canUseControlYut({ ...baseState, mode: 'classic' }, 'A', 2)).toBe(false)
  })
  it('returns false when in await_spend phase', () => {
    expect(canUseControlYut({ ...baseState, phase: 'await_spend' }, 'A', 2)).toBe(false)
  })
  it('returns false when a power was already used this turn', () => {
    expect(canUseControlYut({ ...baseState, powerUsedThisTurn: true }, 'A', 2)).toBe(false)
  })
})

describe('canUseControlHorses', () => {
  it('returns true when await_spend with pendingStep 1..5, my turn, maple mode, powers left, not used', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3 }, 'A', 2)).toBe(true)
  })
  it('returns true at pendingStep=1 (lower boundary)', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 1 }, 'A', 2)).toBe(true)
  })
  it('returns true at pendingStep=5 (upper boundary)', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 5 }, 'A', 2)).toBe(true)
  })
  it('returns false at pendingStep=6 (above range)', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 6 }, 'A', 2)).toBe(false)
  })
  it('returns false when pendingStep is 0', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 0 }, 'A', 2)).toBe(false)
  })
  it('returns false when pendingStep is back-do (-1)', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: -1 }, 'A', 2)).toBe(false)
  })
  it('returns false when not my turn', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3, currentTeam: 'B' }, 'A', 2)).toBe(false)
  })
  it('returns false for spectators', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3 }, '', 2)).toBe(false)
  })
  it('returns false when no powers left', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3 }, 'A', 0)).toBe(false)
  })
  it('returns false when power already used this turn', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3, powerUsedThisTurn: true }, 'A', 2)).toBe(false)
  })
  it('returns false when not in maple mode', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3, mode: 'classic' }, 'A', 2)).toBe(false)
  })
  it('returns false in await_throw phase', () => {
    expect(canUseControlHorses({ ...baseState, pendingStep: 3 }, 'A', 2)).toBe(false)
  })
})
