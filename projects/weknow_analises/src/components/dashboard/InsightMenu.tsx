import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { AnaliseInteligenteIcon } from '@/components/dashboard/AnaliseInteligenteIcon'
import { Btn } from '@ds/Btn'
import { Dropdown, MenuAction } from '@/components/browser/Menu'
import { DASH_TABS } from '@/data/dashboard'
import { captureMoment } from '@/engine/moment'
import { startFromMoment } from '@/lib/conversations'
import { ago, createInsight, insightsOf, useInsights } from '@/lib/insights'
import { go } from '@/lib/router'

/**
 * O "Análise inteligente" da barra do dashboard. Uma porta só para as duas
 * fases: pedir a análise à IA (a análise automática da fase 1) ou escrever a
 * própria, e reabrir as análises que já existem deste dashboard.
 *
 * As duas partem do mesmo lugar: o momento, a aba aberta com os filtros que
 * estão valendo agora. Pedir à IA abre o Weknow Ask com esse momento, e a
 * conversa continua lá; escrever abre a análise direto, sem IA.
 */
export function InsightMenu({ dashboard, tab, mobile }: { dashboard: { id: string; name: string }; tab: number; mobile?: boolean }) {
  const all = useInsights()
  const list = insightsOf(dashboard.id, all)
  const tabName = DASH_TABS[tab]?.name ?? ''

  const withAi = () => {
    const id = startFromMoment(captureMoment(dashboard.id, dashboard.name, tab))
    go(`/ia/${id}`)
  }
  const byHand = () => {
    const m = captureMoment(dashboard.id, dashboard.name, tab)
    const it = createInsight({ title: `Análise de ${m.tabName.toLowerCase()}`, moment: m, text: '', by: 'pessoa' })
    go(`/analise/${it.id}`)
  }

  return (
    <Dropdown
      align="right"
      minWidth={340}
      trigger={({ toggle }) => (
        <Btn size="sm" title={mobile ? 'Análise inteligente' : undefined} onClick={toggle}>
          {/* 4 antes do ícone, 8 até o rótulo, 8 depois dele (ver a barra). */}
          <span className="flex items-center" style={{ gap: 8, marginLeft: -8, marginRight: mobile ? -8 : -4 }}>
            <AnaliseInteligenteIcon />
            {!mobile && 'Análise inteligente'}
            {list.length > 0 && (
              <span className="wk-count" aria-label={`${list.length} análises`}>
                {list.length}
              </span>
            )}
          </span>
        </Btn>
      )}
    >
      {(close) => (
        <div style={{ fontFamily: FONT, width: 340 }}>
          <div style={{ padding: '8px 8px 6px' }}>
            <div style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: COLOR.text }}>Analisar este momento</div>
            <div style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
              A aba {tabName} com os filtros de agora fica registrada na análise.
            </div>
          </div>
          <MenuAction
            icon="auto_awesome"
            label="Analisar com o Weknow Ask"
            onSelect={() => {
              close()
              withAi()
            }}
          />
          <MenuAction
            icon="edit_note"
            label="Escrever uma análise"
            onSelect={() => {
              close()
              byHand()
            }}
          />
          <div style={{ height: 1, background: COLOR.border, margin: '4px 0' }} />
          <div style={{ padding: '6px 8px 4px', fontSize: 12, lineHeight: '16px', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: COLOR.textSecondary }}>
            Análises deste dashboard
          </div>
          {list.length === 0 ? (
            <p style={{ margin: 0, padding: '4px 8px 8px', fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>Nenhuma ainda.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {list.slice(0, 6).map((it) => (
                <li key={it.id}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      close()
                      go(`/analise/${it.id}`)
                    }}
                    className="w-full text-left flex items-start rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]"
                    style={{ gap: 8, padding: '6px 8px' }}
                  >
                    <Icon name={it.by === 'ia' ? 'auto_awesome' : 'article'} size={20} color={COLOR.navLabel} className="shrink-0" />
                    <span className="flex-1 min-w-0 flex flex-col">
                      <span className="truncate" style={{ fontSize: 14, lineHeight: '20px', color: COLOR.text }}>
                        {it.title}
                      </span>
                      <span className="truncate" style={{ fontSize: 12, lineHeight: '16px', color: COLOR.textSecondary }}>
                        {it.author.split(' ')[0]} · aba {it.moment.tabName} · {ago(it.updatedAt)}
                        {it.comments.length > 0 && ` · ${it.comments.length} ${it.comments.length > 1 ? 'comentários' : 'comentário'}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Dropdown>
  )
}
