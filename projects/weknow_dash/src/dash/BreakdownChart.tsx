import { useState, type KeyboardEvent, type MouseEvent } from 'react'
import { formatCompact, formatFull } from '@/engine/format'
import { OTHER, type Bucket } from '@/engine/query'
import type { NumberFormat } from '@/engine/types'
import { Tip, TipRow, clip, niceTicks, useWidth } from '@/dash/kit'

/**
 * Gráfico por categoria: barras, colunas ou rosca.
 *
 * Clique numa parte filtra o dashboard inteiro; clique de novo desfaz;
 * Ctrl/⌘ + clique soma categorias. A parte escolhida fica cheia e as outras
 * apagadas — o gráfico não encolhe para uma barra só, então dá para trocar a
 * escolha ali mesmo.
 *
 * "Outros" é cinza e não filtra: ele junta várias categorias, e filtrar por
 * "tudo que não está no top" confunde mais do que ajuda. A dica diz quantas
 * ele junta.
 */

export type BreakdownProps = {
  data: Bucket[]
  format: NumberFormat
  label: string
  selected: string[]
  colorFor: (key: string) => string
  onToggle: (key: string, additive: boolean) => void
  /** Barras e colunas de série única usam a cor de destaque; a rosca, uma por fatia. */
  mono?: boolean
}

const pct = (v: number, total: number) => (total ? `${((v / total) * 100).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%` : '—')

function useInteraction(onToggle: BreakdownProps['onToggle']) {
  return (key: string) => ({
    role: key === OTHER ? undefined : 'button',
    tabIndex: key === OTHER ? -1 : 0,
    onClick: (e: MouseEvent) => key !== OTHER && onToggle(key, e.ctrlKey || e.metaKey || e.shiftKey),
    onKeyDown: (e: KeyboardEvent) => {
      if (key !== OTHER && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onToggle(key, e.ctrlKey || e.metaKey || e.shiftKey)
      }
    },
    style: { cursor: key === OTHER ? 'default' : 'pointer', outline: 'none' },
  })
}

function TipBody({ b, format, label, total, color, selected }: { b: Bucket; format: NumberFormat; label: string; total: number; color: string; selected: boolean }) {
  return (
    <>
      <div style={{ color: 'var(--d-text-2)', marginBottom: 2, fontWeight: 500 }}>{b.key}</div>
      <TipRow color={color} value={formatFull(b.value, format)} label={label} />
      <div style={{ color: 'var(--d-muted)', marginTop: 2 }}>{pct(b.value, total)} do total</div>
      <div style={{ color: 'var(--d-muted)', marginTop: 4 }}>
        {b.key === OTHER ? `Junta ${b.other} categorias fora do top` : selected ? 'Clique para tirar o filtro' : 'Clique para filtrar · Ctrl+clique soma'}
      </div>
    </>
  )
}

/* ── Barras horizontais ───────────────────────────────────────────────────── */

const ROW = 30
const THICK = 16

