import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * A folha à direita da folha do conteúdo (a conversa do dashboard), com a
 * borda da esquerda de arrastar para alargar ou estreitar, como os painéis
 * do Claude. A largura fica guardada; dois cliques na borda voltam ao padrão.
 *
 * Durante o arrasto, uma camada cobre a janela: o painel executivo mora numa
 * moldura (iframe), e sem ela o ponteiro que passasse por cima dele podia
 * ser engolido pela moldura.
 */
const KEY = 'wk-aside-width'
const MIN = 320
/** Até metade da janela, e nunca mais que isto: o dashboard é o resultado e precisa ficar maior. */
const MAX = 720
const STEP = 16

const maxNow = () => Math.max(MIN, Math.min(MAX, Math.round(window.innerWidth / 2)))
const clamp = (w: number) => Math.min(maxNow(), Math.max(MIN, Math.round(w)))

function stored(fallback: number) {
  try {
    const v = Number(localStorage.getItem(KEY))
    return v ? clamp(v) : fallback
  } catch {
    return fallback
  }
}

export function ResizableAside({
  children,
  defaultWidth,
  className,
  style,
  gap = 0,
}: {
  children: ReactNode
  defaultWidth: number
  className?: string
  style?: CSSProperties
  /** O vão até a folha do conteúdo: a alça ocupa ele inteiro, para ser fácil de pegar. */
  gap?: number
}) {
  const [width, setWidthState] = useState(() => stored(defaultWidth))
  /* A última largura, para guardar ao soltar: o estado do render pode estar
     um movimento atrás. */
  const latest = useRef(width)
  const setWidth = (w: number) => {
    latest.current = w
    setWidthState(w)
  }
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, w: 0 })

  const save = (w: number) => {
    try {
      if (w === defaultWidth) localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, String(w))
    } catch {
      /* sem armazenamento: vale enquanto a tela está aberta */
    }
  }

  /* A janela encolheu: a conversa não passa da metade dela. */
  useEffect(() => {
    const onResize = () => setWidth(clamp(latest.current))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* A alça captura o ponteiro: soltar fora da janela ainda termina o
     arrasto, que antes ficava preso. */
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    start.current = { x: e.clientX, w: latest.current }
    setDragging(true)
  }
  const onMove = (e: PointerEvent) => {
    /* A borda é a da esquerda: puxar para a esquerda alarga. */
    if (dragging) setWidth(clamp(start.current.w - (e.clientX - start.current.x)))
  }
  const onUp = () => {
    if (!dragging) return
    setDragging(false)
    save(latest.current)
  }
  const onKey = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowLeft' ? STEP : e.key === 'ArrowRight' ? -STEP : 0
    if (!d) return
    e.preventDefault()
    const w = clamp(latest.current + d)
    setWidth(w)
    save(w)
  }

  /* A alça fica no vão entre as folhas (ou sobre o fio, sem vão). O fio
     de 2 que acende no hover e no arrasto é o sinal de que ali se puxa. */
  const handleWidth = Math.max(gap, 8)
  return (
    <aside className={`relative ${className ?? ''}`} style={{ ...style, width }}>
      {children}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Largura do Criar com IA"
        aria-valuemin={MIN}
        aria-valuemax={maxNow()}
        aria-valuenow={width}
        tabIndex={0}
        title="Arraste para alargar. Dois cliques voltam ao padrão."
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onLostPointerCapture={onUp}
        onDoubleClick={() => {
          setWidth(clamp(defaultWidth))
          save(defaultWidth)
        }}
        onKeyDown={onKey}
        className="group absolute top-0 bottom-0 z-20 flex justify-center outline-none"
        style={{ left: -(gap + handleWidth) / 2, width: handleWidth, cursor: 'col-resize' }}
      >
        <span
          aria-hidden
          className={`h-full transition-opacity ${dragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}
          style={{ width: 2, borderRadius: 1, background: 'var(--wk-primary)' }}
        />
      </div>
      {/* No body: a folha entra com animação (transform), e um `fixed`
          dentro dela ficaria preso à folha em vez da janela. A camada só
          cobre (o cursor e a moldura); quem ouve o ponteiro é a alça. */}
      {dragging && createPortal(<div className="fixed inset-0 z-50" style={{ cursor: 'col-resize' }} />, document.body)}
    </aside>
  )
}
