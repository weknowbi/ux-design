import { useMemo, useState } from 'react'
import { formatCell } from '@/engine/format'
import type { Row, Source } from '@/engine/types'

const PAGE = 10

/**
 * Tabela de detalhe — a parte fixa que deixa conferir qualquer número.
 * Recebe exatamente as linhas do recorte atual; nada de amostra.
 */
export function DetailTable({ rows, columns, source }: { rows: Row[]; columns: string[]; source: Source }) {
  const [sort, setSort] = useState<{ key: string; dir: 1 | -1 } | null>(null)
  const [page, setPage] = useState(0)
  const fields = columns.map((c) => source.fields.find((f) => f.name === c))

  const sorted = useMemo(() => {
    if (!sort) return rows
    const { key, dir } = sort
    return [...rows].sort((a, b) => {
      const x = a[key]
      const y = b[key]
      if (x === y) return 0
      if (x === null || x === undefined) return 1
      if (y === null || y === undefined) return -1
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'pt-BR')) * dir
    })
  }, [rows, sort])

  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const p = Math.min(page, pages - 1)
  const slice = sorted.slice(p * PAGE, p * PAGE + PAGE)

  const toggle = (key: string) => {
    setPage(0)
    setSort((s) => (s?.key === key ? (s.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 }))
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {fields.map((f, i) => {
                const num = f?.type === 'number' && !f.key
                const on = sort?.key === columns[i]
                return (
                  <th
                    key={columns[i]}
                    scope="col"
                    aria-sort={on ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}
                    style={{ textAlign: num ? 'right' : 'left', padding: '8px 12px', fontWeight: 600, fontSize: 12, color: 'var(--d-text-2)', borderBottom: '1px solid var(--d-card-border)', whiteSpace: 'nowrap' }}
                  >
                    <button onClick={() => toggle(columns[i])} className="inline-flex items-center gap-1" style={{ color: 'inherit', font: 'inherit' }}>
                      {f?.title ?? columns[i]}
                      <span className="wk-icon" aria-hidden style={{ fontSize: 16, opacity: on ? 1 : 0.35, fontVariationSettings: "'wght' 300" }}>
                        {on && sort!.dir === -1 ? 'arrow_downward' : 'arrow_upward'}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {slice.map((r, i) => (
              <tr key={i} className="dash-row">
                {fields.map((f, c) => {
                  const num = f?.type === 'number' && !f.key
                  return (
                    <td
                      key={columns[c]}
                      style={{ padding: '8px 12px', textAlign: num ? 'right' : 'left', color: c === 0 ? 'var(--d-text-2)' : 'var(--d-text)', borderBottom: '1px solid var(--d-grid)', whiteSpace: 'nowrap', fontVariantNumeric: num ? 'tabular-nums' : undefined }}
                    >
                      {formatCell(r[columns[c]], f)}
                    </td>
                  )
                })}
              </tr>
            ))}
            {slice.length === 0 && (
              <tr>
                <td colSpan={columns.length} style={{ padding: 24, textAlign: 'center', color: 'var(--d-muted)' }}>
                  Nenhuma linha neste recorte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap" style={{ paddingTop: 10, fontSize: 12, color: 'var(--d-muted)' }}>
        <span>
          {sorted.length.toLocaleString('pt-BR')} {sorted.length === 1 ? 'linha' : 'linhas'} no recorte
        </span>
        <span className="flex items-center gap-1">
          <PageBtn icon="chevron_left" label="Página anterior" disabled={p === 0} onClick={() => setPage(p - 1)} />
          <span style={{ fontVariantNumeric: 'tabular-nums', padding: '0 4px' }}>
            {p + 1} de {pages.toLocaleString('pt-BR')}
          </span>
          <PageBtn icon="chevron_right" label="Próxima página" disabled={p >= pages - 1} onClick={() => setPage(p + 1)} />
        </span>
      </div>
    </div>
  )
}

function PageBtn({ icon, label, disabled, onClick }: { icon: string; label: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex items-center justify-center rounded-md dash-hover"
      style={{ width: 28, height: 28, opacity: disabled ? 0.35 : 1, color: 'var(--d-text-2)' }}
    >
      <span className="wk-icon" aria-hidden style={{ fontSize: 20 }}>
        {icon}
      </span>
    </button>
  )
}
