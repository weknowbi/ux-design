import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import type { Chart, Kpi } from '@/data/dashboard'

/**
 * Componentes do dashboard de exemplo. São recheio: o protótipo testa a barra
 * de abas, e os gráficos só precisam mudar de uma aba para outra de um jeito
 * que se perceba. Ainda assim seguem as regras de gráfico do resto do
 * produto — traço fino, uma escala por gráfico, cor pela categoria e nunca
 * pela posição, texto na cor de texto.
 *
 * Cores: as três primeiras da paleta categórica de referência, que passam
 * entre si para daltonismo nos dois temas (`--wk-viz-*` no index.css).
 */
const SERIES = ['var(--wk-viz-1)', 'var(--wk-viz-2)', 'var(--wk-viz-3)']
const GRID = 'var(--wk-viz-grid)'
const AXIS = { fontFamily: FONT, fontSize: 12, fill: 'var(--wk-viz-axis)' } as const

const fmt = (n: number) => n.toLocaleString('pt-BR')

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) =>
      setSize({ w: Math.floor(e.contentRect.width), h: Math.floor(e.contentRect.height) }),
    )
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size.w, size.h] as const
}

/**
 * Escala "redonda": o topo do eixo é o primeiro múltiplo bonito acima do
 * máximo, e as divisões saem dele em passos redondos (1.500 em três de 500,
 * nunca em quatro de 375).
 */
const NICE: [m: number, parts: number][] = [[1, 5], [1.2, 4], [1.5, 3], [2, 4], [2.5, 5], [3, 3], [4, 4], [5, 5], [6, 3], [8, 4], [10, 5]]
function niceScale(max: number) {
  const mag = 10 ** Math.floor(Math.log10(max))
  const [m, parts] = NICE.find(([m]) => m * mag >= max) ?? [10, 5]
  const top = m * mag
  return { max: top, ticks: Array.from({ length: parts + 1 }, (_, i) => (top * i) / parts) }
}

/** Caixa do componente, como os blocos do Weknow: título em cima, conteúdo embaixo. */
export function Widget({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="flex flex-col min-w-0 h-full rounded-xl p-4"
      style={{ background: 'var(--wk-surface)', border: `1px solid ${COLOR.border}` }}
    >
      <h3 className="truncate" style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLOR.text }}>
        {title}
      </h3>
      <div className="flex-1 min-h-0 mt-3">{children}</div>
    </section>
  )
}

function Tip({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <div
      className="pointer-events-none absolute z-10 rounded-md px-2.5 py-1.5 whitespace-nowrap"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, calc(-100% - 8px))',
        background: 'var(--wk-toast-bg)',
        color: 'var(--wk-toast-text)',
        fontFamily: FONT,
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {children}
    </div>
  )
}

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1" style={{ fontFamily: FONT, fontSize: 12, color: COLOR.textSecondary }}>
      {items.map((it) => (
        <span key={it.name} className="flex items-center gap-1.5">
          <span className="inline-block rounded-full" style={{ width: 8, height: 8, background: it.color }} />
          {it.name}
        </span>
      ))}
    </div>
  )
}

export function KpiTile({ kpi }: { kpi: Kpi }) {
  const dir = kpi.delta > 0 ? 'arrow_upward' : kpi.delta < 0 ? 'arrow_downward' : 'remove'
  return (
    <section
      className="flex flex-col justify-between rounded-xl px-4 py-3 h-full min-w-0"
      style={{ background: 'var(--wk-surface)', border: `1px solid ${COLOR.border}`, fontFamily: FONT }}
    >
      <span className="truncate" style={{ fontSize: 13, color: COLOR.textSecondary }}>
        {kpi.label}
      </span>
      <span className="flex items-baseline gap-1">
        <span style={{ fontSize: 28, fontWeight: 600, color: COLOR.text, lineHeight: 1.2 }}>{kpi.value}</span>
        {kpi.unit && <span style={{ fontSize: 14, color: COLOR.textSecondary }}>{kpi.unit}</span>}
      </span>
      <span className="flex items-center gap-1 min-w-0 whitespace-nowrap" style={{ fontSize: 12, color: COLOR.textSecondary }}>
        <Icon name={dir} size={16} weight={400} color={COLOR.textSecondary} />
        <span className="truncate">{kpi.delta === 0 ? 'estável' : `${fmt(Math.abs(kpi.delta))}% vs. mês anterior`}</span>
      </span>
    </section>
  )
}

