import { CURRENT, DATA, MONTHS } from '@/engine/data'
import { cellsOf, totals, type Decomposition, type Filter } from '@/engine/decompose'
import * as F from '@/engine/format'
import { metadadoOf, type Measure } from '@/engine/catalog'
import { DIMENSIONS, INDICATORS, type DimId, type IndicatorId } from '@/engine/semantic'
import type { Fact, Rich } from '@/engine/explain'

/**
 * O painel: um documento que descreve o que mostrar, como no Weknow Dash.
 *
 * A conversa e os cliques mudam este documento por operações (`Op`); a tela
 * só o desenha. É por isso que filtro, total e clique continuam funcionando
 * depois de qualquer pedido: ninguém reescreve o gráfico, só o que ele lê.
 */

/** Largura em sextos da linha: 2 = um terço, 3 = metade, 6 = a linha toda. */
export type Span = 2 | 3 | 4 | 6

export type BreakdownStyle = 'bar' | 'column' | 'table'

export type Widget = { id: string; span: Span; title?: string } & (
  | { kind: 'kpi'; measure: Measure }
  | { kind: 'trend'; measure: Measure }
  | { kind: 'breakdown'; dim: DimId; measure: Measure; style: BreakdownStyle }
  | {
      kind: 'explain'
      /** O recorte que estava valendo quando a pergunta foi feita: a explicação é daquele momento. */
      mes: string
      filter: Filter
      d: Decomposition
      text: Rich
      next?: { dim: DimId; key: string }
    }
  | { kind: 'insight'; text: Rich }
  /** O painel executivo inteiro, no modelo de referência (`public/modelos`). */
  | ({ kind: 'painel' } & PainelState)
)

/**
 * O que o painel executivo guarda: o período, o filtro no corte principal
 * (um setor, um convênio), a parte da composição em destaque e o tema. A
 * conversa e os cliques dentro dele mudam isto. Ver `engine/painel.ts`.
 */
export type PainelState = { period: '6m' | '12m' | 'all'; filter: string; highlight: string | null; theme: 'dark' | 'light' } & Partial<PainelLook>

/**
 * O visual do painel, além do tema: paleta, uma cor principal própria (a do
 * cliente), densidade, cantos, linhas e as seções escondidas. Opcional porque
 * os painéis salvos antes disto não têm; quem lê completa com `PAINEL_LOOK`.
 */
export type PainelLook = {
  palette: 'blue' | 'green' | 'violet'
  accent: string | null
  density: 'comfortable' | 'compact'
  corners: 'round' | 'soft' | 'square'
  lines: 'smooth' | 'straight'
  hidden: PainelSection[]
}
export type PainelSection = 'insights' | 'volume' | 'rate' | 'composition' | 'table' | 'notes' | 'sparks'
export const PAINEL_LOOK: PainelLook = { palette: 'blue', accent: null, density: 'comfortable', corners: 'round', lines: 'smooth', hidden: [] }
export const lookOf = (w: Partial<PainelLook>): PainelLook => ({ ...PAINEL_LOOK, ...Object.fromEntries(Object.entries(w).filter(([k, v]) => k in PAINEL_LOOK && v !== undefined)) })
export type WidgetKind = Widget['kind']

/** Uma diretriz visual: o nome (o do arquivo, ou "Diretriz própria") e o texto. */
export type Guide = { name: string; text: string }

export type Board = {
  id: string
  title: string
  ind: IndicatorId
  /** De onde a pessoa partiu, quando partiu de um dashboard. */
  from?: { dashboard: string; folder: string; dims?: DimId[] }
  /**
   * Configuração escrita para este dashboard, por cima da padrão do
   * metadado. Sem ela, vale a do metadado (ver `engine/config.ts`).
   */
  config?: string
  /**
   * Diretriz visual que o cliente trouxe (escrita ou enviada em arquivo).
   * Sem ela, vale a padrão do Weknow (ver `engine/guide.ts`).
   */
  guide?: Guide
  /**
   * Tema dos blocos, que se troca no botão da barra de filtros. Sem ele, os
   * blocos aparecem no tema do Weknow de quem abre. O painel executivo tem o
   * dele, dentro do próprio painel (`PainelState.theme`).
   */
  theme?: 'dark' | 'light'
  mes: string
  dims: Partial<Record<DimId, string[]>>
  widgets: Widget[]
  facts: Record<string, Fact>
  /** Publicado como dashboard: pasta e se há mudança depois da publicação. */
  saved?: { folder: string; name: string; dirty: boolean; access?: Access }
  createdAt: number
}

