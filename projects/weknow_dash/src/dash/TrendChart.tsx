import { useState } from 'react'
import { bucketLabel, formatCompact, formatFull } from '@/engine/format'
import type { Bucket } from '@/engine/query'
import type { Grain, NumberFormat } from '@/engine/types'
import { Tip, TipRow, niceTicks, useWidth } from '@/dash/kit'

const H = 240
const PAD = { top: 12, right: 12, bottom: 26, left: 56 }

/**
 * Evolução no tempo: linha, área ou colunas.
 *
 * A mira acha o X — ninguém mira numa linha de 2px; mira numa data. Clicar
 * num ponto filtra o dashboard por aquele mês (ou semana, dia…); clicar no
 * mesmo ponto de novo volta ao período anterior.
 */
export function TrendChart({
  data,
  grain,
  style,
  format,
  label,
  selected,
  onPick,
}: {
  data: Bucket[]
  grain: Grain
  style: 'line' | 'area' | 'column'
  format: NumberFormat
  label: string
  /** Balde que é o período ativo, quando o filtro veio de um clique aqui. */
  selected: string | null
  onPick: (key: string) => void
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  const w = Math.max(0, width - PAD.left - PAD.right)
  const h = H - PAD.top - PAD.bottom
  const max = Math.max(0, ...data.map((d) => d.value))
  const ticks = niceTicks(max)
  const top = ticks[ticks.length - 1] || 1
  const n = data.length
  const step = n > 0 ? w / n : 0
  const x = (i: number) => PAD.left + step * i + step / 2
  const y = (v: number) => PAD.top + h - (v / top) * h

  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join('')
  const area = n ? `${path}L${x(n - 1).toFixed(1)},${PAD.top + h}L${x(0).toFixed(1)},${PAD.top + h}Z` : ''

  /* Rótulos do eixo X: no máximo ~1 a cada 70px. */
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(w / 70))))

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.floor((clientX - rect.left - PAD.left) / (step || 1))
    return i >= 0 && i < n ? i : null
  }

  const barW = Math.min(24, Math.max(2, step * 0.62))
  const sel = selected ? data.findIndex((d) => d.key === selected) : -1

  return (
    <div ref={ref} className="relative w-full" style={{ height: H }}>
      {width > 0 && (
        <svg
          width={width}
          height={H}
          role="img"
          aria-label={`${label} ao longo do tempo`}
          style={{ cursor: 'pointer', display: 'block' }}
          onPointerMove={(e) => setHover(pick(e.clientX, e.currentTarget.getBoundingClientRect()))}
          onPointerLeave={() => setHover(null)}
          onClick={(e) => {
            const i = pick(e.clientX, e.currentTarget.getBoundingClientRect())
            if (i !== null) onPick(data[i].key)
          }}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + w} y1={y(t)} y2={y(t)} stroke={t === 0 ? 'var(--d-axis)' : 'var(--d-grid)'} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--d-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatCompact(t, format)}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % every === 0 ? (
              <text key={d.key} x={x(i)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--d-muted)">
                {bucketLabel(d.key, grain)}
              </text>
            ) : null,
          )}

          {sel >= 0 && <rect x={x(sel) - step / 2} y={PAD.top} width={step} height={h} fill="var(--d-accent)" opacity={0.1} />}

          {style === 'column' ? (
            data.map((d, i) => {
              const bh = Math.max(0, PAD.top + h - y(d.value))
              const r = Math.min(4, barW / 2, bh)
              const x0 = x(i) - barW / 2
              const y0 = y(d.value)
              const dim = sel >= 0 && sel !== i
              return (
                <path
                  key={d.key}
                  d={`M${x0},${PAD.top + h}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + barW - r}Q${x0 + barW},${y0} ${x0 + barW},${y0 + r}V${PAD.top + h}Z`}
                  fill="var(--d-accent)"
                  opacity={dim ? 0.35 : d.partial ? 0.45 : hover === i ? 0.85 : 1}
                />
              )
            })
          ) : (
            <>
              {style === 'area' && <path d={area} fill="var(--d-accent)" opacity={0.1} />}
              {/* Trecho que toca um balde incompleto sai tracejado. */}
              {data.slice(1).map((d, j) => {
                const a = data[j]
                const dashed = a.partial || d.partial
                return (
                  <line key={d.key} x1={x(j)} y1={y(a.value)} x2={x(j + 1)} y2={y(d.value)} stroke="var(--d-accent)" strokeWidth={2} strokeLinecap="round" strokeDasharray={dashed ? "3 4" : undefined} />
                )
              })}
              {n > 0 && (
                <circle cx={x(n - 1)} cy={y(data[n - 1].value)} r={4} fill="var(--d-accent)" stroke="var(--d-card)" strokeWidth={2} />
              )}
            </>
          )}

          {hover !== null && (
            <>
              <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={PAD.top + h} stroke="var(--d-axis)" strokeWidth={1} />
              {style !== 'column' && (
                <circle cx={x(hover)} cy={y(data[hover].value)} r={4} fill="var(--d-accent)" stroke="var(--d-card)" strokeWidth={2} />
              )}
            </>
          )}
        </svg>
      )}

      {hover !== null && data[hover] && (
        <Tip x={x(hover)} y={y(data[hover].value)} width={width}>
          <div style={{ color: 'var(--d-muted)', marginBottom: 2 }}>{bucketLabel(data[hover].key, grain, true)}</div>
          <TipRow color="var(--d-accent)" line={style !== 'column'} value={formatFull(data[hover].value, format)} label={label} />
          {data[hover].partial && <div style={{ color: "var(--d-muted)", marginTop: 2 }}>Período incompleto: o filtro corta parte deste intervalo</div>}
          <div style={{ color: 'var(--d-muted)', marginTop: 4 }}>
            {data[hover].key === selected ? 'Clique para voltar ao período anterior' : 'Clique para filtrar este período'}
          </div>
        </Tip>
      )}
    </div>
  )
}
