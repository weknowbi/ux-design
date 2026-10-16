/**
 * O dashboard é um documento, não um programa.
 *
 * Esta é a decisão que separa o Weknow Dash do fluxo do vídeo (IA escreve um
 * HTML inteiro e a gente torce para os filtros funcionarem). Aqui a IA nunca
 * escreve código: ela produz e edita um `DashboardSpec`, um JSON pequeno que
 * diz *o que* mostrar. *Como* filtrar, agregar, cruzar e conferir é do motor
 * (`query.ts`), e o motor é o mesmo para todo dashboard.
 *
 * Consequência: um pedido como "tira o filtro de período" não tem como ser
 * atendido por engano — o esquema não tem um campo para isso. O que não cabe
 * no esquema não existe.
 */

/* ── Origem dos dados ─────────────────────────────────────────────────────── */

export type FieldType = 'number' | 'text' | 'date' | 'boolean'

export type NumberFormat = 'currency' | 'integer' | 'decimal' | 'percent'

export type Field = {
  /** Nome técnico, como vem da origem. */
  name: string
  /** Rótulo de negócio, como aparece no dashboard. */
  title: string
  type: FieldType
  format?: NumberFormat
  /** Outras formas de a pessoa se referir ao campo num prompt. */
  aliases?: string[]
  /** Identificador (código, id): não vira medida nem gráfico. */
  key?: boolean
}

/** Data sempre como `AAAA-MM-DD`: compara como texto e agrupa por fatia. */
export type Cell = string | number | boolean | null
export type Row = Record<string, Cell>

export type SourceKind = 'metadado' | 'arquivo'

export type Source = {
  id: string
  kind: SourceKind
  name: string
  /** Área de negócio do metadado, ou o nome do arquivo. */
  group: string
  /** Código do metadado no Weknow. */
  code?: string
  fields: Field[]
  rows: Row[]
}

/* ── O documento do dashboard ─────────────────────────────────────────────── */

export type Agg = 'sum' | 'avg' | 'count' | 'distinct'

/**
 * `field: null` com `count` conta linhas. `per` divide a soma pela contagem
 * distinta de outro campo: receita ÷ pedidos = ticket médio.
 */
export type Measure = { field: string | null; agg: Agg; label?: string; per?: string }

export type Grain = 'day' | 'week' | 'month' | 'quarter'

export type Span = 3 | 4 | 6 | 8 | 12

type WidgetBase = { id: string; title: string; span: Span }

export type KpiWidget = WidgetBase & {
  kind: 'kpi'
  measure: Measure
  /** Variação contra o período anterior de mesmo tamanho. */
  compare: boolean
  spark: boolean
}

export type TrendWidget = WidgetBase & {
  kind: 'trend'
  measure: Measure
  grain: Grain
  style: 'line' | 'area' | 'column'
}

export type BreakdownWidget = WidgetBase & {
  kind: 'breakdown'
  dimension: string
  measure: Measure
  style: 'bar' | 'donut' | 'column'
  /** Quantas categorias aparecem; o resto vira "Outros" — e o total fecha. */
  top: number
}

export type TableWidget = WidgetBase & {
  kind: 'table'
  columns: string[]
}

export type Widget = KpiWidget | TrendWidget | BreakdownWidget | TableWidget
export type WidgetKind = Widget['kind']

/** Bloco ainda sem id — o Omit distribuído mantém cada tipo de bloco separado. */
export type WidgetDraft = Widget extends infer W ? (W extends Widget ? Omit<W, 'id'> : never) : never

export type PaletteId = 'weknow' | 'neon' | 'classico'

export type DashTheme = {
  /** `auto` acompanha o tema do Weknow. */
  mode: 'auto' | 'light' | 'dark'
  palette: PaletteId
  /** Brilho na borda dos indicadores. */
  glow: boolean
  density: 'compact' | 'comfortable'
  corners: 'square' | 'soft' | 'round'
  /** Indicadores com fundo tingido pela cor de destaque. */
  kpiTint: boolean
}

export type DashboardSpec = {
  title: string
  description: string
  /** Campo de data que alimenta o filtro de período. Fixo depois de gerado. */
  dateField: string | null
  /** Dimensões oferecidas como filtro na barra. */
  filterFields: string[]
  widgets: Widget[]
  theme: DashTheme
}

/* ── Estado de filtro (vive na tela, não no documento) ────────────────────── */

export type PeriodPreset = 'all' | '30d' | '90d' | '12m' | 'ytd' | 'custom'

export type Period = { preset: PeriodPreset; from?: string; to?: string }

export type FilterState = {
  period: Period
  /** Campo → valores aceitos. Conjunto vazio = sem filtro naquele campo. */
  dims: Record<string, string[]>
}
