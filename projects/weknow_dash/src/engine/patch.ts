import { measureLabel } from '@/engine/format'
import { PALETTES } from '@/engine/palettes'
import { isMeasure, newId, profile, type FieldProfile } from '@/engine/planner'
import type { DashboardSpec, DashTheme, Measure, Source, Span, Widget, WidgetDraft } from '@/engine/types'

/**
 * As únicas edições possíveis num dashboard.
 *
 * A IA — a de verdade, no produto, ou o intérprete local deste protótipo —
 * não devolve um dashboard novo: devolve uma lista destas operações. Cada uma
 * é validada contra a origem dos dados antes de entrar; a que não passa é
 * recusada com o motivo, e as outras seguem. O dashboard nunca fica num
 * estado inválido, nem por um instante.
 *
 * Três faixas:
 *   livre      aparência (paleta, modo, brilho, densidade, cantos), títulos,
 *              tamanho e ordem dos blocos
 *   validada   trocar tipo de gráfico, medida, dimensão, grão, top N; incluir
 *              e remover gráficos; campos da barra de filtro
 *   fixa       período, filtro cruzado, "Limpar filtros", "Outros" que fecha o
 *              total, tabela de detalhe — não há operação para mexer nelas
 */

export type WidgetPatch = Partial<{
  title: string
  span: Span
  style: string
  grain: string
  top: number
  compare: boolean
  spark: boolean
  measure: Measure
  dimension: string
}>

export type Op =
  | { op: 'theme'; set: Partial<DashTheme> }
  | { op: 'title'; title: string }
  | { op: 'update'; id: string; set: WidgetPatch }
  | { op: 'add'; widget: WidgetDraft; at?: number }
  | { op: 'remove'; id: string }
  | { op: 'move'; id: string; to: number }
  | { op: 'filters'; add?: string[]; remove?: string[] }

/* ── Validação ────────────────────────────────────────────────────────────── */

const SPANS: Span[] = [3, 4, 6, 8, 12]
const STYLES = { trend: ['line', 'area', 'column'], breakdown: ['bar', 'donut', 'column'] } as const
const GRAINS = ['day', 'week', 'month', 'quarter']
const MAX_WIDGETS = 16
const DONUT_MAX = 6

/**
 * Tudo o que torna um documento inválido. Vazio = pode ir para a tela.
 * É a mesma função para o rascunho gerado e para cada edição.
 */
