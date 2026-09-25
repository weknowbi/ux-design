import { useState } from 'react'
import { COLOR, FONT, LAYOUT, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { WeknowLogo } from '@/components/WeknowLogo'
import { DocsSearch } from '@docs/shell/DocsSearch'
import { GROUPS, groupOf } from '@docs/docs/registry'

/**
 * Menu do documento.
 *
 * O item segue a espec. do produto, 40 de altura, raio 8, ícone 24, texto
 * 14/1.5, ativo com fundo `navActive` e ícone `FILL 1`. O que muda é o
 * conteúdo: aqui só existem os **grupos**, cinco itens. As páginas de cada um
 * aparecem numa segunda lista, ao lado do texto (`GroupPages`).
 *
 * A busca também vive aqui, e não numa barra de topo. Uma barra inteira de
 * 56px para carregar um campo é moldura demais para o que ela entrega, e sem
 * ela o conteúdo começa no alto da janela.
 */

function NavRow({
  icon,
  label,
  active,
  onClick,
}: {
  icon: string
  label: string
  active?: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const background = active ? COLOR.navActive : hovered ? COLOR.navHover : 'transparent'
  const color = active ? COLOR.navActiveText : hovered ? COLOR.navHoverText : COLOR.navText

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
        style={{ width: LAYOUT.navIconSize, height: LAYOUT.navIconSize }}
      >
        <Icon name={icon} size={24} filled={active} color={active ? COLOR.navActiveText : COLOR.navLabel} />
      </span>
      <span
        className="flex-1 min-w-0 wk-fade-r text-[14px] leading-[1.5]"
        style={{ fontFamily: FONT, color }}
      >
        {label}
      </span>
    </button>
  )
}

/** Linha do rodapé: leva para fora do documento. */
function FooterLink({ icon, label, href }: { icon: string; label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="w-full flex items-center transition-colors hover:bg-[var(--wk-nav-hover)]"
      style={{
        height: LAYOUT.navItemHeight,
        gap: LAYOUT.navItemGap,
        paddingInline: LAYOUT.navItemPadX,
        borderRadius: LAYOUT.navItemRadius,
      }}
    >
      <span
        className="shrink-0 flex items-center justify-center"
        style={{ width: LAYOUT.navIconSize, height: LAYOUT.navIconSize }}
      >
        <Icon name={icon} size={24} color={COLOR.navLabel} />
      </span>
      <span className="flex-1 text-[14px]" style={{ fontFamily: FONT, color: COLOR.navText }}>
        {label}
      </span>
      <Icon name="open_in_new" size={16} color={COLOR.textIcon} className="shrink-0" />
    </a>
  )
}

export function DocsSidebar({
  current,
  onNavigate,
}: {
  current: string
  onNavigate: (id: string) => void
}) {
  const active = groupOf(current)

  return (
    <aside
      className="shrink-0 flex flex-col h-full"
      style={{ width: LAYOUT.sidebarWidth, background: COLOR.canvas, paddingBottom: 8 }}
    >
      {/* Marca e busca, fixas. A marca diz onde a pessoa está, e sumiria
          justo quando a lista ficasse longa. */}
      <div className="shrink-0" style={{ paddingInline: LAYOUT.sidebarPad }}>
        <div
          className="flex items-center"
          style={{ height: TOPBAR.height, paddingLeft: LAYOUT.navItemPadX + LAYOUT.glyphInset }}
        >
          <WeknowLogo />
        </div>
        <p
          className="text-[12px]"
          style={{
            fontFamily: FONT,
            color: COLOR.textMuted,
            paddingLeft: LAYOUT.navItemPadX + LAYOUT.glyphInset,
            paddingBottom: 16,
          }}
        >
          Design System
        </p>

        <DocsSearch onNavigate={onNavigate} />
      </div>

      {/* Cinco itens não rolam, mas a região tem rolagem própria de qualquer
          forma: em janela baixa é o menu que cede, não o rodapé. */}
      <nav
        className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1"
        style={{ paddingInline: LAYOUT.sidebarPad, paddingTop: 24 }}
      >
        {GROUPS.map((group) => (
          <NavRow
            key={group.id}
            icon={group.icon}
            label={group.label}
            active={active.id === group.id}
            /* Abrir o grupo é abrir a primeira página dele: não há tela de
               índice separada, a lista ao lado do texto já é o índice. */
            onClick={() => onNavigate(group.pages[0].id)}
          />
        ))}
      </nav>

      <div
        className="shrink-0 flex flex-col gap-1 pt-2"
        style={{ paddingInline: LAYOUT.sidebarPad, borderTop: `1px solid ${COLOR.border}` }}
      >
        <FooterLink icon="text_snippet" label="Versão para agentes" href="/llms.txt" />
        <FooterLink icon="design_services" label="Arquivo no Figma" href="https://www.figma.com" />

        <div
          className="w-full flex items-center"
          style={{
            height: LAYOUT.navItemHeight,
            gap: LAYOUT.navItemGap,
            paddingInline: LAYOUT.navItemPadX,
          }}
        >
          <span
            className="shrink-0 flex items-center justify-center"
            style={{ width: LAYOUT.navIconSize, height: LAYOUT.navIconSize }}
          >
            <Icon name="palette" size={24} color={COLOR.navLabel} />
          </span>
          <span className="flex-1 text-[14px]" style={{ fontFamily: FONT, color: COLOR.navText }}>
            Tema
          </span>
          <ThemeSwitch />
        </div>
      </div>
    </aside>
  )
}
