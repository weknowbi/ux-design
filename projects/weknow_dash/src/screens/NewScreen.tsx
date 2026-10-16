import { useRef, useState, type DragEvent } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/Button'
import { Icon } from '@/components/icons'
import { COLOR, FONT } from '@/design/tokens'
import { interpret } from '@/engine/interpreter'
import { applyOps, validate } from '@/engine/patch'
import { isDimension, isMeasure, plan, profile } from '@/engine/planner'
import { loadMetadado, metaLabel, METADADOS, sampleCsv, sourceFromCsv } from '@/engine/sources'
import type { Source } from '@/engine/types'
import { go } from '@/lib/router'
import { createDashboard, pushChat, registerFile, type SourceRef } from '@/lib/store'
import type { PortalRoute } from '@/components/PortalSidebar'

type Tab = 'metadado' | 'arquivo'
type Step = { label: string; detail?: string }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const TYPE_LABEL: Record<string, string> = { number: 'Número', text: 'Texto', date: 'Data', boolean: 'Sim/não' }

/**
 * Gerar um dashboard: de onde vêm os dados e, se quiser, o que importa.
 *
 * O pedido é opcional. Sem ele o dashboard sai do rascunho padrão; com ele,
 * o pedido passa pelo mesmo intérprete do editor — "foco em vendedores,
 * paleta neon" já chega aplicado.
 */
