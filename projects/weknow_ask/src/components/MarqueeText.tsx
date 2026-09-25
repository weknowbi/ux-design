import { useEffect, useRef, useState } from 'react'

/**
 * Texto de uma linha que, ao ficar sob o cursor por um instante, rola devagar
 * até o fim — como o histórico do ChatGPT. Só age quando o texto de fato
 * transborda; caso contrário, fica parado.
 *
 * O esmaecimento acompanha a rolagem: à direita enquanto há texto por vir, e
 * também à esquerda depois que ele começa a andar.
 */

const DELAY_MS = 1200
const SPEED_PX_PER_S = 34
const RESET_MS = 220

export function MarqueeText({
  text,
  active,
  className,
  style,
}: {
  text: string
  /** A linha está sob o cursor. */
  active: boolean
  className?: string
  style?: React.CSSProperties
}) {
  const boxRef = useRef<HTMLSpanElement>(null)
  const innerRef = useRef<HTMLSpanElement>(null)
  const timer = useRef<number | undefined>(undefined)
  const [offset, setOffset] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    window.clearTimeout(timer.current)

    if (!active) {
      setDuration(RESET_MS / 1000)
      setOffset(0)
      return
    }

    timer.current = window.setTimeout(() => {
      const box = boxRef.current
      const inner = innerRef.current
      if (!box || !inner) return
      const overflow = inner.scrollWidth - box.clientWidth
      if (overflow <= 1) return
      setDuration(overflow / SPEED_PX_PER_S)
      setOffset(overflow)
    }, DELAY_MS)

    return () => window.clearTimeout(timer.current)
  }, [active, text])

  const running = offset > 0

  return (
    <span
      ref={boxRef}
      className={className}
      style={{
        ...style,
        display: 'block',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        // Enquanto anda, esmaece dos dois lados; parado, só à direita.
        WebkitMaskImage: running
          ? 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)'
          : 'linear-gradient(to right, #000 calc(100% - 16px), transparent 100%)',
        maskImage: running
          ? 'linear-gradient(to right, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%)'
          : 'linear-gradient(to right, #000 calc(100% - 16px), transparent 100%)',
      }}
    >
      <span
        ref={innerRef}
        style={{
          display: 'inline-block',
          transform: `translateX(-${offset}px)`,
          transition: `transform ${duration}s linear`,
          willChange: 'transform',
        }}
      >
        {text}
      </span>
    </span>
  )
}
