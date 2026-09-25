import { cloneElement, isValidElement, useState } from 'react'
import { COLOR, FONT, LAYOUT, TOPBAR } from '@/design/tokens'
import { Icon, IconWeknowAsk, type IconProps } from '@/components/icons'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { WeknowLogo } from '@/components/WeknowLogo'

/**
 * Menu do portal — espec. do nó `sidebar white` (WP-832).
 * Item de 40px, raio 8, ícone 24px, texto 14px.
 * Ativo: fundo #e4e9f1, texto #3366cc, ícone com FILL 1.
 */

export type PortalRoute = 'portal' | 'ask' | 'sql'

const MENU: { id: PortalRoute; label: string; icon: React.ReactNode }[] = [
  { id: 'portal', label: 'Portal', icon: <Icon name="home" size={24} /> },
  { id: 'ask', label: 'Weknow Ask', icon: <IconWeknowAsk size={24} /> },
  { id: 'sql', label: 'SQL AI', icon: <Icon name="database" size={24} /> },
]

const FOOTER = [
  { label: 'Configurações', icon: 'settings' },
  { label: 'Ajuda', icon: 'help' },
  { label: 'Sair', icon: 'logout' },
]

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="flex items-center h-[40px] px-4 text-[12px] font-semibold uppercase"
      style={{ fontFamily: FONT, color: COLOR.navLabel }}
    >
      {children}
    </p>
  )
}

function NavRow({
  icon,
  label,
  active,
  onClick,
  trailing,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  trailing?: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const background = active ? COLOR.navActive : hovered ? COLOR.navHover : 'transparent'
  const color = active ? COLOR.navActiveText : hovered ? COLOR.navHoverText : COLOR.navText
  const iconColor = active ? COLOR.navActiveText : COLOR.navLabel

  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center overflow-hidden transition-colors"
      style={{
        height: LAYOUT.navItemHeight,
        gap: LAYOUT.navItemGap,
        paddingInline: LAYOUT.navItemPadX,
        borderRadius: LAYOUT.navItemRadius,
        background,
      }}
    >
      <span
        className="shrink-0 flex items-center justify-center"
        style={{ width: LAYOUT.navIconSize, height: LAYOUT.navIconSize, color: iconColor }}
      >
        {isValidElement<IconProps>(icon) ? cloneElement(icon, { filled: active }) : icon}
      </span>
      <span
        className="flex-1 min-w-0 wk-fade-r text-[14px] leading-[1.5] text-left"
        style={{ fontFamily: FONT, color }}
      >
        {label}
      </span>
      {trailing}
    </button>
  )
}

/** Alternador de tema — visual apenas, como no design. */

export function PortalSidebar({
  active,
  onNavigate,
}: {
  active: PortalRoute
  onNavigate: (route: PortalRoute) => void
}) {
  return (
    <aside
      className="shrink-0 flex flex-col h-full"
      style={{
        width: LAYOUT.sidebarWidth,
        background: COLOR.canvas,
        paddingInline: LAYOUT.sidebarPad,
        paddingBottom: 8,
      }}
    >
      <div
        className="flex items-center shrink-0"
        style={{
          height: TOPBAR.height,
          paddingLeft: LAYOUT.navItemPadX + LAYOUT.glyphInset,
          paddingRight: LAYOUT.navItemPadX,
        }}
      >
        <WeknowLogo />
      </div>

      <div className="flex flex-col gap-1" style={{ paddingTop: 24 }}>
        <GroupLabel>Menu</GroupLabel>
        {MENU.map((item) => (
          <NavRow
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={active === item.id}
            onClick={() => onNavigate(item.id)}
          />
        ))}
      </div>

      {/* Rodapé, colado na base */}
      <div className="flex-1 flex flex-col justify-end gap-1 pb-6">
        <NavRow icon={<Icon name="settings" size={24} />} label={FOOTER[0].label} />
        <NavRow icon={<Icon name="palette" size={24} />} label="Tema" trailing={<ThemeSwitch />} />
        <NavRow icon={<Icon name="help" size={24} />} label={FOOTER[1].label} />
        <NavRow icon={<Icon name="logout" size={24} />} label={FOOTER[2].label} />
      </div>
    </aside>
  )
}
