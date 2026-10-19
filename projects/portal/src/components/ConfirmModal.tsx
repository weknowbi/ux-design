import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { COLOR, FONT } from '@/design/tokens'
import { Btn } from '@ds/Btn'
import { Icon } from '@/components/icons'

/**
 * Modal de confirmação: título, uma frase e duas ações.
 *
 * A moldura é a do design system (ver docs/modal): véu `--wk-backdrop`, caixa
 * de 420 com raio 8, cabeçalho de 64 com o título em Inter Medium 20/1.5,
 * corpo 16/1.5, rodapé com o fantasma "Cancelar" e o primário. É a mesma do
 * `PromptModal` do ASK, sem o campo.
 *
 * Ele pode abrir por cima de um menu suspenso que ainda tem rascunho dentro
 * (o painel de editar a pasta). O menu fecha com clique fora e Esc, e fechar
 * o menu desfaz o rascunho, então o modal segura os dois eventos: clicar
 * nele ou apertar Esc responde ao modal, e o menu atrás continua como estava.
 */
export function ConfirmModal({
  title,
  children,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string
  children: ReactNode
  /** Repete o verbo do título (regra 3 do modal): nunca "OK". */
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const boxRef = useRef<HTMLDivElement>(null)
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    boxRef.current?.focus()
    /* Na captura da janela, antes do ouvinte do menu: o Esc fecha só o modal. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onCancelRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--wk-backdrop)' }}
      // O menu atrás fecha com mousedown fora dele; o modal não conta como fora.
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div
        ref={boxRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="wk-confirm-title"
        aria-describedby="wk-confirm-body"
        className="bg-[var(--wk-surface)] flex flex-col overflow-hidden outline-none"
        style={{
          width: 420,
          maxWidth: '100%',
          borderRadius: 8,
          border: `1px solid ${COLOR.border}`,
          boxShadow: 'var(--wk-shadow-menu)',
          fontFamily: FONT,
        }}
      >
        <div
          className="shrink-0 flex items-center gap-2"
          style={{ height: 64, paddingInline: 24, paddingBlock: 16 }}
        >
          <h2
            id="wk-confirm-title"
            className="flex-1 min-w-0 truncate"
            style={{ fontWeight: 500, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            title="Fechar"
            aria-label="Fechar"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        <div
          id="wk-confirm-body"
          style={{ paddingInline: 24, paddingBottom: 24, fontSize: 16, lineHeight: 1.5, color: COLOR.textSecondary }}
        >
          {children}
        </div>

        <div
          className="shrink-0 flex items-center justify-end gap-2"
          style={{ paddingInline: 24, paddingBottom: 16 }}
        >
          <Btn variant="ghost" onClick={onCancel}>
            Cancelar
          </Btn>
          <Btn variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </div>
      </div>
    </div>,
    document.body,
  )
}
