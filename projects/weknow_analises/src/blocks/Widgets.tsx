import { useState, type ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { Dropdown, MenuAction, MenuOption } from '@/components/browser/Menu'
import { PointMenu, type PointAction } from '@/components/PointMenu'
import { RichText } from '@/blocks/Rich'
import { BarsChart, BreakdownTable, ColumnsChart, DecompChart, DecompTable, TrendChart, TrendTable, type Pick } from '@/blocks/charts'
import {
  boardFilter,
  breakdownRows,
  formatMeasure,
  formatMeasureDelta,
  measureValue,
  prevMonth,
  titleOf,
  type Board,
  type BreakdownStyle,
  type Op,
  type Span,
  type Widget,
} from '@/engine/board'
import { metadadoOf, type Measure } from '@/engine/catalog'
import { scopeOf } from '@/engine/explain'
import * as F from '@/engine/format'
import { series } from '@/engine/decompose'
import { DIMENSIONS, INDICATORS, type DimId } from '@/engine/semantic'

/**
 * Os blocos do painel. Cada um aceita três jeitos de mexer:
 *
 *   direto    os botões que aparecem no bloco (tipo de gráfico, largura,
 *             remover) e o arrasto pela alça
 *   clique    a barra, a coluna ou o mês abre um menu ali mesmo (filtrar,
 *             explicar, abrir mais um nível)
 *   IA        "Editar com IA" leva o bloco para a caixa do Criar com IA, e
 *             a instrução seguinte vale para ele
 *
 * Os três terminam no mesmo lugar: operações no documento do painel, que o
 * desfazer conhece.
 */

export type WidgetActions = {
  ops: (ops: Op[]) => void
  ask: (text: string, about?: string) => void
  about: (id: string) => void
}

type Menu = { at: { x: number; y: number }; title: string; actions: PointAction[] } | null

export function WidgetView({
  board,
  w,
  act,
  arriving,
  isAbout,
  drag,
}: {
  board: Board
  w: Widget
  act: WidgetActions
  arriving: boolean
  isAbout: boolean
  drag: { onStart: () => void; onOver: () => void; onEnd: () => void; over: boolean }
}) {
  const [menu, setMenu] = useState<Menu>(null)
  const ind = board.ind
  const I = INDICATORS[ind]
  const filter = boardFilter(board)
  const prev = prevMonth(board.mes)

  /* O que cada clique oferece. */
  const pickMonth: Pick = (mes, at) =>
    setMenu({
      at,
      title: F.monthShort(mes),
      actions: [
        ...(mes !== board.mes ? [{ icon: 'event', label: `Analisar ${F.monthShort(mes)}`, onSelect: () => act.ops([{ op: 'month', mes }]) }] : []),
        { icon: 'help', label: `Por que mudou em ${F.monthName(mes)}?`, onSelect: () => act.ask(`Por que ${I.article} mudou em ${F.monthName(mes)} de ${mes.slice(0, 4)}?`) },
      ],
    })

  /* A explicação é sempre do indicador (a razão). Num bloco de saídas, o menu
     diz isso com todas as letras, para ninguém esperar a explicação do volume. */
  const whyLabel = (key: string, m: Measure) => (m === 'rate' ? `Por que ${key} mudou?` : `Por que ${I.rateNoun} de ${key} mudou?`)
  const pickValue = (dim: (typeof I.dims)[number], m: Measure): Pick => (key, at) => {
    const sel = board.dims[dim] ?? []
    const on = sel.includes(key)
    const deeper = I.dims.find((d) => d !== dim && !board.dims[d]?.length)
    setMenu({
      at,
      title: key,
      actions: [
        on
          ? { icon: 'filter_alt_off', label: `Tirar ${key} do filtro`, onSelect: () => act.ops([{ op: 'filter', dim, values: sel.filter((v) => v !== key) }]) }
          : { icon: 'filter_alt', label: `Filtrar o painel por ${key}`, onSelect: () => act.ops([{ op: 'filter', dim, values: [key] }]) },
        ...(sel.length && !on ? [{ icon: 'add', label: `Somar ${key} ao filtro`, onSelect: () => act.ops([{ op: 'filter', dim, values: [...sel, key] }]) }] : []),
        { icon: 'help', label: whyLabel(key, m), onSelect: () => act.ask(`Por que ${key} mudou?`, w.id) },
        ...(deeper ? [{ icon: 'account_tree', label: `Abrir ${key} por ${DIMENSIONS[deeper].label}`, onSelect: () => act.ask(`${key} por ${DIMENSIONS[deeper].label}`, w.id) }] : []),
      ],
    })
  }

  let body: ReactNode
  let sub: string | undefined
  /** A frase embaixo do gráfico: o que ele mostra, com o número. */
  let insight: string | undefined
  let tools: ReactNode = null
  /** A versão em tabela do gráfico, para quem não lê cor ou quer o número exato. */
  let table: ReactNode = null
  const [asTable, setAsTable] = useState(false)
  let more: ((close: () => void) => ReactNode) | null = null
  const span = (s: Span, close: () => void) => () => {
    act.ops([{ op: 'update', id: w.id, set: { span: s } }])
    close()
  }
  const widthMenu = (close: () => void) => (
    <>
      <MenuOption checked={w.span === 2} label="Um terço da linha" onSelect={span(2, close)} />
      <MenuOption checked={w.span === 3} label="Meia linha" onSelect={span(3, close)} />
      <MenuOption checked={w.span === 4} label="Dois terços" onSelect={span(4, close)} />
      <MenuOption checked={w.span === 6} label="Linha toda" onSelect={span(6, close)} />
    </>
  )
  const measureMenu = (cur: Measure, close: () => void) =>
    (['rate', 'den', 'num'] as Measure[]).map((m) => (
      <MenuOption
        key={m}
        checked={cur === m}
        label={metadadoOf(ind).measures[m].label}
        onSelect={() => {
          act.ops([{ op: 'update', id: w.id, set: { measure: m } }])
          close()
        }}
      />
    ))

  switch (w.kind) {
    case 'kpi': {
      const v = measureValue(ind, w.measure, board.mes, filter)
      const v0 = measureValue(ind, w.measure, prev, filter)
      const d = v - v0
      const up = d > 0
      body = (
        <button
          type="button"
          className="an-kpi text-left w-full flex items-end justify-between gap-3 @max-[300px]:flex-col @max-[300px]:items-start rounded-md outline-none focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]"
          title="Explorar este número"
          onClick={(e) =>
            setMenu({
              at: { x: e.clientX, y: e.clientY },
              title: titleOf(ind, w),
              actions: [
                ...(w.measure === 'rate' ? [{ icon: 'help', label: `Por que mudou em ${F.monthName(board.mes)}?`, onSelect: () => act.ask(`Por que ${I.article} mudou em ${F.monthName(board.mes)} de ${board.mes.slice(0, 4)}?`) }] : []),
                { icon: 'show_chart', label: 'Ver mês a mês', onSelect: () => act.ask(`${metadadoOf(ind).measures[w.measure].label} mês a mês`) },
              ],
            })
          }
        >
          <div className="min-w-0">
            <div className="whitespace-nowrap" style={{ fontFamily: FONT, fontSize: 30, lineHeight: '38px', fontWeight: 600, letterSpacing: '-0.4px', color: COLOR.text, fontVariantNumeric: 'tabular-nums' }}>
              {formatMeasure(ind, w.measure, v)}
            </div>
            <div className="flex flex-wrap items-center" style={{ gap: 6, marginTop: 6, fontFamily: FONT, fontSize: 12, lineHeight: '16px', color: COLOR.textSecondary }}>
              <span className="inline-flex items-center rounded-full whitespace-nowrap" style={{ gap: 2, height: 22, padding: '0 8px 0 6px', background: 'var(--wk-hover-strong)', color: COLOR.text, fontWeight: 600 }}>
                <Icon name={up ? 'arrow_upward' : d < 0 ? 'arrow_downward' : 'remove'} size={14} color="currentColor" weight={500} />
                {v0 ? `${F.signed((d / v0) * 100, 1)}%` : formatMeasureDelta(ind, w.measure, d)}
              </span>
              <span className="whitespace-nowrap">
                {v0 ? `${formatMeasureDelta(ind, w.measure, d)} ` : ''}vs {F.monthShort(prev)}
              </span>
            </div>
          </div>
          <Spark ind={ind} filter={filter} measure={w.measure} mes={board.mes} />
        </button>
      )
      more = (close) => (
        <>
          {measureMenu(w.measure, close)}
          <Sep />
          <MenuAction icon="delete" label="Remover do painel" onSelect={() => (close(), act.ops([{ op: 'remove', id: w.id }]))} />
        </>
      )
      break
    }
    case 'trend': {
      sub = `${F.monthShort('2025-10')} a ${F.monthShort('2026-10')} · clique num mês`
      insight = trendInsight(board, w.measure)
      body = <TrendChart ind={ind} filter={filter} measure={w.measure} mes={board.mes} onPick={pickMonth} />
      table = <TrendTable ind={ind} filter={filter} measure={w.measure} />
      more = (close) => (
        <>
          {measureMenu(w.measure, close)}
          <Sep />
          {widthMenu(close)}
          <Sep />
          <MenuAction icon="delete" label="Remover do painel" onSelect={() => (close(), act.ops([{ op: 'remove', id: w.id }]))} />
        </>
      )
      break
    }
    case 'breakdown': {
      const rows = breakdownRows(board, w.dim, w.measure)
      const sel = board.dims[w.dim] ?? []
      sub = `${F.monthShort(board.mes)} · clique numa barra`
      insight = breakdownInsight(board, w.dim, w.measure, rows)
      const set = (style: BreakdownStyle) => act.ops([{ op: 'update', id: w.id, set: { style } }])
      tools = (
        <>
          <ToolBtn icon="align_horizontal_left" title="Ver em barras" active={w.style === 'bar'} onClick={() => set('bar')} />
          <ToolBtn icon="bar_chart" title="Ver em colunas" active={w.style === 'column'} onClick={() => set('column')} />
          <ToolBtn icon="table" title="Ver em tabela" active={w.style === 'table'} onClick={() => set('table')} />
        </>
      )
      body =
        w.style === 'table' ? (
          <BreakdownTable ind={ind} measure={w.measure} rows={rows} dimLabel={cap(DIMENSIONS[w.dim].label)} prevLabel={F.monthShort(prev)} curLabel={F.monthShort(board.mes)} />
        ) : w.style === 'column' ? (
          <ColumnsChart ind={ind} measure={w.measure} rows={rows} selected={sel} onPick={pickValue(w.dim, w.measure)} />
        ) : (
          <BarsChart ind={ind} measure={w.measure} rows={rows} selected={sel} onPick={pickValue(w.dim, w.measure)} />
        )
      more = (close) => (
        <>
          {measureMenu(w.measure, close)}
          <Sep />
          {widthMenu(close)}
          <Sep />
          <MenuAction icon="delete" label="Remover do painel" onSelect={() => (close(), act.ops([{ op: 'remove', id: w.id }]))} />
        </>
      )
      break
    }
    case 'explain': {
      const scope = scopeOf(w.filter)
      sub = `${scope.length ? scope.join(' · ') : 'Hospital inteiro'} · ${F.monthShort(prevMonth(w.mes))} → ${F.monthShort(w.mes)} · congelado no momento da pergunta`
      body = (
        <div>
          <p style={{ fontFamily: FONT, fontSize: 15, lineHeight: 1.7, color: COLOR.text, margin: '0 0 16px', maxWidth: 760 }}>
            <RichText text={w.text} />
          </p>
          <DecompChart ind={ind} d={w.d} />
          {w.next && (
            <div className="flex flex-wrap" style={{ gap: 8, marginTop: 16 }}>
              <ActionLink icon="account_tree" onClick={() => act.ask(`Por que ${w.next!.key} mudou?`, w.id)}>
                Abrir {w.next.key}
              </ActionLink>
              <ActionLink icon="filter_alt" onClick={() => act.ops([{ op: 'filter', dim: w.next!.dim, values: [w.next!.key] }])}>
                Filtrar o painel por {w.next.key}
              </ActionLink>
            </div>
          )}
        </div>
      )
      table = <DecompTable ind={ind} d={w.d} />
      more = (close) => <MenuAction icon="delete" label="Remover do painel" onSelect={() => (close(), act.ops([{ op: 'remove', id: w.id }]))} />
      break
    }
    case 'insight':
      body = (
        <p style={{ fontFamily: FONT, fontSize: 15, lineHeight: 1.7, color: COLOR.text, margin: 0 }}>
          <RichText text={w.text} />
        </p>
      )
      break
  }

  const isKpi = w.kind === 'kpi'
  return (
    <section
      data-widget={w.id}
      onDragOver={(e) => {
        e.preventDefault()
        drag.onOver()
      }}
      onDrop={(e) => {
        e.preventDefault()
        drag.onEnd()
      }}
      className={`group relative an-card @container${arriving ? ' an-arrive wk-enter' : ''}`}
      style={{
        gridColumn: `span ${w.span}`,
        background: 'var(--wk-surface)',
        // A cor do fio fica na classe, para o hover conseguir trocá-la; aqui só o estado escolhido.
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: isAbout ? COLOR.primary : undefined,
        boxShadow: isAbout ? '0 0 0 1px var(--wk-primary)' : drag.over ? '0 0 0 2px var(--an-fact-line)' : undefined,
        borderRadius: 12,
        padding: isKpi ? '16px 20px 18px' : '18px 24px 22px',
        minWidth: 0,
        scrollMarginTop: 16,
      }}
    >
      <header className="flex items-start" style={{ gap: 4, marginBottom: isKpi ? 2 : 12, minHeight: isKpi ? 24 : 32 }}>
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move'
            drag.onStart()
          }}
          onDragEnd={drag.onEnd}
          title="Arrastar para mudar de lugar"
          aria-hidden
          /* Solta na margem do bloco: dentro da linha ela empurrava o título
             8px para dentro do resto do conteúdo. */
          className="absolute flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: 2, top: isKpi ? 14 : 16, width: 20, height: 32, cursor: 'grab', color: COLOR.navLabel }}
        >
          <Icon name="drag_indicator" size={20} />
        </span>
        <div className="flex-1 min-w-0" style={{ paddingTop: isKpi ? 2 : 5 }}>
          {w.kind === 'explain' && (
            <div className="flex items-center" style={{ gap: 6, marginBottom: 4 }}>
              <Icon name="query_stats" size={20} color={COLOR.navLabel} />
              <span style={{ fontFamily: FONT, fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary }}>Explicação da IA</span>
            </div>
          )}
          <h3 style={{ fontFamily: FONT, fontSize: isKpi ? 13 : 15, lineHeight: isKpi ? '18px' : '22px', fontWeight: isKpi ? 500 : 600, color: isKpi ? COLOR.textSecondary : COLOR.text, margin: 0 }}>
            {titleOf(ind, w)}
          </h3>
          {sub && <div style={{ fontFamily: FONT, fontSize: 12, lineHeight: '16px', color: COLOR.textSecondary, marginTop: 2 }}>{sub}</div>}
        </div>
        {/* Por cima do título, e não ao lado: reservar a largura da barra quebrava
            o título em duas linhas num bloco de meia linha. */}
        <div
          className="absolute flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
          style={{ top: 10, right: 10, gap: 0, background: 'var(--wk-surface)', borderRadius: 8, boxShadow: '0 0 0 1px var(--wk-border)', padding: 2 }}
        >
          {tools}
          {table && <ToolBtn icon="table" title={asTable ? 'Ver como gráfico' : 'Ver em tabela'} active={asTable} onClick={() => setAsTable((v) => !v)} />}
          <ToolBtn icon="draw" title="Editar com IA" active={isAbout} onClick={() => act.about(w.id)} />
          {more && (
            <Dropdown
              minWidth={200}
              trigger={({ toggle }) => <ToolBtn icon="more_horiz" title="Mais ações do bloco" onClick={toggle} />}
            >
              {(close) => more!(close)}
            </Dropdown>
          )}
        </div>
      </header>
      {asTable && table ? table : body}
      {insight && (
        <p className="flex items-start" style={{ gap: 6, margin: '14px 0 0', fontFamily: FONT, fontSize: 13, lineHeight: '20px', color: COLOR.textSecondary }}>
          <Icon name="lightbulb" size={16} color={COLOR.navLabel} className="shrink-0 mt-0.5" />
          <span>{insight}</span>
        </p>
      )}
      {menu && <PointMenu at={menu.at} title={menu.title} actions={menu.actions} onClose={() => setMenu(null)} />}
    </section>
  )
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/* ─────────────────────────────────────────────── a frase de cada gráfico */

