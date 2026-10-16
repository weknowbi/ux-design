import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { bucketLabel, formatDate } from '@/engine/format'
import { cellKey, type DateBounds } from '@/engine/query'
import type { FilterState, PeriodPreset, Source } from '@/engine/types'

/**
 * Barra de filtros — fixa em todo dashboard, numa linha acima dos gráficos.
 *
 * Período primeiro: é o filtro que todo mundo procura. Depois as categorias
 * que o dashboard oferece, e por fim o que está ativo, com "Limpar filtros"
 * sempre que houver algo para limpar. Filtro que nasceu de um clique num
 * gráfico aparece aqui também — a barra é a única verdade do recorte.
 */

const PRESETS: { id: PeriodPreset; label: string }[] = [
  { id: 'all', label: 'Todo o período' },
  { id: '30d', label: 'Últimos 30 dias' },
  { id: '90d', label: 'Últimos 90 dias' },
  { id: '12m', label: 'Últimos 12 meses' },
  { id: 'ytd', label: 'Este ano' },
]

export function periodLabel(f: FilterState): string {
  const p = f.period
  if (p.preset !== 'custom') return PRESETS.find((x) => x.id === p.preset)!.label
  if (p.from && p.to && p.from.slice(0, 7) === p.to.slice(0, 7) && p.from.endsWith('-01')) return bucketLabel(p.from.slice(0, 7), 'month', true)
  return `${formatDate(p.from ?? '')} – ${formatDate(p.to ?? '')}`
}

function Popover({ trigger, children, width = 240 }: { trigger: (o: { open: boolean; toggle: () => void }) => ReactNode; children: (close: () => void) => ReactNode; width?: number }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          className="absolute left-0 z-30 mt-1"
          style={{ width, background: 'var(--d-card)', border: '1px solid var(--d-card-border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(15,23,42,.16)', padding: 4 }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

function Trigger({ icon, label, value, active, open, onClick }: { icon: string; label: string; value?: string; active: boolean; open: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className="inline-flex items-center gap-1.5 dash-hover"
      style={{
        height: 34,
        padding: '0 10px 0 8px',
        borderRadius: 999,
        border: `1px solid ${active ? 'var(--d-accent)' : 'var(--d-card-border)'}`,
        background: 'var(--d-card)',
        color: 'var(--d-text)',
        fontSize: 13,
        whiteSpace: 'nowrap',
      }}
    >
      <span className="wk-icon" aria-hidden style={{ fontSize: 18, color: active ? 'var(--d-accent)' : 'var(--d-muted)' }}>
        {icon}
      </span>
      <span style={{ color: 'var(--d-text-2)' }}>{label}</span>
      {value && <span style={{ fontWeight: 600 }}>{value}</span>}
      <span className="wk-icon" aria-hidden style={{ fontSize: 18, color: 'var(--d-muted)' }}>
        expand_more
      </span>
    </button>
  )
}

function Option({ checked, label, onClick, hint }: { checked: boolean; label: string; onClick: () => void; hint?: string }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2 rounded-md dash-hover text-left" style={{ height: 34, padding: '0 8px', fontSize: 13, color: 'var(--d-text)' }}>
      <span className="wk-icon" aria-hidden style={{ fontSize: 16, width: 16, color: 'var(--d-accent)', fontVariationSettings: "'wght' 600" }}>
        {checked ? 'check' : ''}
      </span>
      <span className="flex-1 min-w-0 truncate" style={{ fontWeight: checked ? 600 : 400 }}>
        {label}
      </span>
      {hint && <span style={{ fontSize: 11, color: 'var(--d-muted)' }}>{hint}</span>}
    </button>
  )
}

export function FilterBar({
  source,
  fields,
  bounds,
  filters,
  defaults,
  onChange,
}: {
  source: Source
  fields: string[]
  bounds: DateBounds | null
  filters: FilterState
  /** Para onde "Limpar filtros" volta — o recorte com que o dashboard abre. */
  defaults: FilterState
  onChange: (f: FilterState) => void
}) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const activeDims = Object.entries(filters.dims).filter(([, v]) => v.length)
  const periodChanged = filters.period.preset !== defaults.period.preset
  const any = activeDims.length > 0 || periodChanged
  const title = (n: string) => source.fields.find((f) => f.name === n)?.title ?? n

  const setDim = (field: string, vals: string[]) => onChange({ ...filters, dims: { ...filters.dims, [field]: vals } })

  return (
    <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
      {bounds && (
        <Popover
          width={260}
          trigger={({ open, toggle }) => <Trigger icon="calendar_month" label="Período" value={periodLabel(filters)} active={periodChanged} open={open} onClick={toggle} />}
        >
          {(close) => (
            <>
              {PRESETS.map((p) => (
                <Option
                  key={p.id}
                  checked={filters.period.preset === p.id}
                  label={p.label}
                  onClick={() => {
                    onChange({ ...filters, period: { preset: p.id } })
                    close()
                  }}
                />
              ))}
              <div style={{ borderTop: '1px solid var(--d-card-border)', margin: '4px -4px 0', padding: '8px 12px 6px' }}>
                <div style={{ fontSize: 11, color: 'var(--d-muted)', marginBottom: 6 }}>
                  Intervalo (a base vai de {formatDate(bounds.min)} a {formatDate(bounds.max)})
                </div>
                <div className="flex items-center gap-1.5">
                  <input type="date" aria-label="De" value={from || filters.period.from || bounds.min} min={bounds.min} max={bounds.max} onChange={(e) => setFrom(e.target.value)} className="dash-input" />
                  <input type="date" aria-label="Até" value={to || filters.period.to || bounds.max} min={bounds.min} max={bounds.max} onChange={(e) => setTo(e.target.value)} className="dash-input" />
                </div>
                <button
                  className="mt-2 w-full rounded-md"
                  style={{ height: 30, fontSize: 13, background: 'var(--d-accent)', color: '#fff' }}
                  onClick={() => {
                    const a = from || filters.period.from || bounds.min
                    const b = to || filters.period.to || bounds.max
                    onChange({ ...filters, period: { preset: 'custom', from: a <= b ? a : b, to: a <= b ? b : a } })
                    close()
                  }}
                >
                  Aplicar intervalo
                </button>
              </div>
            </>
          )}
        </Popover>
      )}

      {fields.map((f) => (
        <DimFilter key={f} source={source} field={f} title={title(f)} selected={filters.dims[f] ?? []} onChange={(v) => setDim(f, v)} />
      ))}

      {/* Filtros que vieram de clique num gráfico, em campos fora da barra. */}
      {activeDims
        .filter(([f]) => !fields.includes(f))
        .map(([f, v]) => (
          <span key={f} className="inline-flex items-center gap-1" style={{ height: 34, padding: '0 6px 0 12px', borderRadius: 999, background: 'var(--d-chip)', fontSize: 13, color: 'var(--d-text)' }}>
            <span style={{ color: 'var(--d-text-2)' }}>{title(f)}:</span>
            <span style={{ fontWeight: 600 }}>{v.length === 1 ? v[0] : `${v.length} selecionados`}</span>
            <button onClick={() => setDim(f, [])} aria-label={`Tirar filtro de ${title(f)}`} className="flex items-center justify-center rounded-full dash-hover" style={{ width: 24, height: 24 }}>
              <span className="wk-icon" aria-hidden style={{ fontSize: 16, color: 'var(--d-muted)' }}>
                close
              </span>
            </button>
          </span>
        ))}

      {any && (
        <button
          onClick={() => onChange(defaults)}
          className="inline-flex items-center gap-1 rounded-full dash-hover"
          style={{ height: 34, padding: '0 12px', fontSize: 13, color: 'var(--d-accent)', fontWeight: 500 }}
        >
          <span className="wk-icon" aria-hidden style={{ fontSize: 18 }}>
            filter_alt_off
          </span>
          Limpar filtros
        </button>
      )}
    </div>
  )
}

