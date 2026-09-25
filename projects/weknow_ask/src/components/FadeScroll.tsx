import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Área rolável cujo conteúdo se dissolve ao encostar no topo, no lugar de uma
 * linha divisória. A máscara só entra quando existe conteúdo acima — parado no
 * início, nada é esmaecido.
 */

const FADE = 56

export function FadeScroll({
  children,
  className,
  style,
  scrollRef,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  scrollRef?: React.RefObject<HTMLDivElement | null>
}) {
  const innerRef = useRef<HTMLDivElement>(null)
  const ref = scrollRef ?? innerRef
  const [progress, setProgress] = useState(0)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    // Sobe de 0 a 1 nos primeiros FADE px de rolagem, para a máscara não "pipocar".
    setProgress(Math.min(el.scrollTop / FADE, 1))
  }, [ref])

  useEffect(() => {
    update()
    const el = ref.current
    if (!el) return
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [update, ref, children])

  const fade = FADE * progress
  const mask =
    fade > 0.5
      ? `linear-gradient(to bottom, transparent 0, #000 ${fade}px)`
      : undefined

  return (
    <div
      ref={ref}
      onScroll={update}
      className={className}
      style={{ ...style, maskImage: mask, WebkitMaskImage: mask }}
    >
      {children}
    </div>
  )
}