/** Mês a mês: como fechou o mês e se é o pico (ou o vale) do ano. */
function trendInsight(board: Board, m: Measure): string {
  const pts = series(board.ind, boardFilter(board)).map((p) => ({ mes: p.mes, v: m === 'rate' ? p.rate : m === 'den' ? p.den : p.num }))
  const i = pts.findIndex((p) => p.mes === board.mes)
  if (i < 1) return ''
  const v = pts[i].v
  const d = v - pts[i - 1].v
  const label = metadadoOf(board.ind).measures[m].label
  const year = pts.slice(Math.max(0, i - 12), i + 1).map((p) => p.v)
  const peak = v === Math.max(...year) ? ', o maior valor dos últimos 12 meses' : v === Math.min(...year) ? ', o menor valor dos últimos 12 meses' : ''
  const move = Math.abs(d) < 1e-9 ? 'ficou igual' : `${d > 0 ? 'subiu' : 'caiu'} ${formatMeasureDelta(board.ind, m, Math.abs(d)).replace(/^\+/, '')}`
  return `${label} ${move} em ${F.monthName(board.mes)} e fechou em ${formatMeasure(board.ind, m, v)}${peak}.`
}

/** Corte: quem lidera e quem mais mexeu contra o mês anterior. */
function breakdownInsight(board: Board, dim: DimId, m: Measure, rows: { key: string; v: number; v0: number }[]): string {
  if (rows.length < 2) return ''
  const top = rows[0]
  const mover = [...rows].sort((a, b) => Math.abs(b.v - b.v0) - Math.abs(a.v - a.v0))[0]
  const label = metadadoOf(board.ind).measures[m].label.toLowerCase()
  const lead = `${top.key} lidera em ${label} entre os ${DIMENSIONS[dim].plural}, com ${formatMeasure(board.ind, m, top.v)}`
  const d = mover.v - mover.v0
  if (Math.abs(d) < 1e-9) return lead + '.'
  return `${lead}. A maior variação foi em ${mover.key}: ${formatMeasureDelta(board.ind, m, d)} contra ${F.monthShort(prevMonth(board.mes))}.`
}

