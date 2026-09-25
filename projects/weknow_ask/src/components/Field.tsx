import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * Campo de formulário do design system — espec. do nó `form-item` (4454:8719):
 *
 *   bloco    flex coluna, 16 de respiro abaixo
 *   rótulo   Inter Regular 16/1.5 em #363E49, 8 de respiro abaixo
 *   caixa    altura 38, borda 1px #ced4da, raio 6, px-12 py-6
 *   valor    Inter Regular 16/1.5 em #363E49
 *   ícone    24px à direita, com 8 de intervalo
 *
 * A caixa é o `form-control`/`form-select` do Bootstrap 5: 6 + 24 (16 × 1.5)
 * + 6 + 2 de borda = 38 exatos. As medidas de 13/7 que o Figma reporta
 * incluem a borda — descontá-la é o que fecha a conta na altura certa.
 *
 * Repare que o raio aqui é 6 — os campos de busca dos modais usam 8, por
 * especificação própria. Não são o mesmo componente.
 */

export const FIELD = {
  height: 38,
  radius: 6,
  padX: 12,
  padY: 6,
  border: 'var(--wk-field-border)',
  gap: 8,
  fontSize: 16,
} as const

export function fieldBoxStyle(state?: { invalid?: boolean; focused?: boolean }): React.CSSProperties {
  const color = state?.invalid ? COLOR.danger : state?.focused ? COLOR.primary : FIELD.border
  return {
    height: FIELD.height,
    border: `1px solid ${color}`,
    borderRadius: FIELD.radius,
    paddingInline: FIELD.padX,
    paddingBlock: FIELD.padY,
    background: 'var(--wk-surface)',
    transition: 'border-color .12s ease',
  }
}

export const fieldTextStyle: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: FIELD.fontSize,
  lineHeight: 1.5,
  color: 'var(--wk-text)',
}

/** Rótulo + campo + auxílio, com o respiro que a espec. define. */
export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col" style={{ paddingBottom: 16 }}>
      <span style={{ ...fieldTextStyle, paddingBottom: 8 }}>{label}</span>
      {children}
      {hint && !error && (
        <span className="mt-2 text-[13px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
          {hint}
        </span>
      )}
      {error && (
        <span className="mt-2 text-[13px]" style={{ fontFamily: FONT, color: COLOR.danger }}>
          {error}
        </span>
      )}
    </div>
  )
}

/** Seletor do design system: caixa do `form-item` com chevron de 24px. */
export function Select<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: T
  onChange: (v: T) => void
  options: { id: T; label: string }[]
  ariaLabel?: string
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

  const current = options.find((o) => o.id === value)

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center text-left"
        style={{ ...fieldBoxStyle({ focused: open }), gap: FIELD.gap }}
      >
        <span className="flex-1 min-w-0 truncate" style={fieldTextStyle}>
          {current?.label}
        </span>
        {/* Sem invólucro: um <span> em volta cria contexto de linha e derruba
            o glifo ~1px abaixo do centro da caixa. */}
        <Icon
          name="keyboard_arrow_down"
          size={24}
          color={COLOR.navLabel}
          className={`shrink-0${open ? ' wk-flip' : ''}`}
        />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-20 mt-1 bg-[var(--wk-surface)] overflow-y-auto"
          style={{
            maxHeight: 240,
            border: `1px solid ${COLOR.border}`,
            borderRadius: FIELD.radius,
            boxShadow: 'var(--wk-shadow-menu)',
            padding: 4,
          }}
          role="listbox"
        >
          {options.map((o) => {
            const on = o.id === value
            return (
              <button
                key={o.id}
                type="button"
                role="option"
                aria-selected={on}
                onClick={() => {
                  onChange(o.id)
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
                <span className="flex-1 min-w-0 truncate">{o.label}</span>
                {on && <Icon name="check" size={18} color={COLOR.primary} />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
