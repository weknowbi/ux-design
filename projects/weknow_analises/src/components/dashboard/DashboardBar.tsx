import { useLayoutEffect, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { AnaliseInteligenteIcon } from '@/components/dashboard/AnaliseInteligenteIcon'
import { Btn } from '@ds/Btn'
import { Dropdown } from '@/components/browser/Menu'
import { useEllipsisTooltip } from '@/components/Tooltip'

/**
 * Barra inferior do dashboard — nó 4921:5646 (WP-832), com as abas de volta.
 *
 *   barra      40 de altura, px 16, fio de cima #DEE2E6, fundo da folha
 *              (fio e recuo medidos no produto no ar)
 *   direita    Análise inteligente · "…"
 *
 * O Figma também tem Editar layout, zoom e tela cheia. Ficam de fora por
 * enquanto: o protótipo simula só o comportamento da navegação.
 *
 * Os controles são os do design system, e não desenhos próprios da barra:
 * `Btn` pequeno (32) para as ações com rótulo, `IconBtn` (32 × 32) para as de
 * ícone. A exceção é o ícone da
 * Análise inteligente, em 24 e não nos 20 do botão: em 20 ele ficava
 * ilegível. O Figma tinha 28 de altura e
 * fundos cinza próprios, que não existem no sistema; 32 é a altura do botão
 * pequeno, que o sistema reserva justamente para barras densas.
 *
 * As abas não têm componente no sistema (o chip diz, com todas as letras, que
 * não é navegação por abas). Elas usam o item de navegação do menu lateral:
 * fundo e cor de "ativo" do menu, raio 8, texto 14 — trocar de aba é navegar.
 *
 * Na 5.2 a esquerda virou seletor + "1 de N", e as abas sumiram de vista.
 * Para quem monta o painel como uma história, as abas SÃO o roteiro: o nome
 * de cada uma é o título do capítulo, e trocar de aba é virar a página.
 * Escondidas atrás de uma lista, cada troca custa dois cliques e o usuário
 * não sabe mais o que vem depois.
 *
 * Por isso as abas voltam a ficar à vista, na ordem. As que não cabem na
 * largura vão para o "+N", que lista o painel inteiro. A aba aberta nunca
 * fica escondida: a fileira anda para mostrá-la, sem tirar as outras de ordem.
 *
 * A escolha entre abas visíveis e a lista suspensa da 5.2, por dashboard,
 * chegou a existir no protótipo e saiu: fica só o modo de abas visíveis.
 *
 * O limite de abas visíveis é a largura, e não um número fixo: "5 abas" sobra
 * num monitor grande, quebra num notebook e depende do tamanho dos nomes.
 */

const BAR_HEIGHT = 40
/** A altura do `Btn` pequeno e do `IconBtn`: tudo na barra se alinha por ela. */
const CONTROL_HEIGHT = 32
/** Respiro entre as abas: pouco, porque o fundo da aba já separa uma da outra. */
const TAB_GAP = 4
/** Nome longo corta aqui e mostra o resto na dica; senão uma aba engole a fileira. */
const TAB_MAX_WIDTH = 240
type Tab = { id: string; name: string }

/* ---------------------------------------------------------------- abas */

function TabButton({
  tab,
  index,
  active,
  onSelect,
  measuring,
}: {
  tab: Tab
  index: number
  active: boolean
  onSelect?: (i: number) => void
  measuring?: boolean
}) {
  const tip = useEllipsisTooltip<HTMLSpanElement>(tab.name)
  return (
    <button
      type="button"
      role={measuring ? undefined : 'tab'}
      aria-selected={measuring ? undefined : active}
      tabIndex={measuring ? -1 : active ? 0 : -1}
      data-tab={measuring ? undefined : index}
      onClick={() => onSelect?.(index)}
      onMouseEnter={tip.show}
      onMouseLeave={tip.hide}
      className={`shrink-0 flex items-center px-3 transition-colors ${
        active
          ? 'bg-[var(--wk-nav-active)] text-[var(--wk-nav-active-text)]'
          : 'text-[var(--wk-nav-text)] hover:bg-[var(--wk-nav-hover)] hover:text-[var(--wk-nav-hover-text)]'
      }`}
      style={{
        height: CONTROL_HEIGHT,
        maxWidth: TAB_MAX_WIDTH,
        borderRadius: LAYOUT.navItemRadius,
        fontFamily: FONT,
        fontSize: 14,
      }}
    >
      <span ref={tip.ref} className="truncate">
        {tab.name}
      </span>
      {!measuring && tip.tooltip}
    </button>
  )
}

/** Lista do painel inteiro, aberta pelo "+N". */
function TabList({ tabs, active, onSelect }: { tabs: Tab[]; active: number; onSelect: (i: number) => void }) {
  return (
    <div role="listbox" aria-label="Abas do dashboard">
      {tabs.map((t, i) => {
        const on = i === active
        return (
          <button
            key={t.id}
            type="button"
            role="option"
            aria-selected={on}
            onClick={() => onSelect(i)}
            className="w-full flex items-center gap-2 h-9 pl-2 pr-3 rounded-md text-left transition-colors hover:bg-[var(--wk-menu-hover)]"
            style={{ fontFamily: FONT, fontSize: 14, color: on ? COLOR.primary : COLOR.navText }}
          >
            <span className="w-6 shrink-0 text-right tabular-nums" style={{ color: COLOR.textSecondary, fontSize: 12 }}>
              {i + 1}
            </span>
            <span className="flex-1 min-w-0 truncate" style={{ maxWidth: 320 }}>
              {t.name}
            </span>
            <span className="w-5 shrink-0 flex justify-center">
              {on && <Icon name="check" size={18} color={COLOR.primary} />}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function OverflowTrigger({ hidden, open, toggle }: { hidden: number; open?: boolean; toggle?: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={`Mais ${hidden} abas`}
      title="Todas as abas"
      className={`shrink-0 flex items-center gap-0.5 pl-3 pr-2 transition-colors text-[var(--wk-nav-text)] ${
        open ? 'bg-[var(--wk-nav-hover)]' : 'hover:bg-[var(--wk-nav-hover)]'
      }`}
      style={{ height: CONTROL_HEIGHT, borderRadius: LAYOUT.navItemRadius, fontFamily: FONT, fontSize: 14 }}
    >
      +{hidden}
      <Icon name="keyboard_arrow_up" size={20} color={COLOR.navLabel} className={open ? 'wk-flip' : undefined} />
    </button>
  )
}

/**
 * Qual trecho da fileira aparece. Mantém o começo de onde estava sempre que
 * a aba aberta continua à vista — a fileira só anda quando precisa, e anda o
 * mínimo. Sobrando espaço no fim, puxa abas de trás para não deixar buraco.
 */
function windowFor(widths: number[], room: number, active: number, prevStart: number) {
  const n = widths.length
  const fitFrom = (s: number) => {
    let used = 0
    let e = s
    while (e < n && used + (e > s ? TAB_GAP : 0) + widths[e] <= room) used += (e > s ? TAB_GAP : 0) + widths[e++]
    return Math.max(e, s + 1)
  }
  let start = Math.min(Math.max(0, prevStart), n - 1)
  if (active < start) start = active
  let end = fitFrom(start)
  if (active >= end) {
    start = active
    let used = widths[active]
    while (start > 0 && used + TAB_GAP + widths[start - 1] <= room) used += TAB_GAP + widths[--start]
    end = fitFrom(start)
  }
  if (end === n) {
    let used = widths.slice(start, end).reduce((a, b) => a + b, 0) + TAB_GAP * (end - start - 1)
    while (start > 0 && used + TAB_GAP + widths[start - 1] <= room) used += TAB_GAP + widths[--start]
  }
  return { start, end }
}

function TabStrip({ tabs, active, onSelect }: { tabs: Tab[]; active: number; onSelect: (i: number) => void }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState(0)
  const [widths, setWidths] = useState<number[]>([])
  const [moreWidth, setMoreWidth] = useState(0)
  const startRef = useRef(0)

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(([e]) => setRoom(Math.floor(e.contentRect.width)))
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  /* Mede cada aba no tamanho natural, numa fileira invisível. Remede quando a
     fonte termina de carregar: medida com a fonte reserva, a conta erra por
     poucos pixels e a última aba fica cortada pela metade. */
  useLayoutEffect(() => {
    const measure = () => {
      const row = measureRef.current
      if (!row) return
      const kids = Array.from(row.children) as HTMLElement[]
      setWidths(kids.slice(0, -1).map((el) => Math.ceil(el.getBoundingClientRect().width)))
      setMoreWidth(Math.ceil(kids[kids.length - 1].getBoundingClientRect().width))
    }
    measure()
    document.fonts?.ready.then(measure)
  }, [tabs])

  const total = widths.reduce((a, b) => a + b, 0) + TAB_GAP * Math.max(0, widths.length - 1)
  const measured = widths.length === tabs.length && room > 0
  const allFit = !measured || total <= room
  const { start, end } = allFit
    ? { start: 0, end: tabs.length }
    : windowFor(widths, room - moreWidth - TAB_GAP, active, startRef.current)
  startRef.current = start
  const hidden = tabs.length - (end - start)

  /* Setas do teclado andam pelas abas, como em qualquer lista de abas. */
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const next = Math.min(tabs.length - 1, Math.max(0, active + step))
    onSelect(next)
    requestAnimationFrame(() => boxRef.current?.querySelector<HTMLElement>(`[data-tab="${next}"]`)?.focus())
  }

  return (
    /* O "+N" vem colado na última aba, e não na ponta da barra: longe dela
       ele parece pertencer aos botões da direita. */
    <div ref={boxRef} className="relative flex-1 min-w-0 flex items-center" style={{ gap: TAB_GAP }}>
      <div
        role="tablist"
        aria-label="Abas do dashboard"
        onKeyDown={onKeyDown}
        className="min-w-0 flex items-center"
        style={{ gap: TAB_GAP, visibility: measured ? undefined : 'hidden' }}
      >
        {tabs.slice(start, end).map((t, i) => (
          <TabButton key={t.id} tab={t} index={start + i} active={start + i === active} onSelect={onSelect} />
        ))}
      </div>
      {hidden > 0 && (
        <Dropdown align="right" minWidth={260} trigger={({ open, toggle }) => <OverflowTrigger hidden={hidden} open={open} toggle={toggle} />}>
          {(close) => (
            <TabList
              tabs={tabs}
              active={active}
              onSelect={(i) => {
                onSelect(i)
                close()
              }}
            />
          )}
        </Dropdown>
      )}
      {/* Régua: fora do fluxo e sem tamanho, para não empurrar nada nem criar rolagem. */}
      <div aria-hidden className="absolute left-0 top-0 w-0 h-0 overflow-hidden">
        <div ref={measureRef} className="flex" style={{ width: 'max-content' }}>
          {tabs.map((t, i) => (
            <TabButton key={t.id} tab={t} index={i} active={false} measuring />
          ))}
          <OverflowTrigger hidden={tabs.length} />
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------ controles */

/**
 * Seta de aba anterior/próxima: o `IconBtn` do sistema (32 × 32, ícone 24 em
 * `--wk-nav-label`), com o estado desabilitado que ele ainda não tem.
 */
function Arrow({ dir, disabled, onClick }: { dir: 'prev' | 'next'; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === 'prev' ? 'Aba anterior' : 'Próxima aba'}
      title={dir === 'prev' ? 'Aba anterior' : 'Próxima aba'}
      className="wk-icon-btn shrink-0 w-8 h-8 flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
    >
      <Icon name={dir === 'prev' ? 'chevron_left' : 'chevron_right'} size={24} color={COLOR.navLabel} />
    </button>
  )
}

/* ---------------------------------------------------------------- barra */

export function DashboardBar({
  tabs,
  active,
  onSelect,
  mobile,
}: {
  tabs: Tab[]
  active: number
  onSelect: (i: number) => void
  mobile?: boolean
}) {
  const prev = <Arrow dir="prev" disabled={active === 0} onClick={() => onSelect(active - 1)} />
  const next = <Arrow dir="next" disabled={active === tabs.length - 1} onClick={() => onSelect(active + 1)} />

  return (
    <div
      className="shrink-0 flex items-center gap-2"
      style={{
        height: BAR_HEIGHT,
        paddingLeft: mobile ? 8 : 16,
        paddingRight: mobile ? 8 : 16,
        borderTop: `1px solid ${COLOR.border}`,
        background: COLOR.surface,
      }}
    >
      {/* As setas ficam juntas na frente: com as abas no meio, a da
          direita andaria a cada troca de aba. */}
      {!mobile && (
        <div className="flex items-center shrink-0">
          {prev}
          {next}
        </div>
      )}
      <TabStrip tabs={tabs} active={active} onSelect={onSelect} />

      <div className="shrink-0 flex items-center gap-2 pl-4">
        {/* Editar layout, zoom e tela cheia ficam de fora por enquanto: o
            protótipo simula só a navegação, que é o que o Jira pede. */}
        {/* O ícone vai no conteúdo, e não no `iconLeft`: lá a caixa é de 20 e
            o de 24 transbordaria. Recuos do web (medidos no dashboard 145):
            4 antes do ícone, 8 até o rótulo, 8 depois dele. O desenho do
            ícone já tem folga própria, e com os 12 do botão pequeno ele
            ficava longe da borda. As margens negativas tiram a diferença. */}
        <Btn size="sm" title={mobile ? 'Análise inteligente' : undefined}>
          <span className="flex items-center" style={{ gap: 8, marginLeft: -8, marginRight: mobile ? -8 : -4 }}>
            <AnaliseInteligenteIcon />
            {!mobile && 'Análise inteligente'}
          </span>
        </Btn>
        {/* O "…" do web fica à vista, mas sem ação por enquanto: o menu
            dele não faz parte do que o protótipo testa. */}
        <span className="shrink-0 w-8 h-8 flex items-center justify-center" aria-hidden>
          <Icon name="more_horiz" size={24} color={COLOR.navLabel} />
        </span>
      </div>
    </div>
  )
}
