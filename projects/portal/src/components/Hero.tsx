import { useEffect, useRef, useState, type ReactNode } from 'react'
import { COLOR, FONT, TOPBAR } from '@/design/tokens'
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

export type SectionId = (typeof CONTENT_TYPES)[number]['id']

function ContentTypeChips({
  active,
  onSelect,
  compact = false,
  scroll = false,
}: {
  active: SectionId
  onSelect: (id: SectionId) => void
  compact?: boolean
  /**
   * No celular os três chips somam ~330px e encostam nas bordas de uma tela
   * de 375. Em vez de encolher a letra ou quebrar em duas linhas, a fileira
   * rola na horizontal — e sangra 16px para os lados, para o chip cortado
   * aparecer meio fora da margem e anunciar que há mais.
   */
  scroll?: boolean
}) {
  return (
    <div
      className={`flex ${scroll ? 'justify-start overflow-x-auto wk-no-scrollbar -mx-4 px-4' : 'justify-center'} ${
        compact ? 'gap-2' : 'gap-3'
      }`}
    >
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
 *
 * Abaixo de 896px de folha (2 × 288 de vaga + 320 de busca) não há como
 * centralizar sem cobrir os chips: a busca passa a ocupar a largura toda numa
 * linha própria, abaixo de chips e controles. A medida é a da folha
 * (`@container` no pai), não a da janela — recolher o menu também conta.
 *
 * As classes ficam escritas por extenso porque o Tailwind só gera o que
 * encontra literalmente no código.
 */
const SEARCH_WIDTH = 'w-full @min-[896px]:w-[clamp(320px,calc(100%_-_576px),800px)]'
/**
 * Onde a linha da busca gruda. Larga: (80 − 36) / 2, centrada na faixa do
 * título. Estreita: abaixo da linha de chips (16 + 32 + 12).
 */
const STICK_TOP = 'top-[60px] @min-[896px]:top-[22px]'
/** Faixa do título: 80 na larga; na estreita cabem chips e busca (16 + 32 + 12 + 36 + 12). */
const BAND_HEIGHT = 'h-[108px] @min-[896px]:h-[80px]'
/** Chips e controles da faixa recolhida: centrados na larga, na primeira linha na estreita. */
const BAND_SLOT = 'top-4 h-8 @min-[896px]:inset-y-0 @min-[896px]:h-auto'
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
      const row = rowRef.current
      if (!row) return
      // O ponto de grudar muda com a largura da folha (ver STICK_TOP): lê o
      // que está valendo em vez de supor um número.
      const edge = root.getBoundingClientRect().top + parseFloat(getComputedStyle(row).top)
      // +1: a linha grudada para exatamente na borda, e o arredondamento do
      // navegador pode devolver 21,99.
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

  const titleText = 'Olá, bem vindo ao Weknow'

  return (
    <>
      <div className={`sticky top-0 z-20 -mx-8 px-8 bg-[var(--wk-surface)] ${BAND_HEIGHT}`}>
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
          <div className={`absolute left-0 flex items-center ${BAND_SLOT} ${FADE} ${collapsed ? '' : HIDDEN}`}>
            <ContentTypeChips active={section} onSelect={onSection} compact />
          </div>
          {controls && (
            <div
              className={`absolute right-0 flex items-center ${BAND_SLOT} ${FADE} ${collapsed ? '' : HIDDEN}`}
            >
              {controls}
            </div>
          )}
        </div>
      </div>

      {/* Altura reservada e sem ponteiro: a parte vazia do bloco grudado não
          pode roubar o clique das linhas que passam por baixo dela. */}
      {/* Sem margem acima: a faixa do título já tem 80px para uma linha de 36,
          então ela sozinha entrega 22px de folga abaixo do texto. Os 20px de
          mt-5 que havia aqui somavam a essa folga e desequilibravam o título —
          28px acima da tinta contra 43 abaixo, medidos. Sem eles ficam 28 e 23:
          um fio a menos embaixo, que é o certo para um título, porque ele
          pertence à busca que vem logo depois. */}
      <div
        ref={rowRef}
        className={`sticky z-30 pointer-events-none ${STICK_TOP}`}
        style={{ height: ROW_HEIGHT }}
      >
        {/* Recolhida, a linha reserva a ponta direita: os controles moram na
            barra de baixo e o grupo não pode passar por cima deles. */}
        {/* Sem ponteiro em tudo que é caixa vazia: grudado, este bloco cobre a
            barra inteira, e só a busca e os chips podem receber clique — senão
            eles engolem os controles que ficam por baixo, na barra. */}
        <div className="flex flex-col items-center gap-4">
          <div className={`pointer-events-auto ${SEARCH_WIDTH}`}>
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

/**
 * Topo da pasta no layout dinâmico. É a barra da home já recolhida,
 * como se o usuário tivesse rolado: chips à esquerda, busca no meio, ordem e
 * visualização à direita, grudada no alto da folha. Entrar numa pasta não
 * troca de ferramenta; a busca e os chips continuam onde estavam.
 *
 * Mesma altura, mesma busca e mesma largura de busca da home recolhida, para
 * a passagem de uma para a outra não mexer em nada além do conteúdo.
 *
 * Quando a folha fica estreita demais para os três na mesma linha (menos de
 * 2 × 288 de vaga + 320 de busca), a busca desce para uma linha própria, na
 * largura toda, com chips e controles em cima — o mesmo empilhamento da home
 * aberta. A medida é a da folha, não a da janela: recolher o menu também
 * muda o espaço.
 */
export function FolderBar({
  query,
  onQuery,
  placeholder,
  section,
  onSection,
  controls,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder: string
  section: SectionId
  onSection: (id: SectionId) => void
  controls?: ReactNode
}) {
  /* Larga: três colunas, as das pontas iguais, então a busca fica no centro
     com a largura de `SEARCH_WIDTH` — a mesma conta da home recolhida.
     Estreita: chips e controles na primeira linha, busca na segunda. */
  return (
    <div className="@container sticky top-0 z-20 -mx-8 px-8 bg-[var(--wk-surface)]">
      <div className="grid grid-cols-[1fr_auto] items-center gap-y-3 pt-4 pb-3 @min-[896px]:grid-cols-[1fr_clamp(320px,calc(100%_-_576px),800px)_1fr] @min-[896px]:h-[80px] @min-[896px]:py-0">
        <div className="col-start-1 row-start-1 flex items-center">
          <ContentTypeChips active={section} onSelect={onSection} compact />
        </div>
        <div className="col-span-2 row-start-2 @min-[896px]:col-span-1 @min-[896px]:col-start-2 @min-[896px]:row-start-1">
          <SearchField query={query} onQuery={onQuery} placeholder={placeholder} compact />
        </div>
        {controls && (
          <div className="col-start-2 row-start-1 justify-self-end flex items-center @min-[896px]:col-start-3">
            {controls}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Topo da home no celular — base no protótipo mobile do redesign (nó
 * 4454:8158), com três decisões novas:
 *
 * - **sem a saudação.** Em 812px de altura, "Olá, bem vindo ao Weknow"
 *   custava uma faixa de 80px para dizer o que a marca na barra já diz — e
 *   empurrava o conteúdo para fora da primeira tela. Na mesa ela cabe; aqui
 *   não paga o aluguel.
 * - **busca de 48px, não os 36 do protótipo.** 36 fica abaixo do alvo mínimo
 *   de toque, e a letra de 14px faz o iOS dar zoom sozinho ao focar o campo —
 *   a tela inteira salta. Com 16px de letra ele não dá.
 * - **grudada no topo.** A busca e os chips são a única navegação da home; num
 *   acervo de dezenas de pastas eles não podem ficar a uma rolagem de
 *   distância.
 */
export function MobileHero({
  query,
  onQuery,
  placeholder,
  section,
  onSection,
}: {
  query: string
  onQuery: (q: string) => void
  placeholder: string
  /**
   * Os chips só existem na raiz. Dentro de uma pasta a busca vem sozinha —
   * na versão de mesa ela fica na linha do título da pasta, e no celular
   * essa linha não tem espaço para ela. Sem ela ali, uma
   * pasta com dezenas de dashboards só se percorre rolando.
   */
  section?: SectionId
  onSection?: (id: SectionId) => void
}) {
  return (
    <div
      // pt-4 = o raio da folha: com menos que isso a busca entrava na curva do
      // canto e o campo parecia torto em relação à borda.
      className="sticky top-0 z-20 -mx-4 px-4 pt-4 pb-3 flex flex-col gap-3"
      style={{ background: COLOR.surface }}
    >
      <SearchField query={query} onQuery={onQuery} placeholder={placeholder} />
      {section && onSection && <ContentTypeChips active={section} onSelect={onSection} scroll />}
    </div>
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
