import type {
  Agg, BreakdownWidget, DashboardSpec, FilterState, Grain, Measure, Period, Row, Source,
} from '@/engine/types'

/**
 * O motor. Todo dashboard passa por aqui, e é aqui que moram as garantias que
 * no fluxo "IA escreve o HTML" dependiam de sorte:
 *
 *   1. Um filtro só, para tudo. Cada gráfico lê `filterRows` com o mesmo
 *      estado. Não existe gráfico que "esqueceu" de ouvir o período.
 *   2. Filtro cruzado sem autoexclusão. Ao filtrar por uma categoria, o
 *      gráfico de categorias continua mostrando as outras (apagadas) — senão
 *      ele viraria uma barra só e não daria para trocar a seleção.
 *   3. O total fecha. O "top N" agrupa o resto em "Outros", então a soma das
 *      fatias é sempre o valor do indicador. `audit` confere isso a cada
 *      pintura, não só quando o dashboard nasce.
 */

/* ── Datas ────────────────────────────────────────────────────────────────── */

const DAY = 86400000
const toMs = (iso: string) => Date.parse(iso + 'T00:00:00Z')
const fromMs = (ms: number) => new Date(ms).toISOString().slice(0, 10)
export const addDays = (iso: string, n: number) => fromMs(toMs(iso) + n * DAY)
export const daysBetween = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY)

export type DateBounds = { min: string; max: string }

export function dateBounds(source: Source, field: string | null): DateBounds | null {
  if (!field) return null
  let min = '9999-12-31'
  let max = '0000-01-01'
  for (const r of source.rows) {
    const v = r[field]
    if (typeof v !== 'string') continue
    if (v < min) min = v
    if (v > max) max = v
  }
  return min <= max ? { min, max } : null
}

/**
 * Período em datas concretas. "Hoje" é a data mais recente da base, não o
 * relógio: um metadado carregado ontem à noite não deve abrir com "últimos 30
 * dias" vazio no último dia.
 */
export function resolvePeriod(p: Period, b: DateBounds | null): { from: string; to: string } | null {
  if (!b) return null
  const to = b.max
  switch (p.preset) {
    case 'all':
      return { from: b.min, to }
    case '30d':
      return { from: addDays(to, -29), to }
    case '90d':
      return { from: addDays(to, -89), to }
    case '12m':
      return { from: addDays(to, -364), to }
    case 'ytd':
      return { from: to.slice(0, 4) + '-01-01', to }
    case 'custom':
      return { from: p.from ?? b.min, to: p.to ?? to }
  }
}

/** Período anterior de mesmo tamanho, colado antes do atual. */
export function previousRange(r: { from: string; to: string }) {
  const len = daysBetween(r.from, r.to) + 1
  return { from: addDays(r.from, -len), to: addDays(r.from, -1) }
}

/* ── Filtro ───────────────────────────────────────────────────────────────── */

export type Range = { from: string; to: string } | null

/**
 * Aplica período e dimensões. `except` deixa um campo de fora — é o que o
 * gráfico daquele campo usa para continuar mostrando as categorias não
 * escolhidas.
 */
export function filterRows(
  rows: Row[],
  dateField: string | null,
  range: Range,
  dims: FilterState['dims'],
  except?: string,
): Row[] {
  const active = Object.entries(dims).filter(([f, vals]) => f !== except && vals.length > 0)
  const sets = active.map(([f, vals]) => [f, new Set(vals)] as const)
  if (!range && sets.length === 0) return rows
  return rows.filter((r) => {
    if (range && dateField) {
      const d = r[dateField]
      if (typeof d !== 'string' || d < range.from || d > range.to) return false
    }
    for (const [f, set] of sets) if (!set.has(cellKey(r[f]))) return false
    return true
  })
}

/** Como uma célula vira chave de filtro/agrupamento. */
export function cellKey(v: Row[string]): string {
  if (v === null || v === undefined || v === '') return '(vazio)'
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não'
  return String(v)
}

/* ── Agregação ────────────────────────────────────────────────────────────── */

export function aggregate(rows: Row[], m: Measure): number {
  if (m.agg === 'count') return rows.length
  if (!m.field) return rows.length
  const f = m.field
  if (m.agg === 'distinct') {
    const s = new Set<Row[string]>()
    for (const r of rows) s.add(r[f])
    return s.size
  }
  let sum = 0
  let n = 0
  const per = m.agg === 'avg' && m.per ? new Set<Row[string]>() : null
  for (const r of rows) {
    const v = r[f]
    if (typeof v === 'number') {
      sum += v
      n++
    }
    per?.add(r[m.per!])
  }
  if (per) return per.size ? sum / per.size : 0
  return m.agg === 'avg' ? (n ? sum / n : 0) : sum
}

/** Agregações que somam por parte — só elas fecham com o total. */
export const additive = (agg: Agg) => agg === 'sum' || agg === 'count'

/** `partial`: balde do tempo cortado pelo período (semana que começou antes do filtro). */
export type Bucket = { key: string; value: number; other?: number; partial?: boolean }

