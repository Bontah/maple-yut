import { useState } from 'react'
import type { YutState } from '../../entities/YutState.js'
import type { Team } from '../../game/types.js'
import { type ForcedThrow } from '../../hooks/useYutGame.js'
import { canUseControlHorses, canUseControlYut } from './abilityGating.js'

// Re-export so consumers of PowersPanel don't need to know about the hook.
export type { ForcedThrow }

const FORCED_OPTIONS: { result: ForcedThrow; label: string }[] = [
  { result: 'DO',   label: '도 (+1)' },
  { result: 'GAE',  label: '개 (+2)' },
  { result: 'GEOL', label: '걸 (+3)' },
  { result: 'YUT',  label: '윷 (+4)' },
  { result: 'MO',   label: '모 (+5)' }
]

export interface PowersPanelProps {
  state: YutState
  myTeam: Team | ''
  powersRemaining: number
  onYut: (result: ForcedThrow) => void
  onHorses: (shift: -1 | 1) => void
}

export function PowersPanel({ state, myTeam, powersRemaining, onYut, onHorses }: PowersPanelProps) {
  const [showYut, setShowYut] = useState(false)
  const [showHorses, setShowHorses] = useState(false)

  if (!myTeam) return null
  if (state.mode !== 'maple') return null

  const yutEnabled = canUseControlYut(state, powersRemaining)
  const horsesEnabled = canUseControlHorses(state, powersRemaining)

  const charges: ('available' | 'spent')[] = []
  for (let i = 0; i < 2; i++) {
    charges.push(i < powersRemaining ? 'available' : 'spent')
  }

  return (
    <div>
      <div className="powers-row">
        <span>POWERS</span>
        <span className="powers-charges">
          {charges.map((c, i) => (
            <span key={i} className={`powers-charge ${c === 'spent' ? 'powers-charge--spent' : ''}`} />
          ))}
        </span>
      </div>
      <div className="ability-row">
        <button
          className="ability"
          disabled={!yutEnabled}
          title="Skip the dice roll and pick your throw result yourself (+1 to +5). Use BEFORE throwing. 1 power per turn."
          onClick={() => setShowYut((v) => !v)}
        >
          <span className="ability__icon">⚡</span>
          Control Yut
        </button>
        <button
          className="ability"
          disabled={!horsesEnabled}
          title="Adjust your throw result up or down by 1 step. Use AFTER throwing, before picking a piece. 1 power per turn."
          onClick={() => setShowHorses((v) => !v)}
        >
          <span className="ability__icon">⚡</span>
          Control Horses
        </button>
      </div>
      {showYut && yutEnabled && (
        <div className="ability-picker">
          {FORCED_OPTIONS.map((o) => (
            <button key={o.result} onClick={() => { onYut(o.result); setShowYut(false) }}>{o.label}</button>
          ))}
        </div>
      )}
      {showHorses && horsesEnabled && (
        <div className="ability-picker">
          <button disabled={state.pendingStep <= 1} onClick={() => { onHorses(-1); setShowHorses(false) }}>−1 step</button>
          <button disabled={state.pendingStep >= 5} onClick={() => { onHorses(1);  setShowHorses(false) }}>+1 step</button>
        </div>
      )}
    </div>
  )
}
