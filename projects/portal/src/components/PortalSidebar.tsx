import { cloneElement, isValidElement, useState } from 'react'
import { COLOR, FONT, LAYOUT, TOPBAR } from '@/design/tokens'
import { Icon, IconWeknowAsk, type IconProps } from '@/components/icons'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { WeknowLogo } from '@/components/WeknowLogo'

/**
 * Menu do portal — espec. do nó `sidebar white` (WP-832).
 * Item de 40px, raio 8, ícone 24px, texto 14px.
 * Ativo: fundo #e4e9f1, texto #3366cc, ícone com FILL 1.
 *
 * Reaproveitado do Weknow Ask (mesma espec., WP-832). Aqui o portal é o
 * único destino navegável: "Weknow Ask" e "SQL AI" ficam no menu como no
 * design, mas apontam para os apps avulsos, não para telas deste projeto.
 */

export type PortalRoute = 'portal' | 'ask' | 'sql'

const MENU: { id: PortalRoute; label: string; icon: React.ReactNode }[] = [
  { id: 'portal', label: 'Página inicial', icon: <Icon name="home" size={24} /> },
  { id: 'ask', label: 'Weknow Ask', icon: <IconWeknowAsk size={24} /> },
  { id: 'sql', label: 'SQL AI', icon: <Icon name="database" size={24} /> },
]

function GroupLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] leading-[20px] font-semibold uppercase"
      // .sidebar-nav-group-title: 11px/600, entreletras 0.06em, respiro 8/20/4.
      style={{ fontFamily: FONT, color: COLOR.navLabel, letterSpacing: '0.06em', padding: '8px 20px 4px' }}
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
  subtle,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  trailing?: React.ReactNode
  /** Ativo sem fundo — quando o realce pertence a um subitem. */
  subtle?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const background = active && !subtle ? COLOR.navActive : hovered ? COLOR.navHover : 'transparent'
  // No app o hover mexe só no fundo; o texto muda de cor apenas quando o item é o ativo.
  const color = active ? COLOR.navActiveText : COLOR.navText
  const iconColor = active ? COLOR.navActiveText : COLOR.navLabel
  // Com controle próprio à direita (a chave de tema), a linha não pode ser botão: botão dentro de botão é HTML inválido.
  const Row = trailing ? 'div' : 'button'

  return (
    <Row
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
    </Row>
  )
}

/**
 * Subitem do Portal. Sem ícone: o texto alinha com o rótulo do item pai, e o
 * recuo já diz que é um nível abaixo. O realce de ativo fica aqui, não no pai.
 */
function SubNavRow({ label, active, onClick }: { label: string; active: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`w-full text-left flex items-center h-9 rounded-lg transition-colors ${
        active ? '' : 'hover:bg-[var(--wk-nav-hover)]'
      }`}
      style={{
        paddingLeft: LAYOUT.navItemPadX + LAYOUT.navIconSize + LAYOUT.navItemGap,
        background: active ? COLOR.navActive : undefined,
      }}
    >
      <span
        className="flex-1 min-w-0 wk-fade-r text-[14px] leading-[1.5]"
        style={{ fontFamily: FONT, color: active ? COLOR.navActiveText : COLOR.navText }}
      >
        {label}
      </span>
    </button>
  )
}

export type PortalSection = { id: string; label: string }

export function PortalSidebar({
  active,
  onNavigate,
  sections,
  activeSection,
  onSection,
}: {
  active: PortalRoute
  onNavigate?: (route: PortalRoute) => void
  /** Variante compacta: tipos de conteúdo do portal como subitens, no lugar dos chips. */
  sections?: readonly PortalSection[]
  activeSection?: string
  onSection?: (id: string) => void
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

      <div className="flex flex-col gap-1" style={{ paddingTop: 28 }}>
        <GroupLabel>Menu</GroupLabel>
        {MENU.map((item) => {
          const expanded = item.id === 'portal' && active === 'portal' && sections
          return (
            <div key={item.id} className="flex flex-col gap-1">
              <NavRow
                icon={item.icon}
                label={item.label}
                active={active === item.id}
                subtle={Boolean(expanded)}
                onClick={() => onNavigate?.(item.id)}
              />
              {expanded &&
                sections.map((s) => (
                  <SubNavRow
                    key={s.id}
                    label={s.label}
                    active={activeSection === s.id}
                    onClick={() => onSection?.(s.id)}
                  />
                ))}
            </div>
          )
        })}
      </div>

      {/* Rodapé, colado na base */}
      <div className="flex-1 flex flex-col justify-end gap-1">
        <NavRow icon={<Icon name="settings" size={24} />} label="Configurações" />
        <NavRow icon={<Icon name="palette" size={24} />} label="Tema" trailing={<ThemeSwitch />} />
        <NavRow icon={<Icon name="help" size={24} />} label="Ajuda" />
        <NavRow icon={<Icon name="logout" size={24} />} label="Sair" />
      </div>
    </aside>
  )
}