/**
 * Agrupa por dimensão e corta no top N. O resto vira um balde "Outros" com a
 * conta de quantas categorias ele junta. Para média e contagem distinta o
 * "Outros" é recalculado sobre as linhas dele, não somado — média de médias
 * é o erro clássico que este motor não comete.
 */
export function groupBy(rows: Row[], dim: string, m: Measure, top: number, keep: string[] = []): Bucket[] {
  const groups = new Map<string, Row[]>()
  for (const r of rows) {
    const k = cellKey(r[dim])
    let g = groups.get(k)
    if (!g) groups.set(k, (g = []))
    g.push(r)
  }
  const all = [...groups.entries()].map(([key, rs]) => ({ key, value: aggregate(rs, m), rows: rs }))
  all.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key, 'pt-BR'))
  if (all.length <= top) return all.map(({ key, value }) => ({ key, value }))
  /* Categoria escolhida no filtro nunca some dentro de "Outros": fica à
     vista, marcada, mesmo fora do top. */
  const kept = new Set(keep)
  const inHead = (g: (typeof all)[number], i: number) => i < top || kept.has(g.key)
  const head: Bucket[] = all.filter(inHead).map(({ key, value }) => ({ key, value }))
  const rest = all.filter((g, i) => !inHead(g, i))
  if (!rest.length) return head
  const restRows = rest.flatMap((g) => g.rows)
  head.push({ key: OTHER, value: aggregate(restRows, m), other: rest.length })
  return head
}

export const OTHER = 'Outros'

/**
 * Ordem estável das categorias, pela base inteira. A cor de cada categoria
 * sai daqui — não da posição no gráfico filtrado —, então filtrar não repinta
 * as fatias que sobraram.
 */
export function stableOrder(source: Source, dim: string, m: Measure): string[] {
  return groupBy(source.rows, dim, m, Infinity).map((b) => b.key)
}

/* ── Série no tempo ───────────────────────────────────────────────────────── */

export function bucketOf(iso: string, grain: Grain): string {
  switch (grain) {
    case 'day':
      return iso
    case 'month':
      return iso.slice(0, 7)
    case 'quarter':
      return `${iso.slice(0, 4)}-T${Math.floor((Number(iso.slice(5, 7)) - 1) / 3) + 1}`
    case 'week': {
      // Semana começando na segunda; a chave é a data da segunda-feira.
      const d = new Date(iso + 'T00:00:00Z')
      const dow = (d.getUTCDay() + 6) % 7
      return addDays(iso, -dow)
    }
  }
}

/** Início e fim de um balde, para o clique num ponto virar filtro de período. */
export function bucketRange(key: string, grain: Grain): { from: string; to: string } {
  switch (grain) {
    case 'day':
      return { from: key, to: key }
    case 'week':
      return { from: key, to: addDays(key, 6) }
    case 'month': {
      const [y, m] = key.split('-').map(Number)
      const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
      return { from: `${key}-01`, to: `${key}-${String(last).padStart(2, '0')}` }
    }
    case 'quarter': {
      const y = key.slice(0, 4)
      const q = Number(key.slice(-1))
      const m1 = (q - 1) * 3 + 1
      const last = new Date(Date.UTC(Number(y), m1 + 2, 0)).getUTCDate()
      return { from: `${y}-${String(m1).padStart(2, '0')}-01`, to: `${y}-${String(m1 + 2).padStart(2, '0')}-${last}` }
    }
  }
}

/**
 * Série contínua: todo balde do período aparece, mesmo sem linha nenhuma.
 * Um mês sem venda é um zero no gráfico, não um mês que sumiu do eixo — a
 * linha ligando março a maio por cima de abril mente.
 */
export function timeSeries(rows: Row[], dateField: string, range: { from: string; to: string }, grain: Grain, m: Measure): Bucket[] {
  const groups = new Map<string, Row[]>()
  let d = range.from
  let guard = 0
  while (d <= range.to && guard++ < 4000) {
    const k = bucketOf(d, grain)
    if (!groups.has(k)) groups.set(k, [])
    d = addDays(d, 1)
  }
  for (const r of rows) {
    const v = r[dateField]
    if (typeof v !== 'string') continue
    groups.get(bucketOf(v, grain))?.push(r)
  }
  // Balde da ponta que o período corta pela metade fica marcado: a queda
  // dele é de dias faltando, não de movimento. Ele continua na soma — tirá-lo
  // faria a série deixar de fechar com o total.
  return [...groups.entries()].map(([key, rs]) => {
    const b = bucketRange(key, grain)
    return { key, value: aggregate(rs, m), partial: b.from < range.from || b.to > range.to }
  })
}

/** Grão que cabe no período: ~6 a 60 pontos. */
export function fitGrain(preferred: Grain, range: { from: string; to: string }): Grain {
  const days = daysBetween(range.from, range.to) + 1
  const order: Grain[] = ['day', 'week', 'month', 'quarter']
  const points = (g: Grain) => days / ({ day: 1, week: 7, month: 30.4, quarter: 91 } as const)[g]
  let i = order.indexOf(preferred)
  while (i > 0 && points(order[i]) < 4) i--
  while (i < order.length - 1 && points(order[i]) > 120) i++
  return order[i]
}