const PAD = { top: 8, right: 8, bottom: 24, left: 40 }

function LineChart({ chart }: { chart: Extract<Chart, { kind: 'line' }> }) {
  const [ref, w, boxH] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  /* A altura é a do bloco: o gráfico ocupa o que o layout do painel der a ele. */
  const h = Math.max(140, boxH)
  const { max, ticks } = niceScale(Math.max(...chart.series.flatMap((s) => s.values)))
  const iw = Math.max(0, w - PAD.left - PAD.right)
  const ih = h - PAD.top - PAD.bottom
  const n = chart.categories.length
  const x = (i: number) => PAD.left + (iw * i) / (n - 1)
  const y = (v: number) => PAD.top + ih - (ih * v) / max

  return (
    <div className="flex flex-col gap-2 h-full">
      <Legend items={chart.series.map((s, i) => ({ name: s.name, color: SERIES[i] }))} />
      <div ref={ref} className="relative flex-1 min-h-0">
        {w > 0 && (
          <svg
            width={w}
            height={h}
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              const i = Math.round(((e.clientX - r.left - PAD.left) / iw) * (n - 1))
              setHover(Math.max(0, Math.min(n - 1, i)))
            }}
            onMouseLeave={() => setHover(null)}
          >
            {ticks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
                <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" {...AXIS}>
                  {fmt(t)}
                </text>
              </g>
            ))}
            {/* Sem espaço para todo mês, mostra um sim, um não. */}
            {chart.categories.map((c, i) => (iw / (n - 1) < 36 && i % 2 ? null : (
              <text key={c} x={x(i)} y={h - 6} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'} {...AXIS}>
                {c}
              </text>
            )))}
            {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + ih} stroke={COLOR.borderStrong} />}
            {chart.series.map((s, si) => (
              <g key={s.name}>
                <polyline
                  fill="none"
                  stroke={SERIES[si]}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                />
                {hover !== null && (
                  <circle cx={x(hover)} cy={y(s.values[hover])} r={4} fill={SERIES[si]} stroke="var(--wk-surface)" strokeWidth={2} />
                )}
              </g>
            ))}
          </svg>
        )}
        {hover !== null && (
          <Tip x={x(hover)} y={y(Math.max(...chart.series.map((s) => s.values[hover])))}>
            <strong>{chart.categories[hover]}</strong>
            {chart.series.map((s) => (
              <div key={s.name}>
                {s.name}: {fmt(s.values[hover])}
              </div>
            ))}
          </Tip>
        )}
      </div>
    </div>
  )
}