function DimFilter({ source, field, title, selected, onChange }: { source: Source; field: string; title: string; selected: string[]; onChange: (v: string[]) => void }) {
  const [q, setQ] = useState('')
  const values = useMemo(() => {
    const count = new Map<string, number>()
    for (const r of source.rows) {
      const k = cellKey(r[field])
      count.set(k, (count.get(k) ?? 0) + 1)
    }
    return [...count.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'))
  }, [source, field])
  const term = q.trim().toLowerCase()
  const shown = values.filter(([v]) => v.toLowerCase().includes(term)).slice(0, 200)

  return (
    <Popover
      width={260}
      trigger={({ open, toggle }) => (
        <Trigger icon="filter_list" label={title} value={selected.length === 0 ? undefined : selected.length === 1 ? selected[0] : `${selected.length}`} active={selected.length > 0} open={open} onClick={toggle} />
      )}
    >
      {() => (
        <>
          {values.length > 8 && (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar ${title.toLowerCase()}`} className="dash-input w-full" style={{ marginBottom: 4 }} />
          )}
          <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
            {shown.map(([v, n]) => (
              <Option key={v} checked={selected.includes(v)} label={v} hint={n.toLocaleString('pt-BR')} onClick={() => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])} />
            ))}
          </div>
          {selected.length > 0 && (
            <button onClick={() => onChange([])} className="w-full rounded-md dash-hover text-left" style={{ height: 32, padding: '0 8px', fontSize: 13, color: 'var(--d-accent)', borderTop: '1px solid var(--d-card-border)', marginTop: 4 }}>
              Limpar {title.toLowerCase()}
            </button>
          )}
        </>
      )}
    </Popover>
  )
}
