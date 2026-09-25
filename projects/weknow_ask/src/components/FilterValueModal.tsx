import { useEffect, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { Icon } from '@/components/icons'
import type { FilterChip } from '@/data/conversation'

/**
 * Editor de valor de um filtro do prompt — espec. do nó 11986:3559.
 *   modal    519 × 322, branco, raio 8
 *   header   64px, px-24 py-16, título Inter Medium 20/1.5 em #334155
 *   abas     p-8; aba px-24 pt-6 pb-8 com borda inferior de 2px
 *            ativa: borda #3d7bff, texto #36c; inativa: 16px rgba(46,52,58,.75)
 *   painel   px-24 py-16; campo 38px, borda #ced4da, raio 8, pl-17 pr-13
 *   rodapé   px-24 py-16, ações à direita
 *
 * O design especifica só a aba "Intervalo". As outras três seguem a mesma
 * gramática de campos, mas o conteúdo delas é proposta, não espec.
 */

type Mode = 'lista' | 'valor' | 'intervalo' | 'avancado'

const TABS: { id: Mode; label: string }[] = [
  { id: 'lista', label: 'Lista' },
  { id: 'valor', label: 'Valor' },
  { id: 'intervalo', label: 'Intervalo' },
  { id: 'avancado', label: 'Avançado' },
]

/** Valores de exemplo da aba "Lista". */
const SAMPLE_VALUES = ['01/2025', '02/2025', '03/2025', '04/2025', '05/2025', '06/2025']

const FIELD: React.CSSProperties = {
  height: 38,
  border: '1px solid var(--wk-field-border)',
  borderRadius: 8,
  paddingLeft: 17,
  paddingRight: 13,
  background: 'var(--wk-surface)',
}
const FIELD_TEXT: React.CSSProperties = { fontFamily: FONT, fontSize: 16, color: COLOR.text }
const LABEL: React.CSSProperties = { fontFamily: FONT, fontSize: 16, color: 'var(--wk-text)' }

function Field({
  label,
  value,
  onChange,
  placeholder = 'Informe o valor',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div className="flex-1 min-w-0 flex flex-col" style={{ paddingBottom: 16 }}>
      <span style={{ ...LABEL, paddingBottom: 8 }}>{label}</span>
      <div className="flex items-center focus-within:border-[var(--wk-primary)] transition-colors" style={FIELD}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 min-w-0 bg-transparent outline-none"
          style={FIELD_TEXT}
        />
      </div>
    </div>
  )
}

export function FilterValueModal({
  chip,
  onClose,
  onApply,
}: {
  chip: FilterChip
  onClose: () => void
  onApply: (value: string) => void
}) {
  const [mode, setMode] = useState<Mode>('intervalo')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [single, setSingle] = useState('')
  const [expr, setExpr] = useState('')
  const [picked, setPicked] = useState<Set<string>>(new Set())

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /** Traduz o que foi preenchido no rótulo curto que aparece no chip. */
  const resolve = (): string => {
    if (mode === 'intervalo') {
      if (min && max) return `${min} – ${max}`
      if (min) return `A partir de ${min}`
      if (max) return `Até ${max}`
      return 'Todos'
    }
    if (mode === 'valor') return single.trim() || 'Todos'
    if (mode === 'avancado') return expr.trim() || 'Todos'
    if (picked.size === 0) return 'Todos'
    if (picked.size === 1) return [...picked][0]
    return `${picked.size} selecionados`
  }

  const toggle = (v: string) =>
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(v) ? next.delete(v) : next.add(v)
      return next
    })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--wk-backdrop)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={chip.label}
    >
      <div
        className="bg-[var(--wk-surface)] flex flex-col overflow-hidden shadow-2xl"
        style={{ width: 519, maxWidth: '100%', borderRadius: 8 }}
      >
        {/* Cabeçalho */}
        <div className="shrink-0 flex items-center gap-2" style={{ height: 64, paddingInline: 24, paddingBlock: 16 }}>
          <h2
            className="flex-1 min-w-0 truncate"
            style={{ fontFamily: FONT, fontWeight: 500, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}
          >
            {chip.label}
          </h2>
          <button
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="close" size={24} />
          </button>
        </div>

        {/* Abas — sublinhado, como no design deste modal */}
        <div className="flex items-start" style={{ padding: 8 }}>
          {TABS.map((t) => {
            const on = mode === t.id
            return (
              <button
                key={t.id}
                onClick={() => setMode(t.id)}
                className="flex items-center justify-center transition-colors"
                style={{
                  paddingInline: 24,
                  paddingTop: 6,
                  paddingBottom: 8,
                  borderBottom: `2px solid ${on ? 'var(--wk-primary)' : 'transparent'}`,
                  fontFamily: FONT,
                  fontSize: 16,
                  lineHeight: 1.5,
                  color: on ? COLOR.primary : COLOR.textMuted,
                  whiteSpace: 'nowrap',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        {/* Painel */}
        <div style={{ paddingInline: 24, paddingBlock: 16 }}>
          {mode === 'intervalo' && (
            <div className="flex items-start" style={{ gap: 16 }}>
              <Field label="Valor mínimo" value={min} onChange={setMin} />
              <Field label="Valor máximo" value={max} onChange={setMax} />
            </div>
          )}

          {mode === 'valor' && (
            <div className="flex items-start" style={{ gap: 16 }}>
              <Field label="Valor exato" value={single} onChange={setSingle} />
            </div>
          )}

          {mode === 'avancado' && (
            <div className="flex items-start" style={{ gap: 16 }}>
              <Field
                label="Expressão"
                value={expr}
                onChange={setExpr}
                placeholder="ex.: >= 100 e <= 500"
              />
            </div>
          )}

          {mode === 'lista' && (
            <div style={{ paddingBottom: 16 }}>
              <span style={{ ...LABEL, display: 'block', paddingBottom: 8 }}>Valores</span>
              <div className="overflow-y-auto" style={{ maxHeight: 86 }}>
                {SAMPLE_VALUES.map((v) => (
                  <button
                    key={v}
                    onClick={() => toggle(v)}
                    className="w-full flex items-center gap-2 px-1 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
                    style={{ height: 32 }}
                  >
                    <span
                      className="shrink-0 flex items-center justify-center rounded-[3px]"
                      style={{
                        width: 16,
                        height: 16,
                        border: `1.5px solid ${picked.has(v) ? COLOR.primary : 'var(--wk-field-border)'}`,
                        background: picked.has(v) ? COLOR.primary : 'var(--wk-surface)',
                        color: 'var(--wk-btn-on-primary)',
                      }}
                    >
                      {picked.has(v) && (
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 14, color: 'var(--wk-text)' }}>{v}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="shrink-0 flex items-center justify-end gap-2" style={{ paddingInline: 24, paddingBlock: 16 }}>
          <Btn variant="ghost" onClick={onClose}>
            Cancelar
          </Btn>
          <Btn
            variant="primary"
            onClick={() => {
              onApply(resolve())
              onClose()
            }}
          >
            Concluir
          </Btn>
        </div>
      </div>
    </div>
  )
}
