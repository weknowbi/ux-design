import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Gráfico do quadro "Resultado", desenhado em SVG no formato do Highcharts
 * que o explorador usa: grade #e6e6e6, rótulos pretos de 13,33px, legenda à
 * direita com uma entrada por categoria.
 *
 * A legenda por categoria já existe em produção, só que com todas as
 * entradas no mesmo azul. Quem decide a cor de cada ponto é o App: com
 * "Colorir cada ponto" ligado, cada categoria pega uma cor da escala (o
 * `colorByPoint` do Highcharts); desligado, todas recebem a 1ª cor.
 */

export type ChartType =
  | 'coluna' | 'barra' | 'linha' | 'linhaCurva' | 'area'
  | 'areaCurva' | 'pizza' | 'rosca' | 'dispersao' | 'bolhas'

type Props = {
  type: ChartType
  data: { label: string; value: number }[]
  colors: string[]
}

const fmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const FONT = 13.33

function niceScale(max: number) {
  /* como o Highcharts nesta tela: passo "redondo" e o eixo termina logo
     acima do maior valor, sem pular para a próxima marca */
  const rough = max / 4.5
  const mag = Math.pow(10, Math.floor(Math.log10(rough)))
  const step = [1, 2, 2.5, 3, 5, 10].map((m) => m * mag).find((v) => v >= rough) ?? rough
  const top = max * 1.04
  const ticks: number[] = []
  for (let v = 0; v <= top; v += step) ticks.push(v)
  return { top, ticks }
}

function smoothPath(pts: [number, number][]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0][0]},${pts[0][1]}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const t = 0.18
    const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t]
    const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t]
    d += ` C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${p2[0]},${p2[1]}`
  }
  return d
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    /* a Inter e os ícones chegam depois do primeiro desenho */
    document.fonts?.ready.then(measure)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

export function Chart({ type, data, colors }: Props) {
  const [ref, { w, h }] = useSize<HTMLDivElement>()
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div ref={ref} className="chart">
      {w > 0 && h > 0 && (
        <svg width={w} height={h} role="img" aria-label="Gráfico de Vendas por UF empresa">
          <Plot type={type} data={data} colors={colors} w={w} h={h} hover={hover} setHover={setHover} />
        </svg>
      )}
    </div>
  )
}

function Legend({ data, colors, x, y, hover, setHover }: { data: Props['data']; colors: string[]; x: number; y: number; hover: number | null; setHover: (i: number | null) => void }) {
  const rowH = 17
  return (
    <g transform={`translate(${x},${y})`} className="legend">
      <rect x={0} y={0} width={46} height={data.length * rowH + 10} rx={0} fill="#fff" stroke="#999" strokeWidth={1} />
      {data.map((d, i) => (
        <g
          key={d.label}
          transform={`translate(8,${8 + i * rowH})`}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(null)}
          opacity={hover === null || hover === i ? 1 : 0.45}
        >
          <circle cx={5} cy={6} r={5} fill={colors[i]} stroke={colors[i] === '#FFFFFF' ? '#BBB' : 'none'} className="mark" />
          <text x={14} y={10} fontSize={11.5} fill="#333">{d.label}</text>
        </g>
      ))}
    </g>
  )
}