/**
 * O tema do Weknow agora: é com ele que um painel novo abre. O `wk-theme`
 * cobre a primeira carga, quando o dashboard de exemplo é montado antes de a
 * página aplicar o tema.
 */
export function appTheme(): 'dark' | 'light' {
  const t = document.documentElement.dataset.theme ?? localStorage.getItem('wk-theme')
  if (t === 'dark' || t === 'light') return t
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/* ─────────────────────────────────────────────────────────── consultas */

export const prevMonth = (mes: string) => MONTHS[Math.max(0, MONTHS.indexOf(mes) - 1)]

export function boardFilter(b: Board, except?: DimId): Filter {
  const f: Filter = {}
  for (const [k, v] of Object.entries(b.dims)) if (k !== except && v && v.length) f[k as DimId] = v
  return f
}

export function measureValue(ind: IndicatorId, m: Measure, mes: string, filter: Filter) {
  const t = totals(ind, cellsOf(ind, mes, filter))
  return m === 'rate' ? t.rate : m === 'den' ? t.den : t.num
}

export function formatMeasure(ind: IndicatorId, m: Measure, v: number) {
  if (m === 'rate') return F.value(ind, v)
  if (INDICATORS[ind].den.field === 'valor_faturado') return F.money(v)
  return F.num(v)
}

export function formatMeasureDelta(ind: IndicatorId, m: Measure, d: number) {
  if (m === 'rate') return F.delta(ind, d)
  const s = formatMeasure(ind, m, Math.abs(d))
  return (d > 0 ? '+' : d < 0 ? '−' : '') + s
}

/** Valores de um corte, do maior para o menor, com o mês anterior ao lado. */
export function breakdownRows(b: Board, dim: DimId, m: Measure) {
  const filter = boardFilter(b, dim)
  const prev = prevMonth(b.mes)
  const keys = [...new Set(DATA[b.ind].map((c) => String(c[dim])))]
  return keys
    .map((key) => {
      const f = { ...filter, [dim]: key }
      return { key, v: measureValue(b.ind, m, b.mes, f), v0: measureValue(b.ind, m, prev, f) }
    })
    .filter((r) => r.v > 0 || r.v0 > 0)
    .sort((a, b2) => b2.v - a.v)
}

/** Todos os valores de cada corte: é o vocabulário que o intérprete reconhece. */
export function dimValues(ind: IndicatorId) {
  const out: Partial<Record<DimId, string[]>> = {}
  for (const d of INDICATORS[ind].dims) out[d] = [...new Set(DATA[ind].map((c) => String(c[d])))]
  return out
}

/* ─────────────────────────────────────────────────────────────── títulos */

export function measureLabel(ind: IndicatorId, m: Measure) {
  return metadadoOf(ind).measures[m].label
}

export function titleOf(ind: IndicatorId, w: Widget): string {
  if (w.title) return w.title
  switch (w.kind) {
    case 'kpi':
      return measureLabel(ind, w.measure)
    case 'trend':
      return `${measureLabel(ind, w.measure)}, mês a mês`
    case 'breakdown':
      return `${measureLabel(ind, w.measure)} por ${DIMENSIONS[w.dim].label}`
    case 'explain': {
      const seg = Object.values(w.filter).flat().join(', ')
      return `Por que ${INDICATORS[ind].article} ${w.d.delta >= 0 ? 'subiu' : 'caiu'} em ${F.monthName(w.mes)}${seg ? ` em ${seg}` : ''}`
    }
    case 'insight':
      return 'Leitura da IA'
    case 'painel':
      return 'Painel executivo'
  }
}

/* ─────────────────────────────────────────────────────────── operações */

export type Op =
  | { op: 'add'; widget: Widget; at?: number }
  | { op: 'remove'; id: string }
  | { op: 'update'; id: string; set: Partial<{ span: Span; style: BreakdownStyle; dim: DimId; measure: Measure; title: string }> }
  | { op: 'move'; id: string; to: number }
  | { op: 'filter'; dim: DimId; values: string[] }
  | { op: 'clearFilters' }
  | { op: 'month'; mes: string }
  | { op: 'title'; title: string }
  | { op: 'config'; text?: string }
  | { op: 'guide'; guide?: Guide }
  | { op: 'theme'; theme: 'dark' | 'light' }
  | { op: 'painel'; id: string; set: Partial<PainelState> }
  | { op: 'facts'; facts: Record<string, Fact> }

export function apply(b: Board, ops: Op[]): Board {
  let next = b
  for (const o of ops) {
    switch (o.op) {
      case 'add': {
        const ws = [...next.widgets]
        ws.splice(o.at ?? ws.length, 0, o.widget)
        next = { ...next, widgets: ws }
        break
      }
      case 'remove':
        next = { ...next, widgets: next.widgets.filter((w) => w.id !== o.id) }
        break
      case 'update':
        next = { ...next, widgets: next.widgets.map((w) => (w.id === o.id ? ({ ...w, ...o.set } as Widget) : w)) }
        break
      case 'move': {
        const ws = [...next.widgets]
        const i = ws.findIndex((w) => w.id === o.id)
        if (i < 0) break
        const [w] = ws.splice(i, 1)
        ws.splice(Math.max(0, Math.min(ws.length, o.to)), 0, w)
        next = { ...next, widgets: ws }
        break
      }
      case 'filter':
        next = { ...next, dims: { ...next.dims, [o.dim]: o.values } }
        break
      case 'clearFilters':
        next = { ...next, dims: {} }
        break
      case 'month':
        next = { ...next, mes: o.mes }
        break
      case 'config':
        next = { ...next, config: o.text }
        break
      case 'guide':
        next = { ...next, guide: o.guide }
        break
      case 'theme':
        next = { ...next, theme: o.theme }
        break
      case 'painel':
        next = { ...next, widgets: next.widgets.map((w) => (w.id === o.id && w.kind === 'painel' ? { ...w, ...o.set } : w)) }
        break
      case 'title':
        next = { ...next, title: o.title }
        break
      case 'facts':
        next = { ...next, facts: { ...next.facts, ...o.facts } }
        break
    }
  }
  if (next.saved && next !== b) next = { ...next, saved: { ...next.saved, dirty: true } }
  return next
}

/* ────────────────────────────────────────────────────────────── início */

let seq = 0
export const wid = (p = 'w') => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`

/** O painel de partida: os três números do metadado, a tendência e o primeiro corte da árvore. */
export function starter(ind: IndicatorId, dims: DimId[] = INDICATORS[ind].dims.slice(0, 1)): Widget[] {
  return [
    { id: wid(), kind: 'kpi', measure: 'rate', span: 2 },
    { id: wid(), kind: 'kpi', measure: 'den', span: 2 },
    { id: wid(), kind: 'kpi', measure: 'num', span: 2 },
    { id: wid(), kind: 'trend', measure: 'rate', span: dims.length > 1 ? 6 : 3 },
    ...dims.map((dim): Widget => ({ id: wid(), kind: 'breakdown', dim, measure: 'rate', style: 'bar', span: 3 })),
  ]
}

export function newBoard(ind: IndicatorId, title: string, widgets: Widget[], from?: Board['from']): Board {
  return { id: wid('an'), title, ind, from, mes: CURRENT, dims: {}, widgets, facts: {}, createdAt: Date.now() }
}

/**
 * Quem vê o dashboard publicado e o que cada um vê dele.
 *
 *   who      pasta: quem já acessa a pasta (herda as permissões dela);
 *            eu: só quem criou; grupos: os grupos escolhidos
 *   rows     aplica as regras de acesso do metadado: cada pessoa vê só as
 *            linhas liberadas para ela (os convênios, os setores)
 *   export   deixa baixar os dados dos gráficos
 */
export type Access = { who: 'pasta' | 'eu' | 'grupos'; groups: string[]; rows: boolean; export: boolean }
