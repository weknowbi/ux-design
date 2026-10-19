import { useEffect, useId, useRef, type ReactNode } from 'react'
import { COLOR, FONT } from './tokens'
import { Icon } from './icons'

/**
 * Moldura de modal do design system Weknow.
 *
 * Esta é a ÚNICA cópia: todo modal do ASK, do portal e da biblioteca monta a
 * caixa por aqui e só escreve o que vai dentro. Antes cada modal desenhava a
 * sua, e elas tinham se separado em dois modelos: o da escolha em lista
 * (filtros), sem fio e com sombra longa, e o de um campo só (criar pasta,
 * senha), com fio de 1px e a sombra curta do menu. No escuro o segundo saía
 * como uma caixa contornada, do mesmo tom da página atrás do véu. Ficou o
 * primeiro:
 *
 *   véu        --wk-backdrop (preto 80% no escuro); clique nele fecha
 *   caixa      --wk-surface, raio 8, SEM borda, sombra longa; nunca passa de
 *              90% da altura da janela
 *   cabeçalho  64 de altura, px-24 py-16, título Inter Medium 20/1.5 em
 *              --wk-text, fechar de 24 em --wk-nav-label na ponta
 *
 * Por que sem fio: num modal quem separa a caixa do fundo é o véu e a
 * elevação. O fio é recurso de painel que mora DENTRO da página (menu,
 * cartão), onde não há véu nenhum.
 *
 * O `Escape` fecha. O corpo e o rodapé são de quem usa; o rodapé padrão é o
 * `ModalFooter`, logo abaixo.
 */

/** Sombra da caixa: longa e difusa, para a caixa flutuar sobre o véu. */
const MODAL_SHADOW = '0 25px 50px -12px rgba(0, 0, 0, 0.25)'

export function Modal({
  title,
  width = 420,
  height,
  onClose,
  role = 'dialog',
  describedBy,
  focusBox = false,
  children,
}: {
  title: ReactNode
  /** 420 para um campo só, 610 para escolha em lista (ver a página Modal). */
  width?: number
  /** Altura fixa, para corpo que rola por dentro (a árvore dos filtros). */
  height?: number
  onClose: () => void
  /** `alertdialog` quando o modal é uma pergunta de confirmação. */
  role?: 'dialog' | 'alertdialog'
  /** id do texto que descreve o modal, para o leitor de tela. */
  describedBy?: string
  /** Foco na própria caixa ao abrir, quando não há campo para recebê-lo. */
  focusBox?: boolean
  children: ReactNode
}) {
  const titleId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  // Em ref: o callback muda a cada render e o ouvinte é montado uma vez só.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (focusBox) boxRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusBox])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--wk-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={boxRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={describedBy}
        tabIndex={focusBox ? -1 : undefined}
        className="flex flex-col overflow-hidden outline-none"
        style={{
          width,
          maxWidth: '100%',
          height,
          maxHeight: '90vh',
          borderRadius: 8,
          background: 'var(--wk-surface)',
          boxShadow: MODAL_SHADOW,
          fontFamily: FONT,
        }}
      >
        <div
          className="shrink-0 flex items-center gap-2"
          style={{ height: 64, paddingInline: 24, paddingBlock: 16 }}
        >
          <h2
            id={titleId}
            className="flex-1 min-w-0 truncate"
            style={{ fontWeight: 500, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="close" size={24} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/**
 * Rodapé do modal: ações à direita com 8 de intervalo, px-24 pb-16. O
 * fantasma "Cancelar" vem antes do primário. `padTop` é para o corpo que não
 * traz respiro próprio embaixo (a árvore dos filtros termina rente).
 */
export function ModalFooter({ children, padTop = 0 }: { children: ReactNode; padTop?: number }) {
  return (
    <div
      className="shrink-0 flex items-center justify-end gap-2"
      style={{ paddingInline: 24, paddingTop: padTop, paddingBottom: 16 }}
    >
      {children}
    </div>
  )
}
