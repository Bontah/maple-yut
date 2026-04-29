import type { CSSProperties, ReactNode } from 'react'
import './styles/panel.css'

export interface WoodFrameProps {
  children: ReactNode
  brackets?: boolean   // render gold corner brackets (default true)
  inactive?: boolean   // dim styling for opponent panel when not their turn
  className?: string
  style?: CSSProperties
}

export function WoodFrame({ children, brackets = true, inactive = false, className = '', style }: WoodFrameProps) {
  const cls = ['wood-frame', inactive ? 'wood-frame--inactive' : '', className].filter(Boolean).join(' ')
  return (
    <div className={cls} style={style}>
      {brackets && (
        <>
          <span className="wood-frame__bracket wood-frame__bracket--tl" />
          <span className="wood-frame__bracket wood-frame__bracket--tr" />
          <span className="wood-frame__bracket wood-frame__bracket--bl" />
          <span className="wood-frame__bracket wood-frame__bracket--br" />
        </>
      )}
      {children}
    </div>
  )
}
