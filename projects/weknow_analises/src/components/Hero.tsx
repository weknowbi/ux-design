import { useEffect, useRef, useState, type ReactNode } from 'react'
import { COLOR, FONT, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * O topo da home do portal, copiado de lá com as mesmas medidas: chip de
 * recorte, busca grande e o cabeçalho dinâmico. Trocar do portal para a lista
 * de análises não pode mexer em nada além do conteúdo, então nenhum número
 * aqui é novo; só os chips deixam de ser fixos (Pastas, Tarefas…) e passam a
 * vir de quem usa.
 */

export function FilterChip({
  icon,
  label,
  active,
  onSelect,
  compact = false,
}: {
  icon: string
  label: string
  active?: boolean
  onSelect?: () => void
  /** Versão da barra recolhida: cabe na vaga que era da saudação. */
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      // .home-tab: 36px, respiro 8/16, raio total, gap 8. O hover só vale fora do ativo.
      className={`inline-flex items-center whitespace-nowrap rounded-full transition-colors ${
        compact ? 'px-3 h-[32px] text-[13px]' : 'gap-2 px-4 h-[36px] text-[14px]'
      } ${
        active ? 'bg-[var(--wk-chip-active-bg)]' : 'bg-[var(--wk-chip-bg)] hover:bg-[var(--wk-chip-bg-hover)]'
      }`}
      style={{ fontFamily: FONT, color: active ? 'var(--wk-chip-active-text)' : COLOR.textSecondary }}
    >
      {/* Na barra recolhida o chip vai sem ícone: com ele os três passavam de
          340px e invadiam a busca centralizada em telas de 1280. */}
      {!compact && (
        <Icon name={icon} size={24} color={active ? 'var(--wk-chip-active-text)' : COLOR.textSecondary} />
      )}
      {label}
    </button>
  )
}

/**
 * Busca "pesquisar home" (nó 4454:7055): pílula de 48px, fundo #edf0f3.
 *
 * `compact` é o mesmo campo encolhido, não outro componente: cai para a altura
 * da pílula da barra de topo, e a transição leva o campo de um estado ao outro
 * à vista do usuário, em vez de trocar uma busca por outra. O fundo não muda —
 * trocar a cor faria parecer outro campo.
 *
 * Ícone, letra e recuos são os da busca da barra de topo (`TOPBAR.search`) nos
 * dois estados: recolhida, ela tinha ícone de 20 e letra de 14, e a tela
 * mostrava três buscas de medidas diferentes. Agora só a altura muda.
 */
export function SearchField({
  query,
  onQuery,
  placeholder = 'Pesquise em Pastas',
  compact = false,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder?: string
  compact?: boolean
}) {
  return (
    <div
      className="flex items-center rounded-full w-full focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-[height,box-shadow] duration-[400ms] ease-[cubic-bezier(0.4,0,0,1)]"
      style={{
        height: compact ? TOPBAR.search.height : 48,
        gap: TOPBAR.search.gap,
        paddingLeft: TOPBAR.search.padLeft,
        paddingRight: TOPBAR.search.padRight,
        background: COLOR.searchPillLight,
      }}
    >
      <Icon name="search" size={TOPBAR.iconSize} color={COLOR.navLabel} className="shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onQuery('')}
        placeholder={placeholder}
        className="flex-1 min-w-0 bg-transparent outline-none"
        style={{
          fontFamily: FONT,
          fontSize: TOPBAR.search.fontSize,
          lineHeight: `${TOPBAR.search.lineHeight}px`,
          color: COLOR.text,
        }}
      />
      {query && (
        <button
          type="button"
          onClick={() => onQuery('')}
          aria-label="Limpar busca"
          title="Limpar busca"
          className="wk-icon-btn shrink-0 flex items-center justify-center"
          style={{ width: 24, height: 24 }}
        >
          <Icon name="close" size={20} color={COLOR.navLabel} />
        </button>
      )}
    </div>
  )
}

export type ChipItem<T extends string> = { id: T; icon: string; label: string }

type ChipsProps<T extends string> = {
  items: readonly ChipItem<T>[]
  active: T | null
  onSelect: (id: T) => void
}

function Chips<T extends string>({
  items,
  active,
  onSelect,
  compact = false,
  scroll = false,
}: ChipsProps<T> & {
  compact?: boolean
  /** Celular: a fileira rola na horizontal e sangra 16px para os lados. */
  scroll?: boolean
}) {
  return (
    <div
      className={`flex ${scroll ? 'justify-start overflow-x-auto wk-no-scrollbar -mx-4 px-4' : 'justify-center'} ${
        compact ? 'gap-2' : 'gap-3'
      }`}
    >
      {items.map((t) => (
        <FilterChip
          key={t.id}
          icon={t.icon}
          label={t.label}
          active={t.id === active}
          compact={compact}
          onSelect={() => onSelect(t.id)}
        />
      ))}
    </div>
  )
}

/** Fade das trocas do cabeçalho dinâmico, o mesmo do portal. */
export const FADE = 'transition-[opacity,visibility] duration-[400ms] ease-[cubic-bezier(0.4,0,0,1)]'
export const HIDDEN = 'opacity-0 invisible'

/* As medidas do `DynamicHero` do portal, sem tirar nem pôr (a conta de cada
   uma está comentada lá). */
const SEARCH_WIDTH = 'w-full @min-[896px]:w-[clamp(320px,calc(100%_-_576px),800px)]'
const STICK_TOP = 'top-[60px] @min-[896px]:top-[22px]'
const BAND_HEIGHT = 'h-[108px] @min-[896px]:h-[80px]'
const BAND_SLOT = 'top-4 h-8 @min-[896px]:inset-y-0 @min-[896px]:h-auto'
const ROW_HEIGHT = 100

/**
 * Topo dinâmico da home do portal: o título numa faixa de 80px, a busca que
 * gruda nela e encolhe, e os chips que esmaecem ao rolar e reaparecem
 * compactos à esquerda da faixa, com os controles à direita.
 *
 * O pai precisa ser `@container`, como no portal: a largura que decide o
 * desenho é a da folha, não a da janela.
 */
export function DynamicHero<T extends string>({
  title,
  description,
  query,
  onQuery,
  placeholder,
  chips,
  scrollRef,
  controls,
  onCollapsedChange,
}: {
  title: string
  /** Frase abaixo do título. Rola por baixo da faixa e some junto com ele. */
  description?: string
  query: string
  onQuery: (q: string) => void
  placeholder: string
  chips: ChipsProps<T>
  scrollRef: React.RefObject<HTMLElement | null>
  controls?: ReactNode
  onCollapsedChange?: (collapsed: boolean) => void
}) {
  const rowRef = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const root = scrollRef.current
    if (!root) return
    let frame = 0
    const measure = () => {
      frame = 0
      const row = rowRef.current
      if (!row) return
      const edge = root.getBoundingClientRect().top + parseFloat(getComputedStyle(row).top)
      setCollapsed(row.getBoundingClientRect().top <= edge + 1)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure)
    }
    measure()
    root.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      root.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      cancelAnimationFrame(frame)
    }
  }, [scrollRef])

  useEffect(() => {
    onCollapsedChange?.(collapsed)
  }, [collapsed, onCollapsedChange])

  return (
    <>
      <div className={`sticky top-0 z-20 -mx-8 px-8 bg-[var(--wk-surface)] ${BAND_HEIGHT}`}>
        <div className="relative h-full">
          <h1
            className={`absolute inset-0 flex justify-center text-[30px] font-medium tracking-[-0.5px] leading-[36px] ${description ? 'items-end pb-1' : 'items-center'} ${FADE} ${
              collapsed ? HIDDEN : ''
            }`}
            style={{ fontFamily: FONT, color: COLOR.text }}
          >
            {title}
          </h1>
          <div className={`absolute left-0 flex items-center ${BAND_SLOT} ${FADE} ${collapsed ? '' : HIDDEN}`}>
            <Chips {...chips} compact />
          </div>
          {controls && (
            <div className={`absolute right-0 flex items-center ${BAND_SLOT} ${FADE} ${collapsed ? '' : HIDDEN}`}>
              {controls}
            </div>
          )}
        </div>
      </div>
      {description && (
        <p className="text-center text-[15px] leading-[22px] mt-1 mb-6" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
          {description}
        </p>
      )}
      <div ref={rowRef} className={`sticky z-30 pointer-events-none ${STICK_TOP}`} style={{ height: ROW_HEIGHT }}>
        <div className="flex flex-col items-center gap-4">
          <div className={`pointer-events-auto ${SEARCH_WIDTH}`}>
            <SearchField query={query} onQuery={onQuery} placeholder={placeholder} compact={collapsed} />
          </div>
          <div className={`pointer-events-auto ${FADE} ${collapsed ? HIDDEN : ''}`}>
            <Chips {...chips} />
          </div>
        </div>
      </div>
    </>
  )
}

/** Topo da home do portal no celular: sem título, busca e chips grudados. */
export function MobileHero<T extends string>({
  query,
  onQuery,
  placeholder,
  chips,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder: string
  chips: ChipsProps<T>
}) {
  return (
    <div className="sticky top-0 z-20 -mx-4 px-4 pt-4 pb-3 flex flex-col gap-3" style={{ background: COLOR.surface }}>
      <SearchField query={query} onQuery={onQuery} placeholder={placeholder} />
      <Chips {...chips} scroll />
    </div>
  )
}