export function BarChart({ data, format, label, selected, colorFor, onToggle, mono }: BreakdownProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const act = useInteraction(onToggle)
  const total = data.reduce((s, b) => s + b.value, 0)
  const labelW = Math.min(150, Math.max(80, width * 0.32))
  const valueW = 64
  const barMax = Math.max(10, width - labelW - valueW - 12)
  const max = Math.max(...data.map((d) => d.value), 0) || 1
  const H = data.length * ROW + 4

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      {width > 0 && (
        <svg width={width} height={H} role="img" aria-label={label} style={{ display: 'block' }}>
          {data.map((b, i) => {
            const isSel = selected.includes(b.key)
            const dim = selected.length > 0 && !isSel
            const bw = Math.max(2, (b.value / max) * barMax)
            const yy = i * ROW + (ROW - THICK) / 2
            const x0 = labelW
            const r = Math.min(4, bw / 2)
            const color = b.key === OTHER ? 'var(--d-other)' : mono ? 'var(--d-accent)' : colorFor(b.key)
            return (
              <g key={b.key} {...act(b.key)} aria-label={`${b.key}: ${formatFull(b.value, format)}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                <rect x={0} y={i * ROW} width={width} height={ROW} fill={hover === i ? 'var(--d-hover)' : 'transparent'} rx={6} />
                <text x={labelW - 10} y={i * ROW + ROW / 2} dy="0.32em" textAnchor="end" fontSize={12} fill={isSel ? 'var(--d-text)' : 'var(--d-text-2)'} fontWeight={isSel ? 600 : 400}>
                  {clip(b.key, labelW - 14)}
                </text>
                <path
                  d={`M${x0},${yy}H${x0 + bw - r}Q${x0 + bw},${yy} ${x0 + bw},${yy + r}V${yy + THICK - r}Q${x0 + bw},${yy + THICK} ${x0 + bw - r},${yy + THICK}H${x0}Z`}
                  fill={color}
                  opacity={dim ? 0.3 : 1}
                />
                <text x={x0 + bw + 6} y={i * ROW + ROW / 2} dy="0.32em" fontSize={12} fill="var(--d-text-2)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatCompact(b.value, format)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tip x={labelW + Math.max(2, (data[hover].value / max) * barMax)} y={hover * ROW} width={width}>
          <TipBody b={data[hover]} format={format} label={label} total={total} selected={selected.includes(data[hover].key)} color={data[hover].key === OTHER ? 'var(--d-other)' : mono ? 'var(--d-accent)' : colorFor(data[hover].key)} />
        </Tip>
      )}
    </div>
  )
}

/* ── Colunas ──────────────────────────────────────────────────────────────── */

const CH = 240
const CPAD = { top: 18, bottom: 34, left: 52, right: 8 }

export function ColumnChart({ data, format, label, selected, colorFor, onToggle, mono }: BreakdownProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const act = useInteraction(onToggle)
  const total = data.reduce((s, b) => s + b.value, 0)
  const w = Math.max(0, width - CPAD.left - CPAD.right)
  const h = CH - CPAD.top - CPAD.bottom
  const ticks = niceTicks(Math.max(0, ...data.map((d) => d.value)))
  const top = ticks[ticks.length - 1] || 1
  const step = data.length ? w / data.length : 0
  const bw = Math.min(28, step * 0.6)
  const y = (v: number) => CPAD.top + h - (v / top) * h

  return (
    <div ref={ref} className="relative w-full" style={{ height: CH }}>
      {width > 0 && (
        <svg width={width} height={CH} role="img" aria-label={label} style={{ display: 'block' }}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={CPAD.left} x2={CPAD.left + w} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--d-axis)' : 'var(--d-grid)'} />
              <text x={CPAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--d-muted)">
                {formatCompact(t, format)}
              </text>
            </g>
          ))}
          {data.map((b, i) => {
            const cx = CPAD.left + step * i + step / 2
            const x0 = cx - bw / 2
            const y0 = y(b.value)
            const bh = CPAD.top + h - y0
            const r = Math.min(4, bw / 2, bh)
            const isSel = selected.includes(b.key)
            const dim = selected.length > 0 && !isSel
            const color = b.key === OTHER ? 'var(--d-other)' : mono ? 'var(--d-accent)' : colorFor(b.key)
            return (
              <g key={b.key} {...act(b.key)} aria-label={`${b.key}: ${formatFull(b.value, format)}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)}>
                <rect x={cx - step / 2} y={CPAD.top} width={step} height={h + CPAD.bottom} fill={hover === i ? 'var(--d-hover)' : 'transparent'} rx={6} />
                <path d={`M${x0},${CPAD.top + h}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${CPAD.top + h}Z`} fill={color} opacity={dim ? 0.3 : 1} />
                <text x={cx} y={CH - CPAD.bottom + 16} textAnchor="middle" fontSize={11} fill={isSel ? 'var(--d-text)' : 'var(--d-text-2)'} fontWeight={isSel ? 600 : 400}>
                  {clip(b.key, step - 4, 11)}
                </text>
              </g>
            )
          })}
        </svg>
      )}
      {hover !== null && data[hover] && (
        <Tip x={CPAD.left + step * hover + step / 2} y={y(data[hover].value)} width={width}>
          <TipBody b={data[hover]} format={format} label={label} total={total} selected={selected.includes(data[hover].key)} color={data[hover].key === OTHER ? 'var(--d-other)' : mono ? 'var(--d-accent)' : colorFor(data[hover].key)} />
        </Tip>
      )}
    </div>
  )
}

/* ── Rosca ────────────────────────────────────────────────────────────────── */

