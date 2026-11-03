import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { COLOR, FONT, TABLE } from '@/design/tokens'
import { series, type Decomposition, type Filter } from '@/engine/decompose'
import * as F from '@/engine/format'
import type { Measure } from '@/engine/catalog'
import { formatMeasure, formatMeasureDelta } from '@/engine/board'
import { DIMENSIONS, INDICATORS, type IndicatorId } from '@/engine/semantic'

/**
 * Os gráficos do painel, desenhados à mão em SVG na largura real do bloco.
 * Uma escala só, marcas finas, rótulo só onde a história precisa e o resto
 * na dica e na tabela.
 *
 * Todo gráfico daqui responde ao clique: a barra, a coluna e o ponto do mês
 * chamam `onPick` com o valor e a posição, e o painel abre o menu de ações
 * ali (filtrar, explicar). O gráfico não decide o que o clique faz.
 */

export type Pick = (value: string, at: { x: number; y: number }) => void

/* ────────────────────────────────────────────────────────── utilidades */

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.floor(e.contentRect.width)))
    ro.observe(el)
    setWidth(Math.floor(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

/** Marcas redondas: 3,8 / 4,0 / 4,2, e não 3,83 / 4,07. */
function niceTicks(lo: number, hi: number, count = 4) {
  const raw = (hi - lo) / count || 1
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const start = Math.floor(lo / step) * step
  const ticks: number[] = []
  for (let v = start; v <= hi + step * 0.5; v += step) ticks.push(Number(v.toFixed(10)))
  return ticks
}

/** Dica flutuante: o valor primeiro e forte, a série num traço da cor. */
function Tip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const flip = x > width - 220
  return (
    <div
      className="absolute z-10 pointer-events-none an-tip"
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? width - x + 12 : undefined,
        top: Math.max(0, y - 8),
        background: 'var(--wk-surface)',
        border: `1px solid ${COLOR.border}`,
        borderRadius: 8,
        boxShadow: 'var(--wk-shadow-menu)',
        padding: '8px 10px',
        fontSize: 12,
        lineHeight: 1.5,
        color: COLOR.text,
        whiteSpace: 'nowrap',
        fontFamily: FONT,
      }}
    >
      {children}
    </div>
  )
}

