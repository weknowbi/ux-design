import { useEffect, useRef, useState } from 'react'
import { Icon } from '@/components/icons'
import { COLOR, FONT } from '@/design/tokens'
import { Composer } from '@/components/Composer'
import type { ChatEntry } from '@/lib/store'

/**
 * Painel de edição por conversa.
 *
 * A resposta não é prosa: é a lista do que mudou, do que foi recusado e por
 * quê. Quem pede "tira o filtro de período" precisa ver que o pedido foi
 * entendido e recusado de propósito — não ficar achando que a IA não ouviu.
 */

const SUGGESTIONS = [
  'Paleta neon com fundo escuro e brilho nos indicadores',
  'Adicione um gráfico de lucro por vendedor',
  'Evolução por semana, em colunas',
  'Faça o gráfico de rosca ser clicável',
  'Remova o filtro de período',
]

const LANES: { icon: string; title: string; text: string; color: string }[] = [
  { icon: 'palette', title: 'Livre', text: 'Paleta, fundo claro ou escuro, brilho, espaçamento, cantos, títulos, tamanho e ordem dos blocos.', color: 'var(--wk-ok)' },
  { icon: 'fact_check', title: 'Conferido antes de entrar', text: 'Tipo de gráfico, medida, campo, agrupamento no tempo, top N, incluir ou remover gráficos e filtros da barra.', color: 'var(--wk-primary)' },
  { icon: 'lock', title: 'Fixo em todo dashboard', text: 'Filtro de período, filtro por clique, “Limpar filtros”, “Outros” que fecha o total, tabela de detalhe e os números em si.', color: 'var(--wk-text-muted)' },
]

export function AiPanel({
  chat,
  busy,
  onSend,
  onUndo,
  canUndoVersion,
  onClose,
  sourceHint,
}: {
  chat: ChatEntry[]
  busy: boolean
  onSend: (text: string) => void
  onUndo: (version: number) => void
  /** Versão atual: só a última resposta que criou a versão atual oferece "Desfazer". */
  canUndoVersion: number
  onClose: () => void
  sourceHint: string
}) {
  const [provider, setProvider] = useState('weknow')
  const [lanes, setLanes] = useState(chat.length === 0)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = endRef.current?.parentElement
    el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [chat.length, busy])

  const send = (t: string) => {
    const v = t.trim()
    if (!v || busy) return
    onSend(v)
    setLanes(false)
  }

  return (
    <aside className="h-full flex flex-col" style={{ fontFamily: FONT, background: 'var(--wk-surface)' }} aria-label="Editar com IA">
      <div className="shrink-0 flex items-center gap-2" style={{ height: 52, padding: '0 8px 0 16px', borderBottom: `1px solid ${COLOR.border}` }}>
        <Icon name="auto_awesome" size={22} color={COLOR.primary} />
        <span className="flex-1" style={{ fontSize: 15, fontWeight: 500, color: COLOR.text }}>
          Editar com IA
        </span>
        <button onClick={() => setLanes((v) => !v)} className="wk-icon-btn flex items-center gap-1 rounded-md" style={{ height: 32, padding: '0 8px', fontSize: 12, color: COLOR.textSecondary }} aria-expanded={lanes}>
          <Icon name="shield" size={18} color={COLOR.navLabel} />O que dá para mudar
        </button>
        <button onClick={onClose} title="Fechar painel" aria-label="Fechar painel" className="wk-icon-btn flex items-center justify-center rounded-full" style={{ width: 32, height: 32 }}>
          <Icon name="close" size={20} />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto" style={{ padding: 16 }}>
        {lanes && (
          <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 12, padding: 12, marginBottom: 16, background: 'var(--wk-surface-subtle)' }}>
            {LANES.map((l) => (
              <div key={l.title} className="flex gap-2.5" style={{ padding: '6px 0' }}>
                <Icon name={l.icon} size={20} color={l.color} className="shrink-0" />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COLOR.text }}>{l.title}</div>
                  <div style={{ fontSize: 12, color: COLOR.textSecondary, lineHeight: 1.5, marginTop: 1 }}>{l.text}</div>
                </div>
              </div>
            ))}
            <p style={{ fontSize: 12, color: COLOR.textMuted, marginTop: 6, lineHeight: 1.5 }}>
              A IA nunca escreve código: ela propõe mudanças num documento, e cada mudança é conferida contra os campos de {sourceHint} antes de entrar.
            </p>
          </div>
        )}

        {chat.length === 0 && !busy && (
          <div>
            <p style={{ fontSize: 13, color: COLOR.textSecondary, marginBottom: 10 }}>Peça em português. Por exemplo:</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-left rounded-lg transition-colors hover:bg-[var(--wk-hover-strong)]" style={{ fontSize: 13, color: COLOR.text, padding: '8px 10px', border: `1px solid ${COLOR.border}` }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col" style={{ gap: 14 }}>
          {chat.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} className="self-end" style={{ maxWidth: '88%', background: COLOR.userBubble, color: COLOR.text, borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 14, lineHeight: 1.5 }}>
                {m.text}
              </div>
            ) : (
              <Reply key={i} m={m} onUndo={onUndo} undoable={m.version !== undefined && m.version === canUndoVersion} />
            ),
          )}
          {busy && (
            <div className="flex items-center gap-2" style={{ fontSize: 13, color: COLOR.textSecondary }}>
              <Icon name="progress_activity" size={18} color={COLOR.primary} className="wk-spin" />
              Lendo o pedido e conferindo os campos…
            </div>
          )}
          <div ref={endRef} />
        </div>
      </div>

      {/* Sem fio em cima, como no Ask: a caixa do prompt já se recorta sozinha. */}
      <div className="shrink-0" style={{ padding: '8px 12px 12px' }}>
        <Composer onSend={send} provider={provider} onProviderChange={setProvider} disabled={busy} noticeShort={chat.length === 0} />
      </div>
    </aside>
  )
}