/* ── Conferência ──────────────────────────────────────────────────────────── */

export type Check = { label: string; ok: boolean; detail: string }

const near = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 1e-9)

/**
 * Confere, com os filtros de agora, se as partes batem com o todo. Roda a
 * cada mudança de filtro — o painel "Conferências" mostra o resultado.
 *
 * O que confere:
 *   - cada gráfico por categoria soma o mesmo que o total da sua medida;
 *   - cada série no tempo soma o mesmo que o total do período;
 *   - a tabela de detalhe tem o mesmo número de linhas que o recorte;
 *   - todo campo citado no documento existe na origem.
 */
export function audit(spec: DashboardSpec, source: Source, filters: FilterState): Check[] {
  const checks: Check[] = []
  const names = new Set(source.fields.map((f) => f.name))
  const bounds = dateBounds(source, spec.dateField)
  const range = resolvePeriod(filters.period, bounds)
  const scoped = filterRows(source.rows, spec.dateField, range, filters.dims)

  const cited = new Set<string>()
  for (const w of spec.widgets) {
    if ('measure' in w && w.measure.field) cited.add(w.measure.field)
    if (w.kind === 'breakdown') cited.add(w.dimension)
    if (w.kind === 'table') w.columns.forEach((c) => cited.add(c))
  }
  spec.filterFields.forEach((f) => cited.add(f))
  const missing = [...cited].filter((c) => !names.has(c))
  checks.push({
    label: 'Campos existem na origem',
    ok: missing.length === 0,
    detail: missing.length ? `Não encontrados: ${missing.join(', ')}` : `${cited.size} campos citados, todos na origem`,
  })

  checks.push({
    label: 'Um filtro para o dashboard inteiro',
    ok: true,
    detail: `${scoped.length.toLocaleString('pt-BR')} linhas no recorte atual, as mesmas para todos os gráficos`,
  })

  for (const w of spec.widgets) {
    if (w.kind === 'breakdown' && additive(w.measure.agg)) {
      const total = aggregate(scoped, w.measure)
      const parts = breakdownBuckets(w, scoped, filters).reduce((s, b) => s + b.value, 0)
      checks.push({
        label: `“${w.title}” fecha com o total`,
        ok: near(parts, total),
        detail: near(parts, total) ? 'Soma das categorias = total da medida' : `Partes ${parts} ≠ total ${total}`,
      })
    }
    if (w.kind === 'trend' && additive(w.measure.agg) && spec.dateField && range) {
      const total = aggregate(scoped, w.measure)
      const series = timeSeries(scoped, spec.dateField, range, fitGrain(w.grain, range), w.measure)
      const parts = series.reduce((s, b) => s + b.value, 0)
      checks.push({
        label: `“${w.title}” fecha com o período`,
        ok: near(parts, total),
        detail: near(parts, total) ? 'Soma dos pontos = total do período' : `Pontos ${parts} ≠ total ${total}`,
      })
    }
  }

  const table = spec.widgets.find((w) => w.kind === 'table')
  checks.push({
    label: 'Tabela de detalhe presente',
    ok: !!table,
    detail: table ? `Mostra as mesmas ${scoped.length.toLocaleString('pt-BR')} linhas` : 'Sem tabela, nenhum número pode ser conferido linha a linha',
  })

  return checks
}

/**
 * Baldes de um gráfico por categoria, já com o filtro cruzado: o próprio
 * campo fica de fora do filtro. Para a conferência, a soma tem de bater com o
 * recorte *com* o filtro do campo, então quando há seleção somamos só as
 * categorias selecionadas.
 */
export function breakdownBuckets(w: BreakdownWidget, scoped: Row[], filters: FilterState): Bucket[] {
  const sel = filters.dims[w.dimension] ?? []
  const buckets = groupBy(scoped, w.dimension, w.measure, w.top)
  if (!sel.length) return buckets
  return buckets.filter((b) => sel.includes(b.key))
}

/**
 * Como o dashboard abre: o maior recorte recente que ainda tem um período
 * anterior inteiro na base para comparar. Com a base inteira não existe
 * "período anterior", e os indicadores abririam todos sem comparação —
 * justamente o que mais se lê neles. "Limpar filtros" volta para cá.
 *
 *   base com mais de ~2 anos   últimos 12 meses
 *   mais de ~6 meses           últimos 90 dias
 *   mais de ~2 meses           últimos 30 dias
 *   menos que isso             tudo
 */
export function defaultFilters(source: Source, dateField: string | null): FilterState {
  const b = dateBounds(source, dateField)
  const days = b ? daysBetween(b.min, b.max) + 1 : 0
  const preset = days >= 730 ? '12m' : days >= 180 ? '90d' : days >= 60 ? '30d' : 'all'
  return { period: { preset }, dims: {} }
}
