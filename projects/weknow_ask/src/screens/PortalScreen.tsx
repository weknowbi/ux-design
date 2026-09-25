import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Header } from '@/components/Header'
import { Icon } from '@/components/icons'
import { PortalSidebar, type PortalRoute } from '@/components/PortalSidebar'

/**
 * Tela do portal — a que antecede o Weknow Ask.
 *
 * Espec. do frame `home` (WP-832): conteúdo de 1159px centrado na coluna de
 * 1617, cards de 375,67 × 230 com 16px de gap.
 *
 * Não é interativa: existe para situar de onde o Ask é aberto. O único
 * caminho ativo é o item "Weknow Ask" do menu.
 */

const CONTENT_WIDTH = 1159

type Card = { kind: 'folder' | 'dashboard'; breadcrumb: string; title: string; starred?: boolean }

const FAVORITOS: Card[] = [
  { kind: 'folder', breadcrumb: 'Página inicial', title: 'Prontuário do Paciente', starred: true },
  { kind: 'folder', breadcrumb: 'Página inicial', title: 'Controle de Leitos', starred: true },
  { kind: 'folder', breadcrumb: 'Página inicial', title: 'Agendamento Cirúrgico', starred: true },
  { kind: 'dashboard', breadcrumb: 'Página inicial', title: '5.1 IA - Análise Inteligente | Exemplos Soluções', starred: true },
  { kind: 'dashboard', breadcrumb: 'Página inicial', title: '5.1 IA - Análise Inteligente | Exemplos Soluções', starred: true },
  { kind: 'dashboard', breadcrumb: 'Página inicial', title: '5.1 IA - Análise Inteligente | Exemplos Soluções', starred: true },
]

const PASTAS: Card[] = [
  { kind: 'folder', breadcrumb: 'Página inicial', title: 'Financeiro Hospitalar' },
  { kind: 'folder', breadcrumb: 'Página inicial', title: 'Atendimento e Triagem' },
  { kind: 'folder', breadcrumb: 'Página inicial', title: 'Materiais e Medicamentos' },
]

function Thumb({ kind }: { kind: Card['kind'] }) {
  if (kind === 'folder') {
    return (
      <div
        className="flex items-center justify-center rounded-lg"
        style={{ height: 140, background: 'var(--wk-hover-strong)', color: 'var(--wk-text-icon)' }}
      >
        <Icon name="folder" size={44} filled />
      </div>
    )
  }
  return (
    <div className="rounded-lg p-3 flex gap-2" style={{ height: 140, background: 'var(--wk-nav-hover)' }}>
      <div className="flex-1 rounded-md bg-[var(--wk-surface)]/70 flex items-center justify-center" style={{ color: 'var(--wk-text-icon)' }}>
        <Icon name="pie_chart" size={28} filled />
      </div>
      <div className="flex-1 flex flex-col gap-2">
        <div className="flex-1 rounded-md bg-[var(--wk-surface)]/70 flex items-center justify-center" style={{ color: 'var(--wk-text-icon)' }}>
          <Icon name="show_chart" size={24} />
        </div>
        <div className="flex-1 rounded-md bg-[var(--wk-surface)]/70 flex items-center justify-center" style={{ color: 'var(--wk-text-icon)' }}>
          <Icon name="bar_chart" size={24} filled />
        </div>
      </div>
    </div>
  )
}

function CardItem({ card }: { card: Card }) {
  return (
    <div
      className="rounded-xl bg-[var(--wk-surface)] p-3 transition-shadow hover:shadow-[0_2px_8px_rgba(15,23,42,0.08)]"
      style={{ border: `1px solid ${COLOR.border}` }}
    >
      <Thumb kind={card.kind} />
      <div className="flex items-start gap-2 mt-3 px-1">
        <Icon name={card.kind === 'folder' ? 'folder' : 'dashboard'} size={20} filled color={COLOR.textMuted} className="shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
            {card.breadcrumb}
          </p>
          <p
            className="text-[13.5px] leading-snug line-clamp-2"
            style={{ fontFamily: FONT, color: COLOR.text }}
          >
            {card.title}
          </p>
        </div>
        {card.starred && (
          <Icon name="star" size={20} filled color="#f59e0b" className="shrink-0 mt-0.5" />
        )}
      </div>
    </div>
  )
}

