import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Btn } from '@/components/Btn'

/**
 * Seletor de cor do editor de fórmula.
 *
 * É um painel flutuante, então segue a espec. de painel: borda de 1px,
 * `--wk-shadow-menu` e raio 8. O quadro de matiz e as duas réguas são a única
 * coisa aqui que não vem de token — cor bruta é o próprio conteúdo do
 * controle, não decoração da interface.
 */

// ── Conversões ────────────────────────────────────────────────────────────
function hsv2rgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)]
}

function rgb2hsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h = Math.round(h * 60)
    if (h < 0) h += 360
  }
  return [h, max === 0 ? 0 : d / max, max]
}

function toHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i)
  if (!m) return null
  const n = parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

interface Props {
  initial?: string
  onConfirm: (hex: string) => void
  onCancel: () => void
}

export default function ColorPicker({ initial = '#3366CC', onConfirm, onCancel }: Props) {
  const initRgb = parseHex(initial) ?? [51, 102, 204]
  const [hsv, setHsv] = useState<[number, number, number]>(() => rgb2hsv(...initRgb))
  const [hexInput, setHexInput] = useState(initial.toUpperCase())
  const [editingHex, setEditingHex] = useState(false)

  const [h, s, v] = hsv
  const [r, g, b] = hsv2rgb(h, s, v)
  const hex = toHex(r, g, b)
  const hueRgb = hsv2rgb(h, 1, 1)

  useEffect(() => { if (!editingHex) setHexInput(hex) }, [hex, editingHex])

  // ── Quadro de saturação e brilho ────────────────────────────────────────
  const sbRef = useRef<HTMLDivElement>(null)
  const draggingSb = useRef(false)

  const handleSbMove = useCallback((clientX: number, clientY: number) => {
    const el = sbRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    const ny = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height))
    setHsv(([hh]) => [hh, nx, 1 - ny])
  }, [])

  // ── Régua de matiz ──────────────────────────────────────────────────────
  const hueRef = useRef<HTMLDivElement>(null)
  const draggingH = useRef(false)

  const handleHueMove = useCallback((clientX: number) => {
    const el = hueRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setHsv(([, ss, vv]) => [Math.round(nx * 360), ss, vv])
  }, [])

  // ── Régua de brilho ─────────────────────────────────────────────────────
  const valRef = useRef<HTMLDivElement>(null)
  const draggingV = useRef(false)

  const handleValMove = useCallback((clientX: number) => {
    const el = valRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const nx = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setHsv(([hh, ss]) => [hh, ss, nx])
  }, [])

  /* Um ouvinte só para os três arrastes: o ponteiro sai da caixa e o arraste
     tem de continuar valendo. */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (draggingSb.current) handleSbMove(e.clientX, e.clientY)
      if (draggingH.current) handleHueMove(e.clientX)
      if (draggingV.current) handleValMove(e.clientX)
    }
    const onUp = () => {
      draggingSb.current = false
      draggingH.current = false
      draggingV.current = false
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [handleSbMove, handleHueMove, handleValMove])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const commitHex = () => {
    setEditingHex(false)
    const rgb = parseHex(hexInput)
    if (rgb) setHsv(rgb2hsv(...rgb))
    else setHexInput(hex)
  }

  const knob: React.CSSProperties = {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 9999,
    border: '2px solid #fff',
    boxShadow: '0 0 0 1px rgba(0,0,0,.25)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  }

  return (
    <div
      className="overflow-hidden"
      style={{
        width: 248,
        background: 'var(--wk-surface)',
        border: `1px solid ${COLOR.border}`,
        borderRadius: RADIUS.md,
        boxShadow: 'var(--wk-shadow-menu)',
        fontFamily: FONT,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      role="dialog"
      aria-label="Escolher cor"
    >
      <div
        ref={sbRef}
        className="relative cursor-crosshair select-none"
        style={{
          height: 152,
          background: `linear-gradient(to bottom, transparent, #000),
                       linear-gradient(to right, #fff, rgb(${hueRgb[0]},${hueRgb[1]},${hueRgb[2]}))`,
        }}
        onMouseDown={(e) => { draggingSb.current = true; handleSbMove(e.clientX, e.clientY) }}
      >
        <div style={{ ...knob, left: `${s * 100}%`, top: `${(1 - v) * 100}%`, background: hex }} />
      </div>

      <div className="flex items-center gap-3" style={{ padding: 12 }}>
        <div
          className="shrink-0 rounded-full"
          style={{ width: 32, height: 32, background: hex, border: `1px solid ${COLOR.border}` }}
        />
        <div className="flex-1 flex flex-col gap-2">
          <div
            ref={hueRef}
            className="relative cursor-pointer select-none rounded-full"
            style={{ height: 10, background: 'linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)' }}
            onMouseDown={(e) => { draggingH.current = true; handleHueMove(e.clientX) }}
          >
            <div style={{ ...knob, left: `${(h / 360) * 100}%`, top: '50%', background: `hsl(${h},100%,50%)` }} />
          </div>
          <div
            ref={valRef}
            className="relative cursor-pointer select-none rounded-full"
            style={{ height: 10, background: `linear-gradient(to right, #000, hsl(${h},${s * 100}%,50%))` }}
            onMouseDown={(e) => { draggingV.current = true; handleValMove(e.clientX) }}
          >
            <div style={{ ...knob, left: `${v * 100}%`, top: '50%', background: hex }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ paddingInline: 12, paddingBottom: 12 }}>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => { setHexInput(e.target.value.toUpperCase()); setEditingHex(true) }}
          onBlur={commitHex}
          onKeyDown={(e) => e.key === 'Enter' && commitHex()}
          maxLength={7}
          aria-label="Valor hexadecimal da cor"
          className="flex-1 min-w-0 bg-transparent outline-none focus:border-[var(--wk-primary)] transition-colors"
          style={{
            height: 32,
            border: '1px solid var(--wk-field-border)',
            borderRadius: RADIUS.sm,
            paddingInline: 8,
            fontFamily: 'var(--wk-mono)',
            fontSize: 13,
            color: COLOR.text,
          }}
        />
        <Btn size="sm" variant="ghost" onClick={onCancel}>Cancelar</Btn>
        <Btn size="sm" variant="primary" onClick={() => onConfirm(hex)}>Inserir</Btn>
      </div>
    </div>
  )
}
