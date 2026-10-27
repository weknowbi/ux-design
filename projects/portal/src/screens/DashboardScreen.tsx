import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { useIsMobile } from '@/design/viewport'
import { Icon } from '@/components/icons'
import { WeknowLogo } from '@ds/WeknowLogo'
import { AccountMenu } from '@ds/AccountMenu'
import { IconBtn } from '@ds/Btn'
import { Dropdown, MenuAction } from '@/components/browser/Menu'
import { useAppearances } from '@/components/browser/appearance'
import type { PortalRoute } from '@/components/PortalSidebar'
import { ChartView, KpiTile, Widget } from '@/components/dashboard/Charts'
import { DashboardBar } from '@/components/dashboard/DashboardBar'
import { DASH_TABS, useTabNav } from '@/data/dashboard'
import { CURRENT_USER } from '@/data/account'
import { PORTAL_ROOT, flatten } from '@/data/portal'
import { go } from '@/lib/router'

/**
 * Um dashboard aberto, na moldura do Weknow web (medida nos dashboards 145 e
 * 171): sem menu lateral, com a seta de voltar e a marca no cabeçalho, a
 * linha de desfazer/refazer e filtros, o painel e a barra inferior.
 *
 *   cabeçalho  56, branco, px 12: voltar · marca · casa › pasta › dashboard
 *              · busca 280 × 36 · "…" · expandir · conta
 *   filtros    52, fundo sutil: desfazer, refazer e limpar (40 × 40), os
 *              filtros do painel e o "⋮" na ponta
 *   painel     largura toda, sombra 0 4 12 / 12%
 *
 * Só a barra inferior é proposta; o resto copia o web para a barra ser
 * julgada no lugar onde vai morar. Todo dashboard abre o mesmo painel de
 * exemplo (`DASH_TABS`): muda o nome, e a navegação das abas, guardada por
 * dashboard.
 */
const HEADER_H = 56
const FILTER_H = 52

/** O `IconBtn` do sistema com um símbolo de 24. */
function HeaderBtn({ icon, label, onClick }: { icon: string; label: string; onClick?: () => void }) {
  return (
    <IconBtn title={label} onClick={onClick}>
      <Icon name={icon} size={24} />
    </IconBtn>
  )
}

