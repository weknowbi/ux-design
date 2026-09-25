import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT, RADIUS } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { Icon } from '@/components/icons'

/**
 * Inserção de um valor literal na fórmula.
 *
 * Texto, hexadecimal, binário e máscara de saída são acessórios da tela: quem
 * escreve fórmula digita `"obeso"` direto, e só recorre a isto quando não tem
 * certeza da forma. Por isso o diálogo é pequeno e sempre mostra o que vai
 * entrar no texto, em vez de pedir fé.
 */

export type LiteralKind = 'text' | 'hex' | 'binary' | 'format'

const CONFIG: Record<
  LiteralKind,
  { title: string; label: string; placeholder: string; hint: string; mono: boolean }
> = {
  text: {
    title: 'Inserir texto',
    label: 'Texto',
    placeholder: 'obeso',
    hint: 'Entra na fórmula entre aspas.',
    mono: false,
  },
  hex: {
    title: 'Inserir número hexadecimal',
    label: 'Valor',
    placeholder: '1A2B3C',
    hint: 'Só os dígitos; o 0x entra sozinho.',
    mono: true,
  },
  binary: {
    title: 'Inserir número binário',
    label: 'Valor',
    placeholder: '1011',
    hint: 'Só 0 e 1; o 0b entra sozinho.',
    mono: true,
  },
  format: {
    title: 'Inserir máscara de saída',
    label: 'Máscara',
    placeholder: '#,##0.00',
    hint: 'Aplicada ao resultado da fórmula.',
    mono: true,
  },
}

const MASKS = ['#,##0.00', '#,##0', '0.00%', 'dd/MM/yyyy', 'HH:mm:ss', 'R$ #,##0.00']

/** O que de fato entra no texto da fórmula. */
function toFormula(kind: LiteralKind, raw: string): string {
  const v = raw.trim()
  if (!v) return ''
  if (kind === 'text') return `"${v.replace(/"/g, '\\"')}"`
  if (kind === 'hex') return `0x${v.replace(/^0x/i, '').toUpperCase()}`
  if (kind === 'binary') return `0b${v.replace(/^0b/i, '')}`
  return `"${v}"`
}

/** Leitura em decimal, quando o valor tiver uma. */
function decimalOf(kind: LiteralKind, raw: string): string | null {
  const v = raw.replace(/^0[xb]/i, '').trim()
  if (!v) return null
  if (kind === 'hex' && /^[0-9a-f]+$/i.test(v)) return `${parseInt(v, 16)} em decimal`
  if (kind === 'binary' && /^[01]+$/.test(v)) return `${parseInt(v, 2)} em decimal`
  return null
}

export function InsertValueModal({
  kind,
  onConfirm,
  onClose,
}: {
  kind: LiteralKind
  onConfirm: (text: string) => void
  onClose: () => void
}) {
  const cfg = CONFIG[kind]
  const [raw, setRaw] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  /* Foco uma vez, na abertura. `onClose` muda de identidade a cada render do
     pai, e mantê-lo nas dependências devolveria o cursor ao campo no meio da
     digitação. */
  useEffect(() => { inputRef.current?.focus() }, [])

  const out = toFormula(kind, raw)

  const confirm = () => {
    if (out) onConfirm(out)
    onClose()
  }

  /* Sem lista de dependências: o ouvinte precisa enxergar o `raw` desta
     renderização, e não o de quando o diálogo abriu. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
      if (e.key === 'Enter') confirm()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const clean = (s: string) =>
    kind === 'binary' ? s.replace(/[^01]/g, '')
      : kind === 'hex' ? s.replace(/[^0-9a-fA-F]/g, '')
        : s

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'var(--wk-backdrop)', fontFamily: FONT }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={cfg.title}
    >
      <div
        className="flex flex-col overflow-hidden"
        /* Mesma moldura do "Nova pasta": 420 de largura, raio 8, borda de 1px
           e `--wk-shadow-menu`. A borda faltava aqui, e sem ela a caixa
           branca encostava no véu sem se recortar dele. */
        style={{
          width: 420,
          maxWidth: '100%',
          background: COLOR.surface,
          borderRadius: RADIUS.md,
          border: `1px solid ${COLOR.border}`,
          boxShadow: 'var(--wk-shadow-menu)',
        }}
      >
        <div className="shrink-0 flex items-center gap-2" style={{ height: 64, paddingInline: 24, paddingBlock: 16 }}>
          <h3 className="flex-1 min-w-0 truncate" style={{ fontWeight: 600, fontSize: 20, lineHeight: 1.5, color: COLOR.text }}>
            {cfg.title}
          </h3>
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

        <div style={{ paddingInline: 24, paddingBottom: 8 }}>
          <label className="flex flex-col">
            {/* Rótulo sempre visível: o placeholder some justo quando a pessoa
                começa a digitar e mais precisa conferir o que o campo pede. */}
            <span style={{ fontSize: 16, lineHeight: 1.5, color: COLOR.text, paddingBottom: 8 }}>{cfg.label}</span>
            <input
              ref={inputRef}
              type="text"
              value={raw}
              onChange={(e) => setRaw(clean(e.target.value))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={cfg.placeholder}
              className="w-full bg-transparent outline-none"
              /* Foco: a borda vira primária e ganha o anel do design system,
                 o mesmo `--wk-btn-focus-ring` dos botões. Um token só para
                 "isto está com o foco" em toda a interface. */
              style={{
                height: 38,
                border: `1px solid ${focused ? COLOR.primary : 'var(--wk-field-border)'}`,
                boxShadow: focused ? 'var(--wk-btn-focus-ring)' : undefined,
                transition: 'border-color .12s ease, box-shadow .12s ease',
                borderRadius: RADIUS.sm,
                paddingInline: 12,
                fontFamily: cfg.mono ? 'var(--wk-mono)' : FONT,
                fontSize: 16,
                lineHeight: 1.5,
                color: COLOR.text,
              }}
            />
          </label>

          {kind === 'format' && (
            <div className="flex flex-wrap gap-2" style={{ paddingTop: 12 }}>
              {MASKS.map((mask) => {
                const on = raw === mask
                return (
                  <button
                    key={mask}
                    onClick={() => setRaw(mask)}
                    className="transition-colors"
                    style={{
                      height: 28,
                      paddingInline: 10,
                      borderRadius: RADIUS.sm,
                      fontFamily: 'var(--wk-mono)',
                      fontSize: 12,
                      background: on ? 'var(--wk-chip-bg)' : 'var(--wk-hover-strong)',
                      color: on ? COLOR.primary : COLOR.textSecondary,
                    }}
                  >
                    {mask}
                  </button>
                )
              })}
            </div>
          )}

          {/* Auxílio e prévia dividem o mesmo lugar: um substitui o outro. */}
          <p className="truncate" style={{ fontSize: 13, color: COLOR.textMuted, paddingTop: 8, minHeight: 20 }}>
            {out ? (
              <>
                Entra como <span style={{ fontFamily: 'var(--wk-mono)', color: COLOR.textSecondary }}>{out}</span>
                {decimalOf(kind, raw) ? `, ${decimalOf(kind, raw)}` : ''}
              </>
            ) : (
              cfg.hint
            )}
          </p>
        </div>

        <div className="shrink-0 flex items-center justify-end gap-2" style={{ paddingInline: 24, paddingTop: 8, paddingBottom: 16 }}>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn variant="primary" onClick={confirm} disabled={!out}>Inserir na fórmula</Btn>
        </div>
      </div>
    </div>
  )
}
