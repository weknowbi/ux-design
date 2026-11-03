import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * O menu que abre onde a pessoa clicou num gráfico: "Filtrar por Clínica
 * médica", "Por que mudou?". Mesmo painel do menu suspenso do design system
 * (raio 8, borda, sombra de menu, item de 36), só que ancorado no ponto do
 * clique em vez de num botão, porque o gatilho é a barra.
 *
 * Fecha ao escolher, por Escape, por clique fora e quando a coluna rola.
 */

export type PointAction = { icon: string; label: string; onSelect: () => void }

export function PointMenu({
  at,
  title,
  actions,
  onClose,
}: {
  at: { x: number; y: number }
  title: string
  actions: PointAction[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ left: at.x, top: at.y })

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    setPos({
      left: Math.min(at.x + 4, window.innerWidth - w - 8),
      top: at.y + 4 + h > window.innerHeight - 8 ? at.y - h - 4 : at.y + 4,
    })
  }, [at])

  useEffect(() => {
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    const scroll = () => onClose()
    // No próximo quadro: o próprio clique que abriu o menu não pode fechá-lo.
    const t = setTimeout(() => document.addEventListener('mousedown', down))
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', scroll, true)
    return () => {
      clearTimeout(t)
      document.removeEventListener('mousedown', down)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [onClose])

  useEffect(() => {
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus()
  }, [])

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={title}
      className="fixed z-50 wk-enter"
      style={{
        left: pos.left,
        top: pos.top,
        minWidth: 220,
        background: 'var(--wk-surface)',
        border: `1px solid ${COLOR.border}`,
        borderRadius: 8,
        boxShadow: 'var(--wk-shadow-menu)',
        padding: 4,
        fontFamily: FONT,
      }}
    >
      <div style={{ padding: '6px 8px 4px', fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary }}>{title}</div>
      {actions.map((a) => (
        <button
          key={a.label}
          role="menuitem"
          type="button"
          onClick={() => {
            onClose()
            a.onSelect()
          }}
          className="w-full flex items-center text-left whitespace-nowrap transition-colors duration-150 hover:bg-[var(--wk-menu-hover)] focus-visible:bg-[var(--wk-menu-hover)] outline-none"
          style={{ height: 36, gap: 8, paddingLeft: 8, paddingRight: 16, borderRadius: 8, fontSize: 14, color: COLOR.text }}
        >
          <Icon name={a.icon} size={20} color={COLOR.navLabel} />
          {a.label}
        </button>
      ))}
    </div>,
    document.body,
  )
}
