import { describe, it, expect } from 'vitest'
import { canUseControlYut, canUseControlHorses } from '../abilityGating.js'

const baseState = {
  phase: 'await_throw',
  mode: 'maple',
  powerUsedThisTurn: false,
  pendingStep: 0
} as const

describe('canUseControlYut', () => {
  it('returns true when await_throw, maple mode, powers left, not yet used', () => {
    expect(canUseControlYut({ ...baseState }, 2)).toBe(true)
  })
  it('returns false when no powers left', () => {
    expect(canUseControlYut({ ...baseState }, 0)).toBe(false)
  })
  it('returns false when not in maple mode', () => {
    expect(canUseControlYut({ ...baseState, mode: 'classic' }, 2)).toBe(false)
  })
  it('returns false when in await_spend phase', () => {
    expect(canUseControlYut({ ...baseState, phase: 'await_spend' }, 2)).toBe(false)
  })
  it('returns false when a power was already used this turn', () => {
    expect(canUseControlYut({ ...baseState, powerUsedThisTurn: true }, 2)).toBe(false)
  })
})

describe('canUseControlHorses', () => {
  it('returns true when await_spend with pendingStep 1..5, maple mode, powers left, not used', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 3 }, 2)).toBe(true)
  })
  it('returns false when pendingStep is 0', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: 0 }, 2)).toBe(false)
  })
  it('returns false when pendingStep is back-do (-1)', () => {
    expect(canUseControlHorses({ ...baseState, phase: 'await_spend', pendingStep: -1 }, 2)).toBe(false)
  })
  it('returns false in await_throw phase', () => {
    expect(canUseControlHorses({ ...baseState, pendingStep: 3 }, 2)).toBe(false)
  })
})
