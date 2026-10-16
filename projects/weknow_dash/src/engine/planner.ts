import { dateBounds, daysBetween } from '@/engine/query'
import type { DashboardSpec, Field, Measure, Source, Widget } from '@/engine/types'

/**
 * Primeiro rascunho do dashboard, a partir só dos campos.
 *
 * Isto é código determinístico, não IA: o mesmo metadado gera sempre o mesmo
 * dashboard, e ele nasce válido. A IA entra depois, para ajustar — e no
 * produto também poderia propor o rascunho, desde que pelo mesmo caminho de
 * operações validadas (ver `patch.ts`).
 *
 * As escolhas seguem o tipo de pergunta que cada campo responde:
 *   data                → filtro de período e evolução no tempo
 *   medida principal    → indicadores no topo, todos os gráficos
 *   categoria com ≤ 6   → rosca (partes de um todo, poucas partes)
 *   categoria com mais  → barras com top 10 e "Outros"
 *   identificador       → nada; é chave, não informação
 */

export type FieldProfile = Field & { distinct: number; filled: number }

export function profile(source: Source): FieldProfile[] {
  return source.fields.map((f) => {
    const s = new Set<unknown>()
    let filled = 0
    for (const r of source.rows) {
      const v = r[f.name]
      if (v === null || v === '') continue
      filled++
      if (s.size <= 5000) s.add(v)
    }
    return { ...f, distinct: s.size, filled }
  })
}

const norm = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Quanto um nome de campo parece "o dinheiro" da base. */
function measureRank(f: Field): number {
  const n = norm(`${f.name} ${f.title}`)
  if (/(receita|faturamento|revenue|valor total|total_value|valor|amount|sales|vendas)/.test(n)) return 0
  if (/(lucro|profit|margem|resultado)/.test(n)) return 1
  if (/(quantidade|qtd|qty|quantity|volume|unidades)/.test(n)) return 2
  if (f.format === 'currency') return 3
  if (/(tempo|espera|duracao|hora|minuto|dias)/.test(n)) return 4
  return 5
}

export const isMeasure = (f: Field) => f.type === 'number' && !f.key
export const isDimension = (f: FieldProfile) => (f.type === 'text' || f.type === 'boolean') && f.distinct >= 2 && f.distinct <= 5000