export function DashboardScreen({ dashboardId }: { dashboardId: string; onRoute: (r: PortalRoute) => void }) {
  const isMobile = useIsMobile()
  const customized = useAppearances()
  const entry = flatten(PORTAL_ROOT).find((e) => e.item.id === dashboardId && e.item.kind === 'dashboard')
  const [active, setActive] = useState(0)
  const [nav, setNav] = useTabNav(dashboardId)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Outro dashboard começa na primeira aba.
  useEffect(() => {
    setActive(0)
  }, [dashboardId])

  // Trocar de aba é virar a página: a nova começa do alto.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
  }, [active])

  const nameOf = (id: string, fallback: string) => customized[id]?.name?.trim() || fallback
  const folders = entry?.path ?? []
  const parent = folders[folders.length - 1]
  const above = folders.slice(0, -1)
  const title = entry ? nameOf(entry.item.id, entry.item.name) : 'Dashboard'
  const openFolder = (id: string) => go(`/pasta/${encodeURIComponent(id)}`)

  const tab = DASH_TABS[active]
  const [line, donut, hbar, bar] = tab.charts

  const chevron = <Icon name="chevron_right" size={24} color={COLOR.navLabel} className="shrink-0" />

  /* Caminho como no web: casa › pasta onde o dashboard mora › dashboard. As
     pastas de cima recolhem em "…". */
  const header = (
    <header
      className="shrink-0 flex items-center gap-2"
      style={{ height: HEADER_H, padding: '0 12px', background: COLOR.surface, fontFamily: FONT }}
    >
      <HeaderBtn icon="chevron_left" label="Voltar" onClick={() => (parent ? openFolder(parent.id) : go(null))} />
      {!isMobile && (
        <button type="button" onClick={() => go(null)} aria-label="Portal" className="shrink-0 px-1">
          <WeknowLogo width={93} height={28} />
        </button>
      )}
      <nav className="flex-1 min-w-0 flex items-center gap-1.5 pl-5" aria-label="Caminho">
        {!isMobile && (
          <>
            <HeaderBtn icon="home" label="Portal" onClick={() => go(null)} />
            {chevron}
            {above.length > 0 && (
              <>
                <Dropdown
                  align="left"
                  minWidth={260}
                  trigger={({ toggle }) => <HeaderBtn icon="more_horiz" label="Pastas" onClick={toggle} />}
                >
                  {(close) =>
                    above.map((f) => (
                      <MenuAction
                        key={f.id}
                        icon="folder"
                        label={nameOf(f.id, f.name)}
                        onSelect={() => {
                          close()
                          openFolder(f.id)
                        }}
                      />
                    ))
                  }
                </Dropdown>
                {chevron}
              </>
            )}
            {parent && (
              <>
                <button
                  type="button"
                  onClick={() => openFolder(parent.id)}
                  className="min-w-0 truncate rounded-md px-1.5 py-1 hover:bg-[var(--wk-icon-hover)]"
                  style={{ fontSize: 15, color: COLOR.textSecondary, maxWidth: 280 }}
                >
                  {nameOf(parent.id, parent.name)}
                </button>
                {chevron}
              </>
            )}
          </>
        )}
        <span className="truncate" style={{ fontSize: 15, fontWeight: 600, color: COLOR.textSecondary }}>
          {title}
        </span>
      </nav>
      {!isMobile && (
        <label
          className="shrink-0 flex items-center gap-2 pl-4 pr-3"
          style={{ width: 280, height: 36, borderRadius: 200, background: 'var(--wk-search-pill-light)' }}
        >
          <Icon name="search" size={24} color={COLOR.navLabel} />
          <input
            placeholder="Pesquise por nome ou tag"
            className="flex-1 min-w-0 bg-transparent outline-none"
            style={{ fontSize: 16, color: COLOR.text }}
          />
        </label>
      )}
      <HeaderBtn icon="more_horiz" label="Mais opções" />
      {!isMobile && <HeaderBtn icon="expand_content" label="Expandir" />}
      <AccountMenu name={CURRENT_USER.name} email={CURRENT_USER.email} photo={CURRENT_USER.photo} size={32} />
    </header>
  )

  /* Desfazer, refazer e limpar andam pelos filtros aplicados; sem filtro
     mexido, ficam apagados, como no web. Ao lado, o filtro do painel com o
     valor embaixo do nome. */
  const filterRow = (
    <div
      className="shrink-0 flex items-center"
      style={{ height: FILTER_H, background: COLOR.surfaceSubtle, padding: '0 8px', fontFamily: FONT }}
    >
      {[
        ['undo', 'Voltar uma etapa'],
        ['redo', 'Avançar uma etapa'],
        ['close', 'Remover filtros não iniciais'],
      ].map(([icon, label]) => (
        <button key={icon} type="button" disabled aria-label={label} title={label} className="shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
          <Icon name={icon} size={24} color="rgba(102, 117, 138, 0.4)" />
        </button>
      ))}
      {!isMobile && (
        <button type="button" className="ml-4 flex flex-col items-start rounded-md px-2 py-0.5 hover:bg-[var(--wk-icon-hover)]">
          <span className="flex items-center gap-1" style={{ fontSize: 14, color: COLOR.text }}>
            Unidade
            <Icon name="keep" size={16} color={COLOR.navLabel} />
          </span>
          <span style={{ fontSize: 14, color: COLOR.textMuted }}>Todas</span>
        </button>
      )}
      <div className="flex-1" />
      <HeaderBtn icon="more_vert" label="Opções do filtro" />
    </div>
  )

  const body = entry ? (
    <div className={`grid gap-3 ${isMobile ? 'grid-cols-2' : 'grid-cols-12'}`} style={{ gridAutoRows: 'min-content' }}>
      {tab.kpis.map((k) => (
        <div key={k.label} className={isMobile ? '' : 'col-span-3'} style={{ height: 112 }}>
          <KpiTile kpi={k} />
        </div>
      ))}
      <div className={isMobile ? 'col-span-2' : 'col-span-8'} style={{ height: 300 }}>
        <Widget title={line.title}>
          <ChartView chart={line} />
        </Widget>
      </div>
      <div className={isMobile ? 'col-span-2' : 'col-span-4'} style={{ minHeight: 300 }}>
        <Widget title={donut.title}>
          <ChartView chart={donut} />
        </Widget>
      </div>
      <div className={isMobile ? 'col-span-2' : 'col-span-5'} style={{ minHeight: 300 }}>
        <Widget title={hbar.title}>
          <ChartView chart={hbar} />
        </Widget>
      </div>
      <div className={isMobile ? 'col-span-2' : 'col-span-7'} style={{ height: 300 }}>
        <Widget title={bar.title}>
          <ChartView chart={bar} />
        </Widget>
      </div>
    </div>
  ) : (
    <p style={{ fontFamily: FONT, fontSize: 14, color: COLOR.textMuted }}>Dashboard não encontrado.</p>
  )

  return (
    <div className="flex flex-col" style={{ width: '100%', height: '100dvh', background: COLOR.canvas, fontFamily: FONT }}>
      {header}
      {filterRow}
      <div
        ref={scrollRef}
        role="tabpanel"
        aria-label={tab.name}
        className="flex-1 min-h-0 overflow-auto"
        style={{
          marginTop: 1,
          background: 'var(--wk-surface-subtle)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
          padding: isMobile ? 12 : 16,
        }}
      >
        {body}
      </div>
      {entry && <DashboardBar tabs={DASH_TABS} active={active} onSelect={setActive} nav={nav} onNav={setNav} mobile={isMobile} />}
    </div>
  )
}
