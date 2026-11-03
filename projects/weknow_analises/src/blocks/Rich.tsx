import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import type { Fact, Rich } from '@/engine/explain'

/**
 * Texto com números rastreáveis.
 *
 * Todo número que a análise cita é um botão: clicando, aparece a conta, o
 * recorte, o período e o metadado de onde ele saiu. É a regra que dá
 * credibilidade ao texto da IA num hospital, e ela está na forma do dado
 * (`Rich` só cita fato por id), não numa recomendação de estilo.
 */

export const FactsContext = createContext<Record<string, Fact>>({})

export function RichText({ text }: { text: Rich }) {
  const facts = useContext(FactsContext)
  return (
    <>
      {text.map((part, i) =>
        typeof part === 'string' ? (
          // "±0,09 p.p." seguido do ponto final da frase daria "p.p..".
          <span key={i}>{endsWithDot(text[i - 1], facts) && part.startsWith('.') ? part.slice(1) : part}</span>
        ) : facts[part.fact] ? (
          <FactButton key={i} fact={facts[part.fact]} />
        ) : (
          // Fato que não existe não vira número inventado: aparece a lacuna.
          <span key={i} style={{ color: COLOR.danger }}>[fato ausente]</span>
        ),
      )}
    </>
  )
}

const endsWithDot = (prev: Rich[number] | undefined, facts: Record<string, Fact>) =>
  !!prev && typeof prev !== 'string' && !!facts[prev.fact]?.text.endsWith('.')

function FactButton({ fact }: { fact: Fact }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button
        ref={ref}
        type="button"
        className="an-fact"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`${fact.text}: ver de onde vem este número`}
        onClick={() => setOpen((v) => !v)}
      >
        {fact.text}
      </button>
      {open && <FactPopover fact={fact} anchor={ref.current} onClose={() => setOpen(false)} />}
    </>
  )
}

/**
 * A ficha do número. Vai para o `body` por portal: o texto mora dentro de
 * colunas que rolam, e o painel não pode ser recortado por elas. Abre abaixo
 * do número e vira para cima quando não cabe.
 */
function FactPopover({ fact, anchor, onClose }: { fact: Fact; anchor: HTMLElement | null; onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const W = 320

  useLayoutEffect(() => {
    if (!anchor || !panel.current) return
    const r = anchor.getBoundingClientRect()
    const h = panel.current.offsetHeight
    const left = Math.min(Math.max(8, r.left), window.innerWidth - W - 8)
    const below = r.bottom + 6
    const top = below + h > window.innerHeight - 8 ? r.top - 6 - h : below
    setPos({ left, top })
  }, [anchor])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!panel.current?.contains(e.target as Node) && !anchor?.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    // A coluna rola por baixo do painel solto: fechar é melhor que deixá-lo
    // flutuando longe do número.
    const onScroll = () => onClose()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [anchor, onClose])

  const rows: [string, string][] = [
    ['Conta', fact.formula],
    ['Recorte', fact.scope.length ? fact.scope.join(' · ') : 'hospital inteiro'],
    ['Período', fact.period],
    ['Metadado', fact.metadado],
  ]

  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={`De onde vem ${fact.text}`}
      className="fixed z-50"
      style={{
        left: pos?.left ?? -9999,
        top: pos?.top ?? 0,
        width: W,
        background: 'var(--wk-surface)',
        border: `1px solid ${COLOR.border}`,
        borderRadius: 8,
        boxShadow: 'var(--wk-shadow-menu)',
        padding: 16,
        fontFamily: FONT,
      }}
    >
      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
        <Icon name="function" size={20} color={COLOR.navLabel} />
        <span style={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary }}>De onde vem este número</span>
      </div>
      <div style={{ fontSize: 20, lineHeight: 1.35, fontWeight: 600, color: COLOR.text }}>{fact.text}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: COLOR.textSecondary, marginBottom: 12 }}>{fact.label}</div>
      <dl className="flex flex-col" style={{ gap: 8, margin: 0 }}>
        {rows.map(([k, v]) => (
          <div key={k} className="grid" style={{ gridTemplateColumns: '72px 1fr', gap: 8 }}>
            <dt style={{ fontSize: 12, lineHeight: '18px', color: COLOR.textSecondary }}>{k}</dt>
            <dd style={{ margin: 0, fontSize: 13, lineHeight: '18px', color: COLOR.text }}>{v}</dd>
          </div>
        ))}
      </dl>
    </div>,
    document.body,
  )
}