function SectionTitle({ icon, label, tools }: { icon: string; label: string; tools?: boolean }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <Icon name={icon} size={22} filled color={icon === 'star' ? '#f59e0b' : COLOR.textMuted} />
        <span className="text-[15px] font-medium" style={{ fontFamily: FONT, color: COLOR.text }}>
          {label}
        </span>
      </div>
      {tools && (
        <div className="flex items-center gap-2" style={{ color: COLOR.textMuted }}>
          <Icon name="arrow_upward" size={20} />
          <span className="text-[13px]" style={{ fontFamily: FONT }}>
            Padrão
          </span>
          <Icon name="grid_view" size={20} />
          <Icon name="keyboard_arrow_down" size={20} />
        </div>
      )}
    </div>
  )
}

export function PortalScreen({ onNavigate }: { onNavigate: (route: PortalRoute) => void }) {
  return (
    <div
      className="flex"
      style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}
    >
      <PortalSidebar active="portal" onNavigate={onNavigate} />

      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ minHeight: 0, paddingRight: LAYOUT.sheetMarginRight }}
      >
        <Header trail={[{ label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true }]} />

        <main
          className="flex-1 overflow-y-auto bg-[var(--wk-surface)] min-w-0"
          style={{
            borderTopLeftRadius: LAYOUT.sheetRadius,
            borderTopRightRadius: LAYOUT.sheetRadius,
          }}
        >
          <div className="mx-auto px-6 py-16" style={{ maxWidth: CONTENT_WIDTH }}>
            <h1
              className="text-[28px] font-semibold text-center mb-8"
              style={{ fontFamily: FONT, color: COLOR.text }}
            >
              Olá, bem vindo ao Weknow
            </h1>

            {/* Busca — 800px, centrada, como no design */}
            <div className="flex justify-center mb-6">
              <div
                className="flex items-center gap-3 rounded-full px-5 h-[48px] w-full"
                style={{ maxWidth: 800, background: COLOR.searchPillLight }}
              >
                <Icon name="search" size={22} color={COLOR.textMuted} />
                <input
                  type="text"
                  placeholder="Pesquise em Pastas"
                  className="flex-1 min-w-0 bg-transparent text-[15px] outline-none"
                  style={{ fontFamily: FONT, color: COLOR.text }}
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex justify-center gap-3 mb-14">
              {[
                { icon: 'folder', label: 'Pastas', on: true },
                { icon: 'task_alt', label: 'Tarefas', on: false },
                { icon: 'slideshow', label: 'Apresentações', on: false },
              ].map(({ icon, label, on }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-2 rounded-full px-4 h-[36px] text-[14px]"
                  style={{
                    fontFamily: FONT,
                    background: on ? COLOR.tintSoft : COLOR.canvas,
                    color: on ? COLOR.primary : COLOR.textSecondary,
                  }}
                >
                  <Icon name={icon} size={20} filled={on} />
                  {label}
                </span>
              ))}
            </div>

            <section className="mb-12">
              <SectionTitle icon="star" label="Favoritos" tools />
              <div className="grid grid-cols-3 gap-4">
                {FAVORITOS.map((c, i) => (
                  <CardItem key={i} card={c} />
                ))}
              </div>
            </section>

            <section>
              <SectionTitle icon="folder" label="Pastas" />
              <div className="grid grid-cols-3 gap-4">
                {PASTAS.map((c, i) => (
                  <CardItem key={i} card={c} />
                ))}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}
