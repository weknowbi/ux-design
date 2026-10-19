import { useEffect, useRef, useState } from 'react'
import { Btn } from '@ds/Btn'
import { FormField, fieldBoxStyle, fieldTextStyle } from '@ds/Field'
import { Modal, ModalFooter } from '@ds/Modal'

/**
 * Modal de um campo só: título, rótulo, entrada de texto e confirmar.
 *
 * A moldura é o `Modal` do design system (véu, caixa sem fio, cabeçalho de
 * 64, Esc); aqui fica só o campo, que é o `form-item` do design system.
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
  }, [])

  const limpo = value.trim()

  const confirmar = () => {
    if (!limpo) return
    onConfirm(limpo)
    onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
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

      <ModalFooter>
        <Btn variant="ghost" onClick={onClose}>
          Cancelar
        </Btn>
        <Btn variant="primary" disabled={!limpo} onClick={confirmar}>
          {confirmLabel}
        </Btn>
      </ModalFooter>
    </Modal>
  )
}