function TipRow({ color, value, label }: { color?: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {color && <span aria-hidden style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />}
      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ color: COLOR.textSecondary }}>{label}</span>
    </div>
  )
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: 16, fontSize: 12, lineHeight: '16px', color: COLOR.textSecondary }}>
      {items.map((it) => (
        <span key={it.label} className="flex items-center" style={{ gap: 6 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: 2, background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  )
}

const AXIS_TEXT = { fontSize: 11, fill: 'var(--wk-text-secondary)', fontFamily: FONT } as const

/* ──────────────────────────────────────────────────────────── tendência */

/* ──────────────────────────────────────────────────────────── tendência */

export function TrendChart({
  ind,
  filter,
  measure,
  mes,
  onPick,
  height = 220,
}: {
  ind: IndicatorId
  filter: Filter
  measure: Measure
  /** O mês do painel: o ponto marcado e rotulado. */
  mes: string
  onPick?: Pick
  height?: number
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const data = series(ind, filter).map((p) => ({ mes: p.mes, v: measure === 'rate' ? p.rate : measure === 'den' ? p.den : p.num }))
  const tick = (v: number) => (measure === 'rate' ? F.bare(ind, v) : formatMeasure(ind, measure, v))

  const H = height
  const pad = { l: 52, r: 44, t: 20, b: 28 }
  const vals = data.map((d) => d.v)
  const lo = Math.min(...vals)
  const hi = Math.max(...vals)
  const span = hi - lo || hi * 0.1 || 1
  const ticks = niceTicks(Math.max(0, lo - span * 0.25), hi + span * 0.15)
  const y0 = ticks[0]
  const y1 = ticks[ticks.length - 1]
  const iw = Math.max(0, width - pad.l - pad.r)
  const ih = H - pad.t - pad.b
  const x = (i: number) => pad.l + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2)
  const y = (v: number) => pad.t + ih - ((v - y0) / (y1 - y0 || 1)) * ih
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.v).toFixed(1)}`).join('')
  const area = `${line}L${x(data.length - 1).toFixed(1)},${y(y0)}L${x(0).toFixed(1)},${y(y0)}Z`
  const sel = data.findIndex((d) => d.mes === mes)

  return (
    <div ref={ref} className="relative" style={{ height: H }}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`${INDICATORS[ind].name}, ${F.monthShort(data[0].mes)} a ${F.monthShort(data[data.length - 1].mes)}`}
          style={{ cursor: onPick ? 'pointer' : undefined }}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect()
            const i = Math.round(((e.clientX - r.left - pad.l) / (iw || 1)) * (data.length - 1))
            setHover(Math.max(0, Math.min(data.length - 1, i)))
          }}
          onClick={(e) => hover !== null && onPick?.(data[hover].mes, { x: e.clientX, y: e.clientY })}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke="var(--an-grid)" strokeWidth={1} />
              <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" style={AXIS_TEXT}>
                {tick(t)}
              </text>
            </g>
          ))}
          {data.map((d, i) => (
            <text
              key={d.mes}
              x={x(i)}
              y={H - 8}
              textAnchor="middle"
              style={{ ...AXIS_TEXT, fontWeight: i === sel ? 600 : 400, fill: i === sel ? 'var(--wk-text)' : AXIS_TEXT.fill }}
            >
              {width < 420 && i % 2 && i !== sel ? '' : F.monthTick(d.mes)}
            </text>
          ))}
          <path d={area} fill="var(--an-wash)" />
          <path d={line} fill="none" stroke="var(--an-line)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {/* A mira e os marcadores existem sempre; o hover só os acende, para
              eles crescerem e sumirem com transição em vez de piscar. */}
          <line
            className="an-cross"
            x1={x(hover ?? 0)}
            x2={x(hover ?? 0)}
            y1={pad.t}
            y2={pad.t + ih}
            stroke="var(--an-axis)"
            strokeWidth={1}
            opacity={hover === null ? 0 : 1}
          />
          {data.map((d, i) => (
            <circle
              key={d.mes}
              className="an-dot"
              cx={x(i)}
              cy={y(d.v)}
              r={i === hover ? 6 : i === sel ? 5 : 0}
              fill="var(--an-line)"
              stroke="var(--wk-surface)"
              strokeWidth={2}
            />
          ))}
          {sel >= 0 && (
            <text
              x={sel === data.length - 1 ? x(sel) + 10 : x(sel)}
              y={sel === data.length - 1 ? y(data[sel].v) + 4 : y(data[sel].v) - 12}
              textAnchor={sel === data.length - 1 ? 'start' : 'middle'}
              style={{ fontSize: 12, fontWeight: 600, fill: 'var(--wk-text)', fontFamily: FONT }}
            >
              {tick(data[sel].v)}
            </text>
          )}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tip x={x(hover)} y={y(data[hover].v)} width={width}>
          <div style={{ color: COLOR.textSecondary, marginBottom: 2 }}>{F.monthShort(data[hover].mes)}</div>
          <TipRow value={formatMeasure(ind, measure, data[hover].v)} label="" />
          {hover > 0 && (
            <div style={{ color: COLOR.textSecondary }}>{formatMeasureDelta(ind, measure, data[hover].v - data[hover - 1].v)} no mês</div>
          )}
          {onPick && <div style={{ color: COLOR.textSecondary, marginTop: 4 }}>Clique para analisar o mês</div>}
        </Tip>
      )}
    </div>
  )
}

export function TrendTable({ ind, filter, measure }: { ind: IndicatorId; filter: Filter; measure: Measure }) {
  const data = series(ind, filter)
  return (
    <DataTable
      head={['Mês', 'Valor']}
      rows={data.map((p) => [F.monthShort(p.mes), formatMeasure(ind, measure, measure === 'rate' ? p.rate : measure === 'den' ? p.den : p.num)])}
    />
  )
}

/* ───────────────────────────────────────────────────────── decomposição */

/**
 * Mix e taxa por segmento, divergindo do zero. Duas barras por linha, uma
 * de cada efeito, porque somar positivo com negativo numa pilha esconde o
 * sinal de um deles. O total da linha fica numa coluna de texto à direita.
 */
export function DecompChart({ ind, d }: { ind: IndicatorId; d: Decomposition }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const rows = d.segments
  const LABEL = Math.min(160, Math.max(110, width * 0.26))
  const TOTAL = 84
  const ROW = 40
  const BAR = 10
  const plotL = LABEL + 12
  const plotW = Math.max(0, width - plotL - TOTAL - 12)
  const max = Math.max(...rows.flatMap((s) => [Math.abs(s.mix), Math.abs(s.rate)]), 1e-9)
  const hasNeg = rows.some((s) => s.mix < -max * 0.02 || s.rate < -max * 0.02)
  // Sem negativo relevante, o zero vai para a esquerda e a barra ganha a largura toda.
  const zeroX = plotL + (hasNeg ? plotW * 0.22 : 0)
  const scale = (v: number) => (v / max) * (hasNeg ? plotW * 0.78 : plotW)
  const H = rows.length * ROW + 8
  const I = INDICATORS[ind]

  const bar = (v: number, yTop: number, color: string, faded = false) => {
    const o = faded ? 0.4 : 1
    const w = Math.abs(scale(v))
    if (w < 0.5) return <rect className="an-mark" x={zeroX - 0.5} y={yTop} width={1} height={BAR} fill={color} opacity={o} />
    const x0 = v >= 0 ? zeroX : zeroX - w
    const r = Math.min(4, w / 2)
    // Ponta arredondada só no fim do dado; a base no zero fica reta.
    const path =
      v >= 0
        ? `M${x0},${yTop}H${x0 + w - r}Q${x0 + w},${yTop} ${x0 + w},${yTop + r}V${yTop + BAR - r}Q${x0 + w},${yTop + BAR} ${x0 + w - r},${yTop + BAR}H${x0}Z`
        : `M${x0 + w},${yTop}H${x0 + r}Q${x0},${yTop} ${x0},${yTop + r}V${yTop + BAR - r}Q${x0},${yTop + BAR} ${x0 + r},${yTop + BAR}H${x0 + w}Z`
    return <path className="an-mark" d={path} fill={color} opacity={o} />
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between" style={{ gap: 12, marginBottom: 12 }}>
        <Legend
          items={[
            { color: 'var(--an-mix)', label: `Mix (participação em ${I.den.label})` },
            { color: 'var(--an-rate)', label: `Taxa (${I.rateNoun} dentro do segmento)` },
          ]}
        />
        <span style={{ fontSize: 12, color: COLOR.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          Total {F.contrib(ind, d.delta)} · mix {F.contrib(ind, d.mix)} · taxa {F.contrib(ind, d.rate)}
        </span>
      </div>
      <div ref={ref} className="relative" style={{ height: H }}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Contribuição de cada ${DIMENSIONS[d.dim].label} para a variação`} onMouseLeave={() => setHover(null)}>
            <line x1={zeroX} x2={zeroX} y1={0} y2={H - 4} stroke="var(--an-axis)" strokeWidth={1} />
            {rows.map((s, i) => {
              const top = i * ROW + 6
              return (
                <g key={s.key} onMouseEnter={() => setHover(i)}>
                  {/* Alvo da linha inteira: maior que as barras de 10px. */}
                  <rect className="an-rowbg" x={0} y={top - 4} width={width} height={ROW} fill={hover === i ? 'var(--wk-surface-subtle)' : 'transparent'} rx={6} />
                  <text x={0} y={top + 15} style={{ fontSize: 13, fill: 'var(--wk-text)', fontFamily: FONT }}>
                    {s.key.length > LABEL / 7 ? s.key.slice(0, Math.floor(LABEL / 7) - 1) + '…' : s.key}
                  </text>
                  {bar(s.mix, top + 3, 'var(--an-mix)', hover !== null && hover !== i)}
                  {bar(s.rate, top + 3 + BAR + 2, 'var(--an-rate)', hover !== null && hover !== i)}
                  <text
                    x={width}
                    y={top + 15}
                    textAnchor="end"
                    style={{ fontSize: 13, fontWeight: i === 0 ? 600 : 400, fill: 'var(--wk-text)', fontFamily: FONT, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {F.contrib(ind, s.total)}
                  </text>
                </g>
              )
            })}
          </svg>
        )}
        {hover !== null && width > 0 && (
          <Tip x={zeroX + Math.max(scale(rows[hover].mix), scale(rows[hover].rate), 0)} y={hover * ROW} width={width}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>{rows[hover].key}</div>
            <div style={{ color: COLOR.textSecondary }}>
              {cap(I.den.label)}: {F.pct(rows[hover].w0, 1)} → {F.pct(rows[hover].w1, 1)} do total
            </div>
            <div style={{ color: COLOR.textSecondary, marginBottom: 4 }}>
              {cap(I.rateNoun)}: {F.value(ind, rows[hover].r0)} → {F.value(ind, rows[hover].r1)}
            </div>
            <TipRow color="var(--an-mix)" value={F.contrib(ind, rows[hover].mix)} label="mix" />
            <TipRow color="var(--an-rate)" value={F.contrib(ind, rows[hover].rate)} label="taxa" />
          </Tip>
        )}
      </div>
    </div>
  )
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function DecompTable({ ind, d }: { ind: IndicatorId; d: Decomposition }) {
  const I = INDICATORS[ind]
  const from = F.monthTick(d.from)
  const to = F.monthTick(d.to)
  return (
    <DataTable
      head={[cap(DIMENSIONS[d.dim].label), `${cap(I.den.label)} ${from}`, `${cap(I.den.label)} ${to}`, `${cap(I.rateNoun)} ${from}`, `${cap(I.rateNoun)} ${to}`, 'Mix', 'Taxa']}
      rows={d.segments.map((s) => [
        s.key,
        F.amount(ind, s.den0),
        F.amount(ind, s.den1),
        F.value(ind, s.r0),
        F.value(ind, s.r1),
        F.contrib(ind, s.mix),
        F.contrib(ind, s.rate),
      ])}
    />
  )
}

