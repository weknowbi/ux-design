import type { ReactNode } from 'react'
import { FONT, RADIUS } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * Botão — as variações do nó Make "Button variations with animations", cujos
 * tokens já estavam em `index.css` (`--wk-btn-*`) esperando um componente.
 *
 * Até aqui o portal não tinha um: o acervo se navega por card e por linha, e
 * ação ali é ícone. A primeira tela que precisa de um botão de verdade é o
 * cadastro — "Novo usuário" é a razão de a tela existir, e um ícone de mais
 * na ponta da barra não diz isso.
 *
 *   primary   ação principal da tela; uma por tela
 *   outlined  ação secundária que ainda pesa (cancelar um envio, exportar)
 *   ghost     ação de apoio, sem caixa até o hover
 *   danger    exclusão confirmada
 *
 * 36px de altura na mesa é a medida da busca compacta e da pílula da barra de
 * topo: lado a lado eles formam uma linha só. No toque sobe para 40, pelo
 * mesmo motivo que a estrela da lista sobe.
 *
 * O rótulo é Regular (400), como o `Btn` do design system. Em 500 o botão
 * puxava mais peso que qualquer outro texto da tela e lia como de outra
 * família — a diferença entre as variantes é cor e contorno, não espessura.
 */

export type ButtonVariant = 'primary' | 'outlined' | 'ghost' | 'danger'

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--wk-primary)] text-[var(--wk-btn-on-primary)] hover:bg-[var(--wk-primary-hover)] hover:shadow-[var(--wk-btn-primary-shadow)]',
  outlined:
    'border border-[var(--wk-primary)] text-[var(--wk-primary)] hover:bg-[var(--wk-btn-outlined-hover-bg)] hover:text-[var(--wk-btn-outlined-hover-fg)]',
  ghost: 'text-[var(--wk-text-secondary)] hover:bg-[var(--wk-btn-ghost-hover)]',
  danger:
    'bg-[var(--wk-btn-danger)] text-[var(--wk-btn-on-danger)] hover:bg-[var(--wk-btn-danger-hover)] hover:shadow-[var(--wk-btn-danger-shadow)]',
}

export function Button({
  children,
  icon,
  variant = 'primary',
  onClick,
  title,
  type = 'button',
}: {
  children: ReactNode
  icon?: string
  variant?: ButtonVariant
  onClick?: () => void
  title?: string
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      title={title}
      className={`shrink-0 inline-flex items-center justify-center gap-1.5 h-10 md:h-9 px-4 whitespace-nowrap text-[14px] font-normal leading-[20px] transition focus-visible:shadow-[var(--wk-btn-focus-ring)] outline-none ${VARIANT[variant]}`}
      style={{ fontFamily: FONT, borderRadius: RADIUS.md }}
    >
      {icon && <Icon name={icon} size={20} weight={400} color="currentColor" className="shrink-0" />}
      {children}
    </button>
  )
}
