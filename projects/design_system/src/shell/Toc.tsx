import { useEffect, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import type { Heading } from '@docs/blocks/Prose'

/**
 * Sumário da página, à direita.
 *
 * A seção corrente é decidida por `IntersectionObserver` com a margem inferior
 * em -70%: o título só assume quando entra no terço de cima da tela, que é
 * onde o olho está lendo. Sem essa margem, o item salta para o próximo assim
 * que ele aparece na borda de baixo, e o destaque fica sempre uma seção à
 * frente da leitura.
 */
export const TOC_WIDTH = 176

export function Toc({ headings }: { headings: Heading[] }) {
  const [active, setActive] = useState<string>()

  useEffect(() => {
    setActive(undefined)
    if (headings.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { rootMargin: '-80px 0px -70% 0px' },
    )

    for (const h of headings) {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [headings])

  /*
    A coluna é reservada pela folha, não por aqui: mantê-la reservada deixa o
    artigo na mesma posição em todas as páginas, e o `sticky` deste <nav>
    corre dentro dela. Uma caixa a mais no meio zeraria esse percurso.
  */
  if (headings.length < 2) return null

  return (
    <nav
      className="sticky"
      style={{ top: 32, paddingTop: 8 }}
      aria-label="Nesta página"
    >
      <p
        className="text-[12px] font-semibold uppercase"
        style={{ fontFamily: FONT, color: COLOR.navLabel, marginBottom: 12 }}
      >
        Nesta página
      </p>
      <ul className="flex flex-col gap-1">
        {headings.map((h) => {
          const on = active === h.id
          return (
            <li key={h.id}>
              <a
                href={`#${h.id}`}
                onClick={(e) => {
                  e.preventDefault()
                  document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
                className="block text-[13px] leading-snug transition-colors"
                style={{
                  fontFamily: FONT,
                  color: on ? COLOR.primary : COLOR.textSecondary,
                  paddingLeft: h.level === 3 ? 12 : 0,
                  paddingBlock: 3,
                  borderLeft: `2px solid ${on ? COLOR.primary : 'transparent'}`,
                  marginLeft: -10,
                  textIndent: 8,
                }}
              >
                {h.text}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
