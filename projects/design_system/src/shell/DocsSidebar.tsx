import { useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { useTheme } from '@/design/theme'
import { Icon } from '@/components/icons'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { GROUPS, groupOf } from '@docs/docs/registry'
import { SIDEBAR_PAD, SIDEBAR_RAIL_WIDTH, SIDEBAR_TRANSITION } from '@docs/shell/layout'

/**
 * Menu do documento: a barra do produto (`PortalSidebar`), item por item:
 * 40 de altura, raio 8, ícone 24, texto 14/1.5, ativo com fundo `navActive` e
 * ícone `FILL 1`, rodapé colado na base, e o mesmo recolher em trilho.
 *
 * Só o conteúdo muda. Onde o portal lista aplicativos, aqui ficam os
 * **grupos** do documento. As páginas de cada grupo aparecem na coluna ao
 * lado (`GroupPages`), que é o segundo nível: a barra fica com um só, como a
 * espec. de layout pede.
 *
 * A marca e o botão de recolher não moram aqui: ficam na faixa de topo
 * (`DocsBrand`), que não encolhe junto com o menu.
 */

function NavRow({
  icon,
  label,
  active,
  collapsed,
  onClick,
  href,
  trailing,
}: {
  icon: string
  label: string
  active?: boolean
  collapsed: boolean
  onClick?: () => void
  /** Leva para fora do documento; ganha a seta de link externo. */
  href?: string
  trailing?: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  /* A linha "Tema" carrega a chave de tema, que é um controle por si só, e
     botão dentro de botão é HTML inválido. Quando a linha tem um controle na
     ponta, ela deixa de ser botão: ali não há o que clicar na linha inteira. */
  const Tag = href ? 'a' : trailing ? 'div' : 'button'
  const background = active ? COLOR.navActive : hovered ? COLOR.navHover : 'transparent'
  const color = active ? COLOR.navActiveText : hovered ? COLOR.navHoverText : COLOR.navText
  const iconColor = active ? COLOR.navActiveText : COLOR.navLabel

  return (
    <Tag
      onClick={onClick}
      title={label}
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noreferrer' : undefined}
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
        style={{ width: LAYOUT.navIconSize, height: LAYOUT.navIconSize }}
      >
        <Icon name={icon} size={LAYOUT.navIconSize} filled={active} color={iconColor} />
      </span>
      <span
        className="flex-1 min-w-0 wk-fade-r text-[14px] leading-[1.5] text-left"
        style={{ fontFamily: FONT, color }}
      >
        {label}
      </span>
      {href && !collapsed && (
        <Icon name="open_in_new" size={16} color={COLOR.textIcon} className="shrink-0" />
      )}
      {trailing}
    </Tag>
  )
}

export function DocsSidebar({
  current,
  onNavigate,
  collapsed,
}: {
  current: string
  onNavigate: (id: string) => void
  /** Recolhido em trilho: só os ícones, com o rótulo no `title`. */
  collapsed: boolean
}) {
  const active = groupOf(current)
  const { toggle: toggleTheme } = useTheme()

  return (
    <aside
      className="shrink-0 flex flex-col h-full overflow-hidden"
      style={{
        width: collapsed ? SIDEBAR_RAIL_WIDTH : LAYOUT.sidebarWidth,
        transition: `width ${SIDEBAR_TRANSITION}`,
        background: COLOR.canvas,
        paddingInline: SIDEBAR_PAD,
        paddingBottom: 8,
      }}
    >
      <div className="flex flex-col gap-1" style={{ paddingTop: 8 }}>
        {GROUPS.map((group) => (
          <NavRow
            key={group.id}
            icon={group.icon}
            label={group.label}
            active={active.id === group.id}
            collapsed={collapsed}
            /* Abrir o grupo é abrir a primeira página dele: não há tela de
               índice separada, a coluna ao lado já é o índice. */
            onClick={() => onNavigate(group.pages[0].id)}
          />
        ))}
      </div>

      {/* Rodapé, colado na base. O pb-2 soma 8 aos 8 do menu: a última linha
          fica a 16 do pé. */}
      <div className="flex-1 flex flex-col justify-end gap-1 pb-2">
        <NavRow
          icon="text_snippet"
          label="Versão para agentes"
          href="/llms.txt"
          collapsed={collapsed}
        />
        <NavRow
          icon="design_services"
          label="Arquivo no Figma"
          href="https://www.figma.com"
          collapsed={collapsed}
        />
        {/* Recolhido não cabe a chave: o próprio ícone passa a alternar. */}
        <NavRow
          icon="palette"
          label="Tema"
          collapsed={collapsed}
          onClick={collapsed ? toggleTheme : undefined}
          trailing={collapsed ? undefined : <ThemeSwitch />}
        />
      </div>
    </aside>
  )
}
