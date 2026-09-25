import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { TYPE_LABEL, type Field } from '@/data/formula'

/**
 * Escrever um valor daquela variável na fórmula.
 *
 * No produto de hoje isto é um ícone fixo em cada linha da árvore que abre um
 * modal "Editor de valor" com um campo "Valor" e nada mais. Três problemas:
 *
 * — O ícone se repete em toda linha, então não identifica nada: virou textura.
 *   A regra de ícones do design system diz exatamente isso.
 * — Um modal por cima do modal tira a pessoa do contexto para digitar uma
 *   palavra.
 * — O campo não sabe de que variável veio, então aceita qualquer coisa e não
 *   ajuda em nada.
 *
 * Aqui a ação aparece só ao passar o mouse na linha, abre colada nela, e sabe
 * o tipo: texto entra entre aspas, número entra cru, lógico vira dois botões.
 * A prévia mostra o que vai para a fórmula antes de confirmar.
 */

/** O que de fato entra na fórmula, conforme o tipo da variável. */
export function literalFor(field: Field, raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (field.type === 'number') return v.replace(',', '.')
  if (field.type === 'boolean') return v
  return `"${v.replace(/"/g, '\\"')}"`
}

const HINT: Record<Field['type'], string> = {
  number: 'Entra cru, sem aspas.',
  text: 'Entra entre aspas.',
  boolean: 'Escolha um dos dois.',
  date: 'Entre aspas, no formato do modelo.',
}

export function ValuePopover({
  field,
  onConfirm,
  onClose,
}: {
  field: Field
  onConfirm: (literal: string) => void
  onClose: () => void
}) {
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const out = literalFor(field, raw)

  const confirm = (value?: string) => {
    const literal = value ?? out
    if (literal) onConfirm(literal)
    onClose()
  }

  /* Sem lista de dependências: o ouvinte precisa ver o `raw` desta
     renderização, e não o de quando o painel abriu. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Enter' && field.type !== 'boolean') confirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div
      className="flex flex-col"
      style={{
        width: 260,
        background: COLOR.surface,
        border: `1px solid ${COLOR.border}`,
        borderRadius: RADIUS.md,
        boxShadow: 'var(--wk-shadow-menu)',
        padding: 12,
        gap: 8,
        fontFamily: FONT,
      }}
      role="dialog"
      aria-label={`Escrever um valor de ${field.name}`}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="truncate" style={{ fontFamily: 'var(--wk-mono)', fontSize: 13, color: COLOR.text }}>
          {field.name}
        </span>
        <span className="shrink-0" style={{ fontSize: 12, color: COLOR.textMuted }}>
          {TYPE_LABEL[field.type]}
        </span>
      </div>

      {field.type === 'boolean' ? (
        <div className="flex gap-2">
          <Btn variant="secondary" size="sm" onClick={() => confirm('true')}>Verdadeiro</Btn>
          <Btn variant="secondary" size="sm" onClick={() => confirm('false')}>Falso</Btn>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={field.type === 'number' ? '30' : 'SC'}
          aria-label="Valor"
          className="w-full bg-transparent outline-none"
          style={{
            height: 38,
            border: `1px solid ${focused ? COLOR.primary : 'var(--wk-field-border)'}`,
            boxShadow: focused ? 'var(--wk-btn-focus-ring)' : undefined,
            transition: 'border-color .12s ease, box-shadow .12s ease',
            borderRadius: RADIUS.sm,
            paddingInline: 12,
            fontFamily: 'var(--wk-mono)',
            fontSize: 14,
            color: COLOR.text,
          }}
        />
      )}

      {/* Auxílio e prévia dividem o mesmo lugar: um substitui o outro. */}
      <p className="truncate" style={{ fontSize: 12, color: COLOR.textMuted, minHeight: 18 }}>
        {out ? (
          <>Entra como <span style={{ fontFamily: 'var(--wk-mono)', color: COLOR.textSecondary }}>{out}</span></>
        ) : (
          HINT[field.type]
        )}
      </p>

      {field.type !== 'boolean' && (
        <div className="flex items-center justify-end gap-2">
          <Btn variant="ghost" size="sm" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" size="sm" disabled={!out} onClick={() => confirm()}>Escrever</Btn>
        </div>
      )}
    </div>
  )
}
