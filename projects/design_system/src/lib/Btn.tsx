import { useState, type ReactNode } from 'react'
import { COLOR, FONT } from './tokens'
import { Icon } from './icons'

/**
 * Botão do design system Weknow.
 *
 * Esta é a ÚNICA cópia: o Weknow ASK e o portal importam daqui. Antes eram
 * dois botões diferentes para o mesmo trabalho: o `Btn` do ASK, tirado do
 * arquivo Make "Button variations with animations", e o `Button` do portal,
 * feito depois para a tela de cadastro. Nenhum dos dois estava errado; o
 * problema era serem dois, com a documentação descrevendo um só.
 *
 * A fusão guardou a SUPERFÍCIE do ASK (cinco variantes, três tamanhos,
 * desabilitado, largura cheia) e as MEDIDAS do portal, que têm a justificativa
 * melhor:
 *
 *   altura fixa    36 na mesa, 40 no toque. 36 é a altura da busca compacta e
 *                  da pílula da barra de topo: lado a lado formam uma linha
 *                  só. Antes a altura saía do padding e dava ~37, que não
 *                  alinhava com nada.
 *   intervalo 6    entre ícone e rótulo
 *   borda 1px      a de 1.5 engrossava o contorno acima de tudo em volta
 *   foco teclado   o anel só aparece para quem navega por teclado
 *
 * As cores saem de variáveis, não de constantes: o mesmo componente serve os
 * dois temas. No escuro o primário inverte (fundo #8AB4F8 com texto #0D1B2A)
 * porque texto branco sobre azul claro não passa em contraste.
 *
 * O fantasma é o único que não usa o azul de marca: ele é a ação de menor
 * peso da tela (o "Cancelar" ao lado de um "Salvar"), e em azul disputava
 * atenção com a ação principal. Fica na cor de texto secundária, e o hover
 * continua dizendo que é clicável.
 */

export type BtnVariant = 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger'
export type BtnSize = 'sm' | 'md' | 'lg'

/**
 * Ícone do botão: ou o nome do símbolo, e aí ele vem na espec. do botão, ou um
 * nó pronto, para o caso raro que a espec. não cobre.
 */
export type BtnIcon = string | ReactNode

type BtnProps = {
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  children?: ReactNode
  iconLeft?: BtnIcon
  iconRight?: BtnIcon
  fullWidth?: boolean
  /** Conteúdo encostado à esquerda em vez de centrado (usado em menus). */
  alignLeft?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  title?: string
}

/**
 * Altura por tamanho, em classe e não em estilo: o degrau do toque é consulta
 * de mídia, e consulta de mídia não cabe em `style`.
 *
 * O `md` é a medida do portal. O `sm` e o `lg` desceram para a grade de 4 a
 * partir do que já mediam (~33 e ~47): nenhum dos dois estava num número
 * redondo, porque a altura vinha do padding.
 */
const HEIGHT: Record<BtnSize, string> = {
  sm: 'h-9 md:h-8',
  md: 'h-10 md:h-9',
  lg: 'h-12 md:h-11',
}

const PAD_X: Record<BtnSize, number> = { sm: 12, md: 16, lg: 20 }
const FONT_SIZE: Record<BtnSize, number> = { sm: 13, md: 14, lg: 16 }
const RADIUS: Record<BtnSize, number> = { sm: 6, md: 8, lg: 10 }

/** Espec. do ícone dentro do botão: 20px no peso 400, herdando a cor do rótulo. */
const ICON = { size: 20, weight: 400 } as const

function renderIcon(icon: BtnIcon) {
  return (
    <span
      style={{
        width: ICON.size,
        height: ICON.size,
        flex: '0 0 ' + ICON.size + 'px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {typeof icon === 'string' ? (
        <Icon name={icon} size={ICON.size} weight={ICON.weight} color="currentColor" />
      ) : (
        icon
      )}
    </span>
  )
}

