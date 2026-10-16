import { useMemo, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { Button } from '@/components/Button'
import { Dropdown, MenuAction } from '@/components/browser/Menu'
import { FilterChip, SearchField } from '@/components/Hero'
import { Icon } from '@/components/icons'
import { COLOR, FONT } from '@/design/tokens'
import { PALETTES } from '@/engine/palettes'
import { metaLabel, METADADOS } from '@/engine/sources'
import { normalize } from '@/lib/format'
import { go } from '@/lib/router'
import { currentSpec, hasUnpublished, removeDashboard, shareUrl, useDashboards, type Dashboard } from '@/lib/store'
import type { PortalRoute } from '@/components/PortalSidebar'

/**
 * Lista de dashboards, no desenho da home do Portal: título centrado, busca
 * grande, chips de recorte e a grade de cards com miniatura em cima e faixa
 * do nome embaixo. Quem vem do Portal reconhece a tela sem ler nada.
 */

const WIDE_MAX_WIDTH = 1760

type Status = 'todos' | 'publicados' | 'rascunhos'
const CHIPS: { id: Status; icon: string; label: string }[] = [
  { id: 'todos', icon: 'space_dashboard', label: 'Todos' },
  { id: 'publicados', icon: 'public', label: 'Publicados' },
  { id: 'rascunhos', icon: 'edit_note', label: 'Rascunhos' },
]

/** Mesma grade do Portal: mínimo de 260px por card, 16px entre eles. */
const CARD_COLUMNS = { gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }
const CARD =
  'group relative flex flex-col rounded-xl bg-[var(--wk-card-surface)] shadow-[var(--wk-clean-shadow)] hover:bg-[var(--wk-card-surface-hover)] hover:shadow-[var(--wk-clean-shadow-hover)] transition'
const REVEAL = 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 has-[[data-open]]:opacity-100 [@media(hover:none)]:opacity-100'

export function HomeScreen({ onRoute }: { onRoute: (r: PortalRoute) => void }) {
  const list = useDashboards()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<Status>('todos')

  const shown = useMemo(() => {
    const q = normalize(query.trim())
    return list.filter((d) => {
      if (status === 'publicados' && !d.published) return false
      if (status === 'rascunhos' && d.published) return false
      return !q || normalize(currentSpec(d).title).includes(q) || normalize(sourceName(d)).includes(q)
    })
  }, [list, query, status])

  return (
    <AppShell route="dash" onNavigate={onRoute} trail={[{ label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => onRoute('portal') }, { label: 'Weknow Dash' }]}>
      <div className="mx-auto flex flex-col gap-8 px-4 md:px-8 pt-8 pb-24" style={{ maxWidth: WIDE_MAX_WIDTH }}>
        <div className="flex flex-col items-center gap-9">
          <h1 className="text-[30px] font-medium text-center tracking-[-0.5px] leading-[36px]" style={{ fontFamily: FONT, color: COLOR.text }}>
            Dashboards
          </h1>
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="w-full" style={{ maxWidth: 800 }}>
              <SearchField query={query} onQuery={setQuery} placeholder="Pesquise em Dashboards" />
            </div>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {CHIPS.map((c) => (
                <FilterChip key={c.id} icon={c.icon} label={c.label} active={status === c.id} onSelect={() => setStatus(c.id)} />
              ))}
            </div>
          </div>
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-4 min-h-[28px]">
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <Icon name="space_dashboard" size={24} filled color="var(--wk-dashboard-icon)" className="shrink-0" />
              <h3 className="text-[15px] font-semibold leading-[22px]" style={{ fontFamily: FONT, color: COLOR.text }}>
                {query.trim() ? `Resultados para “${query.trim()}”` : status === 'todos' ? 'Todos os dashboards' : CHIPS.find((c) => c.id === status)!.label}
              </h3>
            </div>
            <Button icon="add" onClick={() => go('/novo')}>
              Novo dashboard
            </Button>
          </div>

          {shown.length > 0 ? (
            <div role="list" className="grid gap-4" style={{ ...CARD_COLUMNS, marginTop: 8 }}>
              {shown.map((d) => (
                <DashCard key={d.id} d={d} />
              ))}
            </div>
          ) : (
            <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
              {list.length === 0 ? 'Nenhum dashboard ainda. Comece por “Novo dashboard”.' : 'Nenhum dashboard neste recorte.'}
            </p>
          )}
        </section>
      </div>
    </AppShell>
  )
}

function sourceName(d: Dashboard) {
  if (d.sourceRef.kind === 'arquivo') return d.sourceRef.name
  const ref = d.sourceRef
  const m = METADADOS.find((x) => x.id === ref.id)
  return m ? metaLabel(m) : ref.id
}

/**
 * O card do Portal no modo Expandido: miniatura 2:1 em cima, faixa de 64px
 * com ícone, nome e ⋮ embaixo. A miniatura é um esboço do próprio dashboard
 * (grade, paleta e fundo dele), não uma captura.
 */
function DashCard({ d }: { d: Dashboard }) {
  const spec = currentSpec(d)
  const dark = spec.theme.mode === 'dark'
  const colors = PALETTES[spec.theme.palette][dark ? 'dark' : 'light']
  const block = dark ? '#1a1b1c' : 'var(--wk-card-surface)'
  const status = !d.published ? 'Rascunho' : hasUnpublished(d) ? 'Alterações não publicadas' : 'Publicado'

  return (
    <div role="listitem" className={CARD}>
      <button type="button" onClick={() => go(`/d/${d.id}`)} aria-label={spec.title} className="absolute inset-0 rounded-[inherit] outline-none cursor-pointer focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]" />

      <div className="pointer-events-none aspect-[2/1] overflow-hidden rounded-t-xl" style={{ background: dark ? '#0e0f10' : 'var(--wk-thumb-empty)', padding: '8%' }} aria-hidden>
        <div className="grid h-full" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: '1fr 2.6fr', gap: 6 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ background: block, borderRadius: 4, boxShadow: spec.theme.glow ? `0 0 6px ${colors[0]}88` : undefined }} />
          ))}
          <div style={{ gridColumn: 'span 3', background: block, borderRadius: 4, display: 'flex', alignItems: 'flex-end', gap: 3, padding: 6 }}>
            {[40, 55, 48, 62, 70, 66, 78, 90, 84].map((h, i) => (
              <div key={i} style={{ flex: 1, height: `${h}%`, background: colors[0], borderRadius: 2, opacity: 0.85 }} />
            ))}
          </div>
          <div style={{ background: block, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '62%', aspectRatio: '1', borderRadius: '50%', background: `conic-gradient(${colors[0]} 0 40%, ${colors[1]} 0 65%, ${colors[2]} 0 82%, ${colors[3]} 0)`, mask: 'radial-gradient(circle, transparent 46%, #000 48%)', WebkitMask: 'radial-gradient(circle, transparent 46%, #000 48%)' }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-4 pr-2" style={{ height: 64 }}>
        <span className="shrink-0 flex items-center justify-center rounded-lg pointer-events-none" style={{ width: 26, height: 26, background: 'color-mix(in srgb, var(--wk-dashboard-icon) var(--wk-icon-tint), var(--wk-card-surface))' }}>
          <Icon name={d.sourceRef.kind === 'metadado' ? 'space_dashboard' : 'description'} size={20} weight={350} color="var(--wk-dashboard-icon)" />
        </span>
        <span className="pointer-events-none flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <span className="truncate text-[14px] leading-[18px]" style={{ fontFamily: FONT, color: COLOR.text }}>
            {spec.title}
          </span>
          <span className="truncate text-[12px] leading-[16px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
            {sourceName(d)} · {status}
          </span>
        </span>
        <span className={`relative z-10 has-[[data-open]]:z-30 shrink-0 ${REVEAL}`}>
          <Dropdown
            minWidth={200}
            trigger={({ toggle }) => (
              <button type="button" onClick={toggle} title="Mais ações" aria-label={`Mais ações de ${spec.title}`} className="wk-icon-btn flex items-center justify-center rounded-full" style={{ width: 28, height: 28 }}>
                <Icon name="more_vert" size={20} />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuAction icon="edit" label="Abrir para editar" onSelect={() => go(`/d/${d.id}`)} />
                {d.published && (
                  <MenuAction
                    icon="open_in_new"
                    label="Abrir link publicado"
                    onSelect={() => {
                      window.open(shareUrl(d.id), '_blank', 'noopener')
                      close()
                    }}
                  />
                )}
                <MenuAction
                  icon="delete"
                  label="Excluir"
                  onSelect={() => {
                    close()
                    if (window.confirm(`Excluir “${spec.title}”? O link publicado deixa de funcionar.`)) removeDashboard(d.id)
                  }}
                />
              </>
            )}
          </Dropdown>
        </span>
      </div>
    </div>
  )
}
