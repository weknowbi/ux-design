import { useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * Chip do design system — espec. do nó `SlotClone` (WP-832, 4454:7159):
 *
 *   caixa    36 de altura, px-16, gap 8, raio total (pílula), fundo #e0e9f2
 *   ícone    24px, Material Symbols wght 200, em #3366cc
 *   rótulo   Inter Regular 14/20 em #3366cc
 *
 * O nó mede 113 × 36 com o rótulo "Tarefas": 16 + 24 + 8 + texto + 16 na
 * largura, e 36 na altura — ou seja, o ícone de 24 manda no eixo vertical e
 * sobra 6 de respiro, não os 8 que o padding nominal sugere. Por isso a
 * altura entra fixa, e não como padding.
 */

export const CHIP = {
  height: 36,
  padX: 16,
  gap: 8,
  iconSize: 24,
  fontSize: 14,
  lineHeight: 20,
  background: COLOR.chipBg,
  color: COLOR.primary,
} as const

export function Chip({
  icon,
  onClick,
  title,
  children,
}: {
  icon?: string
  /** Com ação, o chip vira botão — mesma caixa, com realce no hover. */
  onClick?: () => void
  title?: string
  children: React.ReactNode
}) {
  const [hover, setHover] = useState(false)

  const style: React.CSSProperties = {
    height: CHIP.height,
    paddingInline: CHIP.padX,
    gap: CHIP.gap,
    background: hover ? COLOR.chipBgHover : CHIP.background,
    color: CHIP.color,
    fontFamily: FONT,
    fontSize: CHIP.fontSize,
    lineHeight: `${CHIP.lineHeight}px`,
  }

  const content = (
    <>
      {icon && <Icon name={icon} size={CHIP.iconSize} color={CHIP.color} className="shrink-0" />}
      {children}
    </>
  )

  if (!onClick) {
    return (
      <span className="inline-flex items-center shrink-0 rounded-full" style={style}>
        {content}
      </span>
    )
  }

  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="inline-flex items-center shrink-0 rounded-full transition-colors"
      style={style}
    >
      {content}
    </button>
  )
}