export function validate(spec: DashboardSpec, source: Source, prof: FieldProfile[] = profile(source)): string[] {
  const errors: string[] = []
  const field = (n: string | null | undefined) => (n ? prof.find((f) => f.name === n) : undefined)

  const checkMeasure = (m: Measure, where: string) => {
    if (m.agg === 'count') return
    const f = field(m.field)
    if (!f) return errors.push(`${where}: o campo “${m.field}” não existe na origem.`)
    if ((m.agg === 'sum' || m.agg === 'avg') && !isMeasure(f))
      errors.push(`${where}: “${f.title}” não é numérico, então não dá para somar ou tirar média. Dá para contar.`)
    if (m.per && !field(m.per)) errors.push(`${where}: o campo “${m.per}” não existe na origem.`)
  }

  if (!spec.title.trim()) errors.push('O dashboard precisa de um título.')
  if (spec.widgets.length > MAX_WIDGETS) errors.push(`Até ${MAX_WIDGETS} blocos por dashboard. Mais que isso ninguém lê, só rola.`)
  if (spec.dateField && field(spec.dateField)?.type !== 'date') errors.push('O campo de período precisa ser uma data.')

  for (const w of spec.widgets) {
    const where = `“${w.title}”`
    if (!SPANS.includes(w.span)) errors.push(`${where}: largura inválida.`)
    if (!w.title.trim()) errors.push('Todo bloco precisa de título.')
    switch (w.kind) {
      case 'kpi':
        checkMeasure(w.measure, where)
        if (w.compare && !spec.dateField) errors.push(`${where}: sem campo de data não há período anterior para comparar.`)
        break
      case 'trend':
        checkMeasure(w.measure, where)
        if (!spec.dateField) errors.push(`${where}: evolução no tempo precisa de um campo de data.`)
        if (!(STYLES.trend as readonly string[]).includes(w.style)) errors.push(`${where}: no tempo, o gráfico pode ser linha, área ou colunas.`)
        if (!GRAINS.includes(w.grain)) errors.push(`${where}: o agrupamento pode ser por dia, semana, mês ou trimestre.`)
        break
      case 'breakdown': {
        checkMeasure(w.measure, where)
        const d = field(w.dimension)
        if (!d) errors.push(`${where}: o campo “${w.dimension}” não existe na origem.`)
        else if (d.type !== 'text' && d.type !== 'boolean') errors.push(`${where}: “${d.title}” não é uma categoria; para datas use a evolução no tempo.`)
        if (!(STYLES.breakdown as readonly string[]).includes(w.style)) errors.push(`${where}: por categoria, o gráfico pode ser barras, colunas ou rosca.`)
        if (w.style === 'donut' && w.top > DONUT_MAX)
          errors.push(`${where}: rosca com mais de ${DONUT_MAX} fatias deixa de ser legível. Use barras, ou top ${DONUT_MAX}.`)
        if (w.top < 2 || w.top > 20) errors.push(`${where}: o top precisa ficar entre 2 e 20.`)
        if (w.style === 'donut' && w.measure.agg !== 'sum' && w.measure.agg !== 'count')
          errors.push(w.measure.agg === 'avg'
            ? `${where}: rosca mostra partes de um todo, e médias não somam um todo. Use barras.`
            : `${where}: rosca mostra partes de um todo, e contagem distinta não soma: o mesmo registro pode cair em duas fatias. Use barras.`)
        if (w.style === 'donut' && PALETTES[spec.theme.palette].light.length < w.top)
          errors.push(`${where}: a paleta ${PALETTES[spec.theme.palette].label} tem cores para ${PALETTES[spec.theme.palette].light.length} fatias.`)
        break
      }
      case 'table':
        if (!w.columns.length) errors.push(`${where}: a tabela precisa de pelo menos uma coluna.`)
        for (const c of w.columns) if (!field(c)) errors.push(`${where}: a coluna “${c}” não existe na origem.`)
        break
    }
  }

  /* Invariantes de estrutura. */
  if (!spec.widgets.some((w) => w.kind === 'table')) errors.push('A tabela de detalhe é parte fixa: é onde qualquer número pode ser conferido.')
  if (!spec.widgets.some((w) => w.kind === 'kpi')) errors.push('Todo dashboard abre com pelo menos um indicador.')
  for (const f of spec.filterFields) {
    const d = field(f)
    if (!d || (d.type !== 'text' && d.type !== 'boolean')) errors.push(`O filtro “${f}” precisa ser um campo de categoria.`)
  }
  if (spec.filterFields.length > 5) errors.push('Até 5 filtros na barra.')
  if (!PALETTES[spec.theme.palette]) errors.push('Paleta desconhecida.')

  return errors
}

/* ── Aplicação ────────────────────────────────────────────────────────────── */

function applyOne(spec: DashboardSpec, op: Op): DashboardSpec | string {
  switch (op.op) {
    case 'theme':
      return { ...spec, theme: { ...spec.theme, ...op.set } }
    case 'title':
      return { ...spec, title: op.title.trim() }
    case 'update': {
      const i = spec.widgets.findIndex((w) => w.id === op.id)
      if (i < 0) return 'Esse bloco não existe mais no dashboard.'
      const widgets = [...spec.widgets]
      widgets[i] = { ...widgets[i], ...op.set } as Widget
      return { ...spec, widgets }
    }
    case 'add': {
      const w = { ...op.widget, id: newId(op.widget.kind) } as Widget
      const widgets = [...spec.widgets]
      widgets.splice(op.at ?? insertionPoint(spec, w), 0, w)
      return { ...spec, widgets }
    }
    case 'remove': {
      const w = spec.widgets.find((x) => x.id === op.id)
      if (!w) return 'Esse bloco não existe mais no dashboard.'
      return { ...spec, widgets: spec.widgets.filter((x) => x.id !== op.id) }
    }
    case 'move': {
      const from = spec.widgets.findIndex((w) => w.id === op.id)
      if (from < 0) return 'Esse bloco não existe mais no dashboard.'
      const widgets = [...spec.widgets]
      const [w] = widgets.splice(from, 1)
      widgets.splice(Math.max(0, Math.min(op.to, widgets.length)), 0, w)
      return { ...spec, widgets }
    }
    case 'filters': {
      let f = spec.filterFields.filter((x) => !op.remove?.includes(x))
      for (const a of op.add ?? []) if (!f.includes(a)) f = [...f, a]
      return { ...spec, filterFields: f }
    }
  }
}

/** Gráfico novo entra antes da tabela, que fica sempre por último. */
function insertionPoint(spec: DashboardSpec, w: Widget): number {
  if (w.kind === 'kpi') {
    const lastKpi = spec.widgets.map((x) => x.kind).lastIndexOf('kpi')
    return lastKpi + 1
  }
  const table = spec.widgets.findIndex((x) => x.kind === 'table')
  return table < 0 ? spec.widgets.length : table
}