export function NewScreen({ onRoute }: { onRoute: (r: PortalRoute) => void }) {
  const [tab, setTab] = useState<Tab>('metadado')
  const [metaId, setMetaId] = useState<string | null>(null)
  const [file, setFile] = useState<{ source: Source; text: string } | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [steps, setSteps] = useState<Step[] | null>(null)
  const [done, setDone] = useState(0)
  const [tried, setTried] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const [drag, setDrag] = useState(false)

  const meta = METADADOS.find((m) => m.id === metaId)
  const ready = tab === 'metadado' ? !!meta && !meta.failed : !!file

  const readFile = async (f: File) => {
    setFileError(null)
    if (!/\.(csv|txt)$/i.test(f.name)) {
      setFileError(/\.xlsx?$/i.test(f.name) ? 'Este protótipo lê CSV. No Excel: Arquivo › Salvar como › CSV (separado por ponto e vírgula).' : 'Envie um arquivo .csv.')
      return
    }
    try {
      const text = await f.text()
      setFile({ source: sourceFromCsv(f.name, text), text })
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Não consegui ler o arquivo.')
    }
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDrag(false)
    const f = e.dataTransfer.files[0]
    if (f) readFile(f)
  }

  const generate = async () => {
    setTried(true)
    if (!ready) return
    let src: Source | null
    let ref: SourceRef
    if (tab === 'metadado') {
      src = loadMetadado(meta!.id)
      ref = { kind: 'metadado', id: meta!.id }
    } else {
      src = file!.source
      ref = registerFile(file!.source, file!.text)
    }
    if (!src) return

    const prof = profile(src)
    const dates = prof.filter((f) => f.type === 'date').length
    const measures = prof.filter(isMeasure).length
    const dims = prof.filter(isDimension).length
    const list: Step[] = [
      { label: tab === 'metadado' ? 'Lendo o metadado' : 'Lendo o arquivo', detail: `${src.rows.length.toLocaleString('pt-BR')} linhas, ${src.fields.length} campos` },
      { label: 'Classificando os campos', detail: `${dates} de data, ${measures} medidas, ${dims} categorias` },
      { label: 'Montando indicadores e gráficos' },
      ...(prompt.trim() ? [{ label: 'Aplicando o seu pedido' }] : []),
      { label: 'Conferindo filtros e totais' },
    ]
    setSteps(list)
    setDone(0)

    let spec = plan(src)
    let result: ReturnType<typeof applyOps> | null = null
    let notes: ReturnType<typeof interpret>['notes'] = []
    for (let i = 0; i < list.length; i++) {
      await sleep(i === 0 ? 450 : 650)
      if (list[i].label === 'Montando indicadores e gráficos') {
        const kpis = spec.widgets.filter((w) => w.kind === 'kpi').length
        list[i] = { ...list[i], detail: `${kpis} indicadores, ${spec.widgets.length - kpis - 1} gráficos e a tabela de detalhe` }
      }
      if (list[i].label === 'Aplicando o seu pedido') {
        const it = interpret(prompt, spec, src)
        notes = it.notes
        result = applyOps(spec, it.ops, src)
        spec = result.spec
        list[i] = { ...list[i], detail: `${result.applied.length} ajuste${result.applied.length === 1 ? '' : 's'} aplicado${result.applied.length === 1 ? '' : 's'}` }
      }
      if (list[i].label === 'Conferindo filtros e totais') {
        const errors = validate(spec, src)
        list[i] = { ...list[i], detail: errors.length ? `${errors.length} problema(s)` : 'Tudo certo' }
      }
      setSteps([...list])
      setDone(i + 1)
    }
    await sleep(350)

    const id = createDashboard(ref, spec, prompt.trim() || undefined)
    if (prompt.trim() && result) {
      pushChat(id, { role: 'user', text: prompt.trim(), at: Date.now() })
      pushChat(id, { role: 'ai', at: Date.now(), applied: result.applied.map((a) => a.text), rejected: result.rejected.map((r) => ({ text: r.text, reason: r.reason })), notes })
    }
    go(`/d/${id}`)
  }

  return (
    <AppShell
      route="dash"
      onNavigate={onRoute}
      trail={[
        { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => onRoute('portal') },
        { label: 'Weknow Dash', onClick: () => go(null) },
        { label: 'Novo dashboard' },
      ]}
    >
      <div className="mx-auto w-full px-6" style={{ maxWidth: 720, paddingBlock: 40 }}>
        {steps ? (
          <Progress steps={steps} done={done} />
        ) : (
          <>
            <h1 className="text-center" style={{ fontFamily: FONT, fontSize: 26, lineHeight: '36px', fontWeight: 400, color: COLOR.text }}>
              De onde vêm os dados?
            </h1>
            <p className="text-center" style={{ fontFamily: FONT, fontSize: 14, color: COLOR.textSecondary, marginTop: 6 }}>
              O dashboard sai pronto, com filtro de período, filtro por clique e tabela de detalhe.
            </p>

            <div role="tablist" className="flex justify-center gap-1" style={{ marginTop: 28, marginBottom: 16 }}>
              {(['metadado', 'arquivo'] as Tab[]).map((t) => (
                <button
                  key={t}
                  role="tab"
                  aria-selected={tab === t}
                  onClick={() => setTab(t)}
                  className={`px-3 py-1.5 text-[13px] rounded-md font-medium transition-colors ${tab === t ? '' : 'hover:bg-[var(--wk-hover)]'}`}
                  style={{ fontFamily: FONT, background: tab === t ? COLOR.pillActive : 'transparent', color: tab === t ? COLOR.text : COLOR.textSecondary }}
                >
                  {t === 'metadado' ? 'Metadado' : 'Arquivo'}
                </button>
              ))}
            </div>

            {tab === 'metadado' ? (
              <div role="radiogroup" aria-label="Metadado" className="flex flex-col" style={{ gap: 8 }}>
                {METADADOS.map((m) => {
                  const on = metaId === m.id
                  return (
                    <button
                      key={m.id}
                      role="radio"
                      aria-checked={on}
                      onClick={() => setMetaId(m.id)}
                      className="w-full text-left flex items-center gap-3 transition-colors"
                      style={{
                        fontFamily: FONT,
                        padding: '12px 14px',
                        borderRadius: 10,
                        border: `1px solid ${on ? (m.failed ? COLOR.danger : COLOR.primary) : 'var(--wk-card-border)'}`,
                        background: on ? (m.failed ? 'transparent' : COLOR.tintSoft) : 'var(--wk-surface)',
                      }}
                    >
                      <Icon name="database" size={24} color={m.failed ? COLOR.danger : on ? COLOR.primary : COLOR.navLabel} />
                      <span className="flex-1 min-w-0">
                        <span className="block truncate" style={{ fontSize: 15, color: COLOR.text }}>
                          {metaLabel(m)}
                        </span>
                        <span className="block truncate" style={{ fontSize: 12, color: m.failed && on ? COLOR.danger : COLOR.textMuted, marginTop: 2 }}>
                          {m.failed ? 'A última execução deste metadado deu erro. Corrija no Weknow antes de gerar.' : `${m.group} · ${m.rowsHint}`}
                        </span>
                      </span>
                      {on && !m.failed && <Icon name="check_circle" size={22} filled color={COLOR.primary} />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div>
                <div
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDrag(true)
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={onDrop}
                  className="flex flex-col items-center justify-center text-center"
                  style={{ fontFamily: FONT, minHeight: 160, borderRadius: 12, border: `1.5px dashed ${drag ? COLOR.primary : 'var(--wk-field-border)'}`, background: drag ? COLOR.tintSoft : 'var(--wk-surface-subtle)', padding: 20, gap: 8 }}
                >
                  {file ? (
                    <>
                      <Icon name="description" size={32} color={COLOR.primary} />
                      <div style={{ fontSize: 15, color: COLOR.text }}>{file.source.group}</div>
                      <div style={{ fontSize: 13, color: COLOR.textSecondary }}>
                        {file.source.rows.length.toLocaleString('pt-BR')} linhas · {file.source.fields.length} colunas
                      </div>
                      <button onClick={() => inputRef.current?.click()} style={{ fontSize: 13, color: COLOR.primary }} className="hover:underline">
                        Trocar arquivo
                      </button>
                    </>
                  ) : (
                    <>
                      <Icon name="upload_file" size={32} color={COLOR.navLabel} />
                      <div style={{ fontSize: 15, color: COLOR.text }}>Arraste um CSV aqui</div>
                      <div style={{ fontSize: 13, color: COLOR.textSecondary }}>
                        ou{' '}
                        <button onClick={() => inputRef.current?.click()} style={{ color: COLOR.primary }} className="hover:underline">
                          escolha no computador
                        </button>{' '}
                        ·{' '}
                        <button
                          onClick={() => {
                            const s = sampleCsv()
                            setFileError(null)
                            setFile({ source: sourceFromCsv(s.name, s.text), text: s.text })
                          }}
                          style={{ color: COLOR.primary }}
                          className="hover:underline"
                        >
                          usar um exemplo
                        </button>
                      </div>
                    </>
                  )}
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) readFile(f)
                      e.target.value = ''
                    }}
                  />
                </div>
                {fileError && <p style={{ fontFamily: FONT, fontSize: 13, color: COLOR.danger, marginTop: 8 }}>{fileError}</p>}
                {file && (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ fontFamily: FONT, fontSize: 12, color: COLOR.textMuted, marginBottom: 6 }}>Tipos identificados nas colunas do arquivo:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {file.source.fields.map((f) => (
                        <span key={f.name} className="inline-flex items-center gap-1" style={{ fontFamily: FONT, fontSize: 12, height: 24, padding: '0 8px', borderRadius: 6, background: 'var(--wk-hover-strong)', color: COLOR.textSecondary }}>
                          <span style={{ color: COLOR.text }}>{f.title}</span>
                          <span style={{ color: COLOR.textMuted }}>· {f.key ? 'Identificador' : TYPE_LABEL[f.type]}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tried && !ready && (
              <p style={{ fontFamily: FONT, fontSize: 13, color: COLOR.danger, marginTop: 8 }}>
                {tab === 'metadado' ? (meta?.failed ? 'Este metadado está com erro. Escolha outro.' : 'Escolha um metadado.') : 'Envie um arquivo ou use o exemplo.'}
              </p>
            )}

            <label className="block" style={{ marginTop: 28 }}>
              <span style={{ fontFamily: FONT, fontSize: 16, color: COLOR.text }}>O que você quer acompanhar?</span>
              <span style={{ fontFamily: FONT, fontSize: 13, color: COLOR.textMuted, marginLeft: 6 }}>opcional</span>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="Ex.: inclua um gráfico de lucro por vendedor, paleta neon com fundo escuro e brilho nos indicadores"
                className="w-full mt-2 outline-none resize-none focus:border-[var(--wk-primary)]"
                style={{ fontFamily: FONT, fontSize: 15, lineHeight: 1.5, color: COLOR.text, border: '1px solid var(--wk-field-border)', borderRadius: 8, padding: '10px 12px', background: 'var(--wk-surface)' }}
              />
            </label>

            <div className="flex justify-end gap-2" style={{ marginTop: 16 }}>
              <Button variant="ghost" onClick={() => go(null)}>
                Cancelar
              </Button>
              <Button icon="auto_awesome" onClick={generate}>
                Gerar dashboard
              </Button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}

function Progress({ steps, done }: { steps: Step[]; done: number }) {
  return (
    <div style={{ fontFamily: FONT, paddingTop: 40 }} aria-live="polite">
      <h1 className="text-center" style={{ fontSize: 26, lineHeight: '36px', fontWeight: 400, color: COLOR.text, marginBottom: 28 }}>
        Montando o dashboard
      </h1>
      <ol className="mx-auto flex flex-col" style={{ maxWidth: 440, gap: 14 }}>
        {steps.map((s, i) => {
          const state = i < done ? 'done' : i === done ? 'doing' : 'todo'
          return (
            <li key={s.label} className="flex items-start gap-3" style={{ opacity: state === 'todo' ? 0.45 : 1, transition: 'opacity .3s' }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24 }}>
                {state === 'done' ? (
                  <Icon name="check_circle" size={22} filled color={COLOR.ok} />
                ) : state === 'doing' ? (
                  <Icon name="progress_activity" size={22} color={COLOR.primary} className="wk-spin" />
                ) : (
                  <Icon name="radio_button_unchecked" size={22} color={COLOR.textMuted} />
                )}
              </span>
              <span>
                <span className="block" style={{ fontSize: 15, color: COLOR.text }}>
                  {s.label}
                </span>
                {s.detail && state === 'done' && (
                  <span className="block" style={{ fontSize: 13, color: COLOR.textSecondary, marginTop: 2 }}>
                    {s.detail}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