function Reply({ m, onUndo, undoable }: { m: Extract<ChatEntry, { role: 'ai' }>; onUndo: (v: number) => void; undoable: boolean }) {
  const nothing = m.applied.length === 0 && m.rejected.length === 0 && m.notes.length === 0
  return (
    <div style={{ fontSize: 13, lineHeight: 1.5, color: COLOR.text }}>
      {m.applied.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.applied.length === 1 ? 'Feito:' : `Feito, ${m.applied.length} mudanças:`}</div>
          <ul className="flex flex-col gap-1">
            {m.applied.map((t, i) => (
              <li key={i} className="flex gap-1.5">
                <Icon name="check" size={18} color={COLOR.ok} weight={500} className="shrink-0" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {m.rejected.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Não apliquei:</div>
          <ul className="flex flex-col gap-1.5">
            {m.rejected.map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <Icon name="block" size={18} color={COLOR.danger} className="shrink-0" />
                <span>
                  <span style={{ color: COLOR.textSecondary }}>{r.text}.</span> {r.reason}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {m.notes.map((n, i) => (
        <div key={i} className="flex gap-1.5" style={{ marginBottom: 6, padding: '8px 10px', borderRadius: 10, background: n.kind === 'refuse' ? 'var(--wk-hover-strong)' : COLOR.tintSoft }}>
          <Icon name={n.kind === 'refuse' ? 'lock' : n.kind === 'info' ? 'info' : 'help'} size={18} color={n.kind === 'refuse' ? COLOR.textSecondary : COLOR.primary} className="shrink-0" />
          <span>{n.text}</span>
        </div>
      ))}
      {nothing && <span style={{ color: COLOR.textSecondary }}>Nada a mudar com esse pedido.</span>}
      {undoable && m.version !== undefined && (
        <button onClick={() => onUndo(m.version! - 1)} className="inline-flex items-center gap-1 hover:underline" style={{ color: COLOR.primary, fontSize: 12, marginTop: 2 }}>
          <Icon name="undo" size={16} color={COLOR.primary} />
          Desfazer
        </button>
      )}
    </div>
  )
}