export type ApplyResult = {
  spec: DashboardSpec
  applied: { op: Op; text: string }[]
  rejected: { op: Op; text: string; reason: string }[]
}

/**
 * Aplica uma a uma, validando depois de cada. Operação que deixaria o
 * documento inválido é recusada e o documento continua como estava antes
 * dela — as demais do mesmo pedido seguem valendo.
 */
export function applyOps(spec: DashboardSpec, ops: Op[], source: Source): ApplyResult {
  const prof = profile(source)
  let cur = spec
  const applied: ApplyResult['applied'] = []
  const rejected: ApplyResult['rejected'] = []
  for (const op of ops) {
    const text = describeOp(op, cur, source)
    const next = applyOne(cur, op)
    if (typeof next === 'string') {
      rejected.push({ op, text, reason: next })
      continue
    }
    const before = new Set(validate(cur, source, prof))
    const errors = validate(next, source, prof).filter((e) => !before.has(e))
    if (errors.length) rejected.push({ op, text, reason: errors[0] })
    else {
      cur = next
      applied.push({ op, text })
    }
  }
  return { spec: cur, applied, rejected }
}

/* ── Em português ─────────────────────────────────────────────────────────── */

const STYLE_NAME: Record<string, string> = { line: 'linha', area: 'área', column: 'colunas', bar: 'barras', donut: 'rosca' }
const GRAIN_NAME: Record<string, string> = { day: 'dia', week: 'semana', month: 'mês', quarter: 'trimestre' }

/** O que a operação faz, numa linha — vira o item da resposta e da versão. */
export function describeOp(op: Op, spec: DashboardSpec, source: Source): string {
  const title = (id: string) => spec.widgets.find((w) => w.id === id)?.title ?? 'bloco'
  const fieldTitle = (n: string) => source.fields.find((f) => f.name === n)?.title ?? n
  switch (op.op) {
    case 'theme': {
      const s = op.set
      const parts: string[] = []
      if (s.palette) parts.push(`paleta ${PALETTES[s.palette]?.label ?? s.palette}`)
      if (s.mode) parts.push(s.mode === 'dark' ? 'fundo escuro' : s.mode === 'light' ? 'fundo claro' : 'fundo acompanha o tema do Weknow')
      if (s.glow !== undefined) parts.push(s.glow ? 'brilho nos indicadores' : 'sem brilho nos indicadores')
      if (s.kpiTint !== undefined) parts.push(s.kpiTint ? 'indicadores com fundo de destaque' : 'indicadores sem fundo de destaque')
      if (s.density) parts.push(s.density === 'compact' ? 'espaçamento compacto' : 'espaçamento confortável')
      if (s.corners) parts.push(s.corners === 'round' ? 'cantos arredondados' : s.corners === 'square' ? 'cantos retos' : 'cantos suaves')
      return cap(parts.join(', '))
    }
    case 'title':
      return `Título: “${op.title}”`
    case 'update': {
      const s = op.set
      const parts: string[] = []
      if (s.style) parts.push(`vira ${STYLE_NAME[s.style] ?? s.style}`)
      if (s.grain) parts.push(`por ${GRAIN_NAME[s.grain] ?? s.grain}`)
      if (s.top !== undefined) parts.push(`top ${s.top}`)
      if (s.span) parts.push(s.span === 12 ? 'largura inteira' : `largura ${s.span}/12`)
      if (s.measure) parts.push(`medida: ${measureLabel(s.measure, source)}`)
      if (s.dimension) parts.push(`por ${fieldTitle(s.dimension).toLowerCase()}`)
      if (s.compare !== undefined) parts.push(s.compare ? 'com comparação' : 'sem comparação')
      if (s.title) parts.push(`novo título “${s.title}”`)
      return `“${title(op.id)}”: ${parts.join(', ')}`
    }
    case 'add':
      return `Novo bloco: “${op.widget.title}”`
    case 'remove':
      return `Removido: “${title(op.id)}”`
    case 'move':
      return `“${title(op.id)}” mudou de posição`
    case 'filters': {
      const parts = [
        ...(op.add ?? []).map((f) => `filtro de ${fieldTitle(f).toLowerCase()} na barra`),
        ...(op.remove ?? []).map((f) => `filtro de ${fieldTitle(f).toLowerCase()} saiu da barra`),
      ]
      return cap(parts.join(', '))
    }
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
