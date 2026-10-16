import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT, RADIUS, SHADOW } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { ExperimentalNotice } from '@/components/ExperimentalNotice'
import { ModelPicker } from '@/components/ModelPicker'

/**
 * O prompt do Weknow Ask, no painel do dashboard.
 *
 * Mesma caixa, mesma anatomia — texto em cima, ações embaixo, modelo de IA
 * sempre à vista —, para quem já usa o Ask não aprender um segundo campo.
 * Sai o botão de filtros do Ask: aqui o filtro mora no próprio dashboard, e
 * um filtro dentro do pedido mudaria o recorte, não a montagem.
 */
export function Composer({
  onSend,
  provider,
  onProviderChange,
  disabled,
  placeholder = 'Peça uma mudança no dashboard',
  noticeShort,
}: {
  onSend: (text: string) => void
  provider: string
  onProviderChange: (id: string) => void
  disabled: boolean
  placeholder?: string
  noticeShort?: boolean
}) {
  const [value, setValue] = useState('')
  const areaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow do textarea, limitado a ~6 linhas.
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 140) + 'px'
  }, [value])

  const canSend = value.trim().length > 0 && !disabled

  const submit = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <div>
      <div
        className="bg-[var(--wk-surface)] transition-[border-color,box-shadow]"
        style={{ borderRadius: RADIUS.composer, border: `1px solid ${COLOR.border}`, boxShadow: SHADOW.composer }}
      >
        <div className="px-5 pt-4 pb-1">
          <textarea
            ref={areaRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={placeholder}
            aria-label="Pedido de mudança"
            className="block w-full resize-none bg-transparent outline-none wk-ph-prompt"
            style={{ fontFamily: FONT, fontSize: 16, lineHeight: '20px', color: COLOR.text }}
          />
        </div>

        <div className="flex items-end justify-end gap-2 px-3 pb-3 pt-1">
          <ModelPicker value={provider} onChange={onProviderChange} />
          <button
            title="Ditar pedido"
            aria-label="Ditar pedido"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="mic" size={24} />
          </button>
          <button
            onClick={submit}
            disabled={!canSend}
            title="Enviar"
            aria-label="Enviar"
            className="shrink-0 flex items-center justify-center rounded-full transition-colors"
            style={{
              width: 30,
              height: 30,
              background: COLOR.hoverStrong,
              color: canSend ? COLOR.textSecondary : COLOR.textIcon,
              cursor: canSend ? 'pointer' : 'not-allowed',
            }}
          >
            <Icon name="arrow_upward" size={18} color="currentColor" />
          </button>
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <ExperimentalNotice short={noticeShort} />
      </div>
    </div>
  )
}
