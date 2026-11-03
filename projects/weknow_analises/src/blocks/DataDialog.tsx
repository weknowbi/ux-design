import { useState } from 'react'
import { Btn } from '@ds/Btn'
import { fieldBoxStyle, fieldTextStyle } from '@ds/Field'
import { Modal, ModalFooter } from '@ds/Modal'
import { Switch } from '@ds/Switch'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { metadadoOf } from '@/engine/catalog'
import { defaultConfig } from '@/engine/config'
import { DATA } from '@/engine/data'
import { WEKNOW_GUIDE_NAME } from '@/engine/guide'
import * as F from '@/engine/format'
import type { Board, Op } from '@/engine/board'

/**
 * "Dados": de onde o dashboard tira os números e como a IA os lê.
 *
 *   Amostra        as primeiras linhas do metadado no mês do painel, com os
 *                  campos como o cadastro os chama
 *   Configuração   a padrão do metadado, escrita por quem o cadastrou, e o
 *                  switch para escrever outra só para este dashboard
 *
 * A configuração do metadado não se edita daqui: ela vale para todo
 * dashboard feito dele. Sobrescrever muda só este, e a IA passa a seguir o
 * texto novo nos próximos pedidos.
 */
type Tab = 'amostra' | 'config'

const SAMPLE = 12

