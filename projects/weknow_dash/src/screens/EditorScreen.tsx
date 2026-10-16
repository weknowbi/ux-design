import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/Button'
import { Dropdown } from '@/components/browser/Menu'
import { Icon } from '@/components/icons'
import { COLOR, FONT } from '@/design/tokens'
import { useIsMobile, useMediaQuery } from '@/design/viewport'
import { interpret } from '@/engine/interpreter'
import { applyOps, validate } from '@/engine/patch'
import { audit } from '@/engine/query'
import { metaLabel, METADADOS } from '@/engine/sources'
import type { FilterState } from '@/engine/types'
import { defaultFilters } from '@/engine/query'
import { Dashboard } from '@/dash/Dashboard'
import { go } from '@/lib/router'
import {
  commit, currentSpec, goToVersion, hasUnpublished, publish, pushChat, resolveSource, shareUrl, unpublish,
  useChat, useDashboard, type Dashboard as Dash,
} from '@/lib/store'
import { AiPanel } from '@/screens/AiPanel'
import type { PortalRoute } from '@/components/PortalSidebar'

const PANEL_W = 380
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const when = (ms: number) => new Date(ms).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

export function EditorScreen({ id, onRoute }: { id: string; onRoute: (r: PortalRoute) => void }) {
  const d = useDashboard(id)
  const chat = useChat(id)
  const isMobile = useIsMobile()
  /* Painel ao lado só quando sobra espaço para o dashboard respirar; abaixo
     disso ele abre por cima, como gaveta. */
  const docked = useMediaQuery('(min-width: 1280px)')
  const [panel, setPanel] = useState(docked)
  const [busy, setBusy] = useState(false)
  const [flash, setFlash] = useState<Set<string>>(new Set())
  const flashTimer = useRef<number>(0)

  const source = useMemo(() => (d ? resolveSource(d.sourceRef) : null), [d?.sourceRef]) // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<FilterState>(() => (d && source ? defaultFilters(source, d.versions[d.current].spec.dateField) : { period: { preset: 'all' }, dims: {} }))

  useEffect(() => () => window.clearTimeout(flashTimer.current), [])

  const trail = [
    { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => onRoute('portal') },
    { label: 'Weknow Dash', onClick: () => go(null) },
    { label: d ? currentSpec(d).title : 'Dashboard' },
  ]

  if (!d || !source) {
    return (
      <AppShell route="dash" onNavigate={onRoute} trail={trail}>
        <div className="flex flex-col items-center text-center" style={{ fontFamily: FONT, paddingTop: 96, gap: 12 }}>
          <Icon name={d ? 'cloud_off' : 'search_off'} size={48} color={COLOR.textMuted} />
          <p style={{ fontSize: 16, color: COLOR.text }}>{d ? 'O arquivo deste dashboard não está mais neste navegador.' : 'Dashboard não encontrado.'}</p>
          <p style={{ fontSize: 14, color: COLOR.textSecondary, maxWidth: 440 }}>
            {d ? 'No protótipo, arquivos grandes não ficam guardados depois de fechar a aba. Gere de novo a partir do arquivo.' : 'Ele pode ter sido excluído.'}
          </p>
          <Button variant="outlined" onClick={() => go(null)}>
            Voltar aos dashboards
          </Button>
        </div>
      </AppShell>
    )
  }

  const spec = currentSpec(d)
  const errors = validate(spec, source)
  const sourceName = d.sourceRef.kind === 'metadado' ? metaLabel(METADADOS.find((m) => m.id === (d.sourceRef as { id: string }).id) ?? { name: source.name }) : source.group

  const onSend = async (text: string) => {
    pushChat(id, { role: 'user', text, at: Date.now() })
    setBusy(true)
    await sleep(650)
    const it = interpret(text, spec, source)
    const res = applyOps(spec, it.ops, source)
    let version: number | undefined
    if (res.applied.length) {
      version = commit(id, res.spec, res.applied.map((a) => a.text).join(' · '), 'ia', text)
      // Pisca o que mudou: blocos novos e blocos editados.
      const before = new Map(spec.widgets.map((w) => [w.id, JSON.stringify(w)]))
      const changed = res.spec.widgets.filter((w) => before.get(w.id) !== JSON.stringify(w)).map((w) => w.id)
      const themeChanged = JSON.stringify(spec.theme) !== JSON.stringify(res.spec.theme)
      setFlash(new Set(themeChanged && !changed.length ? res.spec.widgets.filter((w) => w.kind === 'kpi').map((w) => w.id) : changed))
      window.clearTimeout(flashTimer.current)
      flashTimer.current = window.setTimeout(() => setFlash(new Set()), 1500)
    }
    pushChat(id, { role: 'ai', at: Date.now(), applied: res.applied.map((a) => a.text), rejected: res.rejected.map((r) => ({ text: r.text, reason: r.reason })), notes: it.notes, version })
    setBusy(false)
  }

  const panelEl = (
    <AiPanel
      chat={chat}
      busy={busy}
      onSend={onSend}
      onUndo={(v) => goToVersion(id, v)}
      canUndoVersion={d.current}
      onClose={() => setPanel(false)}
      sourceHint={sourceName}
    />
  )

  return (
    <AppShell route="dash" onNavigate={onRoute} trail={trail}>
      <div className="h-full flex flex-col" style={{ fontFamily: FONT }}>
        <Toolbar d={d} sourceName={sourceName} rows={source.rows.length} filters={filters} panel={panel} onPanel={() => setPanel((v) => !v)} source={source} />

        <div className="flex-1 min-h-0 flex relative">
          <div className="flex-1 min-w-0 overflow-y-auto" style={{ padding: isMobile ? '0 12px 24px' : '0 24px 32px' }}>
            {errors.length > 0 && (
              <div role="alert" style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 10, border: `1px solid ${COLOR.danger}`, color: COLOR.danger, fontSize: 13 }}>
                {errors[0]}
              </div>
            )}
            <Dashboard spec={spec} source={source} filters={filters} onFilters={setFilters} flash={flash} />
          </div>

          {panel && !isMobile && (
            <div
              className={docked ? 'shrink-0 h-full' : 'absolute top-0 right-0 bottom-0 z-40'}
              style={{ width: PANEL_W, borderLeft: `1px solid ${COLOR.border}`, boxShadow: docked ? undefined : '-8px 0 24px rgba(15,23,42,.12)' }}
            >
              {panelEl}
            </div>
          )}
        </div>
      </div>

      {panel && isMobile && (
        <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--wk-surface)' }}>
          {panelEl}
        </div>
      )}
    </AppShell>
  )
}

