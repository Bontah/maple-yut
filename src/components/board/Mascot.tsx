import type { Team } from '../../game/types.js'
import { MASCOT_BY_TEAM, MASCOT_NAME_BY_TEAM } from '../../assets/mascots.js'
import './styles/panel.css'

export type MascotSize = 'hero' | 'token' | 'piece'

export interface MascotProps {
  team: Team
  size: MascotSize
  bob?: boolean
  glow?: boolean
}

export function Mascot({ team, size, bob = false, glow = false }: MascotProps) {
  const cls = [
    'mascot',
    size === 'hero' ? 'mascot--shadow' : '',
    glow ? 'mascot--glow' : '',
    bob ? 'mascot--bob' : ''
  ].filter(Boolean).join(' ')
  return (
    <img
      src={MASCOT_BY_TEAM[team]}
      alt={MASCOT_NAME_BY_TEAM[team]}
      data-size={size}
      className={cls}
    />
  )
}
