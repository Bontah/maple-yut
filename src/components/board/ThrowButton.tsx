import './styles/sticks.css'

export interface ThrowButtonProps {
  enabled: boolean
  pulse?: boolean        // gentle gold pulse when available (default = enabled)
  onClick: () => void
  label?: string
}

export function ThrowButton({ enabled, pulse, onClick, label = 'Throw Sticks' }: ThrowButtonProps) {
  const cls = ['gold-button', (pulse ?? enabled) ? 'gold-button--pulse' : ''].filter(Boolean).join(' ')
  return (
    <button className={cls} disabled={!enabled} onClick={onClick}>
      {label}
    </button>
  )
}
