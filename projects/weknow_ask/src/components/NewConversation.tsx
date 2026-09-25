import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { FormField, Select, fieldBoxStyle, fieldTextStyle } from '@/components/Field'
import { Icon } from '@/components/icons'
import { CONFIGURED_PROVIDERS, META_CONTEXTS, type MetaContext } from '@/data/conversation'

/**
 * Tela de nova conversa: escolher o metadado que dá contexto e o provedor de
 * IA antes de começar.
 *
 * Os dois controles usam o mesmo `form-item` do design system e ficam na
 * mesma coluna, um sob o outro — o provedor deixa de flutuar solto ao lado.
 * A ação fecha a coluna, alinhada à direita.
 *
 * O campo só fica vermelho depois de uma tentativa de criar sem escolher:
 * marcar erro antes de a pessoa agir apenas ensina a ignorar o aviso.
 */

const COLUMN = 720

/**
 * Proporção da tela de saudação (nó 11558:3328), com o bloco 80px acima:
 * os 80 saem do espaçador de cima e entram no de baixo.
 */
const LIFT = 80
const SPACE_ABOVE = 360.5 - LIFT
const SPACE_BELOW = 511.5 + LIFT

/**
 * Subida adicional, em pixels de verdade.
 *
 * Os espaçadores acima são *pesos* de flex: mexer neles desloca o bloco só
 * na proporção da folga disponível, então "mais 120" viraria bem menos que
 * 120 numa tela de 900. Aqui a subida sai como margem negativa — o valor é
 * exato — e a margem positiva do espaçador de baixo devolve o mesmo tanto,
 * para que a folga total não mude.
 *
 * O `minHeight` no espaçador de cima é o freio: garante que exista pelo
 * menos essa altura para consumir, então em tela baixa o bloco encosta no
 * topo da área em vez de subir para fora dela.
 */
const LIFT_PX = 120

export function NewConversation({
  onCreate,
}: {
  onCreate: (context: MetaContext, provider: string) => void
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<MetaContext | null>(null)
  /* Com a lista vazia não há o que pré-selecionar; com itens, segue o
     primeiro, como sempre foi. */
  const [provider, setProvider] = useState(CONFIGURED_PROVIDERS[0]?.id ?? '')
  const semProvedor = CONFIGURED_PROVIDERS.length === 0
  const [open, setOpen] = useState(false)
  const [focused, setFocused] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  /** Opções filtradas, preservando a ordem dos grupos de origem. */
  const groups = useMemo(() => {
    const term = query.trim().toLowerCase()
    const found = META_CONTEXTS.filter((c) => c.label.toLowerCase().includes(term))
    const order: string[] = []
    const byGroup = new Map<string, MetaContext[]>()
    for (const c of found) {
      if (!byGroup.has(c.group)) {
        byGroup.set(c.group, [])
        order.push(c.group)
      }
      byGroup.get(c.group)!.push(c)
    }
    return order.map((label) => ({ label, items: byGroup.get(label)! }))
  }, [query])

  const choose = (c: MetaContext) => {
    setPicked(c)
    setQuery(c.label)
    setOpen(false)
    setInvalid(false)
  }

  const create = () => {
    if (!picked) {
      setInvalid(true)
      return
    }
    onCreate(picked, provider)
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col px-6" style={{ paddingBlock: 24 }}>
      {/* Mesma repartição da tela de saudação: o bloco fica acima do centro. */}
      <div style={{ flex: SPACE_ABOVE, minHeight: LIFT_PX, marginBottom: -LIFT_PX }} />
      <div className="mx-auto w-full shrink-0" style={{ maxWidth: COLUMN }}>
        <h1
          className="text-center"
          style={{
            fontFamily: FONT,
            fontSize: 26,
            lineHeight: '36px',
            fontWeight: 400,
            color: COLOR.text,
            marginBottom: 32,
          }}
        >
          Informe um contexto de dados para começar:
        </h1>

        <FormField
          label="Contexto de dados"
          hint="Seus dados não serão enviados nem compartilhados, exceto quando houver liberação expressa."
          error={invalid ? 'Escolha um metadado para continuar.' : undefined}
        >
          <div ref={rootRef} className="relative">
            <div
              className="flex items-center"
              style={{ ...fieldBoxStyle({ invalid, focused: focused || open }), gap: 8 }}
            >
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setPicked(null)
                  setOpen(true)
                }}
                onFocus={() => {
                  setFocused(true)
                  setOpen(true)
                }}
                onBlur={() => setFocused(false)}
                placeholder="Digite para buscar um metadado..."
                aria-invalid={invalid}
                aria-expanded={open}
                role="combobox"
                className="flex-1 min-w-0 bg-transparent outline-none"
                style={fieldTextStyle}
              />
              <Icon name="search" size={24} color={COLOR.navLabel} className="shrink-0" />
            </div>

            {open && (
              <div
                className="absolute left-0 right-0 z-20 mt-1 bg-[var(--wk-surface)] overflow-y-auto"
                style={{
                  maxHeight: 300,
                  border: `1px solid ${COLOR.border}`,
                  borderRadius: 6,
                  boxShadow: 'var(--wk-shadow-menu)',
                }}
                role="listbox"
              >
                {groups.map((g) => (
                  <div key={g.label}>
                    <p
                      className="px-4 pt-3 pb-1 uppercase"
                      style={{
                        fontFamily: FONT,
                        fontSize: 11,
                        fontWeight: 600,
                        letterSpacing: '.04em',
                        color: COLOR.textMuted,
                      }}
                    >
                      {g.label}
                    </p>
                    {g.items.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => choose(c)}
                        role="option"
                        aria-selected={picked?.id === c.id}
                        className="w-full text-left px-4 transition-colors hover:bg-[var(--wk-menu-hover)]"
                        style={{ height: 36, fontFamily: FONT, fontSize: 14, color: COLOR.text }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                ))}

                {groups.length === 0 && (
                  <p className="px-4 py-4 text-[14px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
                    Nenhum metadado corresponde a “{query}”.
                  </p>
                )}
              </div>
            )}
          </div>
        </FormField>

        {/* Sem provedor, o aviso ocupa o lugar do seletor e o rótulo fica: é
            ele que diz do que o aviso trata. Alerta light — fundo e borda
            neutros — com o ícone carregando o sinal de aviso sem gritar. */}
        <FormField label="Provedor de IA">
          {semProvedor ? (
            <div
              role="status"
              className="flex items-center"
              style={{
                gap: 12,
                padding: '12px 16px',
                borderRadius: 6,
                background: COLOR.surfaceSubtle,
                border: `1px solid ${COLOR.border}`,
              }}
            >
              <Icon name="info" size={24} color={COLOR.navLabel} className="shrink-0" />
              <span style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.5, color: COLOR.textSecondary }}>
                Nenhum provedor de IA configurado. Configure um provedor para criar conversas.
              </span>
            </div>
          ) : (
            <Select
              value={provider}
              onChange={setProvider}
              options={CONFIGURED_PROVIDERS.map((p) => ({ id: p.id, label: p.label }))}
              ariaLabel="Provedor de IA"
            />
          )}
        </FormField>

        <div className="flex justify-end" style={{ paddingTop: 8 }}>
          <Btn variant="primary" onClick={create} disabled={semProvedor}>
            Criar conversa
          </Btn>
        </div>
      </div>
      <div style={{ flex: SPACE_BELOW, marginTop: LIFT_PX }} />
    </div>
  )
}
