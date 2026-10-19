import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { COLOR } from '@/design/tokens'
import { Btn } from '@ds/Btn'
import { Modal, ModalFooter } from '@ds/Modal'

/**
 * Modal de confirmação: título, uma frase e duas ações.
 *
 * A moldura é o `Modal` do design system (véu, caixa sem fio, cabeçalho de
 * 64); aqui fica o corpo 16/1.5 e o rodapé com o fantasma "Cancelar" e o
 * primário.
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
  const bodyId = useId()
  const onCancelRef = useRef(onCancel)
  onCancelRef.current = onCancel

  useEffect(() => {
    /* Na captura da janela, antes do ouvinte do menu (e do próprio Modal): o
       Esc fecha só o modal. */
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onCancelRef.current()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [])

  return createPortal(
    // O menu atrás fecha com mousedown fora dele; o modal não conta como fora.
    <div onMouseDown={(e) => e.stopPropagation()}>
      <Modal title={title} onClose={onCancel} role="alertdialog" describedBy={bodyId} focusBox>
        <p
          id={bodyId}
          style={{ paddingInline: 24, paddingBottom: 24, fontSize: 16, lineHeight: 1.5, color: COLOR.textSecondary }}
        >
          {children}
        </p>
        <ModalFooter>
          <Btn variant="ghost" onClick={onCancel}>
            Cancelar
          </Btn>
          <Btn variant="primary" onClick={onConfirm}>
            {confirmLabel}
          </Btn>
        </ModalFooter>
      </Modal>
    </div>,
    document.body,
  )
}
