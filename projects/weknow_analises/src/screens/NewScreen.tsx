import { useEffect, useMemo, useRef, useState } from 'react'
import { Btn } from '@ds/Btn'
import { DASHBOARD_COLOR } from '@ds/appearance'
import { COLOR, FONT } from '@/design/tokens'
import { useIsMobile } from '@/design/viewport'
import { Icon } from '@/components/icons'
import { AppShell } from '@/components/AppShell'
import { DynamicHero, FADE, HIDDEN, MobileHero, type ChipItem } from '@/components/Hero'
import { Dropdown, MenuOption } from '@/components/browser/Menu'
import type { PortalRoute } from '@/components/PortalSidebar'
import { create, type Origin } from '@/engine/assistant'
import { CATALOG, DASHBOARDS, catalogItem, dashboardsOfCode, type CatalogItem, type SourceDashboard } from '@/engine/catalog'
import { DIMENSIONS } from '@/engine/semantic'
import { go } from '@/lib/router'
import { createAnalysis } from '@/lib/store'

/**
 * Criar dashboard: escolher a fonte, e só.
 *
 * A tela é a home do portal: o mesmo topo (título, busca, chips), os chips
 * trocando entre Metadados e Dashboards existentes como lá trocam entre
 * Pastas e Tarefas, e a lista em árvore do portal. Um clique seleciona; a
 * barra de baixo diz o que foi escolhido. "Continuar" (ou dois cliques) já abre
 * o editor com o dashboard vazio e a caixa de pedido embaixo: o que mostrar
 * se diz ali, e não num formulário antes.
 *
 * `#/dashboard/novo/de/<id>` é a entrada de dentro de um dashboard do portal:
 * a fonte já está escolhida, então cria e abre direto.
 */

type Kind = 'dashboards' | 'metadados'
type Pick = { kind: 'dashboard'; id: string } | { kind: 'metadado'; code: string }

/* Metadados primeiro: é a fonte de quem monta do zero. O dashboard existente
   é o atalho para levar o metadado já com os filtros. */
const KINDS: ChipItem<Kind>[] = [
  { id: 'metadados', icon: 'database', label: 'Metadados' },
  { id: 'dashboards', icon: 'bar_chart', label: 'Dashboards existentes' },
]

const SEARCH = 'Buscar metadados ou dashboards...'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** O metadado por trás da escolha, e se dá para criar o dashboard com ele. */
function resolve(pick: Pick | null) {
  if (!pick) return { source: undefined, dash: undefined, usable: false }
  const dash = pick.kind === 'dashboard' ? DASHBOARDS.find((d) => d.id === pick.id) : undefined
  const source = pick.kind === 'metadado' ? catalogItem(pick.code) : dash ? catalogItem(dash.code) : undefined
  return { source, dash, usable: !!source && !source.failed && !!source.ind }
}

