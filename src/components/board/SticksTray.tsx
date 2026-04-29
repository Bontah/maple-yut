import { useEffect, useRef, useState } from 'react'
import './styles/sticks.css'

const STICK_PATTERN: Record<string, boolean[]> = {
  BACK_DO: [true, false, false, false],
  DO:      [false, true, false, false],
  GAE:     [true, true, false, false],
  GEOL:    [true, true, true, false],
  YUT:     [true, true, true, true],
  MO:      [false, false, false, false]
}

const STICK_RESULT_LABEL: Record<string, { ko: string; en: string; step: number }> = {
  BACK_DO: { ko: '빽도', en: 'Back-do', step: -1 },
  DO:      { ko: '도',  en: 'Do',      step: 1 },
  GAE:     { ko: '개',  en: 'Gae',     step: 2 },
  GEOL:    { ko: '걸',  en: 'Geol',    step: 3 },
  YUT:     { ko: '윷',  en: 'Yut',     step: 4 },
  MO:      { ko: '모',  en: 'Mo',      step: 5 }
}

// Per-stick rotation jitter — tied to stick index so each stick spins
// differently on toss but a given stick is consistent across renders.
const STICK_ROT = ['-14deg', '12deg', '-8deg', '16deg']

export interface SticksTrayProps {
  lastThrowResult: string
  pendingStep: number
}

export function SticksTray({ lastThrowResult, pendingStep }: SticksTrayProps) {
  const pattern = STICK_PATTERN[lastThrowResult] ?? [false, false, false, false]
  const [showDust, setShowDust] = useState(false)
  const lastResultRef = useRef(lastThrowResult)

  useEffect(() => {
    if (lastResultRef.current !== lastThrowResult && lastThrowResult) {
      setShowDust(true)
      const t = setTimeout(() => setShowDust(false), 900)
      lastResultRef.current = lastThrowResult
      return () => clearTimeout(t)
    }
  }, [lastThrowResult])

  const label = STICK_RESULT_LABEL[lastThrowResult]

  return (
    <div className="sticks-tray">
      <p className="sticks-tray__label">YUT STICKS</p>
      <div className="sticks-tray__sticks">
        {pattern.map((flat, i) => (
          <div
            key={`${lastThrowResult}-${i}`}
            className={`stick ${flat ? 'stick--flat' : 'stick--round'}`}
            style={{ '--toss-rot': STICK_ROT[i] } as React.CSSProperties}
            title={`Stick ${i + 1}: ${flat ? 'flat side up' : 'round side up'}${i === 0 ? ' (back-marked)' : ''}`}
          >
            {i === 0 && flat && <span className="stick__mark">●</span>}
          </div>
        ))}
      </div>
      {showDust && (
        <div className="sticks-tray__dust">
          <span /><span /><span />
        </div>
      )}
      {label && (
        <div className="result-ribbon">
          {label.ko} ({label.en})
          <span className="result-ribbon__step">
            {pendingStep !== 0 && pendingStep !== label.step
              ? `step ${pendingStep > 0 ? '+' : ''}${pendingStep}`
              : `${label.step > 0 ? '+' : ''}${label.step}`}
          </span>
        </div>
      )}
    </div>
  )
}