function arc(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const big = a1 - a0 > Math.PI ? 1 : 0
  const p = (r: number, a: number) => `${(cx + r * Math.sin(a)).toFixed(2)},${(cy - r * Math.cos(a)).toFixed(2)}`
  if (a1 - a0 >= Math.PI * 2 - 1e-6) {
    // Fatia única: dois semicírculos, porque um arco de 360° não desenha.
    return `M${p(r1, 0)}A${r1},${r1} 0 1 1 ${p(r1, Math.PI)}A${r1},${r1} 0 1 1 ${p(r1, 0)}M${p(r0, 0)}A${r0},${r0} 0 1 0 ${p(r0, Math.PI)}A${r0},${r0} 0 1 0 ${p(r0, 0)}Z`
  }
  return `M${p(r1, a0)}A${r1},${r1} 0 ${big} 1 ${p(r1, a1)}L${p(r0, a1)}A${r0},${r0} 0 ${big} 0 ${p(r0, a0)}Z`
}

export function DonutChart({ data, format, label, selected, colorFor, onToggle }: BreakdownProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)
  const act = useInteraction(onToggle)
  const total = data.reduce((s, b) => s + b.value, 0)
  const side = width >= 380
  const size = Math.min(side ? width * 0.46 : width, 196)
  const r1 = size / 2
  const r0 = r1 * 0.64
  let a = 0
  const color = (k: string) => (k === OTHER ? 'var(--d-other)' : colorFor(k))

  return (
    <div ref={ref} className="relative w-full" style={{ display: 'flex', flexDirection: side ? 'row' : 'column', alignItems: 'center', gap: 16 }}>
      {width > 0 && (
        <svg width={size} height={size} role="img" aria-label={label} style={{ flexShrink: 0, display: 'block' }}>
          {data.map((b, i) => {
            const a0 = a
            const a1 = a + (total ? (b.value / total) * Math.PI * 2 : 0)
            a = a1
            const isSel = selected.includes(b.key)
            const dim = selected.length > 0 && !isSel
            const grow = hover === i ? 3 : 0
            return (
              <path
                key={b.key}
                {...act(b.key)}
                aria-label={`${b.key}: ${formatFull(b.value, format)}`}
                d={arc(r1, r1, r0, r1 - 3 + grow, a0, a1)}
                fill={color(b.key)}
                opacity={dim ? 0.3 : 1}
                stroke="var(--d-card)"
                strokeWidth={2}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              />
            )
          })}
          <text x={r1} y={r1 - 4} textAnchor="middle" fontSize={size > 160 ? 18 : 15} fontWeight={600} fill="var(--d-text)">
            {formatCompact(hover !== null && data[hover] ? data[hover].value : total, format)}
          </text>
          <text x={r1} y={r1 + 14} textAnchor="middle" fontSize={11} fill="var(--d-muted)">
            {hover !== null && data[hover] ? pct(data[hover].value, total) : 'total'}
          </text>
        </svg>
      )}

      {/* Legenda sempre presente: identidade nunca só pela cor. Cada linha
          também filtra, para quem não acerta a fatia fina. */}
      <ul className="flex-1 min-w-0 w-full flex flex-col" style={{ gap: 2 }}>
        {data.map((b, i) => {
          const isSel = selected.includes(b.key)
          const dim = selected.length > 0 && !isSel
          return (
            <li
              key={b.key}
              {...act(b.key)}
              onPointerEnter={() => setHover(i)}
              onPointerLeave={() => setHover(null)}
              className="flex items-center gap-2 rounded-md px-2"
              style={{ ...act(b.key).style, height: 28, background: hover === i ? 'var(--d-hover)' : undefined, opacity: dim ? 0.55 : 1 }}
            >
              <span aria-hidden style={{ width: 10, height: 10, borderRadius: 3, background: color(b.key), flexShrink: 0 }} />
              <span className="flex-1 min-w-0 truncate" style={{ fontSize: 12, color: isSel ? 'var(--d-text)' : 'var(--d-text-2)', fontWeight: isSel ? 600 : 400 }}>
                {b.key}
              </span>
              <span style={{ fontSize: 12, color: 'var(--d-text-2)', fontVariantNumeric: 'tabular-nums' }}>{formatCompact(b.value, format)}</span>
              <span style={{ fontSize: 11, color: 'var(--d-muted)', width: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{pct(b.value, total)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
