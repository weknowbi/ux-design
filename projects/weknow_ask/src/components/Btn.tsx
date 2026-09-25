import { useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'

export type BtnVariant = 'primary' | 'secondary' | 'outlined' | 'ghost' | 'danger'
export type BtnSize = 'sm' | 'md' | 'lg'

type BtnProps = {
  variant?: BtnVariant
  size?: BtnSize
  disabled?: boolean
  children?: React.ReactNode
  iconLeft?: React.ReactNode
  iconRight?: React.ReactNode
  fullWidth?: boolean
  /** Conteúdo encostado à esquerda em vez de centrado (usado em menus). */
  alignLeft?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  title?: string
}

/**
 * Botão do design system Weknow — espec. do arquivo Make "Button variations
 * with animations": variantes, raios, sombras, anel de foco e transições.
 *
 * As cores saem de variáveis, não de constantes: o mesmo componente serve os
 * dois temas. No escuro o primário inverte — fundo #8AB4F8 com texto #0D1B2A —
 * porque texto branco sobre azul claro não passa em contraste.
 */
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
  const [focused, setFocused] = useState(false)

  const pad = size === 'sm' ? '6px 12px' : size === 'lg' ? '10px 20px' : iconLeft ? '7px 16px 7px 12px' : '7px 16px'
  const fontSize = size === 'sm' ? '0.8125rem' : size === 'lg' ? '1rem' : '0.875rem'
  const radius = size === 'sm' ? 6 : size === 'lg' ? 10 : 8
  const ring = focused ? 'var(--wk-btn-focus-ring)' : undefined

  type StyleMap = Record<BtnVariant, React.CSSProperties>
  const base: StyleMap = {
    primary:   { background: hovered ? COLOR.primaryHover : COLOR.primary, color: 'var(--wk-btn-on-primary)', border: '1.5px solid transparent', boxShadow: hovered ? 'var(--wk-btn-primary-shadow)' : ring ?? 'none' },
    secondary: { background: hovered ? COLOR.tintHover : COLOR.tint, color: COLOR.primary, border: '1.5px solid transparent', boxShadow: ring ?? 'none' },
    outlined:  { background: hovered ? 'var(--wk-btn-outlined-hover-bg)' : 'transparent', color: hovered ? 'var(--wk-btn-outlined-hover-fg)' : COLOR.primary, border: `1.5px solid ${COLOR.primary}`, boxShadow: hovered ? 'var(--wk-btn-outlined-shadow)' : ring ?? 'none' },
    ghost:     { background: hovered ? 'var(--wk-btn-ghost-hover)' : 'transparent', color: COLOR.primary, border: '1.5px solid transparent', boxShadow: ring ?? 'none' },
    danger:    { background: hovered ? 'var(--wk-btn-danger-hover)' : 'var(--wk-btn-danger)', color: 'var(--wk-btn-on-danger)', border: '1.5px solid transparent', boxShadow: hovered ? 'var(--wk-btn-danger-shadow)' : ring ?? 'none' },
  }
  const dis: StyleMap = {
    primary:   { background: 'var(--wk-btn-off-primary-bg)', color: 'var(--wk-btn-off-primary-fg)', border: 'none' },
    secondary: { background: 'var(--wk-btn-off-secondary-bg)', color: 'var(--wk-btn-off-fg)', border: 'none' },
    outlined:  { background: 'transparent', color: 'var(--wk-btn-off-fg)', border: '1.5px solid var(--wk-btn-off-border)' },
    ghost:     { background: 'transparent', color: 'var(--wk-btn-off-fg)', border: 'none' },
    danger:    { background: 'var(--wk-btn-off-danger-bg)', color: 'var(--wk-btn-off-danger-fg)', border: 'none' },
  }

  const style: React.CSSProperties = {
    ...(disabled ? dis[variant] : base[variant]),
    padding: pad,
    fontSize,
    borderRadius: radius,
    fontWeight: 400,
    fontFamily: FONT,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background .15s ease, box-shadow .15s ease, color .15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    outline: 'none',
    whiteSpace: 'nowrap',
    width: fullWidth ? '100%' : undefined,
    justifyContent: fullWidth ? (alignLeft ? 'flex-start' : 'center') : undefined,
  }

  const iconBox: React.CSSProperties = {
    width: 20, height: 20, flex: '0 0 20px',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      style={style}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={onClick}
    >
      {iconLeft && <span style={iconBox}>{iconLeft}</span>}
      {children && <span>{children}</span>}
      {iconRight && <span style={iconBox}>{iconRight}</span>}
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
  children: React.ReactNode
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
