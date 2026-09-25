import { useEffect, useRef, useState, type ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'

export const CONTENT_TYPES = [
  { id: 'pastas', icon: 'folder', label: 'Pastas' },
  { id: 'tarefas', icon: 'task_alt', label: 'Tarefas' },
  { id: 'apresentacoes', icon: 'animated_images', label: 'Apresentações' },
] as const

function FilterChip({
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
      className={`inline-flex items-center rounded-full transition-colors ${
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
 * `compact` é o mesmo campo encolhido, não outro componente: a altura, o ícone
 * e a letra caem para a medida da pílula da barra de topo, e a transição leva
 * o campo de um estado ao outro à vista do usuário, em vez de trocar uma busca
 * por outra. O fundo não muda — trocar a cor faria parecer outro campo.
 */
function SearchField({
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
      className="flex items-center gap-2 rounded-full w-full focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-[height,padding,box-shadow] duration-[400ms] ease-[cubic-bezier(0.4,0,0,1)]"
      style={{
        height: compact ? 36 : 48,
        paddingLeft: compact ? 12 : 16,
        paddingRight: compact ? 8 : 12,
        background: COLOR.searchPillLight,
      }}
    >
      <Icon name="search" size={compact ? 20 : 24} color={COLOR.navLabel} className="shrink-0" />
      <input
        type="text"
        value={query}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && onQuery('')}
        placeholder={placeholder}
        className={`flex-1 min-w-0 bg-transparent leading-[20px] outline-none transition-[font-size] duration-[400ms] ${
          compact ? 'text-[14px]' : 'text-[16px]'
        }`}
        style={{ fontFamily: FONT, color: COLOR.text }}
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

export type SectionId = (typeof CONTENT_TYPES)[number]['id']

function ContentTypeChips({
  active,
  onSelect,
  compact = false,
}: {
  active: SectionId
  onSelect: (id: SectionId) => void
  compact?: boolean
}) {
  return (
    <div className={`flex justify-center ${compact ? 'gap-2' : 'gap-3'}`}>
      {CONTENT_TYPES.map((t) => (
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

/**
 * Fade de todas as trocas do cabeçalho dinâmico — medido na home do Drive:
 * opacidade em 300ms, curva cubic-bezier(0.4, 0, 0, 1) (sai rápido, assenta
 * devagar). `visibility` acompanha para o elemento oculto não receber foco
 * nem clique; ela só muda no fim do fade de saída.
 */
export const FADE = 'transition-[opacity,visibility] duration-[400ms] ease-[cubic-bezier(0.4,0,0,1)]'
/** `invisible` guarda o lugar do elemento: some sem a página recalcular nada. */
export const HIDDEN = 'opacity-0 invisible'

/**
 * Largura da busca — a mesma aberta e grudada, para ela não mudar de tamanho
 * nem sair do lugar no meio da animação.
 *
 * Ela é centrada na coluna e cede, dos dois lados, a vaga do que aparece na
 * barra quando recolhe: os chips compactos à esquerda (os maiores, ~270px) e
 * os controles à direita. Como centralizar exige folga igual dos dois lados, a
 * conta usa 2 × a maior vaga. Assim nada se sobrepõe sem precisar deslocar a
 * busca — e o teto segue sendo os 800px da espec.
 */
const SIDE_RESERVE = 288
const SEARCH_WIDTH = `clamp(320px, calc(100% - ${SIDE_RESERVE * 2}px), 800px)`
/** Onde a linha da busca gruda: (80 − 36) / 2, centrada na faixa do título. */
const STICK_TOP = 22
/** Altura reservada para busca + chips: 48 + 16 + 36. */
const ROW_HEIGHT = 100

/**
 * Topo da home no layout dinâmico, no modelo da home do Drive.
 *
 * A busca gruda na faixa do título e **encolhe ali mesmo**: é o mesmo campo o
 * tempo todo, de 48px para 36px de altura, mantendo a largura. Antes eram duas
 * buscas trocando por opacidade — a de baixo sumia e outra aparecia em cima —,
 * e a troca se via. Os chips esmaecem: na faixa de 80px cabem a saudação, a
 * busca e os controles, e mais nada.
 *
 * O bloco que segura a linha tem altura fixa de 100px mesmo quando a linha
 * encolhe. Isso resolve duas coisas: o conteúdo abaixo não sobe no meio da
 * animação, e o limiar de recolher não depende do próprio estado — senão
 * encolher mudaria a medida que decide encolher, e a barra piscaria.
 *
 * A barra de topo não entra nessa troca: lá fica a busca geral do Weknow, que
 * procura além do que está listado na tela.
 */
export function DynamicHero({
  query,
  onQuery,
  placeholder,
  section,
  onSection,
  scrollRef,
  controls,
  onCollapsedChange,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder: string
  section: SectionId
  onSection: (id: SectionId) => void
  scrollRef: React.RefObject<HTMLElement | null>
  /** Ordenação e visualização: aparecem na barra quando o topo recolhe. */
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
      const edge = root.getBoundingClientRect().top + STICK_TOP
      // +1: a linha grudada para exatamente na borda, e o arredondamento do
      // navegador pode devolver 21,99.
      setCollapsed((rowRef.current?.getBoundingClientRect().top ?? edge + 2) <= edge + 1)
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

  const titleText = 'Olá, bem vindo ao Weknow'

  return (
    <>
      <div className="sticky top-0 z-20 -mx-8 px-8 bg-[var(--wk-surface)]" style={{ height: 80 }}>
        <div className="relative h-full">
          <h1
            className={`absolute inset-0 flex items-center justify-center text-[30px] font-medium tracking-[-0.5px] leading-[36px] ${FADE} ${
              collapsed ? HIDDEN : ''
            }`}
            style={{ fontFamily: FONT, color: COLOR.text }}
          >
            {titleText}
          </h1>
          {/* Recolhido: os chips à esquerda, no lugar da saudação — ao rolar
              eles sumiam junto com o resto do topo, e trocar de área exigia
              voltar lá em cima. Controles à direita e, no meio, a busca
              grudada, que vem de fora e passa por cima desta barra. */}
          <div className={`absolute inset-y-0 left-0 flex items-center ${FADE} ${collapsed ? '' : HIDDEN}`}>
            <ContentTypeChips active={section} onSelect={onSection} compact />
          </div>
          {controls && (
            <div
              className={`absolute inset-y-0 right-0 flex items-center ${FADE} ${collapsed ? '' : HIDDEN}`}
            >
              {controls}
            </div>
          )}
        </div>
      </div>

      {/* Altura reservada e sem ponteiro: a parte vazia do bloco grudado não
          pode roubar o clique das linhas que passam por baixo dela. */}
      <div
        ref={rowRef}
        className="sticky z-30 mt-5 pointer-events-none"
        style={{ top: STICK_TOP, height: ROW_HEIGHT }}
      >
        {/* Recolhida, a linha reserva a ponta direita: os controles moram na
            barra de baixo e o grupo não pode passar por cima deles. */}
        {/* Sem ponteiro em tudo que é caixa vazia: grudado, este bloco cobre a
            barra inteira, e só a busca e os chips podem receber clique — senão
            eles engolem os controles que ficam por baixo, na barra. */}
        <div className="flex flex-col items-center gap-4">
          <div className="pointer-events-auto" style={{ width: SEARCH_WIDTH }}>
            <SearchField query={query} onQuery={onQuery} placeholder={placeholder} compact={collapsed} />
          </div>
          <div className={`pointer-events-auto ${FADE} ${collapsed ? HIDDEN : ''}`}>
            <ContentTypeChips active={section} onSelect={onSection} />
          </div>
        </div>
      </div>
    </>
  )
}

/** Topo do portal — nó `home` (WP-832, 4454:7047), fiel à espec. */
export function Hero({
  query,
  onQuery,
  placeholder,
  section,
  onSection,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder: string
  section: SectionId
  onSection: (id: SectionId) => void
}) {
  return (
    <div className="flex flex-col items-center gap-9">
      <h1
        className="text-[30px] font-medium text-center tracking-[-0.5px] leading-[36px]"
        style={{ fontFamily: FONT, color: COLOR.text }}
      >
        Olá, bem vindo ao Weknow
      </h1>
      <div className="flex flex-col items-center gap-4 w-full">
        <div className="w-full" style={{ maxWidth: 800 }}>
          <SearchField query={query} onQuery={onQuery} placeholder={placeholder} />
        </div>
        <ContentTypeChips active={section} onSelect={onSection} />
      </div>
    </div>
  )
}