/* ── Barra do dashboard ───────────────────────────────────────────────────── */

function Toolbar({ d, sourceName, rows, filters, panel, onPanel, source }: { d: Dash; sourceName: string; rows: number; filters: FilterState; panel: boolean; onPanel: () => void; source: NonNullable<ReturnType<typeof resolveSource>> }) {
  const spec = currentSpec(d)
  const checks = useMemo(() => audit(spec, source, filters), [spec, source, filters])
  const ok = checks.filter((c) => c.ok).length
  const all = ok === checks.length

  return (
    <div className="shrink-0 flex items-center gap-3 flex-wrap" style={{ padding: '16px 24px 14px' }}>
      <div className="flex-1 min-w-[220px]">
        <h1 className="truncate" style={{ fontSize: 22, lineHeight: '30px', fontWeight: 400, color: COLOR.text }}>
          {spec.title}
        </h1>
        <div className="flex items-center gap-2 flex-wrap" style={{ fontSize: 12, color: COLOR.textSecondary, marginTop: 2 }}>
          <span className="inline-flex items-center gap-1">
            <Icon name={d.sourceRef.kind === 'metadado' ? 'database' : 'description'} size={16} color={COLOR.textMuted} />
            {sourceName}
          </span>
          <span style={{ color: COLOR.textMuted }}>· {rows.toLocaleString('pt-BR')} linhas</span>
          <span style={{ color: COLOR.textMuted }}>
            · versão {d.current + 1} de {d.versions.length}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <IconBtn icon="undo" label="Desfazer" disabled={d.current === 0} onClick={() => goToVersion(d.id, d.current - 1)} />
        <IconBtn icon="redo" label="Refazer" disabled={d.current >= d.versions.length - 1} onClick={() => goToVersion(d.id, d.current + 1)} />

        <Dropdown
          minWidth={340}
          trigger={({ toggle, open }) => (
            <button onClick={toggle} aria-expanded={open} className="inline-flex items-center gap-1.5 rounded-lg hover:bg-[var(--wk-hover-strong)]" style={{ height: 36, padding: '0 10px', fontSize: 13, color: all ? COLOR.ok : COLOR.danger }} title="Conferências de filtros e totais">
              <Icon name={all ? 'verified' : 'error'} size={20} filled color={all ? COLOR.ok : COLOR.danger} />
              <span style={{ color: COLOR.textSecondary }}>
                {ok}/{checks.length} conferências
              </span>
            </button>
          )}
        >
          {() => (
            <div style={{ padding: 8, maxWidth: 380, fontFamily: FONT }}>
              <p style={{ fontSize: 12, color: COLOR.textMuted, marginBottom: 8, lineHeight: 1.5 }}>Refeitas a cada filtro, com os números de agora, e não só quando o dashboard nasceu.</p>
              {checks.map((c, i) => (
                <div key={i} className="flex gap-2" style={{ padding: '6px 0' }}>
                  <Icon name={c.ok ? 'check_circle' : 'cancel'} size={18} filled color={c.ok ? COLOR.ok : COLOR.danger} className="shrink-0" />
                  <div>
                    <div style={{ fontSize: 13, color: COLOR.text }}>{c.label}</div>
                    <div style={{ fontSize: 12, color: COLOR.textSecondary }}>{c.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Dropdown>

        <Dropdown
          minWidth={320}
          trigger={({ toggle, open }) => <IconBtn icon="history" label="Versões" onClick={toggle} pressed={open} />}
        >
          {(close) => (
            <div style={{ padding: 4, fontFamily: FONT, maxHeight: 360 }}>
              <p style={{ fontSize: 12, color: COLOR.textMuted, padding: '4px 8px 8px' }}>Toda mudança vira uma versão. Voltar a uma não apaga as outras.</p>
              {[...d.versions].map((v, i) => ({ v, i })).reverse().map(({ v, i }) => (
                <button
                  key={i}
                  onClick={() => {
                    goToVersion(d.id, i)
                    close()
                  }}
                  className="w-full text-left flex gap-2 rounded-md hover:bg-[var(--wk-menu-hover)]"
                  style={{ padding: '8px', background: i === d.current ? COLOR.tintSoft : undefined }}
                >
                  <Icon name={v.author === 'gerado' ? 'auto_awesome' : v.author === 'ia' ? 'chat' : 'edit'} size={18} color={COLOR.navLabel} className="shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: COLOR.textMuted }}>
                      Versão {i + 1} · {when(v.at)}
                      {i === d.current && <Badge>atual</Badge>}
                      {d.published?.version === i && <Badge ok>publicada</Badge>}
                    </span>
                    <span className="block" style={{ fontSize: 13, color: COLOR.text, lineHeight: 1.45, marginTop: 2 }}>
                      {v.note}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </Dropdown>

        <PublishControl d={d} />

        {!panel && (
          <Button icon="auto_awesome" variant="outlined" onClick={onPanel}>
            Editar com IA
          </Button>
        )}
      </div>
    </div>
  )
}

function Badge({ children, ok }: { children: string; ok?: boolean }) {
  return (
    <span style={{ fontSize: 11, padding: '0 6px', borderRadius: 4, lineHeight: '18px', background: ok ? 'color-mix(in srgb, var(--wk-ok) 14%, transparent)' : 'var(--wk-hover-strong)', color: ok ? COLOR.ok : COLOR.textSecondary }}>
      {children}
    </span>
  )
}

function IconBtn({ icon, label, onClick, disabled, pressed }: { icon: string; label: string; onClick: () => void; disabled?: boolean; pressed?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={pressed}
      className="flex items-center justify-center rounded-lg hover:bg-[var(--wk-hover-strong)] disabled:hover:bg-transparent"
      style={{ width: 36, height: 36, opacity: disabled ? 0.35 : 1 }}
    >
      <Icon name={icon} size={22} color={COLOR.textSecondary} />
    </button>
  )
}

/**
 * Publicar. O link é um só, para sempre: "Publicar alterações" move a versão
 * publicada para a atual sem trocar o endereço — quem já tem o link passa a
 * ver a versão nova, sem despublicar nem gerar outro.
 */
function PublishControl({ d }: { d: Dash }) {
  const [copied, setCopied] = useState(false)
  const url = shareUrl(d.id)
  const pending = hasUnpublished(d)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      window.prompt('Copie o link:', url)
    }
  }

  return (
    <Dropdown
      minWidth={340}
      trigger={({ toggle }) =>
        !d.published ? (
          <Button icon="public" onClick={() => {
            publish(d.id)
            toggle()
          }}>
            Publicar
          </Button>
        ) : pending ? (
          <Button icon="publish" onClick={toggle}>
            Publicar alterações
          </Button>
        ) : (
          <Button icon="check" variant="ghost" onClick={toggle}>
            Publicado
          </Button>
        )
      }
    >
      {(close) => (
        <div style={{ padding: 10, fontFamily: FONT, width: 340 }}>
          {pending ? (
            <>
              <p style={{ fontSize: 13, color: COLOR.text, lineHeight: 1.5 }}>
                Quem tem o link vê a versão {d.published!.version + 1}. Você está na versão {d.current + 1}.
              </p>
              <div className="flex justify-end gap-2" style={{ marginTop: 10 }}>
                <Button variant="ghost" onClick={close}>
                  Agora não
                </Button>
                <Button icon="publish" onClick={() => publish(d.id)}>
                  Publicar versão {d.current + 1}
                </Button>
              </div>
              <hr style={{ border: 0, borderTop: `1px solid ${COLOR.border}`, margin: '12px -10px' }} />
            </>
          ) : (
            <p style={{ fontSize: 13, color: COLOR.text, marginBottom: 8 }}>
              Publicado · versão {d.published!.version + 1} · {when(d.published!.at)}
            </p>
          )}
          <p style={{ fontSize: 12, color: COLOR.textMuted, marginBottom: 6 }}>Link do dashboard, o mesmo a cada publicação:</p>
          <div className="flex items-center gap-1.5">
            <input readOnly value={url} onFocus={(e) => e.target.select()} className="flex-1 min-w-0 outline-none" style={{ height: 34, fontSize: 12, padding: '0 10px', borderRadius: 8, border: `1px solid var(--wk-field-border)`, background: 'var(--wk-surface-subtle)', color: COLOR.text }} />
            <IconBtn icon={copied ? 'check' : 'content_copy'} label={copied ? 'Copiado' : 'Copiar link'} onClick={copy} />
            <IconBtn icon="open_in_new" label="Abrir como quem recebe o link" onClick={() => window.open(url, '_blank', 'noopener')} />
          </div>
          <button
            onClick={() => {
              unpublish(d.id)
              close()
            }}
            className="hover:underline"
            style={{ fontSize: 12, color: COLOR.danger, marginTop: 10 }}
          >
            Despublicar (o link para de funcionar)
          </button>
        </div>
      )}
    </Dropdown>
  )
}
