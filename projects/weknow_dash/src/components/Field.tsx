import type { CSSProperties, ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'

/**
 * Campo de formulário do design system — a mesma espec. do nó `form-item`
 * (4454:8719) que o Weknow Ask já implementa em `components/Field.tsx`:
 *
 *   bloco    flex coluna, 16 de respiro abaixo
 *   rótulo   Inter Regular 16/1.5 em --wk-text, 8 de respiro abaixo
 *   caixa    altura 38, borda 1px --wk-field-border, raio 6, px-12 py-6
 *   valor    Inter Regular 16/1.5 em --wk-text
 *
 * A caixa é o `form-control` do Bootstrap 5: 6 + 24 (16 × 1.5) + 6 + 2 de
 * borda = 38 exatos. As medidas de 13/7 que o Figma reporta incluem a borda —
 * descontá-la é o que fecha a conta.
 *
 * O raio aqui é 6. Os campos de busca usam 8, por espec. própria: não são o
 * mesmo componente, então não unifique por conta própria.
 *
 * O portal não tinha formulário até agora — o acervo se navega por card. O
 * primeiro é o painel de editar a pasta, e ele nasce com a caixa do design
 * system em vez de uma caixa desenhada ali na hora.
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

export function fieldBoxStyle(state?: { invalid?: boolean; focused?: boolean }): CSSProperties {
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

export const fieldTextStyle: CSSProperties = {
  fontFamily: FONT,
  fontSize: FIELD.fontSize,
  lineHeight: 1.5,
  color: COLOR.text,
}

/**
 * Rótulo + campo + auxílio, com o respiro que a espec. define.
 *
 * O rótulo fica sempre visível: placeholder não é rótulo — ele some quando a
 * pessoa começa a digitar, justo quando ela mais precisa conferir o que o
 * campo pede.
 */
export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col" style={{ paddingBottom: 16 }}>
      <span style={{ ...fieldTextStyle, paddingBottom: FIELD.gap }}>{label}</span>
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
