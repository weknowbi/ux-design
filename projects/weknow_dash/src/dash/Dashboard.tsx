import { useMemo, type CSSProperties, type ReactNode } from 'react'
import { formatCompact, formatFull, measureFormat, measureLabel } from '@/engine/format'
import { seriesColor, themeVars, useAppMode } from '@/engine/palettes'
import {
  aggregate, bucketOf, bucketRange, dateBounds, defaultFilters, filterRows, fitGrain, groupBy,
  previousRange, resolvePeriod, stableOrder, timeSeries,
} from '@/engine/query'
import type { DashboardSpec, FilterState, KpiWidget, Measure, Source, Widget } from '@/engine/types'
import { BarChart, ColumnChart, DonutChart } from '@/dash/BreakdownChart'
import { DetailTable } from '@/dash/DetailTable'
import { FilterBar } from '@/dash/FilterBar'
import { TrendChart } from '@/dash/TrendChart'
import { useWidth } from '@/dash/kit'

/**
 * Desenha um `DashboardSpec`. Não decide nada sobre os dados: pede tudo ao
 * motor (`query.ts`) com o mesmo estado de filtro, e é isso que faz todos os
 * blocos concordarem entre si.
 */
export function Dashboard({
  spec,
  source,
  filters,
  onFilters,
  flash,
}: {
  spec: DashboardSpec
  source: Source
  filters: FilterState
  onFilters: (f: FilterState) => void
  /** Blocos recém-alterados pela IA, para piscarem uma vez. */
  flash?: Set<string>
}) {
  const app = useAppMode()
  const mode = spec.theme.mode === 'auto' ? app : spec.theme.mode
  const vars = themeVars(spec.theme, mode) as CSSProperties
  const [gridRef, width] = useWidth<HTMLDivElement>()

  const bounds = useMemo(() => dateBounds(source, spec.dateField), [source, spec.dateField])
  const range = resolvePeriod(filters.period, bounds)
  const scoped = useMemo(() => filterRows(source.rows, spec.dateField, range, filters.dims), [source, spec.dateField, range?.from, range?.to, filters.dims]) // eslint-disable-line react-hooks/exhaustive-deps

  /* Larguras pela largura real da área, não da janela: com o painel da IA
     aberto, a mesma tela tem bem menos espaço. */
  const cols = width < 600 ? 1 : width < 880 ? 2 : 3
  const spanOf = (w: Widget) => {
    if (cols === 1) return 12
    if (cols === 2) return w.span <= 4 ? 6 : 12
    return w.span
  }

  const toggleDim = (field: string, key: string, additive: boolean) => {
    const cur = filters.dims[field] ?? []
    let next: string[]
    if (additive) next = cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    else next = cur.length === 1 && cur[0] === key ? [] : [key]
    onFilters({ ...filters, dims: { ...filters.dims, [field]: next } })
  }

  return (
    <div className={`dash dash-${mode}`} style={{ ...vars, background: 'var(--d-bg)', color: 'var(--d-text)', borderRadius: 16, padding: 'var(--d-gap)' }}>
      <div style={{ marginBottom: 'var(--d-gap)' }}>
        <FilterBar source={source} fields={spec.filterFields} bounds={bounds} filters={filters} defaults={defaultFilters(source, spec.dateField)} onChange={onFilters} />
      </div>

      <div ref={gridRef} className="grid" style={{ gridTemplateColumns: 'repeat(12, minmax(0, 1fr))', gap: 'var(--d-gap)' }}>
        {width > 0 &&
          spec.widgets.map((w) => (
            <div key={w.id} style={{ gridColumn: `span ${spanOf(w)} / span ${spanOf(w)}`, minWidth: 0 }} className={flash?.has(w.id) ? 'dash-flash' : undefined}>
              {w.kind === 'kpi' ? (
                <Kpi w={w} spec={spec} source={source} filters={filters} scoped={scoped} />
              ) : (
                <Card title={w.title} subtitle={subtitleOf(w, source, filters)}>
                  <WidgetBody w={w} spec={spec} source={source} filters={filters} scoped={scoped} range={range} toggleDim={toggleDim} onFilters={onFilters} />
                </Card>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}

function subtitleOf(w: Widget, source: Source, filters: FilterState): string | undefined {
  if (w.kind === 'breakdown') {
    const sel = filters.dims[w.dimension]?.length ?? 0
    return sel ? `${sel} selecionado${sel > 1 ? 's' : ''} · clique de novo para desfazer` : 'Clique para filtrar o dashboard'
  }
  if (w.kind === 'trend') return 'Clique num ponto para filtrar o período'
  return undefined
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="h-full flex flex-col" style={{ background: 'var(--d-card)', border: '1px solid var(--d-card-border)', borderRadius: 'var(--d-radius)', boxShadow: 'var(--d-shadow)', padding: 'var(--d-pad)' }}>
      <header style={{ marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--d-text)', lineHeight: 1.35 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: 12, color: 'var(--d-muted)', marginTop: 2 }}>{subtitle}</p>}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  )
}

function WidgetBody({
  w, spec, source, filters, scoped, range, toggleDim, onFilters,
}: {
  w: Exclude<Widget, KpiWidget>
  spec: DashboardSpec
  source: Source
  filters: FilterState
  scoped: ReturnType<typeof filterRows>
  range: ReturnType<typeof resolvePeriod>
  toggleDim: (field: string, key: string, additive: boolean) => void
  onFilters: (f: FilterState) => void
}) {
  const order = useMemo(() => (w.kind === 'breakdown' ? stableOrder(source, w.dimension, w.measure) : []), [source, w])

  if (w.kind === 'table') return <DetailTable rows={scoped} columns={w.columns} source={source} />

  const fmt = measureFormat(w.measure, source)
  const label = measureLabel(w.measure, source)

  if (w.kind === 'trend') {
    if (!spec.dateField || !range) return null
    const grain = fitGrain(w.grain, range)
    const data = timeSeries(scoped, spec.dateField, range, grain, w.measure)
    const p = filters.period
    const selected = p.preset === 'custom' && p.from && p.to && bucketRange(bucketOf(p.from, grain), grain).from === p.from && bucketRange(bucketOf(p.from, grain), grain).to === p.to ? bucketOf(p.from, grain) : null
    return (
      <TrendChart
        data={data}
        grain={grain}
        style={w.style}
        format={fmt}
        label={label}
        selected={selected}
        onPick={(key) => {
          if (key === selected) onFilters({ ...filters, period: defaultFilters(source, spec.dateField).period })
          else onFilters({ ...filters, period: { preset: 'custom', ...bucketRange(key, grain) } })
        }}
      />
    )
  }

  /* Por categoria: o próprio campo fica fora do filtro (filtro cruzado). */
  const sel = filters.dims[w.dimension] ?? []
  const rowsExcept = filterRows(source.rows, spec.dateField, range, filters.dims, w.dimension)
  const data = groupBy(rowsExcept, w.dimension, w.measure, w.top, sel)
  const colorFor = (k: string) => seriesColor(order.indexOf(k), spec.theme.palette)
  const props = { data, format: fmt, label, selected: sel, colorFor, onToggle: (k: string, add: boolean) => toggleDim(w.dimension, k, add) }
  if (w.style === 'donut') return <DonutChart {...props} />
  if (w.style === 'column') return <ColumnChart {...props} mono />
  return <BarChart {...props} mono />
}

/** Para medidas em que subir é ruim — espera, custo, devolução —, a seta inverte a cor. */
function upIsGood(m: Measure, source: Source) {
  const f = source.fields.find((x) => x.name === m.field)
  const n = `${f?.name ?? ''} ${f?.title ?? ''}`.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  return !/(espera|tempo|custo|devol|atraso|cancel|reclama|resolucao)/.test(n)
}

function Kpi({ w, spec, source, filters, scoped }: { w: KpiWidget; spec: DashboardSpec; source: Source; filters: FilterState; scoped: ReturnType<typeof filterRows> }) {
  const fmt = measureFormat(w.measure, source)
  const value = aggregate(scoped, w.measure)
  const bounds = dateBounds(source, spec.dateField)
  const range = resolvePeriod(filters.period, bounds)

  let delta: number | null = null
  let prevLabel = ''
  if (w.compare && range && bounds) {
    const prev = previousRange(range)
    if (prev.to >= bounds.min) {
      const prevValue = aggregate(filterRows(source.rows, spec.dateField, prev, filters.dims), w.measure)
      delta = prevValue ? (value - prevValue) / Math.abs(prevValue) : null
      prevLabel = 'vs. período anterior'
    } else prevLabel = 'sem período anterior na base'
  }

  /* Faísca: os últimos 12 baldes do período, na cor de destaque. */
  const spark = useMemo(() => {
    if (!w.spark || !spec.dateField || !range) return null
    const grain = fitGrain('month', range)
    return timeSeries(scoped, spec.dateField, range, grain, w.measure).slice(-12)
  }, [w.spark, w.measure, spec.dateField, range?.from, range?.to, scoped]) // eslint-disable-line react-hooks/exhaustive-deps

  // Variação que arredonda para 0,0% é estável: sem seta nem cor.
  if (delta !== null && Math.abs(delta) < 0.0005) delta = 0
  const good = delta === null || delta === 0 ? null : (delta > 0) === upIsGood(w.measure, source)
  const glow = spec.theme.glow
  const tint = spec.theme.kpiTint

  return (
    <section
      className="h-full flex flex-col justify-between"
      title={`${w.title}: ${formatFull(value, fmt)}`}
      style={{
        position: 'relative',
        background: tint ? 'color-mix(in srgb, var(--d-accent) 9%, var(--d-card))' : 'var(--d-card)',
        border: `1px solid ${glow ? 'color-mix(in srgb, var(--d-accent) 55%, transparent)' : 'var(--d-card-border)'}`,
        borderRadius: 'var(--d-radius)',
        boxShadow: glow
          ? '0 0 0 1px color-mix(in srgb, var(--d-accent) 25%, transparent), 0 0 22px color-mix(in srgb, var(--d-accent) 32%, transparent)'
          : 'var(--d-shadow)',
        padding: 'var(--d-pad)',
        minHeight: 124,
        transition: 'box-shadow .3s ease, border-color .3s ease, background .3s ease',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 style={{ fontSize: 13, color: 'var(--d-text-2)', fontWeight: 500 }}>{w.title}</h3>
        {spark && spark.length > 1 && <Spark data={spark.map((d) => d.value)} />}
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.15, color: 'var(--d-text)', letterSpacing: '-0.01em' }}>{formatCompact(value, fmt)}</div>
        {w.compare && (
          <div className="flex items-center gap-1" style={{ marginTop: 6, fontSize: 12 }}>
            {delta !== null && (
              <span className="inline-flex items-center" style={{ color: good === null ? 'var(--d-text-2)' : good ? 'var(--d-good)' : 'var(--d-bad)', fontWeight: 600 }}>
                <span className="wk-icon" aria-hidden style={{ fontSize: 16, fontVariationSettings: "'wght' 500" }}>
                  {delta > 0 ? 'arrow_upward' : delta < 0 ? 'arrow_downward' : 'trending_flat'}
                </span>
                {Math.abs(delta * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
              </span>
            )}
            <span style={{ color: 'var(--d-muted)' }}>{prevLabel}</span>
          </div>
        )}
      </div>
    </section>
  )
}

function Spark({ data }: { data: number[] }) {
  const W = 72
  const H = 26
  const max = Math.max(...data)
  const min = Math.min(...data)
  const span = max - min || 1
  const pts = data.map((v, i) => [(i / (data.length - 1)) * (W - 4) + 2, H - 3 - ((v - min) / span) * (H - 6)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <svg width={W} height={H} aria-hidden style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke="var(--d-muted)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.7} />
      <circle cx={lx} cy={ly} r={3} fill="var(--d-accent)" />
    </svg>
  )
}
