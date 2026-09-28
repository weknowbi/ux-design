import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { FONT } from '@/design/tokens'

/** Tempo antes de aparecer: passar o mouse de raspão não deve disparar nada. */
const DELAY = 400
const MAX_WIDTH = 420

/**
 * Dica no acabamento do Weknow, no lugar do `title` do navegador — a caixinha
 * nativa ignora o tema, a tipografia e o raio de tudo em volta.
 *
 * Só arma quando o texto foi de fato cortado: nome que cabe inteiro não tem o
 * que revelar, e dica repetindo o que já está na tela é ruído.
 */
export function useEllipsisTooltip<T extends HTMLElement = HTMLSpanElement>(text: string, always = false) {
  const ref = useRef<T>(null)
  const timer = useRef(0)
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)

  const hide = useCallback(() => {
    window.clearTimeout(timer.current)
    setAt(null)
  }, [])

  useEffect(() => hide, [hide])

  const show = useCallback(() => {
    const el = ref.current
    if (!el) return
    const cut = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight
    if (!cut && !always) return
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const r = el.getBoundingClientRect()
      setAt({ x: r.left, y: r.bottom + 6 })
    }, DELAY)
  }, [always])

  const tooltip: ReactNode = at
    ? createPortal(
        <div
          role="tooltip"
          className="wk-tip pointer-events-none fixed z-50"
          style={{
            left: Math.max(8, Math.min(at.x, window.innerWidth - MAX_WIDTH - 16)),
            top: at.y,
            maxWidth: MAX_WIDTH,
            background: 'var(--wk-toast-bg)',
            color: 'var(--wk-toast-text)',
            fontFamily: FONT,
            fontSize: 12,
            lineHeight: '16px',
            padding: '6px 10px',
            borderRadius: 6,
            boxShadow: 'var(--wk-shadow-menu)',
          }}
        >
          {text}
        </div>,
        document.body,
      )
    : null

  return { ref, show, hide, tooltip }
}
