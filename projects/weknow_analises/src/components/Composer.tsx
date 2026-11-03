import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT, RADIUS, SHADOW } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * A caixa de pergunta do Weknow Ask, sem o seletor de modelo e sem filtros:
 * quem pergunta aqui escolhe um indicador, não uma fonte. Mesma anatomia
 * (texto em cima, ações embaixo) para quem já usa o Ask não aprender outra.
 */
export function Composer({
  onSend,
  placeholder,
  label,
  autoFocus,
  disabled,
  initial = '',
  compact,
}: {
  onSend: (text: string) => void
  placeholder: string
  label: string
  autoFocus?: boolean
  disabled?: boolean
  /** Na coluna do Criar com IA: texto de 14, o mesmo das mensagens acima. Os 16 são da caixa grande do dashboard vazio. */
  compact?: boolean
  /** Texto que já entra na caixa, para ler e ajustar antes de enviar. */
  initial?: string
}) {
  const [value, setValue] = useState(initial)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  /* A altura acompanha o texto (ou o exemplo, com a caixa vazia) até 220, e
     só dali rola. Mede de novo quando a largura muda: a conversa entra
     deslizando, e medir antes de ela chegar à largura final deixava o
     exemplo cortado numa linha, com as setas da rolagem ao lado. */
  useEffect(() => {
    const el = areaRef.current
    if (!el) return
    const fit = () => {
      el.style.height = 'auto'
      el.style.height = Math.min(el.scrollHeight, 220) + 'px'
      el.style.overflowY = el.scrollHeight > 220 ? 'auto' : 'hidden'
    }
    fit()
    let w = el.clientWidth
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== w) {
        w = el.clientWidth
        fit()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
    /* O exemplo também conta: ele troca quando um bloco entra em edição, e
       sem medir de novo a última linha dele ficava cortada. */
  }, [value, placeholder])

  const canSend = value.trim().length > 0 && !disabled
  const submit = () => {
    if (!canSend) return
    onSend(value.trim())
    setValue('')
  }

  return (
    <div
      className="bg-[var(--wk-surface)]"
      style={{ borderRadius: RADIUS.composer, border: `1px solid ${COLOR.border}`, boxShadow: SHADOW.composer }}
    >
      <div className="px-5 pt-4 pb-1">
        <textarea
          ref={areaRef}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder={placeholder}
          aria-label={label}
          className="block w-full resize-none bg-transparent outline-none"
          /* Na coluna estreita o exemplo ocupa duas linhas e o texto digitado
             começa com uma: sem o mínimo de duas, a caixa encolhia na primeira
             letra e crescia de novo ao apagar. */
          style={{ fontFamily: FONT, fontSize: compact ? 14 : 16, lineHeight: '20px', minHeight: compact ? 40 : undefined, color: COLOR.text }}
        />
      </div>
      <div className="flex items-end justify-end gap-2 px-3 pb-3 pt-1">
        <button
          type="button"
          title="Ditar pergunta"
          aria-label="Ditar pergunta"
          className="wk-icon-btn shrink-0 flex items-center justify-center"
          style={{ width: 24, height: 24, color: COLOR.navLabel }}
        >
          <Icon name="mic" size={24} />
        </button>
        <button
          type="button"
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
  )
}
