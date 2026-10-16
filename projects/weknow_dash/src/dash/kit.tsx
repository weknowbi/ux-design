import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

/** Largura viva de um elemento — os gráficos desenham na largura real. */
export function useWidth<T extends HTMLElement>() {
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

/** Marcas redondas do eixo: 0, 250 mil, 500 mil… e não 0, 237.512, 475.024. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const ticks: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) ticks.push(v)
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

/**
 * Dica flutuante. O valor vem primeiro e forte — quem passa o mouse já sabe
 * a série e quer o número. A série vem com um traço da cor, não uma caixa.
 * Fica dentro do gráfico (vira de lado perto da borda) e não captura o mouse.
 */
export function Tip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const flip = x > width - 180
  return (
    <div
      className="absolute z-10 pointer-events-none"
      style={{
        left: flip ? undefined : x + 12,
        right: flip ? width - x + 12 : undefined,
        top: Math.max(0, y - 12),
        background: 'var(--d-tip-bg)',
        color: 'var(--d-text)',
        border: '1px solid var(--d-card-border)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(15,23,42,.14)',
        padding: '8px 10px',
        fontSize: 12,
        lineHeight: 1.45,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </div>
  )
}

export function TipRow({ color, value, label, line }: { color?: string; value: string; label: string; line?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {color && (
        <span
          aria-hidden
          style={{ width: line ? 12 : 8, height: line ? 2 : 8, borderRadius: line ? 1 : 2, background: color, flexShrink: 0 }}
        />
      )}
      <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <span style={{ color: 'var(--d-text-2)' }}>{label}</span>
    </div>
  )
}

/** Rótulo cortado com reticências pela largura, não pela contagem de letras. */
export function clip(text: string, maxPx: number, fontPx = 12): string {
  const approx = Math.floor(maxPx / (fontPx * 0.56))
  return text.length > approx ? text.slice(0, Math.max(1, approx - 1)) + '…' : text
}