let seq = 0
export const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${(seq++).toString(36)}`

export function plan(source: Source): DashboardSpec {
  const prof = profile(source)
  const date = prof.find((f) => f.type === 'date') ?? null
  const measures = prof.filter(isMeasure).sort((a, b) => measureRank(a) - measureRank(b))
  const dims = prof.filter(isDimension).sort((a, b) => a.distinct - b.distinct)
  const key = prof.find((f) => f.key)

  const countLabel = key ? plural(key.title) : 'Registros'
  /* Chave única por linha (um chamado por linha): contar linhas basta, e a
     contagem soma por categoria — cabe em rosca. Chave repetida (um pedido
     em várias linhas de item) pede contagem distinta, que não soma: o mesmo
     pedido pode estar em duas categorias. */
  const keyUnique = key ? new Set(source.rows.map((r) => r[key.name])).size === source.rows.length : false
  const countMeasure: Measure = key && !keyUnique ? { field: key.name, agg: 'distinct', label: countLabel } : { field: null, agg: 'count', label: countLabel }

  /* A medida principal precisa somar — é ela que vai para rosca e barras, e
     parte de um todo só existe para o que soma. Base sem dinheiro nem
     quantidade (chamados, atendimentos com nota) conta registros; as médias
     viram indicadores. */
  const additiveMain = measures[0] && measureRank(measures[0]) <= 3
  const primary: Measure = additiveMain ? { field: measures[0].name, agg: 'sum' } : countMeasure
  const secondary = measures.find((m, i) => i > 0 && measureRank(m) <= 2)

  /* Indicadores: até quatro, do mais importante para o de apoio. */
  const kpis: [string, Measure][] = []
  if (additiveMain) kpis.push([measures[0].title, primary])
  if (secondary) kpis.push([secondary.title, { field: secondary.name, agg: 'sum' }])
  kpis.push([countLabel, countMeasure])
  if (additiveMain) {
    // Medida principal dividida pelo que se conta: receita ÷ pedidos, e não
    // a média por linha — uma linha é um item, não um pedido.
    const label = measures[0].format === 'currency' ? 'Ticket médio' : `Média por ${(key?.title ?? 'registro').toLowerCase()}`
    kpis.push([label, { field: measures[0].name, agg: 'avg', per: key?.name, label }])
  }
  for (const m of measures) {
    if (kpis.length >= 4) break
    if (!kpis.some(([, k]) => k.field === m.name)) kpis.push([`${m.title} (média)`, { field: m.name, agg: 'avg' }])
  }
  const kpiSpan = (12 / kpis.length) as 3 | 4 | 6 | 12
  const widgets: Widget[] = kpis.map(([title, measure]) => ({
    id: newId('kpi'), kind: 'kpi', title, span: kpiSpan, measure, compare: !!date, spark: !!date,
  }))

  /* Evolução no tempo, larga, ao lado da rosca. */
  /* Rosca: a categoria de texto com mais partes, desde que caibam seis. Sim/não
     numa rosca é um indicador disfarçado de gráfico. */
  const text = dims.filter((d) => d.type === 'text')
  const donutDim = text.filter((d) => d.distinct >= 3 && d.distinct <= 6).at(-1)
  if (date) {
    const b = dateBounds(source, date.name)!
    const days = daysBetween(b.min, b.max)
    widgets.push({
      id: newId('trend'), kind: 'trend', span: donutDim ? 8 : 12,
      title: `${measureTitle(primary, prof)} ao longo do tempo`,
      measure: primary, grain: days > 120 ? 'month' : days > 30 ? 'week' : 'day', style: 'area',
    })
  }
  if (donutDim) {
    widgets.push({ id: newId('bd'), kind: 'breakdown', span: date ? 4 : 6, title: `${measureTitle(primary, prof)} por ${lowerTitle(donutDim.title)}`, dimension: donutDim.name, measure: primary, style: 'donut', top: 6 })
  }

  /* Barras para as demais categorias, aos pares. */
  const bars = text.filter((d) => d !== donutDim).sort((a, b) => b.distinct - a.distinct).slice(0, 3)
  bars.forEach((d, i) => {
    // Número ímpar de gráficos: o último ocupa a linha inteira, em colunas.
    const last = i === bars.length - 1 && bars.length % 2 === 1
    widgets.push({ id: newId('bd'), kind: 'breakdown', span: last ? 12 : 6, title: `${measureTitle(primary, prof)} por ${lowerTitle(d.title)}`, dimension: d.name, measure: primary, style: last && d.distinct <= 14 ? 'column' : 'bar', top: 10 })
  })

  /* Detalhe: sempre. É onde qualquer número do dashboard pode ser conferido. */
  const cols = [date?.name, key?.name, ...dims.slice(0, 4).map((d) => d.name), ...measures.slice(0, 2).map((m) => m.name)].filter(Boolean) as string[]
  widgets.push({ id: newId('table'), kind: 'table', span: 12, title: 'Detalhe', columns: cols })

  return {
    title: source.name,
    description: date ? `Gerado a partir de ${source.kind === 'metadado' ? 'metadado' : 'arquivo'} · ${source.rows.length.toLocaleString('pt-BR')} linhas` : `${source.rows.length.toLocaleString('pt-BR')} linhas`,
    dateField: date?.name ?? null,
    filterFields: text.filter((d) => d.distinct <= 40).slice(0, 3).map((d) => d.name),
    widgets,
    theme: { mode: 'auto', palette: 'weknow', glow: false, density: 'comfortable', corners: 'soft', kpiTint: false },
  }
}

function measureTitle(m: Measure, prof: FieldProfile[]): string {
  if (m.label) return m.label
  if (!m.field || m.agg === 'count') return 'Registros'
  const t = prof.find((f) => f.name === m.field)?.title ?? m.field
  return m.agg === 'avg' ? `${t} (média)` : t
}

/** "Pedido" → "Pedidos", "Atendimento" → "Atendimentos". Só o caso comum. */
function plural(word: string) {
  if (/[aeiou]$/i.test(word)) return word + 's'
  if (/m$/i.test(word)) return word.replace(/m$/i, 'ns')
  if (/(r|z|s)$/i.test(word)) return word + 'es'
  if (/l$/i.test(word)) return word.replace(/l$/i, 'is')
  return word
}

/** "Categoria" → "categoria", mas "UF" continua "UF". */
export const lowerTitle = (t: string) => (/^[A-Z0-9]{2,}$/.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1))