export function DataDialog({
  board,
  onOps,
  onClose,
  onGuide,
  initialTab = 'amostra',
}: {
  board: Board
  onOps: (o: Op[]) => void
  onClose: () => void
  /** Abre a diretriz visual: é por aqui que se procura depois que o painel existe. */
  onGuide: () => void
  initialTab?: Tab
}) {
  const md = metadadoOf(board.ind)
  const [tab, setTab] = useState<Tab>(initialTab)
  const base = defaultConfig(md)
  const [custom, setCustom] = useState(board.config !== undefined)
  const [text, setText] = useState(board.config ?? base)
  const [focused, setFocused] = useState(false)
  const dirty = custom ? text.trim() !== (board.config ?? '').trim() : board.config !== undefined

  const rows = DATA[board.ind].filter((c) => c.mes === board.mes)
  const fmt = (v: string | number, type: string, name: string) =>
    typeof v === 'number' ? (/valor/.test(name) ? F.money(v) : F.num(v)) : type === 'Data' ? F.monthShort(String(v)) : v

  return (
    <Modal title="Dados do dashboard" width={760} onClose={onClose}>
      <div className="flex flex-col min-h-0" style={{ fontFamily: FONT }}>
        <div className="flex items-start" style={{ gap: 12, padding: '0 24px 16px' }}>
          <span className="shrink-0 flex items-center justify-center rounded-md" style={{ width: 32, height: 32, background: 'color-mix(in srgb, var(--wk-primary) 12%, transparent)' }}>
            <Icon name="database" size={20} color={COLOR.primary} />
          </span>
          <span className="flex flex-col min-w-0" style={{ gap: 2 }}>
            <span style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, color: COLOR.text }}>
              Metadado {md.code} - {md.name}
            </span>
            <span style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
              {md.group} · {md.description}
              {board.from ? ` · dados de “${board.from.dashboard}”` : ''}
            </span>
          </span>
        </div>

        <div role="tablist" className="flex shrink-0" style={{ gap: 4, padding: '0 24px', borderBottom: `1px solid ${COLOR.border}` }}>
          {(
            [
              ['amostra', 'Amostra dos dados'],
              ['config', board.config !== undefined ? 'Configuração (sobrescrita)' : 'Configuração'],
            ] as [Tab, string][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className="relative transition-colors hover:text-[var(--wk-text)]"
              style={{ height: 40, padding: '0 12px', fontSize: 14, fontWeight: tab === id ? 600 : 400, color: tab === id ? COLOR.text : COLOR.textSecondary }}
            >
              {label}
              {tab === id && <span className="absolute left-2 right-2 bottom-[-1px] rounded-full" style={{ height: 3, background: COLOR.primary }} />}
            </button>
          ))}
        </div>

        {/* Corpo de altura fixa (as abas não pulam ao trocar). Termina com
            respiro e o rodapé abre com outro: a tabela cortada pela rolagem
            não encosta no "Fechar". */}
        {/* Na amostra quem rola é a tabela, nas duas direções e com o
            cabeçalho preso: o corpo fica parado e não ganha uma segunda
            rolagem por fora. */}
        <div
          className={tab === 'amostra' ? 'min-h-0 flex flex-col' : 'min-h-0 overflow-y-auto'}
          style={{ padding: '16px 24px', height: 'min(480px, 60vh)' }}
        >
          {tab === 'amostra' ? (
            <>
              <p className="shrink-0" style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: '0 0 10px' }}>
                {SAMPLE} de {F.num(rows.length)} linhas de {F.monthShort(board.mes)}. É daqui que saem todos os números do painel.
              </p>
              <div className="flex-1 min-h-0 overflow-auto rounded-lg" style={{ border: `1px solid ${COLOR.border}` }}>
                <table className="w-full border-collapse" style={{ fontSize: 13, lineHeight: '18px' }}>
                  <thead className="sticky top-0 z-[1]">
                    <tr style={{ background: 'var(--wk-surface-subtle)' }}>
                      {md.fields.map((f) => (
                        <th key={f.name} title={`${f.name} · ${f.type.toLowerCase()}`} className="text-left whitespace-nowrap" style={{ padding: '8px 12px', fontWeight: 600, color: COLOR.textSecondary, textAlign: f.type === 'Número' ? 'right' : 'left', background: 'var(--wk-surface-subtle)' }}>
                          {f.title}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, SAMPLE).map((r, i) => (
                      <tr key={i} style={{ borderTop: `1px solid var(--wk-row-divider)` }}>
                        {md.fields.map((f) => (
                          <td key={f.name} className="whitespace-nowrap" style={{ padding: '7px 12px', color: COLOR.text, textAlign: f.type === 'Número' ? 'right' : 'left', fontVariantNumeric: 'tabular-nums' }}>
                            {fmt(r[f.name], f.type, f.name)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start" style={{ gap: 16, padding: '4px 0 12px' }}>
                <span className="flex-1 flex flex-col" style={{ gap: 2 }}>
                  <span style={{ fontSize: 14, lineHeight: '20px', color: COLOR.text }}>Sobrescrever a configuração padrão neste dashboard</span>
                  <span style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
                    A IA passa a seguir o seu texto nos próximos pedidos. A configuração do metadado continua valendo para os outros dashboards.
                  </span>
                </span>
                <Switch
                  checked={custom}
                  onChange={(v) => {
                    setCustom(v)
                    if (v && board.config === undefined) setText(base)
                  }}
                  label="Sobrescrever a configuração padrão"
                />
              </div>
              {custom ? (
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  aria-label="Configuração deste dashboard"
                  className="block w-full resize-none outline-none"
                  style={{ ...fieldBoxStyle({ focused }), ...fieldTextStyle, height: 340, fontSize: 14, lineHeight: '21px', padding: '12px 14px' }}
                />
              ) : (
                <>
                  <span className="flex items-center" style={{ gap: 6, fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary, marginBottom: 6 }}>
                    <Icon name="lock" size={14} color={COLOR.navLabel} />
                    Padrão do metadado {md.code}
                  </span>
                  <pre className="whitespace-pre-wrap rounded-lg" style={{ margin: 0, padding: '12px 14px', fontFamily: FONT, fontSize: 14, lineHeight: '21px', color: COLOR.text, background: 'var(--wk-surface-subtle)' }}>
                    {base}
                  </pre>
                </>
              )}
              {/* A configuração diz o que mostrar; como mostrar é a diretriz
                  visual, um texto à parte que também se escreve ou se envia
                  em arquivo. */}
              <p className="flex flex-wrap items-center" style={{ gap: 6, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: '12px 0 0' }}>
                <Icon name="palette" size={16} color={COLOR.navLabel} className="shrink-0" />
                <span>
                  Estilo visual: <b style={{ fontWeight: 600, color: COLOR.text }}>{board.guide ? board.guide.name : WEKNOW_GUIDE_NAME}</b>
                </span>
                <button type="button" onClick={onGuide} className="hover:underline" style={{ color: COLOR.primary, fontWeight: 500 }}>
                  Alterar
                </button>
              </p>
            </>
          )}
        </div>
      </div>
      <ModalFooter padTop={16}>
        {tab === 'config' && dirty ? (
          <>
            <Btn variant="ghost" onClick={onClose}>
              Cancelar
            </Btn>
            <Btn
              variant="primary"
              onClick={() => {
                onOps([{ op: 'config', text: custom ? text.trim() : undefined }])
                onClose()
              }}
            >
              {custom ? 'Salvar configuração' : 'Voltar ao padrão'}
            </Btn>
          </>
        ) : (
          <Btn variant="outlined" onClick={onClose}>
            Fechar
          </Btn>
        )}
      </ModalFooter>
    </Modal>
  )
}