export function Btn({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  iconLeft,
  iconRight,
  fullWidth,
  alignLeft,
  onClick,
  type = 'button',
  title,
}: BtnProps) {
  const [hovered, setHovered] = useState(false)
  /* Só o foco de teclado acende o anel. `:focus-visible` é o navegador
     decidindo isso, e ele decide melhor do que qualquer regra nossa: antes
     o anel aparecia também no clique de mouse, que não precisa de pista. */
  const [ringed, setRinged] = useState(false)
  const ring = ringed ? 'var(--wk-btn-focus-ring)' : undefined

  type StyleMap = Record<BtnVariant, React.CSSProperties>
  const base: StyleMap = {
    primary:   { background: hovered ? COLOR.primaryHover : COLOR.primary, color: 'var(--wk-btn-on-primary)', border: '1px solid transparent', boxShadow: hovered ? 'var(--wk-btn-primary-shadow)' : ring ?? 'none' },
    secondary: { background: hovered ? COLOR.tintHover : COLOR.tint, color: COLOR.primary, border: '1px solid transparent', boxShadow: ring ?? 'none' },
    outlined:  { background: hovered ? 'var(--wk-btn-outlined-hover-bg)' : 'transparent', color: hovered ? 'var(--wk-btn-outlined-hover-fg)' : COLOR.primary, border: '1px solid ' + COLOR.primary, boxShadow: hovered ? 'var(--wk-btn-outlined-shadow)' : ring ?? 'none' },
    ghost:     { background: hovered ? 'var(--wk-btn-ghost-hover)' : 'transparent', color: COLOR.textSecondary, border: '1px solid transparent', boxShadow: ring ?? 'none' },
    danger:    { background: hovered ? 'var(--wk-btn-danger-hover)' : 'var(--wk-btn-danger)', color: 'var(--wk-btn-on-danger)', border: '1px solid transparent', boxShadow: hovered ? 'var(--wk-btn-danger-shadow)' : ring ?? 'none' },
  }
  const dis: StyleMap = {
    primary:   { background: 'var(--wk-btn-off-primary-bg)', color: 'var(--wk-btn-off-primary-fg)', border: '1px solid transparent' },
    secondary: { background: 'var(--wk-btn-off-secondary-bg)', color: 'var(--wk-btn-off-fg)', border: '1px solid transparent' },
    outlined:  { background: 'transparent', color: 'var(--wk-btn-off-fg)', border: '1px solid var(--wk-btn-off-border)' },
    ghost:     { background: 'transparent', color: 'var(--wk-btn-off-fg)', border: '1px solid transparent' },
    danger:    { background: 'var(--wk-btn-off-danger-bg)', color: 'var(--wk-btn-off-danger-fg)', border: '1px solid transparent' },
  }

  /* A borda entra em TODAS as variantes, inclusive transparente: sem ela a
     caixa do fantasma ficaria 2px menor que a do contornado, e os dois vivem
     lado a lado no rodapé do modal. */
  const style: React.CSSProperties = {
    ...(disabled ? dis[variant] : base[variant]),
    paddingInline: PAD_X[size],
    fontSize: FONT_SIZE[size],
    lineHeight: '20px',
    borderRadius: RADIUS[size],
    fontWeight: 400,
    fontFamily: FONT,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background .15s ease, box-shadow .15s ease, color .15s ease',
    gap: 6,
    outline: 'none',
    width: fullWidth ? '100%' : undefined,
    justifyContent: fullWidth && alignLeft ? 'flex-start' : 'center',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      style={style}
      title={title}
      className={HEIGHT[size] + ' shrink-0 inline-flex items-center whitespace-nowrap'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={(e) => setRinged(e.currentTarget.matches(':focus-visible'))}
      onBlur={() => setRinged(false)}
      onClick={onClick}
    >
      {iconLeft && renderIcon(iconLeft)}
      {children && <span>{children}</span>}
      {iconRight && renderIcon(iconRight)}
    </button>
  )
}

/** Botão de ícone discreto usado no header e nas barras de ação. */
export function IconBtn({
  title,
  onClick,
  children,
  active,
}: {
  title: string
  onClick?: () => void
  children: ReactNode
  active?: boolean
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="wk-icon-btn w-8 h-8 flex items-center justify-center"
      style={{ color: active ? COLOR.primary : COLOR.navLabel }}
    >
      {children}
    </button>
  )
}