function BarChart({ chart }: { chart: Extract<Chart, { kind: 'bar' }> }) {
  const [ref, w, boxH] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  /* A altura é a do bloco: o gráfico ocupa o que o layout do painel der a ele. */
  const h = Math.max(140, boxH)
  const { max, ticks } = niceScale(Math.max(...chart.values))
  const iw = Math.max(0, w - PAD.left - PAD.right)
  const ih = h - PAD.top - PAD.bottom
  const band = iw / chart.values.length
  const bw = Math.min(28, band * 0.6)
  const y = (v: number) => PAD.top + ih - (ih * v) / max

  return (
    <div ref={ref} className="relative h-full">
      {w > 0 && (
        <svg width={w} height={h} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={w - PAD.right} y1={y(t)} y2={y(t)} stroke={GRID} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" {...AXIS}>
                {fmt(t)}
              </text>
            </g>
          ))}
          {chart.values.map((v, i) => {
            const cx = PAD.left + band * i + band / 2
            const top = y(v)
            const bh = PAD.top + ih - top
            return (
              <g key={i} onMouseEnter={() => setHover(i)}>
                <rect x={PAD.left + band * i} y={PAD.top} width={band} height={ih} fill="transparent" />
                <path
                  d={`M${cx - bw / 2},${top + bh} V${top + 4} q0,-4 4,-4 H${cx + bw / 2 - 4} q4,0 4,4 V${top + bh} Z`}
                  fill={SERIES[0]}
                  opacity={hover === null || hover === i ? 1 : 0.55}
                />
                <text x={cx} y={h - 6} textAnchor="middle" {...AXIS}>
                  {chart.categories[i]}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && (
        <Tip x={PAD.left + band * hover + band / 2} y={y(chart.values[hover])}>
          <strong>{chart.categories[hover]}</strong>: {fmt(chart.values[hover])}
        </Tip>
      )}
    </div>
  )
}

function HBarChart({ chart }: { chart: Extract<Chart, { kind: 'hbar' }> }) {
  const max = Math.max(...chart.values)
  return (
    <div className="flex flex-col gap-2.5" style={{ fontFamily: FONT, fontSize: 12 }}>
      {chart.categories.map((c, i) => (
        <div key={c} className="grid items-center gap-3" style={{ gridTemplateColumns: '96px 1fr 48px' }} title={`${c}: ${fmt(chart.values[i])}`}>
          <span className="truncate" style={{ color: COLOR.textSecondary }}>
            {c}
          </span>
          <span className="h-3 rounded-r" style={{ width: `${(chart.values[i] / max) * 100}%`, background: SERIES[0], borderRadius: '0 4px 4px 0' }} />
          <span className="text-right tabular-nums" style={{ color: COLOR.text }}>
            {fmt(chart.values[i])}
          </span>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ chart }: { chart: Extract<Chart, { kind: 'donut' }> }) {
  const [hover, setHover] = useState<number | null>(null)
  const total = chart.values.reduce((a, b) => a + b, 0)
  const R = 70
  const r = 46
  let acc = 0
  const arcs = chart.values.map((v) => {
    const a0 = (acc / total) * Math.PI * 2
    acc += v
    const a1 = (acc / total) * Math.PI * 2
    return [a0, a1] as const
  })
  const pt = (a: number, rad: number) => [R + rad * Math.sin(a), R - rad * Math.cos(a)]
  const arc = ([a0, a1]: readonly [number, number]) => {
    const large = a1 - a0 > Math.PI ? 1 : 0
    const [x0, y0] = pt(a0, R)
    const [x1, y1] = pt(a1, R)
    const [x2, y2] = pt(a1, r)
    const [x3, y3] = pt(a0, r)
    return `M${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${r},${r} 0 ${large} 0 ${x3},${y3} Z`
  }
  const pct = (v: number) => `${Math.round((v / total) * 100)}%`

  return (
    <div className="flex items-center gap-6 h-full flex-wrap">
      <svg width={R * 2} height={R * 2} onMouseLeave={() => setHover(null)} className="shrink-0">
        {arcs.map((a, i) => (
          <path
            key={i}
            d={arc(a)}
            fill={SERIES[i]}
            stroke="var(--wk-surface)"
            strokeWidth={2}
            opacity={hover === null || hover === i ? 1 : 0.55}
            onMouseEnter={() => setHover(i)}
          />
        ))}
        <text x={R} y={R} textAnchor="middle" dy="0.32em" style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, fill: 'var(--wk-text)' }}>
          {hover === null ? fmt(total) : pct(chart.values[hover])}
        </text>
      </svg>
      <ul className="flex flex-col gap-2" style={{ fontFamily: FONT, fontSize: 13 }}>
        {chart.categories.map((c, i) => (
          <li key={c} className="flex items-center gap-2" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="inline-block rounded-full shrink-0" style={{ width: 8, height: 8, background: SERIES[i] }} />
            <span style={{ color: COLOR.textSecondary }}>{c}</span>
            <span className="tabular-nums" style={{ color: COLOR.text }}>
              {pct(chart.values[i])}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ChartView({ chart }: { chart: Chart }) {
  if (chart.kind === 'line') return <LineChart chart={chart} />
  if (chart.kind === 'bar') return <BarChart chart={chart} />
  if (chart.kind === 'hbar') return <HBarChart chart={chart} />
  return <DonutChart chart={chart} />
}