/* ─────────────────────────────────────────────────────────────── corte */

export type BreakdownRow = { key: string; v: number; v0: number }

/**
 * Um corte em barras horizontais, do maior para o menor, com o valor na
 * ponta. Os valores selecionados no filtro ficam cheios e os outros
 * apagados: o gráfico clicado continua mostrando todos, para dar para trocar
 * a escolha (filtro cruzado sem autoexclusão, como no Weknow Dash).
 */
export function BarsChart({
  ind,
  measure,
  rows,
  selected,
  onPick,
}: {
  ind: IndicatorId
  measure: Measure
  rows: BreakdownRow[]
  selected: string[]
  onPick?: Pick
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const LABEL = Math.min(150, Math.max(96, width * 0.32))
  const VALUE = 72
  const ROW = 34
  const BAR = 14
  const plotL = LABEL + 8
  const plotW = Math.max(0, width - plotL - VALUE)
  const max = Math.max(...rows.map((r) => r.v), 1e-9)
  const H = rows.length * ROW
  const dim = (k: string) => selected.length > 0 && !selected.includes(k)

  return (
    <div ref={ref} className="relative" style={{ height: H }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Valores por segmento" onMouseLeave={() => setHover(null)}>
          {rows.map((r, i) => {
            const top = i * ROW + (ROW - BAR) / 2
            const w = Math.max(1, (r.v / max) * plotW)
            const rad = Math.min(4, w / 2)
            const off = dim(r.key)
            return (
              <g
                key={r.key}
                style={{ cursor: onPick ? 'pointer' : undefined }}
                onMouseEnter={() => setHover(i)}
                onClick={(e) => onPick?.(r.key, { x: e.clientX, y: e.clientY })}
              >
                <rect className="an-rowbg" x={0} y={i * ROW} width={width} height={ROW} rx={6} fill={hover === i ? 'var(--wk-surface-subtle)' : 'transparent'} />
                <text x={0} y={top + 11} style={{ fontSize: 13, fill: off ? 'var(--wk-text-secondary)' : 'var(--wk-text)', fontFamily: FONT }}>
                  {r.key.length > LABEL / 7.2 ? r.key.slice(0, Math.floor(LABEL / 7.2) - 1) + '…' : r.key}
                </text>
                <path
                  d={`M${plotL},${top}H${plotL + w - rad}Q${plotL + w},${top} ${plotL + w},${top + rad}V${top + BAR - rad}Q${plotL + w},${top + BAR} ${plotL + w - rad},${top + BAR}H${plotL}Z`}
                  className="an-mark"
                  fill="var(--an-mix)"
                  opacity={off ? 0.28 : hover !== null && hover !== i ? 0.55 : 1}
                />
                <text
                  x={width}
                  y={top + 11}
                  textAnchor="end"
                  style={{ fontSize: 13, fontWeight: 600, fill: off ? 'var(--wk-text-secondary)' : 'var(--wk-text)', fontFamily: FONT, fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatMeasure(ind, measure, r.v)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tip x={plotL + (rows[hover].v / max) * plotW} y={hover * ROW} width={width}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{rows[hover].key}</div>
          <div style={{ color: COLOR.textSecondary }}>
            {formatMeasure(ind, measure, rows[hover].v0)} → {formatMeasure(ind, measure, rows[hover].v)} ({formatMeasureDelta(ind, measure, rows[hover].v - rows[hover].v0)})
          </div>
          {onPick && <div style={{ color: COLOR.textSecondary, marginTop: 4 }}>Clique para filtrar ou explicar</div>}
        </Tip>
      )}
    </div>
  )
}

/** O mesmo corte em colunas: serve quando os nomes são curtos e poucos. */
export function ColumnsChart({
  ind,
  measure,
  rows,
  selected,
  onPick,
}: {
  ind: IndicatorId
  measure: Measure
  rows: BreakdownRow[]
  selected: string[]
  onPick?: Pick
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const H = 220
  const pad = { t: 24, b: 40 }
  const ih = H - pad.t - pad.b
  const band = rows.length ? width / rows.length : 0
  const BAR = Math.min(24, band * 0.5)
  const max = Math.max(...rows.map((r) => r.v), 1e-9)
  const dim = (k: string) => selected.length > 0 && !selected.includes(k)

  return (
    <div ref={ref} className="relative" style={{ height: H }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label="Valores por segmento" onMouseLeave={() => setHover(null)}>
          <line x1={0} x2={width} y1={pad.t + ih} y2={pad.t + ih} stroke="var(--an-axis)" strokeWidth={1} />
          {rows.map((r, i) => {
            const h = Math.max(1, (r.v / max) * ih)
            const cx = band * i + band / 2
            const x0 = cx - BAR / 2
            const top = pad.t + ih - h
            const rad = Math.min(4, h / 2, BAR / 2)
            const off = dim(r.key)
            const words = r.key.split(' ')
            return (
              <g
                key={r.key}
                style={{ cursor: onPick ? 'pointer' : undefined }}
                onMouseEnter={() => setHover(i)}
                onClick={(e) => onPick?.(r.key, { x: e.clientX, y: e.clientY })}
              >
                <rect className="an-rowbg" x={band * i} y={0} width={band} height={H} rx={6} fill={hover === i ? 'var(--wk-surface-subtle)' : 'transparent'} />
                <path
                  d={`M${x0},${pad.t + ih}V${top + rad}Q${x0},${top} ${x0 + rad},${top}H${x0 + BAR - rad}Q${x0 + BAR},${top} ${x0 + BAR},${top + rad}V${pad.t + ih}Z`}
                  className="an-mark"
                  fill="var(--an-mix)"
                  opacity={off ? 0.28 : hover !== null && hover !== i ? 0.55 : 1}
                />
                <text x={cx} y={top - 6} textAnchor="middle" style={{ fontSize: 12, fontWeight: 600, fill: 'var(--wk-text)', fontFamily: FONT }}>
                  {measure === 'rate' ? F.bare(ind, r.v) : formatMeasure(ind, measure, r.v)}
                </text>
                <text x={cx} y={pad.t + ih + 16} textAnchor="middle" style={{ ...AXIS_TEXT, fill: off ? AXIS_TEXT.fill : 'var(--wk-text)' }}>
                  {words[0].length > band / 6.5 ? words[0].slice(0, Math.max(3, Math.floor(band / 6.5))) + '…' : words[0]}
                </text>
                {words[1] && band > 70 && (
                  <text x={cx} y={pad.t + ih + 30} textAnchor="middle" style={AXIS_TEXT}>
                    {words.slice(1).join(' ').slice(0, Math.floor(band / 6.5))}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && width > 0 && (
        <Tip x={band * hover + band / 2} y={pad.t + ih - (rows[hover].v / max) * ih} width={width}>
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{rows[hover].key}</div>
          <div style={{ color: COLOR.textSecondary }}>
            {formatMeasure(ind, measure, rows[hover].v0)} → {formatMeasure(ind, measure, rows[hover].v)} ({formatMeasureDelta(ind, measure, rows[hover].v - rows[hover].v0)})
          </div>
          {onPick && <div style={{ color: COLOR.textSecondary, marginTop: 4 }}>Clique para filtrar ou explicar</div>}
        </Tip>
      )}
    </div>
  )
}

export function BreakdownTable({ ind, measure, rows, dimLabel, prevLabel, curLabel }: { ind: IndicatorId; measure: Measure; rows: BreakdownRow[]; dimLabel: string; prevLabel: string; curLabel: string }) {
  return (
    <DataTable
      head={[dimLabel, prevLabel, curLabel, 'Variação']}
      rows={rows.map((r) => [r.key, formatMeasure(ind, measure, r.v0), formatMeasure(ind, measure, r.v), formatMeasureDelta(ind, measure, r.v - r.v0)])}
    />
  )
}

/** A tabela do design system, sem moldura: o bloco já é a moldura. */
export function DataTable({ head, rows, caption }: { head: string[]; rows: string[][]; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" style={{ fontFamily: FONT }}>
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {head.map((h, i) => (
              <th
                key={h}
                scope="col"
                className="whitespace-nowrap"
                style={{
                  fontSize: TABLE.headerSize,
                  fontWeight: TABLE.headerWeight,
                  color: TABLE.headerText,
                  textAlign: i === 0 ? 'left' : 'right',
                  paddingBlock: TABLE.padY,
                  paddingLeft: i === 0 ? 0 : TABLE.padX,
                  paddingRight: i === head.length - 1 ? 0 : TABLE.padX,
                  borderBottom: `1px solid ${TABLE.border}`,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, i) => (
                <td
                  key={i}
                  className={i === 0 ? '' : 'whitespace-nowrap'}
                  style={{
                    fontSize: TABLE.bodySize,
                    color: i === 0 ? TABLE.labelText : TABLE.text,
                    textAlign: i === 0 ? 'left' : 'right',
                    fontVariantNumeric: 'tabular-nums',
                    paddingBlock: 10,
                    paddingLeft: i === 0 ? 0 : TABLE.padX,
                    paddingRight: i === r.length - 1 ? 0 : TABLE.padX,
                    borderBottom: ri === rows.length - 1 ? 'none' : `1px solid ${TABLE.border}`,
                  }}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
