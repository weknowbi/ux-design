import { useMemo, useState } from 'react'
import { Icon } from '@/components/icons'
import { WeknowLogo } from '@/components/WeknowLogo'
import { COLOR, FONT } from '@/design/tokens'
import type { FilterState } from '@/engine/types'
import { defaultFilters } from '@/engine/query'
import { Dashboard } from '@/dash/Dashboard'
import { publishedSpec, resolveSource, useDashboard } from '@/lib/store'

/**
 * O que abre quem recebe o link: só o dashboard, na versão publicada, sem
 * editor nem menu do Weknow. Os filtros funcionam igual — são do motor,
 * não do editor.
 *
 * No protótipo o "link" só abre neste navegador (os dashboards ficam no
 * localStorage). No produto, ele seria servido pelo Weknow, com o mesmo
 * controle de acesso do metadado.
 */
export function ViewScreen({ id }: { id: string }) {
  const d = useDashboard(id)
  const source = useMemo(() => (d ? resolveSource(d.sourceRef) : null), [d?.sourceRef]) // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState<FilterState>(() => (d && source ? defaultFilters(source, d.versions[d.current].spec.dateField) : { period: { preset: 'all' }, dims: {} }))
  const spec = d ? publishedSpec(d) : null

  return (
    <div className="min-h-screen" style={{ background: COLOR.canvas, fontFamily: FONT }}>
      <header className="flex items-center gap-3 flex-wrap" style={{ padding: '14px 24px' }}>
        <WeknowLogo height={24} width={79} />
        {spec && (
          <>
            <span aria-hidden style={{ width: 1, height: 20, background: COLOR.border }} />
            <h1 className="truncate" style={{ fontSize: 18, color: COLOR.text, fontWeight: 400 }}>
              {spec.title}
            </h1>
            <span className="inline-flex items-center gap-1" style={{ fontSize: 12, color: COLOR.textMuted }}>
              <Icon name="visibility" size={16} color={COLOR.textMuted} />
              Somente leitura · publicado em {new Date(d!.published!.at).toLocaleDateString('pt-BR')}
            </span>
          </>
        )}
      </header>
      <main style={{ padding: '0 24px 32px' }}>
        {spec && source ? (
          <Dashboard spec={spec} source={source} filters={filters} onFilters={setFilters} />
        ) : (
          <div className="flex flex-col items-center text-center" style={{ paddingTop: 96, gap: 10 }}>
            <Icon name="link_off" size={48} color={COLOR.textMuted} />
            <p style={{ fontSize: 16, color: COLOR.text }}>Este dashboard não está publicado.</p>
            <p style={{ fontSize: 14, color: COLOR.textSecondary }}>Quem o criou pode ter despublicado ou excluído.</p>
          </div>
        )}
      </main>
    </div>
  )
}
