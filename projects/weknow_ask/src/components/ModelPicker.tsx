import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { AI_PROVIDERS } from '@/data/conversation'

/**
 * Seletor do modelo de IA, na barra de ações do prompt.
 *
 * Fica discreto de propósito: é informação de estado — "quem vai responder" —
 * que precisa estar sempre visível, não uma ação que disputa atenção com o
 * enviar. Por isso texto sem caixa, na cor secundária, e realce só no hover.
 *
 * O menu abre para cima porque o prompt mora no rodapé; para baixo ele sairia
 * da tela. O painel é o mesmo dos outros menus do projeto.
 */

export function ModelPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = AI_PROVIDERS.find((p) => p.id === value) ?? AI_PROVIDERS[0]

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Modelo de IA desta conversa"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="wk-icon-btn flex items-center"
        style={{ height: 24, paddingInline: 6, gap: 4, fontFamily: FONT, fontSize: 14 }}
      >
        <span style={{ color: COLOR.textSecondary }}>{current.label}</span>
        <Icon
          name="keyboard_arrow_down"
          size={18}
          color={COLOR.navLabel}
          className={`shrink-0${open ? ' wk-flip' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 bottom-full z-20 mb-1 bg-[var(--wk-surface)]"
          style={{
            minWidth: 200,
            border: `1px solid ${COLOR.border}`,
            borderRadius: 6,
            boxShadow: 'var(--wk-shadow-menu)',
            padding: 4,
          }}
          role="listbox"
        >
          {AI_PROVIDERS.map((p) => {
            const on = p.id === current.id
            return (
              <button
                key={p.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(p.id)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 text-left px-3 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
                style={{
                  height: 36,
                  fontFamily: FONT,
                  fontSize: 14,
                  color: on ? COLOR.primary : COLOR.text,
                }}
              >
                <span className="flex-1 min-w-0 truncate">{p.label}</span>
                {on && <Icon name="check" size={18} color={COLOR.primary} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
