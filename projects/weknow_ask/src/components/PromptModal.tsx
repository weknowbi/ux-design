import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { FormField, fieldBoxStyle, fieldTextStyle } from '@/components/Field'
import { Icon } from '@/components/icons'

/**
 * Modal de um campo só: título, rótulo, entrada de texto e confirmar.
 *
 * Usa a mesma moldura dos modais de filtro — véu `--wk-backdrop`, superfície
 * de raio 8, cabeçalho de 64 com o título em Inter Medium 20/1.5, rodapé com
 * fantasma + primário — e o `form-item` do design system no campo. É o
 * terceiro modal do projeto, então a moldura virou componente em vez de
 * terceira cópia.
 *
 * O foco vai para o campo ao abrir e o texto já entra selecionado: em um
 * "renomear", o gesto seguinte quase sempre é substituir o nome inteiro.
 *
 * Confirmar com o campo vazio não faz nada — o botão fica desabilitado em vez
 * de aceitar e criar uma pasta sem nome.
 */

export function PromptModal({
  title,
  label,
  placeholder,
  initialValue = '',
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string
  label: string
  placeholder?: string
  initialValue?: string
  confirmLabel: string
  onConfirm: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.select()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const limpo = value.trim()

  const confirmar = () => {
    if (!limpo) return
    onConfirm(limpo)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--wk-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="bg-[var(--wk-surface)] flex flex-col overflow-hidden"
        style={{
          width: 420,
          maxWidth: '100%',
          borderRadius: 8,
          border: `1px solid ${COLOR.border}`,
          boxShadow: 'var(--wk-shadow-menu)',
        }}
      >
        <div
          className="shrink-0 flex items-center gap-2"
          style={{ height: 64, paddingInline: 24, paddingBlock: 16 }}
        >
          <h2
            className="flex-1 min-w-0 truncate"
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        <div style={{ paddingInline: 24 }}>
          <FormField label={label}>
            <input
              ref={inputRef}
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  confirmar()
                }
              }}
              placeholder={placeholder}
              className="w-full bg-transparent outline-none"
              style={{ ...fieldBoxStyle({ focused }), ...fieldTextStyle }}
            />
          </FormField>
        </div>

        <div
          className="shrink-0 flex items-center justify-end gap-2"
          style={{ paddingInline: 24, paddingBottom: 16 }}
        >
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn variant="primary" disabled={!limpo} onClick={confirmar}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>
  )
}