function Plot({ type, data, colors, w, h, hover, setHover }: Props & { w: number; h: number; hover: number | null; setHover: (i: number | null) => void }) {
  const legendW = 46
  const legendX = w - legendW - 10
  const legend = <Legend data={data} colors={colors} x={legendX} y={10} hover={hover} setHover={setHover} />
  const fade = (i: number) => (hover === null || hover === i ? 1 : 0.35)
  const edge = (c: string) => (c === '#FFFFFF' || c === '#F2F2F2' ? '#C9CED6' : 'none')

  if (type === 'pizza' || type === 'rosca') {
    const total = data.reduce((a, d) => a + d.value, 0)
    const cx = (legendX - 10) / 2
    const cy = h / 2
    const r = Math.max(40, Math.min(cx - 40, cy - 40))
    const inner = type === 'rosca' ? r * 0.58 : 0
    let a0 = -Math.PI / 2
    return (
      <g>
        {data.map((d, i) => {
          const a1 = a0 + (d.value / total) * Math.PI * 2
          const large = a1 - a0 > Math.PI ? 1 : 0
          const p = (rr: number, a: number) => `${cx + rr * Math.cos(a)},${cy + rr * Math.sin(a)}`
          const path = inner
            ? `M${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} L${p(inner, a1)} A${inner},${inner} 0 ${large} 0 ${p(inner, a0)} Z`
            : `M${cx},${cy} L${p(r, a0)} A${r},${r} 0 ${large} 1 ${p(r, a1)} Z`
          const mid = (a0 + a1) / 2
          const lx = cx + (r + 16) * Math.cos(mid)
          const ly = cy + (r + 16) * Math.sin(mid)
          a0 = a1
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={fade(i)}>
              <path d={path} fill={colors[i]} stroke="#fff" strokeWidth={1} className="mark">
                <title>{`${d.label}: ${fmt.format(d.value)}`}</title>
              </path>
              <text x={lx} y={ly + 4} fontSize={12} fill="#000" textAnchor={Math.cos(mid) >= 0 ? 'start' : 'end'}>
                {d.label}
              </text>
            </g>
          )
        })}
        {legend}
      </g>
    )
  }

  const max = Math.max(...data.map((d) => d.value))
  const { top, ticks } = niceScale(max)

  if (type === 'barra') {
    const left = 34
    const right = legendX - 64
    const plotTop = 12
    const bottom = h - 30
    const slot = (bottom - plotTop) / data.length
    const bh = Math.max(3, slot * 0.58)
    const x = (v: number) => left + (v / top) * (right - left)
    return (
      <g>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={plotTop} y2={bottom} stroke="#e6e6e6" />
            <text x={x(t)} y={bottom + 18} fontSize={FONT} textAnchor="middle" fill="#000">{fmt.format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const y = plotTop + i * slot + (slot - bh) / 2
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={fade(i)}>
              <text x={left - 8} y={y + bh / 2 + 4} fontSize={FONT} textAnchor="end" fill="#000">{d.label}</text>
              <rect x={left} y={y} width={x(d.value) - left} height={bh} fill={colors[i]} stroke={edge(colors[i])} className="mark">
                <title>{`${d.label}: ${fmt.format(d.value)}`}</title>
              </rect>
              {slot >= 16 && (
                <text x={x(d.value) + 5} y={y + bh / 2 + 4} fontSize={FONT} fill="#000">{fmt.format(d.value)}</text>
              )}
            </g>
          )
        })}
        {legend}
      </g>
    )
  }

  const left = 64
  const right = legendX - 18
  const plotTop = 22
  const bottom = h - 34
  const slot = (right - left) / data.length
  const y = (v: number) => bottom - (v / top) * (bottom - plotTop)
  const cxOf = (i: number) => left + slot * i + slot / 2
  const showLabels = slot >= 46
  const pts = data.map((d, i) => [cxOf(i), y(d.value)] as [number, number])

  const axes = (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={left} x2={right} y1={y(t)} y2={y(t)} stroke="#e6e6e6" />
          <text x={left - 10} y={y(t) + 4} fontSize={FONT} textAnchor="end" fill="#000">{fmt.format(t)}</text>
        </g>
      ))}
      {data.map((d, i) => (
        <text key={d.label} x={cxOf(i)} y={bottom + 20} fontSize={FONT} textAnchor="middle" fill="#000">{d.label}</text>
      ))}
    </g>
  )

  const valueLabel = (i: number, yy: number) =>
    showLabels && (
      <text x={cxOf(i)} y={yy - 7} fontSize={FONT} textAnchor="middle" fill="#000" className="dl">
        {fmt.format(data[i].value)}
      </text>
    )

  if (type === 'coluna') {
    const bw = Math.max(4, slot * 0.5)
    return (
      <g>
        {axes}
        {data.map((d, i) => (
          <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={fade(i)}>
            <rect x={cxOf(i) - bw / 2} y={y(d.value)} width={bw} height={bottom - y(d.value)} fill={colors[i]} stroke={edge(colors[i])} className="mark">
              <title>{`${d.label}: ${fmt.format(d.value)}`}</title>
            </rect>
            {valueLabel(i, y(d.value))}
          </g>
        ))}
        {legend}
      </g>
    )
  }

  if (type === 'dispersao' || type === 'bolhas') {
    const rOf = (v: number) => (type === 'bolhas' ? 6 + Math.sqrt(v / max) * Math.min(26, slot * 0.7) : 6)
    return (
      <g>
        {axes}
        {data.map((d, i) => (
          <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={fade(i)}>
            <circle cx={cxOf(i)} cy={y(d.value)} r={rOf(d.value)} fill={colors[i]} fillOpacity={type === 'bolhas' ? 0.75 : 1} stroke={type === 'bolhas' ? colors[i] : edge(colors[i])} className="mark">
              <title>{`${d.label}: ${fmt.format(d.value)}`}</title>
            </circle>
            {valueLabel(i, y(d.value) - rOf(d.value) + 2)}
          </g>
        ))}
        {legend}
      </g>
    )
  }

  /* linha, linha curva, área, área curva: a linha leva a primeira cor da
     escala e cada ponto leva a cor da sua categoria, como no Highcharts. */
  const curved = type === 'linhaCurva' || type === 'areaCurva'
  const line = curved ? smoothPath(pts) : 'M' + pts.map((p) => p.join(',')).join(' L')
  const isArea = type === 'area' || type === 'areaCurva'
  const area = `${line} L${pts[pts.length - 1][0]},${bottom} L${pts[0][0]},${bottom} Z`
  const main = colors[0]
  return (
    <g>
      {axes}
      {isArea && <path d={area} fill={main} fillOpacity={0.75} className="mark" />}
      <path d={line} fill="none" stroke={main} strokeWidth={2} className="mark-stroke" />
      {data.map((d, i) => (
        <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} opacity={fade(i)}>
          <circle cx={pts[i][0]} cy={pts[i][1]} r={hover === i ? 6 : 4} fill={colors[i]} stroke={edge(colors[i]) === 'none' ? '#fff' : '#C9CED6'} strokeWidth={1} className="mark">
            <title>{`${d.label}: ${fmt.format(d.value)}`}</title>
          </circle>
          {valueLabel(i, pts[i][1])}
        </g>
      ))}
      {legend}
    </g>
  )
}