export function NewScreen({ dashboard, onRoute }: { dashboard?: string; onRoute: (r: PortalRoute) => void }) {
  const [pick, setPick] = useState<Pick | null>(dashboard ? { kind: 'dashboard', id: dashboard } : null)
  const [kind, setKind] = useState<Kind>('metadados')
  const [steps, setSteps] = useState<{ label: string; detail?: string }[] | null>(null)
  const [done, setDone] = useState(0)
  const mainRef = useRef<HTMLElement>(null)

  const { source, dash, usable } = resolve(pick)

  /* Carregar é curto: lê o metadado e, se veio de um dashboard, os filtros
     dele. Montar o painel fica para o primeiro pedido, já no editor. */
  const start = async () => {
    if (!usable || !source || !pick || steps) return
    const origin: Origin = pick.kind === 'metadado' ? { kind: 'metadado', code: source.code } : { kind: 'dashboard', id: dash!.id }
    const list = [
      { label: `Lendo o metadado ${source.code} - ${source.name}`, detail: `${source.fields.length} campos` },
      ...(dash ? [{ label: `Trazendo os filtros de “${dash.name}”`, detail: dash.dims.map((d) => DIMENSIONS[d].label).join(', ') || 'Período' }] : []),
    ]
    setSteps(list)
    for (let i = 0; i < list.length; i++) {
      await sleep(420)
      setDone(i + 1)
    }
    const r = create(origin)
    if (!r) return
    createAnalysis({ board: r.board, messages: r.messages })
    await sleep(200)
    go(`/dashboard/${r.board.id}`)
  }

  // Vindo de dentro de um dashboard, a fonte já está escolhida.
  const auto = useRef(false)
  useEffect(() => {
    if (dashboard && !auto.current) {
      auto.current = true
      void start()
    }
  })

  return (
    <AppShell
      route="portal"
      onNavigate={onRoute}
      trail={[{ label: 'Portal', onClick: () => go(null) }, { label: 'Criar dashboard' }]}
      /* Escondida e guardando o lugar, como na raiz do portal: a escolha tem a
         busca dela, e duas caixas de busca na mesma tela pedem para adivinhar
         qual procura o quê. */
      search={{ value: '', onChange: () => {}, placeholder: 'Pesquise por nome ou tag', hidden: true }}
      mainRef={mainRef}
    >
      {steps ? (
        <Progress steps={steps} done={done} />
      ) : (
        <SourceStep kind={kind} onKind={setKind} pick={pick} onPick={setPick} scrollRef={mainRef} onNext={start} />
      )}
    </AppShell>
  )
}

/* ──────────────────────────────────────────────────────── passo 1: fonte */

type Group<T> = { label: string; items: T[] }

function groupBy<T>(items: T[], key: (t: T) => string): Group<T>[] {
  const order: string[] = []
  const by = new Map<string, T[]>()
  for (const t of items) {
    const k = key(t)
    if (!by.has(k)) {
      by.set(k, [])
      order.push(k)
    }
    by.get(k)!.push(t)
  }
  return order.map((label) => ({ label, items: by.get(label)! }))
}

