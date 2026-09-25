import { Fragment, useEffect, useRef, useState } from 'react'
import { BREADCRUMB, COLOR, FONT, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { ThemeRow } from '@/components/ThemeSwitch'
import { Dropdown, MenuAction as DropdownAction } from '@/components/browser/Menu'
import avatar from '@/assets/avatar.png'

/**
 * Barra de topo — medidas do nó `Frame 427319838` (WP-832, 4454:7125):
 *   barra    56px de altura, px-16 py-8, gap 12, fundo #f3f6fc
 *   busca    328 × 36, fundo #e3e7ee, raio 200, pl-16 pr-12, gap 8,
 *            ícone 24, texto Inter 16/20 em rgba(71,85,105,.75)
 *   ícones   24px — `more_horiz` (menu) e `expand_content`
 *
 * O suporte saiu da barra e virou item do menu "…": é ação ocasional, não
 * merece ocupar um lugar fixo ao lado do avatar.
 *   avatar   36px, redondo, com foto (nó 3630:4012)
 *
 * O caminho à esquerda não está no design: foi acrescentado para responder
 * "onde eu estou" ao sair do portal para o Ask.
 */

export type Crumb = {
  label: string
  icon?: React.ReactNode
  onClick?: () => void
  /**
   * Mostra só o ícone. O rótulo continua no DOM, fora da tela, porque leitor
   * de tela e `title` precisam dele — um ícone de casa sozinho não diz para
   * onde leva.
   */
  iconOnly?: boolean
  /** Níveis recolhidos: o item vira "…" e abre um menu com os nomes completos. */
  collapsed?: { label: string; onClick: () => void }[]
}

function Breadcrumb({ trail }: { trail: Crumb[] }) {
  /* A caixa de hover do item clicável tem folga própria, que somaria ao gap
     da espec. A margem negativa devolve exatamente o mesmo tanto, então o
     respiro entre os itens continua sendo os 8 do nó. */
  const HOVER_PAD_X = 6

  return (
    <nav
      className="flex items-center min-w-0"
      style={{ gap: BREADCRUMB.gap }}
      aria-label="Caminho"
    >
      {trail.map((crumb, i) => {
        const last = i === trail.length - 1
        const content = (
          <span className="flex items-center min-w-0" style={{ gap: BREADCRUMB.gap }}>
            {crumb.icon && (
              <span
                className="shrink-0 flex items-center justify-center"
                style={{
                  width: BREADCRUMB.iconSize,
                  height: BREADCRUMB.iconSize,
                  color: BREADCRUMB.iconColor,
                }}
              >
                {crumb.icon}
              </span>
            )}
            <span
              className={crumb.iconOnly ? 'sr-only' : 'truncate'}
              style={
                crumb.iconOnly
                  ? undefined
                  : {
                      fontFamily: FONT,
                      fontSize: BREADCRUMB.fontSize,
                      lineHeight: BREADCRUMB.lineHeight,
                      color: BREADCRUMB.color,
                      fontWeight: last ? BREADCRUMB.currentWeight : BREADCRUMB.weight,
                    }
              }
            >
              {crumb.label}
            </span>
          </span>
        )

        /* A barra tem altura fixa, então nome longo de pasta precisa caber numa
           linha: cada nível tem um piso de largura para nunca sumir, e o pai
           encolhe antes do atual. O nome inteiro vai no tooltip.
           O piso só vale para rótulo que pode ser cortado — em "Pastas" ele
           sobrava dentro da caixa de hover e virava espaço vazio. */
        const truncable = crumb.label.length > 12
        const width = crumb.iconOnly || !truncable
          ? 'shrink-0'
          : last
            ? 'min-w-[120px] shrink'
            : 'min-w-[72px] max-w-[220px] shrink-[3]'

        const separator = i > 0 && (
          <Icon name="chevron_right" size={BREADCRUMB.iconSize} color={BREADCRUMB.iconColor} className="shrink-0" />
        )

        if (crumb.collapsed) {
          return (
            <Fragment key={`${i}-collapsed`}>
              {separator}
              <Dropdown
                align="left"
                minWidth={280}
                trigger={({ open, toggle }) => (
                  <button
                    type="button"
                    onClick={toggle}
                    aria-haspopup="menu"
                    aria-expanded={open}
                    aria-label="Mostrar pastas intermediárias"
                    title={crumb.collapsed!.map((c) => c.label).join(' › ')}
                    className="wk-icon-btn shrink-0 flex items-center justify-center"
                    style={{ width: 28, height: 28, background: open ? 'var(--wk-icon-hover)' : undefined }}
                  >
                    <Icon name="more_horiz" size={20} color={BREADCRUMB.iconColor} />
                  </button>
                )}
              >
                {(close) =>
                  crumb.collapsed!.map((c) => (
                    <DropdownAction
                      key={c.label}
                      icon="folder"
                      label={c.label}
                      onSelect={() => {
                        close()
                        c.onClick()
                      }}
                    />
                  ))
                }
              </Dropdown>
            </Fragment>
          )
        }

        return (
          <Fragment key={`${i}-${crumb.label}`}>
            {separator}
            {crumb.onClick && !last ? (
              <button
                onClick={crumb.onClick}
                title={crumb.label}
                className={`wk-icon-btn flex items-center h-7 ${width}`}
                style={{ paddingInline: HOVER_PAD_X, marginInline: -HOVER_PAD_X }}
              >
                {content}
              </button>
            ) : (
              <span
                className={`flex items-center ${width}`}
                title={crumb.label}
                aria-current={last ? 'page' : undefined}
              >
                {content}
              </span>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}

/** Ícone de ação da barra: 24px, sem caixa — o realce é por cor. */
function TopIcon({ name, title }: { name: string; title: string }) {
  return (
    <button
      title={title}
      aria-label={title}
      className="wk-icon-btn shrink-0 flex items-center justify-center"
      style={{ width: TOPBAR.iconSize, height: TOPBAR.iconSize, color: COLOR.navLabel }}
    >
      <Icon name={name} size={TOPBAR.iconSize} />
    </button>
  )
}

/** Linha de ação do menu "…" — mesma métrica da linha "Tema". */
function MenuAction({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className="w-full flex items-center gap-2 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
      // minHeight, não height: rótulo de duas linhas cresce a linha em vez de vazar dela.
      style={{ minHeight: 40, paddingBlock: 6, paddingInline: 8 }}
    >
      <Icon name={icon} size={24} color={COLOR.navLabel} className="shrink-0" />
      <span
        className="flex-1 min-w-0 text-left"
        style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.5, color: COLOR.navText }}
      >
        {label}
      </span>
    </button>
  )
}

/** Linha que a tela injeta no menu "…" (ver `Header.menuItems`). */
export type MenuItem = { icon: string; label: string; onClick?: () => void }

/**
 * Menu "…" da barra de topo: suporte e tema. É o lugar onde ações e
 * preferências que não merecem um ícone próprio na barra se acumulam —
 * inclusive o que a tela manda em `menuItems`, que entra antes das opções
 * fixas e separado delas por um fio.
 */
function OverflowMenu({ items }: { items?: MenuItem[] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Mais opções"
        aria-label="Mais opções"
        aria-haspopup="menu"
        aria-expanded={open}
        className="wk-icon-btn flex items-center justify-center"
        style={{ width: TOPBAR.iconSize, height: TOPBAR.iconSize, color: COLOR.navLabel }}
      >
        <Icon name="more_horiz" size={TOPBAR.iconSize} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-2"
          style={{
            background: COLOR.surface,
            border: `1px solid ${COLOR.border}`,
            borderRadius: 8,
            boxShadow: 'var(--wk-shadow-menu)',
            padding: 4,
            minWidth: 240,
          }}
          role="menu"
        >
          {items?.map((item) => (
            <MenuAction key={item.label} icon={item.icon} label={item.label} onClick={item.onClick} />
          ))}
          {!!items?.length && <div className="my-1 h-px" style={{ background: COLOR.border }} />}
          <MenuAction icon="support_agent" label="Suporte" />
          <ThemeRow />
        </div>
      )}
    </div>
  )
}

export function Header({
  trail,
  menuItems,
  search,
}: {
  trail?: Crumb[]
  /** Linhas extras no menu "…", vindas da tela. */
  menuItems?: MenuItem[]
  /**
   * Busca controlada pela tela; sem ela, a barra mostra a busca global do Weknow.
   * `hidden`: a busca está visível em outro lugar da tela (layout dinâmico).
   * O espaço fica reservado para o caminho à esquerda não pular.
   */
  search?: { value: string; onChange: (q: string) => void; placeholder: string; hidden?: boolean }
}) {
  const S = TOPBAR.search

  return (
    <header
      className="shrink-0 flex items-center"
      style={{
        height: TOPBAR.height,
        gap: TOPBAR.gap,
        paddingInline: TOPBAR.padX,
        paddingBlock: TOPBAR.padY,
        background: COLOR.canvas,
      }}
    >
      {trail && trail.length > 0 && <Breadcrumb trail={trail} />}

      <div className="flex-1" />

      <div
        // 328px (espec.) a partir de 1536px; abaixo cede espaço ao caminho, que carrega nome longo de pasta.
        // Quando a busca é da tela (como no Drive), ela ganha mais largura: é a busca principal.
        className={`hidden md:flex shrink-0 items-center focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-[opacity,visibility,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0,1)] ${
          search ? 'w-[300px] xl:w-[380px] 2xl:w-[440px]' : 'w-[240px] 2xl:w-[328px]'
        } ${search?.hidden ? 'opacity-0 invisible' : 'opacity-100 visible'}`}
        aria-hidden={search?.hidden || undefined}
        style={{
          height: S.height,
          gap: S.gap,
          paddingLeft: S.padLeft,
          paddingRight: S.padRight,
          borderRadius: S.radius,
          background: S.background,
        }}
      >
        <Icon name="search" size={TOPBAR.iconSize} color={COLOR.navLabel} />
        <input
          type="text"
          placeholder={search?.placeholder ?? 'Pesquise no Weknow'}
          tabIndex={search?.hidden ? -1 : undefined}
          value={search?.value}
          onChange={search ? (e) => search.onChange(e.target.value) : undefined}
          onKeyDown={search ? (e) => e.key === 'Escape' && search.onChange('') : undefined}
          className="flex-1 min-w-0 bg-transparent outline-none"
          style={{
            fontFamily: FONT,
            fontSize: S.fontSize,
            lineHeight: `${S.lineHeight}px`,
            color: COLOR.text,
          }}
        />
        {search?.value && (
          <button
            type="button"
            onClick={() => search.onChange('')}
            aria-label="Limpar busca"
            title="Limpar busca"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24 }}
          >
            <Icon name="close" size={20} color={COLOR.navLabel} />
          </button>
        )}
      </div>

      <OverflowMenu items={menuItems} />
      <TopIcon name="expand_content" title="Expandir" />

      {/* Avatar — foto de 36px, recortada como no nó 3630:4012 */}
      <button
        title="Conta"
        aria-label="Conta"
        className="shrink-0 rounded-full overflow-hidden relative transition-opacity hover:opacity-90"
        style={{ width: TOPBAR.avatarSize, height: TOPBAR.avatarSize }}
      >
        <img
          src={avatar}
          alt=""
          className="absolute max-w-none"
          style={{ width: '200%', height: '249.91%', left: '-50%', top: '-11.84%' }}
        />
      </button>
    </header>
  )
}
