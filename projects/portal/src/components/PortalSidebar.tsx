import { cloneElement, isValidElement, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { SIDEBAR_TRANSITION } from '@/design/sidebar'
import { useTheme } from '@/design/theme'
import { Icon, IconWeknowAsk, type IconProps } from '@/components/icons'
import { ThemeSwitch } from '@/components/ThemeSwitch'

/**
 * Menu do portal — espec. do nó `sidebar white` (WP-832).
 * Item de 40px, raio 8, ícone 24px, texto 14px.
 * Ativo: fundo #e4e9f1, texto #3366cc, ícone com FILL 1.
 */

export type PortalRoute = 'portal' | 'ask' | 'sql' | 'configuracoes'

const MENU: { id: PortalRoute; label: string; icon: React.ReactNode }[] = [
  // "Portal", não "Página inicial": é o nome do nó `sidebar white` (WP-832) e
  // é o que mantém os três itens falando a mesma língua — os outros dois são
  // nomes de aplicativo, e o menu é o mesmo dentro do Ask e do SQL AI, onde
  // "página inicial" seria a home de qual dos três?
  { id: 'portal', label: 'Portal', icon: <Icon name="home" size={24} /> },
  { id: 'ask', label: 'Weknow Ask', icon: <IconWeknowAsk size={24} /> },
  { id: 'sql', label: 'SQL AI', icon: <Icon name="database" size={24} /> },
]

const FOOTER = [
  { label: 'Ajuda', icon: 'help' },
  { label: 'Sair', icon: 'logout' },
]


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
  /**
   * A linha "Tema" carrega a chave de tema, que é um controle por si só, e
   * botão dentro de botão é HTML inválido — o React reclamava disso a cada
   * pintura. Quando a linha tem um controle na ponta, ela deixa de ser botão:
   * ali não há o que clicar na linha inteira, só na chave.
   */
  const Tag = trailing ? 'div' : 'button'
  const background = active ? COLOR.navActive : hovered ? COLOR.navHover : 'transparent'
  const color = active ? COLOR.navActiveText : hovered ? COLOR.navHoverText : COLOR.navText
  const iconColor = active ? COLOR.navActiveText : COLOR.navLabel

  return (
    <Tag
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
    </Tag>
  )
}

/** Alternador de tema — visual apenas, como no design. */

/**
 * A marca e o botão de recolher não moram aqui: ficam na faixa de topo
 * (`SidebarBrand`), que não encolhe junto com o menu.
 *
 * Sem o rótulo "Menu": para um grupo só, de três itens, ele não organiza
 * nada — só empurrava a lista para baixo.
 */
export function PortalSidebar({
  active,
  onNavigate,
  collapsed,
}: {
  active: PortalRoute
  onNavigate: (route: PortalRoute) => void
  /** Recolhido em trilho: só os ícones, com o rótulo no `title`. */
  collapsed: boolean
}) {
  const { toggle: toggleTheme } = useTheme()

  return (
    <aside
      className="shrink-0 flex flex-col h-full overflow-hidden"
      style={{
        width: collapsed ? LAYOUT.sidebarRailWidth : LAYOUT.sidebarWidth,
        transition: `width ${SIDEBAR_TRANSITION}`,
        background: COLOR.canvas,
        paddingInline: LAYOUT.sidebarPad,
        paddingBottom: 8,
      }}
    >
      <div className="flex flex-col gap-1" style={{ paddingTop: 8 }}>
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

      {/* Rodapé, colado na base. O pb-2 soma 8 aos 8 do menu: Sair fica a
          16 do pé. Com só os 8 das laterais ele parecia grudado na borda. */}
      <div className="flex-1 flex flex-col justify-end gap-1 pb-2">
        {/* Configurações é uma tela, não um enfeite de rodapé: marca como
            aberta igual aos itens de cima. Sem esse estado, dentro do cadastro
            de usuários o menu inteiro continuava dizendo que você estava no
            portal. */}
        <NavRow
          icon={<Icon name="settings" size={24} />}
          label="Configurações"
          active={active === 'configuracoes'}
          onClick={() => onNavigate('configuracoes')}
        />
        {/* Recolhido não cabe a chave: o próprio ícone passa a alternar. */}
        <NavRow
          icon={<Icon name="palette" size={24} />}
          label="Tema"
          onClick={collapsed ? toggleTheme : undefined}
          trailing={collapsed ? undefined : <ThemeSwitch />}
        />
        <NavRow icon={<Icon name="help" size={24} />} label={FOOTER[0].label} />
        <NavRow icon={<Icon name="logout" size={24} />} label={FOOTER[1].label} />
      </div>
    </aside>
  )
}