function SourceStep({
  kind,
  onKind,
  pick,
  onPick,
  scrollRef,
  onNext,
}: {
  kind: Kind
  onKind: (k: Kind) => void
  pick: Pick | null
  onPick: (p: Pick) => void
  scrollRef: React.RefObject<HTMLElement | null>
  onNext: () => void
}) {
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState(false)
  /** Pasta ou área escolhida no filtro; `null` mostra todas. Vale por aba. */
  const [scope, setScope] = useState<Record<Kind, string | null>>({ dashboards: null, metadados: null })
  const q = norm(query.trim())

  const dashGroups = useMemo(() => {
    const hits = DASHBOARDS.filter((d) => {
      if (scope.dashboards && d.folder !== scope.dashboards) return false
      const m = catalogItem(d.code)!
      return !q || norm(`${d.name} ${d.folder} ${m.code} - ${m.name}`).includes(q)
    })
    return groupBy(hits, (d) => d.folder)
  }, [q, scope.dashboards])

  const metaGroups = useMemo(() => {
    const hits = CATALOG.filter((m) => {
      if (scope.metadados && m.group !== scope.metadados) return false
      return !q || norm(`${m.code} - ${m.name} ${m.group} ${m.description}`).includes(q)
    })
    return groupBy(hits, (m) => m.group)
  }, [q, scope.metadados])

  const scopes = kind === 'dashboards' ? [...new Set(DASHBOARDS.map((d) => d.folder))] : [...new Set(CATALOG.map((m) => m.group))]
  const allLabel = kind === 'dashboards' ? 'Todas as pastas' : 'Todas as áreas'
  const filter = (
    <Dropdown
      align="right"
      minWidth={220}
      trigger={({ open, toggle }) => (
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="menu"
          aria-expanded={open}
          title={kind === 'dashboards' ? 'Filtrar por pasta' : 'Filtrar por área'}
          className="wk-icon-btn flex items-center gap-0.5 h-[28px] pl-1.5 pr-1 min-w-0"
          style={{ background: open ? 'var(--wk-icon-hover)' : undefined, maxWidth: isMobile ? 180 : 360 }}
        >
          <span className="truncate text-[14px] leading-[20px]" style={{ fontFamily: FONT, color: 'var(--wk-control-label)' }}>
            {scope[kind] ?? allLabel}
          </span>
          <Icon name="expand_more" size={20} color={COLOR.navLabel} className="shrink-0" />
        </button>
      )}
    >
      {(close) => (
        <div style={{ maxWidth: 'min(460px, calc(100vw - 32px))' }} className="[&_span]:truncate">
          {[null, ...scopes].map((s) => (
            <MenuOption
              key={s ?? '*'}
              checked={scope[kind] === s}
              label={s ?? allLabel}
              onSelect={() => {
                setScope({ ...scope, [kind]: s })
                close()
              }}
            />
          ))}
        </div>
      )}
    </Dropdown>
  )

  const groups = kind === 'dashboards' ? dashGroups : metaGroups
  const { source, dash, usable } = resolve(pick)
  const noun = kind === 'dashboards' ? 'dashboard' : 'metadado'

  return (
    <>
      <div className={isMobile ? 'flex flex-col px-4 pb-10' : '@container mx-auto flex flex-col px-8 pb-16'} style={isMobile ? undefined : { maxWidth: 1760 }}>
        {isMobile ? (
          <MobileHero query={query} onQuery={setQuery} placeholder={SEARCH} chips={{ items: KINDS, active: kind, onSelect: onKind }} />
        ) : (
          <DynamicHero
            title="Como deseja começar?"
            description="Selecione um metadado ou utilize os dados de um dashboard existente para criar sua nova análise."
            query={query}
            onQuery={setQuery}
            placeholder={SEARCH}
            chips={{ items: KINDS, active: kind, onSelect: onKind }}
            scrollRef={scrollRef}
            controls={filter}
            onCollapsedChange={setCollapsed}
          />
        )}

        <section className={`flex flex-col gap-2 ${isMobile ? '' : 'mt-8'}`}>
          <div className="flex items-center gap-4 min-h-[28px]">
            <div className="flex flex-1 items-center gap-1.5 min-w-0">
              <Icon name={kind === 'dashboards' ? 'bar_chart' : 'database'} size={24} filled weight={200} color={COLOR.navLabel} className="shrink-0" />
              <h3 className="truncate text-[15px] font-semibold leading-[22px]" style={{ fontFamily: FONT, color: COLOR.text }}>
                {q ? `Resultados para “${query.trim()}”` : kind === 'dashboards' ? 'Dashboards disponíveis' : 'Metadados disponíveis'}
              </h3>
            </div>
            {/* Recolhido o topo, o filtro sobe para a faixa, como a ordem e a
                visualização do portal; aqui ele só esmaece. */}
            <div className={`${FADE} ${collapsed && !isMobile ? HIDDEN : ''}`}>{filter}</div>
          </div>
          {groups.length === 0 ? (
            <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
              Nenhum {noun} {q ? 'corresponde à busca' : 'neste filtro'}.
            </p>
          ) : kind === 'dashboards' ? (
            <DashTree groups={dashGroups} pick={pick} onPick={onPick} onOpen={onNext} searching={!!q} />
          ) : (
            <MetaTree groups={metaGroups} pick={pick} onPick={onPick} onOpen={onNext} searching={!!q} />
          )}
        </section>
      </div>

      <ActionBar mobile={isMobile}>
        <div className="flex-1 min-w-0 flex items-center gap-3">
          {pick && source ? (
            <>
              <ItemMark kind={dash ? 'dashboard' : 'metadado'} />
              <span className="min-w-0 flex flex-col gap-0.5">
                <span className="truncate text-[14px] leading-[18px]" style={{ fontFamily: FONT, color: COLOR.text }}>
                  {dash ? dash.name : `${source.code} - ${source.name}`}
                </span>
                <span className="truncate text-[12px] leading-[16px]" style={{ fontFamily: FONT, color: source.failed ? 'var(--an-danger-text)' : COLOR.textSecondary }}>
                  {source.failed
                    ? 'Metadado com erro na última execução. Escolha outro.'
                    : !source.ind
                      ? 'Sem dados no protótipo. Use os de 21 - Internações ou 32 - Faturamento e glosas.'
                      : dash
                        ? `Metadado ${source.code} - ${source.name}`
                        : `${source.group} · ${source.fields.length} campos`}
                </span>
              </span>
            </>
          ) : (
            <span className="text-[14px] leading-[20px]" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
              Selecione uma opção para começar.
            </span>
          )}
        </div>
        {!isMobile && (
          <Btn variant="ghost" onClick={() => go(null)}>
            Cancelar
          </Btn>
        )}
        <Btn variant="primary" disabled={!usable} onClick={onNext}>
          Continuar
        </Btn>
      </ActionBar>
    </>
  )
}