/**
 * A minilinha do número: os 13 meses do metadado, sem eixo nem rótulo, com o
 * mês da análise marcado. Ela responde "isso é normal?" sem abrir o gráfico.
 */
export function Spark({ ind, filter, measure, mes }: { ind: Board['ind']; filter: ReturnType<typeof boardFilter>; measure: Measure; mes: string }) {
  const W = 104
  const H = 40
  const pts = series(ind, filter).map((p) => ({ mes: p.mes, v: measure === 'rate' ? p.rate : measure === 'den' ? p.den : p.num }))
  const vs = pts.map((p) => p.v)
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const x = (i: number) => 3 + (i / (pts.length - 1)) * (W - 6)
  const y = (v: number) => (hi === lo ? H / 2 : 4 + (1 - (v - lo) / (hi - lo)) * (H - 8))
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.v).toFixed(1)}`).join('')
  const at = Math.max(0, pts.findIndex((p) => p.mes === mes))
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="shrink-0" aria-hidden style={{ overflow: 'visible' }}>
      <path d={`${line}L${x(pts.length - 1)},${H}L${x(0)},${H}Z`} fill="var(--an-wash)" />
      <path d={line} fill="none" stroke="var(--an-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(at)} cy={y(pts[at].v)} r={3.5} fill="var(--an-line)" stroke="var(--wk-surface)" strokeWidth={2} />
    </svg>
  )
}

function Sep() {
  return <div style={{ height: 1, background: COLOR.border, margin: '4px 0' }} />
}

function ToolBtn({ icon, title, onClick, active }: { icon: string; title: string; onClick?: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      onClick={onClick}
      className="wk-icon-btn w-8 h-8 flex items-center justify-center"
      style={{ color: active ? COLOR.primary : COLOR.navLabel }}
    >
      <Icon name={icon} size={20} filled={active} />
    </button>
  )
}

function ActionLink({ icon, onClick, children }: { icon: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center transition-colors hover:bg-[var(--wk-btn-ghost-hover)]"
      style={{ gap: 6, height: 32, paddingInline: 10, marginLeft: -10, borderRadius: 6, fontFamily: FONT, fontSize: 13, color: COLOR.primary }}
    >
      <Icon name={icon} size={20} color="currentColor" weight={400} />
      {children}
    </button>
  )
}