/** A barra que acompanha a rolagem no rodapé da folha: o que foi escolhido e o próximo passo. */
function ActionBar({ children, mobile }: { children: React.ReactNode; mobile: boolean }) {
  return (
    <div className="sticky bottom-0 z-20 bg-[var(--wk-surface)]" style={{ borderTop: `1px solid ${COLOR.border}` }}>
      <div className={`mx-auto flex items-center gap-2 ${mobile ? 'px-4' : 'px-8'}`} style={{ maxWidth: 1760, minHeight: 72 }}>
        {children}
      </div>
    </div>
  )
}

/** O quadrado de 26 do card do portal: barras em vermelho para dashboard, banco em azul para metadado. */
function ItemMark({ kind }: { kind: 'dashboard' | 'metadado' }) {
  const color = kind === 'dashboard' ? `color-mix(in srgb, #fff var(--wk-icon-lift), ${DASHBOARD_COLOR})` : COLOR.primary
  return (
    <span
      className="shrink-0 flex items-center justify-center rounded-lg pointer-events-none"
      style={{ width: 26, height: 26, background: `color-mix(in srgb, ${color} var(--wk-icon-tint), var(--wk-card-surface))` }}
    >
      <Icon name={kind === 'dashboard' ? 'bar_chart' : 'database'} size={20} weight={350} color={color} />
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────── árvore */

/*
 * A lista do portal (Items.tsx de lá): linhas de 44px com fio entre elas,
 * hover azulado e rótulo de coluna discreto. Aqui ela vira árvore: a pasta
 * (ou a área) abre e fecha, e o metadado abre nos dashboards que alimenta.
 * Escolher é clicar na linha; dois cliques ou Enter seguem para o passo 2.
 */
const TREE_COLS =
  '[grid-template-columns:minmax(0,1fr)_24px] lg:[grid-template-columns:minmax(0,50fr)_minmax(0,22fr)_minmax(0,28fr)_24px]'
/* O cinza do rótulo de coluna do portal (textMuted) dá 2,93:1 no claro; aqui vai o secundário. */
const HEAD = { fontFamily: FONT, fontSize: 12, fontWeight: 600, color: COLOR.textSecondary } as const
const META = { fontFamily: FONT, fontSize: 13, lineHeight: '20px', color: COLOR.textSecondary } as const
/** Recuo de cada nível: a seta (20) e o vão (8) do nível de cima. */
const INDENT = 28

function TreeHead({ cols }: { cols: [string, string, string] }) {
  return (
    <div className={`grid items-center h-7 px-3 gap-x-3 ${TREE_COLS}`}>
      <span style={HEAD}>{cols[0]}</span>
      <span className="hidden lg:block truncate" style={HEAD}>
        {cols[1]}
      </span>
      <span className="hidden lg:block truncate" style={HEAD}>
        {cols[2]}
      </span>
      <span />
    </div>
  )
}

/** Pasta ou área: só abre e fecha. */
function GroupRow({ icon, label, count, open, onToggle, level = 0 }: { icon: string; label: string; count: string; open: boolean; onToggle: () => void; level?: number }) {
  return (
    <button
      type="button"
      role="treeitem"
      aria-expanded={open}
      onClick={onToggle}
      title={label}
      className={`w-full text-left grid items-center h-11 px-3 gap-x-3 transition-colors hover:bg-[var(--wk-list-hover)] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--wk-primary)] ${TREE_COLS}`}
    >
      <span className="flex items-center min-w-0 gap-2" style={{ paddingLeft: level * INDENT }}>
        <Icon name="chevron_right" size={20} color={COLOR.navLabel} className={`shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
        <Icon name={icon} size={20} filled weight={300} color={COLOR.navLabel} className="shrink-0" />
        <span className="truncate text-[14px] leading-[20px] font-semibold" style={{ fontFamily: FONT, color: COLOR.text }}>
          {label}
        </span>
        <span className="shrink-0 text-[13px]" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
          {count}
        </span>
      </span>
      <span className="hidden lg:block" />
      <span className="hidden lg:block" />
      <span />
    </button>
  )
}

/** O que trava o uso do metadado, na própria linha. */
function StatusTag({ m }: { m: CatalogItem }) {
  if (m.failed)
    return (
      <span className="shrink-0 inline-flex items-center gap-1 text-[12px]" style={{ fontFamily: FONT, color: 'var(--an-danger-text)' }}>
        <Icon name="error" size={16} color="currentColor" />
        Com erro
      </span>
    )
  if (!m.ind)
    return (
      <span className="shrink-0 inline-flex items-center rounded-md text-[12px] font-medium" style={{ height: 20, padding: '0 6px', background: 'var(--wk-hover-strong)', fontFamily: FONT, color: COLOR.textSecondary }}>
        Sem dados no protótipo
      </span>
    )
  return null
}

/** Linha que se escolhe: dashboard ou metadado. */
function LeafRow({
  kind,
  name,
  meta,
  detail,
  status,
  level,
  selected,
  onSelect,
  onOpen,
  toggle,
}: {
  kind: 'dashboard' | 'metadado'
  name: string
  meta: string
  detail: string
  status?: React.ReactNode
  level: number
  selected: boolean
  onSelect: () => void
  onOpen: () => void
  /** Metadado com dashboards embaixo: a seta abre e fecha sem escolher. */
  toggle?: { open: boolean; onToggle: () => void }
}) {
  const color = kind === 'dashboard' ? `color-mix(in srgb, #fff var(--wk-icon-lift), ${DASHBOARD_COLOR})` : COLOR.primary
  return (
    <div
      role="treeitem"
      aria-selected={selected}
      aria-expanded={toggle?.open}
      className={`group relative grid items-center min-h-[56px] md:min-h-0 md:h-11 px-3 gap-x-3 transition-colors ${selected ? '' : 'hover:bg-[var(--wk-list-hover)]'} ${TREE_COLS}`}
      style={selected ? { background: 'color-mix(in srgb, var(--wk-primary) 9%, transparent)' } : undefined}
    >
      <button
        type="button"
        aria-label={name}
        onClick={onSelect}
        onDoubleClick={onOpen}
        onKeyDown={(e) => e.key === 'Enter' && selected && (e.preventDefault(), onOpen())}
        className="absolute inset-0 outline-none cursor-pointer focus-visible:shadow-[inset_0_0_0_2px_var(--wk-primary)]"
      />
      <span className="flex items-center min-w-0 gap-2" style={{ paddingLeft: level * INDENT }}>
        {toggle ? (
          <button
            type="button"
            onClick={toggle.onToggle}
            aria-label={toggle.open ? `Recolher ${name}` : `Mostrar os dashboards de ${name}`}
            title={toggle.open ? 'Recolher' : 'Mostrar os dashboards que ele alimenta'}
            className="relative z-[1] shrink-0 wk-icon-btn flex items-center justify-center"
            style={{ width: 20, height: 20 }}
          >
            <Icon name="chevron_right" size={20} color={COLOR.navLabel} className={`transition-transform duration-200 ${toggle.open ? 'rotate-90' : ''}`} />
          </button>
        ) : (
          <span className="shrink-0" style={{ width: 20 }} />
        )}
        <Icon name={kind === 'dashboard' ? 'bar_chart' : 'database'} size={20} weight={350} color={color} className="shrink-0 pointer-events-none" />
        <span className="pointer-events-none min-w-0 flex flex-col py-1.5 md:py-0">
          <span className="flex items-center gap-2 min-w-0">
            <span className="truncate text-[14px] leading-[20px]" style={{ fontFamily: FONT, color: COLOR.text, fontWeight: selected ? 600 : 400 }}>
              {name}
            </span>
            {status}
          </span>
          {/* Abaixo de lg as colunas somem; o metadado desce para baixo do nome. */}
          <span className="lg:hidden truncate text-[12px] leading-[16px] mt-0.5" style={{ fontFamily: FONT, color: COLOR.textSecondary }}>
            {meta}
          </span>
        </span>
      </span>
      <span className="pointer-events-none hidden lg:block truncate" style={META} title={meta}>
        {meta}
      </span>
      <span className="pointer-events-none hidden lg:block truncate" style={META} title={detail}>
        {detail}
      </span>
      <span className="pointer-events-none flex justify-end">
        {selected && <Icon name="check_circle" size={20} filled color={COLOR.primary} className="wk-enter" />}
      </span>
    </div>
  )
}

const filtersOf = (d: SourceDashboard) => ['Período', ...d.dims.map((x) => cap(DIMENSIONS[x].label))].join(', ')
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/** Aberto/fechado por chave; na busca tudo abre, para o resultado não ficar escondido. */
function useOpen(initial: (k: string) => boolean) {
  const [state, setState] = useState<Record<string, boolean>>({})
  return {
    isOpen: (k: string, searching: boolean) => searching || (state[k] ?? initial(k)),
    toggle: (k: string) => setState((s) => ({ ...s, [k]: !(s[k] ?? initial(k)) })),
  }
}

type TreeProps<T> = { groups: Group<T>[]; pick: Pick | null; onPick: (p: Pick) => void; onOpen: () => void; searching: boolean }

function DashTree({ groups, pick, onPick, onOpen, searching }: TreeProps<SourceDashboard>) {
  const open = useOpen(() => true)
  return (
    <div role="tree" aria-label="Dashboards disponíveis" className="flex flex-col -mx-3 divide-y divide-[var(--wk-row-divider)]">
      <TreeHead cols={['Nome', 'Metadado', 'Filtros que vêm junto']} />
      {groups.map((g) => {
        const isOpen = open.isOpen(g.label, searching)
        return (
          <div key={g.label} role="group" className="flex flex-col divide-y divide-[var(--wk-row-divider)]">
            <GroupRow icon="folder" label={g.label} count={String(g.items.length)} open={isOpen} onToggle={() => open.toggle(g.label)} />
            {isOpen &&
              g.items.map((d) => {
                const m = catalogItem(d.code)!
                return (
                  <LeafRow
                    key={d.id}
                    kind="dashboard"
                    name={d.name}
                    meta={`${m.code} - ${m.name}`}
                    detail={filtersOf(d)}
                    status={<StatusTag m={m} />}
                    level={1}
                    selected={pick?.kind === 'dashboard' && pick.id === d.id}
                    onSelect={() => onPick({ kind: 'dashboard', id: d.id })}
                    onOpen={onOpen}
                  />
                )
              })}
          </div>
        )
      })}
    </div>
  )
}

function MetaTree({ groups, pick, onPick, onOpen, searching }: TreeProps<CatalogItem>) {
  /* Áreas abertas; o metadado abre nos dashboards só quando se pede, senão a
     lista dobra de tamanho e o metadado some no meio dos filhos. */
  const open = useOpen((k) => !k.startsWith('m:'))
  return (
    <div role="tree" aria-label="Metadados disponíveis"className="flex flex-col -mx-3 divide-y divide-[var(--wk-row-divider)]">
      <TreeHead cols={['Nome', 'Campos', 'Alimenta']} />
      {groups.map((g) => {
        const isOpen = open.isOpen(g.label, searching)
        return (
          <div key={g.label} role="group" className="flex flex-col divide-y divide-[var(--wk-row-divider)]">
            <GroupRow icon="category" label={g.label} count={String(g.items.length)} open={isOpen} onToggle={() => open.toggle(g.label)} />
            {isOpen &&
              g.items.map((m) => {
                const dashes = dashboardsOfCode(m.code)
                const key = `m:${m.code}`
                const mOpen = dashes.length > 0 && open.isOpen(key, false)
                return (
                  <div key={m.code} role="group" className="flex flex-col divide-y divide-[var(--wk-row-divider)]">
                    <LeafRow
                      kind="metadado"
                      name={`${m.code} - ${m.name}`}
                      meta={m.fields.length ? `${m.fields.length} campos` : '—'}
                      detail={dashes.length ? dashes.map((d) => d.name).join(', ') : 'Nenhum dashboard'}
                      status={<StatusTag m={m} />}
                      level={1}
                      selected={pick?.kind === 'metadado' && pick.code === m.code}
                      onSelect={() => onPick({ kind: 'metadado', code: m.code })}
                      onOpen={onOpen}
                      toggle={dashes.length ? { open: mOpen, onToggle: () => open.toggle(key) } : undefined}
                    />
                    {mOpen &&
                      dashes.map((d) => (
                        <LeafRow
                          key={d.id}
                          kind="dashboard"
                          name={d.name}
                          meta={d.folder}
                          detail={filtersOf(d)}
                          level={2}
                          selected={pick?.kind === 'dashboard' && pick.id === d.id}
                          onSelect={() => onPick({ kind: 'dashboard', id: d.id })}
                          onOpen={onOpen}
                        />
                      ))}
                  </div>
                )
              })}
          </div>
        )
      })}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── progresso */

function Progress({ steps, done }: { steps: { label: string; detail?: string }[]; done: number }) {
  return (
    <div className="mx-auto px-6" style={{ maxWidth: 480, paddingTop: 64 }} aria-live="polite">
      <h1 className="text-center" style={{ fontFamily: FONT, fontSize: 22, lineHeight: '32px', fontWeight: 400, color: COLOR.text, margin: '0 0 24px' }}>
        Criando o dashboard
      </h1>
      <ol className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 14 }}>
        {steps.map((s, i) => {
          const ok = i < done
          const doing = i === done
          return (
            <li key={s.label} className="flex items-start" style={{ gap: 10, opacity: ok || doing ? 1 : 0.5, transition: 'opacity .3s ease' }}>
              <Icon
                name={ok ? 'check_circle' : doing ? 'progress_activity' : 'radio_button_unchecked'}
                size={22}
                filled={ok}
                color={ok || doing ? COLOR.primary : COLOR.navLabel}
                className={doing ? 'an-spin' : undefined}
              />
              <span style={{ fontFamily: FONT }}>
                <span className="block" style={{ fontSize: 15, lineHeight: '22px', color: COLOR.text }}>
                  {s.label}
                </span>
                {s.detail && ok && (
                  <span className="block wk-enter" style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
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
