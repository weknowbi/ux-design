import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Btn } from '@ds/Btn'
import { WeknowMark } from '@/components/WeknowLogo'
import { DASHBOARD_COLOR, APPEARANCE_COLORS } from '@ds/appearance'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { AppShell } from '@/components/AppShell'
import { Composer } from '@/components/Composer'
import { Markdown, plainText } from '@/components/Markdown'
import { ConfirmModal } from '@/components/ConfirmModal'
import { PromptModal } from '@/components/PromptModal'
import { Dropdown, MenuAction } from '@/components/browser/Menu'
import type { PortalRoute } from '@/components/PortalSidebar'
import { DashboardSketch } from '@/blocks/DashboardSketch'
import { DRAFTS_ID, folderIdOf, sketchOf } from '@/data/created'
import type { Board } from '@/engine/board'
import { catalogItem, metadadoOf } from '@/engine/catalog'
import type { UserChange } from '@/engine/mcp'
import type { AlertSpec } from '@/engine/alerts'
import type { Step } from '@/engine/tools'
import { momentWhen, type Moment } from '@/engine/moment'
import { useInsights } from '@/lib/insights'
import {
  cancelPending,
  confirmPending,
  deleteConversation,
  renameConversation,
  sendRequest,
  startConversation,
  useConversations,
  type Conversation,
  type Entry,
  type Pending,
} from '@/lib/conversations'
import { go, replace } from '@/lib/router'
import { useStore } from '@/lib/store'
import { UserBubble, openBoardWithoutChat, useNarrow, useRoomyMenu } from '@/screens/BoardScreen'

/**
 * Weknow Ask: a IA do Weknow, numa conversa. A pessoa pergunta, pede uma
 * análise ou pede algo, e o Weknow responde ou faz. É o que uma IA de fora faz
 * pelo MCP do Weknow, sem a pessoa precisar sair daqui (ver `engine/mcp.ts`).
 *
 * O Ask de antes partia de um metadado escolhido numa lista; este escolhe
 * sozinho. E absorve a Análise inteligente: o "Análise inteligente" do
 * dashboard abre uma conversa daqui com o momento do dashboard (ver
 * `engine/moment.ts`), e a análise que sai dela é salva no dashboard.
 *
 * Funciona como o Claude usando o MCP do Weknow: a pessoa diz o que quer, e a
 * IA escolhe as ferramentas e os metadados (quantos precisar), mostra cada
 * chamada e responde. Ninguém escolhe metadado numa lista: se a escolha não
 * serviu, diz-se na conversa ("usa o 32").
 *
 * Ler, consultar, achar uma tela e criar um rascunho, que só a pessoa vê,
 * acontecem direto. Só o que muda algo de outra pessoa (um cadastro) espera
 * confirmação: pelo botão ou por Enter com a caixa vazia.
 *
 * O menu lateral é o de sempre, recolhido em ícones como no editor, com o
 * "Portal" à vista, e as conversas vêm numa folha ao lado dele. Trocar o menu
 * inteiro ao entrar aqui, como faz o Ask, deixa a pessoa sem saber como voltar.
 * Abertura sem sugestões: dá para pedir qualquer coisa, e meia dúzia de exemplos
 * só estreitaria isso.
 */

const COLUMN = 760
const SEND_HINT = 'Enter para enviar, Shift+Enter para nova linha'
const COMPOSER_LABEL = 'Mensagem para o Weknow Ask'
/** O vão do símbolo: o que vem depois da resposta alinha com o texto dela. */
const GLYPH_COLUMN = 36

/** Quem responde é o Weknow: a resposta vem assinada pelo símbolo da marca. */
function AiGlyph({ size = 24, hidden }: { size?: number; hidden?: boolean }) {
  return (
    <span className="shrink-0 flex items-center justify-center" style={{ width: size, height: size, visibility: hidden ? 'hidden' : undefined }}>
      <WeknowMark size={size} />
    </span>
  )
}

export function IaScreen({ id, onRoute }: { id?: string; onRoute: (r: PortalRoute) => void }) {
  useRoomyMenu()
  const { list, work } = useConversations()
  const conv = id ? list.find((c) => c.id === id) : undefined
  /* A lista divide a folha com a conversa: em tela estreita ela vira gaveta. */
  const narrow = useNarrow('(max-width: 1099px)')
  const [listOpen, setListOpen] = useState(false)
  const [collapsed, setCollapsed] = useListCollapsed()
  /* Em tela larga, a lista recolhe; em tela estreita, ela já é gaveta. */
  const hidden = !narrow && collapsed
  const showRef = useRef<HTMLButtonElement>(null)
  const collapseRef = useRef<HTMLButtonElement>(null)
  /* O foco segue o botão que troca de lugar: quem recolhe pelo teclado cai no
     "Mostrar conversas", e vice-versa. Só depois de um clique, não na abertura. */
  const toggled = useRef(false)
  useEffect(() => {
    if (!toggled.current) return
    toggled.current = false
    ;(hidden ? showRef : collapseRef).current?.focus({ preventScroll: true })
  }, [hidden])
  const toggle = (next: boolean) => {
    toggled.current = true
    setCollapsed(next)
  }

  const start = (text: string) => replace(`/ia/${startConversation(text)}`)
  const pick = (cid: string | null) => {
    setListOpen(false)
    if (cid !== conv?.id) go(cid ? `/ia/${cid}` : '/ia')
  }

  const history = (
    <ConversationList list={list} work={work} active={conv?.id} onPick={pick} onCollapse={narrow ? undefined : () => toggle(true)} collapseRef={collapseRef} />
  )

  return (
    <AppShell
      route="ia"
      gutter={false}
      onNavigate={onRoute}
      trail={[
        { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => go(null) },
        { label: 'Weknow Ask', onClick: () => go('/ia') },
        ...(conv ? [{ label: conv.title }] : []),
      ]}
      search={{ value: '', onChange: () => {}, placeholder: 'Pesquise por nome ou tag', hidden: true }}
      panel={narrow ? undefined : history}
      panelCollapsed={hidden}
    >
      <div className="relative flex h-full" style={{ fontFamily: FONT }}>
        {/* Lista recolhida: o que ela tinha de mais usado fica no canto da
            conversa, solto, sem barra: abrir de volta e começar outra. */}
        {hidden && (
          <div className="absolute z-10 flex items-center wk-fade-in" style={{ top: 8, left: 8, gap: 2 }}>
            <button
              ref={showRef}
              type="button"
              title="Mostrar conversas"
              aria-label="Mostrar conversas"
              aria-expanded={false}
              onClick={() => toggle(false)}
              className="wk-icon-btn flex items-center justify-center"
              style={{ width: 36, height: 36, color: COLOR.navLabel }}
            >
              <Icon name="left_panel_open" size={22} />
            </button>
            {conv && (
              <button
                type="button"
                title="Nova conversa"
                aria-label="Nova conversa"
                onClick={() => pick(null)}
                className="wk-icon-btn flex items-center justify-center"
                style={{ width: 36, height: 36, color: COLOR.navLabel }}
              >
                <Icon name="edit_square" size={22} />
              </button>
            )}
          </div>
        )}
        <div className="flex-1 min-w-0 flex flex-col h-full">
          {narrow && (
            <div className="shrink-0 flex items-center" style={{ padding: '8px 12px 0' }}>
              <Btn variant="ghost" size="sm" iconLeft="forum" onClick={() => setListOpen(true)}>
                Conversas
              </Btn>
            </div>
          )}
          {conv ? <Thread key={conv.id} conv={conv} work={work[conv.id]} /> : <Hero onSend={start} />}
        </div>
        {narrow && listOpen && (
          <div className="absolute inset-0 z-20 flex" style={{ background: 'var(--wk-backdrop)' }} onClick={(e) => e.target === e.currentTarget && setListOpen(false)}>
            <div className="h-full" style={{ width: 'min(320px, 88%)', background: 'var(--wk-surface)', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
              {history}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}

/* ─────────────────────────────────────────────────────── lista de conversas */

/**
 * As conversas, numa folha própria ao lado da aberta, como o Criar com IA no
 * editor: é o vão entre as folhas que separa, e não um fio. Do portal vêm a
 * pílula da busca, a marca tingida (dashboard é sempre o vermelho de barras) e
 * o raio dos cartões; do painel, o lado técnico: o rótulo em caixa alta, o
 * código do metadado e a hora em números tabulares.
 *
 * Sem título na folha: quem diz onde a pessoa está é o caminho do topo, e a
 * primeira coisa ali é começar outra conversa.
 *
 * Cada linha diz o que a conversa virou, e não só o nome dela: dá para achá-la
 * pelo resultado, e ver de relance o que ainda espera confirmação.
 */

const GROUPS = ['Hoje', 'Ontem', 'Últimos 7 dias', 'Anteriores']

/** Lista recolhida ou não, lembrado entre as visitas, como o menu lateral do portal. */
const COLLAPSED_KEY = 'wk-ia-list-collapsed'

function useListCollapsed() {
  const [collapsed, set] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
      return false
    }
  })
  const setCollapsed = (next: boolean) => {
    set(next)
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
    } catch {
      /* sem armazenamento: vale enquanto a tela está aberta */
    }
  }
  return [collapsed, setCollapsed] as const
}

function groupOf(at: number) {
  const day = new Date()
  day.setHours(0, 0, 0, 0)
  const start = day.getTime()
  if (at >= start) return 0
  if (at >= start - 86_400_000) return 1
  if (at >= start - 7 * 86_400_000) return 2
  return 3
}

/** Hoje, a hora; antes disso, o dia. O grupo já diz o resto. */
function timeOf(at: number) {
  const d = new Date(at)
  const two = (n: number) => String(n).padStart(2, '0')
  return groupOf(at) === 0 ? `${two(d.getHours())}:${two(d.getMinutes())}` : `${two(d.getDate())}/${two(d.getMonth() + 1)}`
}

type Summary = { icon: string; color: string; meta: string; waiting?: boolean }

const MARK_PERSON = APPEARANCE_COLORS[2]
const MARK_CHAT = APPEARANCE_COLORS[0]
const MARK_SCREEN = APPEARANCE_COLORS[5]
const MARK_ANSWER = APPEARANCE_COLORS[1]
const MARK_ALERT = APPEARANCE_COLORS[3]
const MARK_INSIGHT = APPEARANCE_COLORS[4]

/** O que a conversa virou, para a linha: o tipo na marca e o resultado na linha técnica. */
function summarize(c: Conversation, boards: Board[]): Summary {
  if (c.pending?.kind === 'alert') return { icon: 'notifications_active', color: MARK_ALERT, meta: 'Falta confirmar · Alerta', waiting: true }
  if (c.pending) return { icon: 'person', color: MARK_PERSON, meta: 'Falta confirmar · Cadastro', waiting: true }

  /* Sobre um momento de dashboard: a análise, ou a conversa que parte dele. */
  if (c.moment) {
    const made = c.entries.some((e) => e.role === 'ai' && e.insight)
    return { icon: 'article', color: MARK_INSIGHT, meta: `${made ? 'Análise' : 'Momento'} · ${c.moment.dashboardName}` }
  }
  const links = c.entries.flatMap((e) => (e.role === 'ai' && e.link ? [e.link.path] : []))
  const last = links[links.length - 1]
  if (last?.startsWith('/dashboard/')) {
    const board = boards.find((b) => b.id === last.slice('/dashboard/'.length))
    if (!board) return { icon: 'bar_chart', color: DASHBOARD_COLOR, meta: 'Dashboard excluído' }
    const md = metadadoOf(board.ind)
    return { icon: 'bar_chart', color: DASHBOARD_COLOR, meta: `${md.code} - ${md.name} · ${board.saved ? 'Publicado' : 'Rascunho'}` }
  }
  if (last === '/tarefas') return { icon: 'notifications_active', color: MARK_ALERT, meta: 'Alerta · Tarefas' }
  if (last === '/configuracoes/usuarios') return { icon: 'person', color: MARK_PERSON, meta: 'Cadastro · Usuários' }
  if (last?.startsWith('/configuracoes/')) return { icon: 'settings', color: MARK_SCREEN, meta: 'Configurações' }
  /* Respondida com os dados: de onde a resposta veio. */
  const read = [...c.entries].reverse().find((e) => e.role === 'ai' && e.about)
  const codes = read?.role === 'ai' && read.about ? (Array.isArray(read.about) ? read.about : [read.about]) : []
  const items = codes.map((code) => catalogItem(code)).filter((i) => !!i)
  if (items.length === 1) return { icon: 'insights', color: MARK_ANSWER, meta: `Resposta · ${items[0].code} - ${items[0].name}` }
  /* Cruzou metadados: os códigos dizem quais, sem caber o nome de todos. */
  if (items.length > 1) return { icon: 'insights', color: MARK_ANSWER, meta: `Resposta · ${items.map((i) => i.code).join(' e ')} cruzados` }
  /* Ainda sem resultado: o começo da última resposta, que diz em que pé está. */
  const said = [...c.entries].reverse().find((e) => e.role === 'ai')
  return { icon: 'quickreply', color: MARK_CHAT, meta: said ? plainText(said.text) : 'Conversa' }
}

function Mark({ icon, color, busy, solid }: { icon: string; color: string; busy?: boolean; solid?: boolean }) {
  /* A mesma conta da marca dos cartões do portal: o glifo na cor e o fundo
     diluído. `solid` é a conversa aberta: a marca se enche e o glifo fica branco. */
  const tone = solid ? '#fff' : `color-mix(in srgb, #fff var(--wk-icon-lift), ${color})`
  const background = solid ? color : `color-mix(in srgb, ${tone} var(--wk-icon-tint), var(--wk-card-surface))`
  return (
    <span className="shrink-0 flex items-center justify-center rounded-lg transition-colors" style={{ width: 32, height: 32, background }}>
      {busy ? <Icon name="progress_activity" size={20} weight={350} color={tone} className="an-spin" /> : <Icon name={icon} size={20} weight={350} color={tone} />}
    </span>
  )
}

function ConversationRow({
  conv,
  summary,
  busy,
  active,
  onPick,
  onRename,
  onDelete,
}: {
  conv: Conversation
  summary: Summary
  busy: boolean
  active: boolean
  onPick: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const lit = hovered || menuOpen
  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-xl transition-colors"
      /* Aberto: um véu leve, e quem diz "é este" é a marca cheia. O bloco cinza
         do menu, aqui, pesava e engolia a marca, do mesmo tom dele. */
      style={{ background: active ? 'color-mix(in srgb, var(--wk-primary) 7%, transparent)' : lit ? 'var(--wk-list-hover)' : 'transparent' }}
    >
      <button
        type="button"
        onClick={onPick}
        aria-current={active ? 'page' : undefined}
        title={conv.title}
        className="w-full flex items-center text-left rounded-xl outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--wk-primary)]"
        style={{ gap: 10, padding: 8, fontFamily: FONT }}
      >
        <Mark icon={summary.icon} color={summary.color} busy={busy} solid={active} />
        <span className="flex-1 min-w-0 flex flex-col" style={{ gap: 1 }}>
          <span className="flex items-baseline" style={{ gap: 8 }}>
            <span className="flex-1 min-w-0 truncate" style={{ fontSize: 14, lineHeight: '20px', fontWeight: active ? 600 : 500, color: COLOR.text }}>
              {conv.title}
            </span>
            <span className="shrink-0" style={{ fontSize: 12, lineHeight: '16px', fontVariantNumeric: 'tabular-nums', color: COLOR.textSecondary, visibility: lit ? 'hidden' : undefined }}>
              {timeOf(conv.updatedAt)}
            </span>
          </span>
          <span className="truncate" style={{ fontSize: 12, lineHeight: '16px', fontWeight: summary.waiting ? 500 : 400, color: summary.waiting ? 'var(--wk-primary-hover)' : COLOR.textSecondary }}>
            {busy ? 'Pensando…' : summary.meta}
          </span>
        </span>
      </button>
      {lit && (
        <span className="absolute flex items-center" style={{ top: 4, right: 4 }}>
          <Dropdown
            align="right"
            minWidth={168}
            onClose={() => setMenuOpen(false)}
            trigger={({ toggle }) => (
              <button
                type="button"
                title="Mais opções"
                aria-label={`Mais opções de ${conv.title}`}
                onClick={() => {
                  setMenuOpen(true)
                  toggle()
                }}
                className="wk-icon-btn flex items-center justify-center"
                style={{ width: 28, height: 28, color: COLOR.navLabel }}
              >
                <Icon name="more_horiz" size={20} />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuAction
                  icon="edit"
                  label="Renomear"
                  onSelect={() => {
                    close()
                    setMenuOpen(false)
                    onRename()
                  }}
                />
                <MenuAction
                  icon="delete"
                  label="Excluir"
                  onSelect={() => {
                    close()
                    setMenuOpen(false)
                    onDelete()
                  }}
                />
              </>
            )}
          </Dropdown>
        </span>
      )}
    </li>
  )
}

function ConversationList({
  list,
  work,
  active,
  onPick,
  onCollapse,
  collapseRef,
}: {
  list: Conversation[]
  work: Record<string, unknown>
  active?: string
  onPick: (id: string | null) => void
  /** Recolher a lista; sem ele (a gaveta da tela estreita), não há o botão. */
  onCollapse?: () => void
  collapseRef?: RefObject<HTMLButtonElement | null>
}) {
  const { analyses } = useStore()
  const boards = useMemo(() => analyses.map((a) => a.board), [analyses])
  const [removing, setRemoving] = useState<Conversation | null>(null)
  const [renaming, setRenaming] = useState<Conversation | null>(null)
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const summaries = useMemo(() => new Map(list.map((c) => [c.id, summarize(c, boards)])), [list, boards])
  const found = q
    ? list.filter((c) => c.title.toLowerCase().includes(q) || summaries.get(c.id)!.meta.toLowerCase().includes(q) || c.entries.some((e) => e.text.toLowerCase().includes(q)))
    : list
  return (
    <div className="flex flex-col h-full" style={{ fontFamily: FONT }}>
      {/* Linha limpa, sem caixas: só o "+" e o texto. O "+" ocupa a coluna das
          marcas, então o texto alinha com os títulos das conversas. Não fica
          aceso na abertura (a abertura já mostra onde a pessoa está); acende
          com o mouse, como as outras linhas. */}
      {/* O recolher fica na mesma linha, na ponta direita: é onde a borda
          que fecha está, e não pede uma faixa de topo só para ele. */}
      <div className="shrink-0 flex items-center" style={{ padding: '8px 8px 6px', gap: 4 }}>
        <button
          type="button"
          onClick={() => onPick(null)}
          aria-current={active ? undefined : 'page'}
          className="flex-1 min-w-0 flex items-center text-left rounded-xl transition-colors hover:bg-[var(--wk-list-hover)] outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--wk-primary)]"
          style={{ gap: 10, padding: '6px 8px', fontFamily: FONT, fontSize: 14, lineHeight: '20px', fontWeight: 500, color: COLOR.text }}
        >
          <span className="shrink-0 flex items-center justify-center" style={{ width: 32, height: 28 }}>
            <Icon name="add" size={22} weight={350} color={COLOR.text} />
          </span>
          Nova conversa
        </button>
        {onCollapse && (
          <button
            ref={collapseRef}
            type="button"
            title="Recolher conversas"
            aria-label="Recolher conversas"
            aria-expanded
            onClick={onCollapse}
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 36, height: 36, color: COLOR.navLabel }}
          >
            <Icon name="left_panel_close" size={22} />
          </button>
        )}
      </div>
      {list.length > 0 && (
        <div className="shrink-0" style={{ padding: '0 12px 12px' }}>
          <label className="flex items-center rounded-full" style={{ height: 36, gap: 8, padding: '0 14px 0 10px', background: COLOR.searchPillLight }}>
            <Icon name="search" size={20} color={COLOR.navLabel} className="shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar"
              aria-label="Buscar conversas"
              className="flex-1 min-w-0 bg-transparent outline-none"
              style={{ fontSize: 14, color: COLOR.text }}
            />
          </label>
        </div>
      )}
      <div className="wk-hover-scroll flex-1 min-h-0 overflow-y-auto" style={{ padding: '0 8px 16px' }}>
        {list.length === 0 ? (
          <div className="flex flex-col items-center text-center" style={{ padding: '48px 20px 0', gap: 12 }}>
            <Mark icon="quickreply" color={MARK_CHAT} />
            <p style={{ fontSize: 13, lineHeight: '19px', color: COLOR.textSecondary, margin: 0 }}>Suas conversas ficam aqui, com o que cada uma criou ou mudou.</p>
          </div>
        ) : found.length === 0 ? (
          <p style={{ fontSize: 13, lineHeight: '19px', color: COLOR.textSecondary, margin: 0, padding: '8px 12px' }}>Nenhuma conversa encontrada.</p>
        ) : (
          GROUPS.map((label, g) => {
            const items = found.filter((c) => groupOf(c.updatedAt) === g)
            if (!items.length) return null
            return (
              <section key={label} style={{ marginBottom: 12 }}>
                <h3 style={{ fontSize: 11.5, lineHeight: '16px', fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', color: COLOR.textSecondary, margin: 0, padding: '4px 12px 6px' }}>{label}</h3>
                <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 2 }}>
                  {items.map((c) => (
                    <ConversationRow
                      key={c.id}
                      conv={c}
                      summary={summaries.get(c.id)!}
                      busy={!!work[c.id]}
                      active={c.id === active}
                      onPick={() => onPick(c.id)}
                      onRename={() => setRenaming(c)}
                      onDelete={() => setRemoving(c)}
                    />
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </div>
      {renaming && (
        <PromptModal
          title="Renomear conversa"
          label="Nome"
          initialValue={renaming.title}
          confirmLabel="Renomear"
          onClose={() => setRenaming(null)}
          onConfirm={(title) => {
            renameConversation(renaming.id, title.trim())
            setRenaming(null)
          }}
        />
      )}
      {removing && (
        <ConfirmModal
          title="Excluir conversa?"
          confirmLabel="Excluir"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            deleteConversation(removing.id)
            if (removing.id === active) onPick(null)
            setRemoving(null)
          }}
        >
          “{removing.title}” sai da lista e não dá para recuperar. O que ela já criou ou mudou no Weknow continua como está.
        </ConfirmModal>
      )}
    </div>
  )
}

/* ───────────────────────────────────────────────────────── a abertura */

function Hero({ onSend }: { onSend: (t: string) => void }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center" style={{ padding: '24px 24px 12vh' }}>
      <div className="w-full flex flex-col items-center" style={{ maxWidth: COLUMN }}>
        <AiGlyph size={40} />
        <h1 className="text-center" style={{ fontSize: 26, lineHeight: '36px', fontWeight: 400, color: COLOR.text, margin: '12px 0 24px' }}>
          O que você quer saber ou fazer no Weknow?
        </h1>
        <div className="w-full">
          <Composer autoFocus onSend={onSend} placeholder="Pergunte sobre seus dados, peça uma análise ou um dashboard..." label={COMPOSER_LABEL} />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────── a conversa */

function Thread({ conv, work }: { conv: Conversation; work?: { steps: string[]; done: number } }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { id, entries, pending } = conv

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries.length, pending, work])

  const confirm = () => void confirmPending(id)

  return (
    <>
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full flex flex-col" style={{ maxWidth: COLUMN + 48, padding: '24px', gap: 20 }}>
          {entries.map((e, i) =>
            e.role === 'user' ? <UserLine key={e.id} text={e.text} moment={e.moment} /> :<AiLine key={e.id} entry={e} glyph={entries[i - 1]?.role !== 'ai'} onSend={(t) => sendRequest(id, t)} />,
          )}
          {work && <Working steps={work.steps} done={work.done} />}
          {pending && !work && (
            <div className="wk-enter" style={{ marginLeft: GLYPH_COLUMN }}>
              {pending.kind === 'alert' ? (
                <AlertProposal alert={pending.alert} onConfirm={confirm} onCancel={() => cancelPending(id)} />
              ) : (
                <UserProposal changes={pending.changes} onConfirm={confirm} onCancel={() => cancelPending(id)} />
              )}
            </div>
          )}
        </div>
      </div>
      <div className="shrink-0" style={{ padding: '0 24px 20px' }}>
        <div className="mx-auto" style={{ maxWidth: COLUMN }}>
          <Composer autoFocus onSend={(t) => sendRequest(id, t)} onEmptyEnter={confirm} placeholder={placeholder(pending)} label={COMPOSER_LABEL} disabled={!!work} />
        </div>
      </div>
    </>
  )
}

function placeholder(p: Pending | null) {
  return p ? 'Enter para confirmar, ou peça outra coisa' : SEND_HINT
}

function UserLine({ text, moment }: { text: string; moment?: Moment }) {
  return (
    <div className="self-end flex flex-col items-end" style={{ maxWidth: '80%', gap: 6 }}>
      {moment && <MomentChip moment={moment} />}
      <UserBubble text={[text]} />
    </div>
  )
}

/** O momento que a pessoa trouxe do dashboard, como um anexo da mensagem. */
function MomentChip({ moment }: { moment: Moment }) {
  return (
    <button
      type="button"
      onClick={() => go(`/dashboard/${moment.dashboard}/aba/${moment.tab}`)}
      className="wk-moment flex items-center text-left"
      style={{ gap: 10, padding: '8px 12px 8px 8px', maxWidth: 420 }}
      title="Abrir o dashboard nesta aba"
    >
      <span className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: 36, height: 36, background: `color-mix(in srgb, ${DASHBOARD_COLOR} 14%, var(--wk-card-surface))` }}>
        <Icon name="photo_camera" size={20} color={DASHBOARD_COLOR} />
      </span>
      <span className="flex flex-col min-w-0">
        <span className="truncate" style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: COLOR.text }}>
          {moment.dashboardName}
        </span>
        <span className="truncate" style={{ fontSize: 12, lineHeight: '16px', color: COLOR.textSecondary }}>
          Aba {moment.tabName} · {momentWhen(moment)}
        </span>
      </span>
    </button>
  )
}

/** A análise que a conversa salvou no dashboard, como ela está agora. */
function InsightResult({ id }: { id: string }) {
  const all = useInsights()
  const it = all.find((i) => i.id === id)
  if (!it) return <p style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: 0 }}>Esta análise foi excluída.</p>
  const others = it.shared.filter((s) => s.name !== it.author).length
  const status = [`Salva em Análises do ${it.moment.dashboardName}`, it.comments.length ? `${it.comments.length} ${it.comments.length > 1 ? 'comentários' : 'comentário'}` : '', others ? `compartilhada com ${others}` : '']
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="flex flex-wrap items-center" style={{ ...CARD, padding: 12, gap: 12 }}>
      <span className="shrink-0 flex items-center justify-center rounded-lg" style={{ width: 40, height: 40, background: `color-mix(in srgb, ${MARK_INSIGHT} 14%, var(--wk-card-surface))` }}>
        <Icon name="article" size={22} color={MARK_INSIGHT} />
      </span>
      <span className="flex flex-col" style={{ flex: '1 1 200px', minWidth: 0, gap: 2 }}>
        <span className="truncate" style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: COLOR.text }}>
          {it.title}
        </span>
        <span className="truncate" title={status} style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
          {status}
        </span>
      </span>
      <Btn variant="outlined" size="sm" iconLeft="open_in_new" onClick={() => go(`/analise/${it.id}`)}>
        Abrir análise
      </Btn>
    </div>
  )
}

function AiLine({ entry, glyph, onSend }: { entry: Extract<Entry, { role: 'ai' }>; glyph: boolean; onSend: (t: string) => void }) {
  const dashboard = entry.link?.path.startsWith('/dashboard/') ? entry.link.path.slice('/dashboard/'.length) : null
  return (
    <div className="flex wk-enter" style={{ gap: GLYPH_COLUMN - 24 }}>
      <AiGlyph hidden={!glyph} />
      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: 10 }}>
        {entry.steps && entry.steps.length > 0 && <Steps steps={entry.steps} />}
        <Markdown text={entry.text} />
        {entry.preview && <WhatsAppPreview message={entry.preview.message} sample={entry.preview.sample} />}
        {entry.options && (
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {entry.options.map((o) => (
              <Btn key={o.label} variant="outlined" size="sm" onClick={() => onSend(o.text)}>
                {o.label}
              </Btn>
            ))}
          </div>
        )}
        {entry.insight ? (
          <InsightResult id={entry.insight} />
        ) : dashboard ? (
          <DashboardResult id={dashboard} />
        ) : (
          entry.link && (
            <div>
              <Btn variant="outlined" size="sm" iconLeft="open_in_new" onClick={() => go(entry.link!.path)}>
                {entry.link.label}
              </Btn>
            </div>
          )
        )}
      </div>
    </div>
  )
}

/**
 * O dashboard que a conversa criou, como ele está agora: rascunho até publicar,
 * e depois a pasta. A conversa é um dos dois caminhos até ele; o outro é o
 * portal, por isso o botão que leva à pasta onde ele está.
 */
function DashboardResult({ id }: { id: string }) {
  const { analyses } = useStore()
  const board = analyses.find((a) => a.board.id === id)?.board
  if (!board) return <p style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: 0 }}>Este dashboard foi excluído.</p>
  const folder = board.saved ? folderIdOf(board.saved.folder) : DRAFTS_ID
  const status = board.saved ? `Publicado em ${board.saved.folder}${board.saved.dirty ? ', com alterações' : ''}` : 'Rascunho em Meus rascunhos'
  return (
    <div className="flex flex-wrap items-center" style={{ ...CARD, padding: 12, gap: 12 }}>
      <span className="shrink-0 flex items-center justify-center overflow-hidden rounded-lg" style={{ width: 96, height: 48, background: 'var(--wk-thumb-empty)' }}>
        <DashboardSketch layout={sketchOf(board.widgets)} />
      </span>
      <span className="flex flex-col" style={{ flex: '1 1 200px', minWidth: 0, gap: 2 }}>
        <span className="truncate" style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: COLOR.text }}>
          {board.saved?.name ?? board.title}
        </span>
        <span className="truncate" title={status} style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
          {status}
        </span>
      </span>
      <span className="flex items-center" style={{ gap: 4 }}>
        {folder && (
          <Btn variant="ghost" size="sm" iconLeft="folder_open" onClick={() => go(`/pasta/${encodeURIComponent(folder)}`)}>
            Ver na pasta
          </Btn>
        )}
        <Btn variant="outlined" size="sm" iconLeft="open_in_new" onClick={() => openBoardWithoutChat(id)}>
          Abrir dashboard
        </Btn>
      </span>
    </div>
  )
}

function Working({ steps, done }: { steps: string[]; done: number }) {
  return (
    <div className="flex" style={{ gap: GLYPH_COLUMN - 24 }}>
      <AiGlyph />
      <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: '2px 0 0', gap: 2 }} aria-live="polite">
        {steps.slice(0, done + 1).map((s, i) => (
          <li key={s} className="flex items-center" style={{ gap: 6, fontSize: 13, lineHeight: '20px', color: COLOR.textSecondary }}>
            {i < done ? (
              <>
                <Icon name="check" size={16} color={COLOR.navLabel} className="shrink-0" />
                {s}
              </>
            ) : (
              <>
                <Icon name="progress_activity" size={16} color={COLOR.navLabel} className="an-spin shrink-0" />
                {s}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

const CARD = { border: `1px solid ${COLOR.border}`, borderRadius: 12, padding: '12px 16px 16px' }

/* ──────────────────────────────────────────── chamadas de ferramenta */

/**
 * O que a IA consultou para responder, como o Claude mostra o uso de um MCP:
 * uma linha por chamada, e cada uma abre para mostrar a ferramenta, o que se
 * pediu e o que voltou. Fechadas, ficam no tom secundário e não disputam com a
 * resposta; abertas, deixam conferir de onde cada número saiu.
 */
function Steps({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 2 }} aria-label="O que foi consultado">
      {steps.map((s, i) => {
        const rowStyle = { gap: 6, fontSize: 13, lineHeight: '20px', color: COLOR.textSecondary } as const
        if (typeof s === 'string') {
          return (
            <li key={i} className="flex items-center" style={rowStyle}>
              <Icon name="check" size={16} color={COLOR.navLabel} className="shrink-0" />
              {s}
            </li>
          )
        }
        const isOpen = open === i
        const panel = `wk-step-${i}-${s.tool}`
        return (
          <li key={i} className="flex flex-col">
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panel}
              onClick={() => setOpen(isOpen ? null : i)}
              className="self-start flex items-center rounded-md transition-colors hover:text-[var(--wk-text)] outline-none focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]"
              style={{ ...rowStyle, padding: '0 4px 0 0', fontFamily: FONT }}
            >
              <Icon name="check" size={16} color={COLOR.navLabel} className="shrink-0" />
              {s.label}
              <Icon name="expand_more" size={16} color={COLOR.navLabel} className={`shrink-0 ${isOpen ? 'wk-flip' : ''}`} />
            </button>
            {isOpen && (
              <div id={panel} className="wk-step-detail" style={{ margin: '6px 0 6px 22px' }}>
                <div className="wk-step-tool">{s.tool}</div>
                <dl>
                  {Object.entries(s.input).length > 0 && (
                    <>
                      <dt>Pedido</dt>
                      <dd>
                        {Object.entries(s.input).map(([k, v]) => (
                          <div key={k}>
                            <span className="wk-step-key">{k}:</span> {String(v)}
                          </div>
                        ))}
                      </dd>
                    </>
                  )}
                  <dt>Resultado</dt>
                  <dd>
                    {s.output.map((o) => (
                      <div key={o}>{o}</div>
                    ))}
                  </dd>
                </dl>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

/* ──────────────────────────────────────────────────── proposta: cadastro */

function UserProposal({ changes, onConfirm, onCancel }: { changes: UserChange[]; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <div className="flex flex-col" style={{ gap: 8, marginBottom: 16 }}>
        {changes.map((c) => (
          <div key={c.label} className="flex flex-wrap items-center" style={{ gap: 8, fontSize: 14, lineHeight: '20px', color: COLOR.text }}>
            <span style={{ color: COLOR.textSecondary, minWidth: 140 }}>{c.label}</span>
            <span style={{ color: COLOR.textSecondary }}>{c.from}</span>
            <Icon name="arrow_forward" size={16} color={COLOR.navLabel} />
            <b style={{ fontWeight: 600 }}>{c.to}</b>
          </div>
        ))}
      </div>
      <div className="flex justify-end" style={{ gap: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>
          Cancelar
        </Btn>
        <Btn variant="primary" onClick={onConfirm}>
          Confirmar
        </Btn>
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────────── proposta: alerta */

/**
 * O alerta antes de existir: o que ele acompanha, quando avisa, para quem e
 * por onde, e a mensagem como vai chegar. É o que a pessoa confere antes de o
 * Weknow mandar mensagem para os outros, então cabe tudo num relance.
 */
function AlertProposal({ alert, onConfirm, onCancel }: { alert: AlertSpec; onConfirm: () => void; onCancel: () => void }) {
  const rows: [string, string][] = [
    ['Indicador', alert.subject],
    ['Quando avisar', alert.condition],
    ['Agora', `${alert.current}${alert.crossed ? ', já passou do limite' : ''}`],
    ['Confere', alert.schedule],
  ]
  return (
    <div style={{ ...CARD, padding: 16 }}>
      <dl className="grid" style={{ gridTemplateColumns: 'minmax(120px, max-content) 1fr', columnGap: 16, rowGap: 8, margin: '0 0 16px', fontSize: 14, lineHeight: '20px' }}>
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt style={{ color: COLOR.textSecondary }}>{k}</dt>
            <dd style={{ margin: 0, color: COLOR.text, fontWeight: k === 'Quando avisar' ? 600 : 400 }}>{v}</dd>
          </div>
        ))}
        <dt style={{ color: COLOR.textSecondary }}>Para</dt>
        <dd style={{ margin: 0 }}>
          <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 6 }}>
            {alert.recipients.map((r) => (
              <li key={r.name} className="flex flex-wrap items-center" style={{ gap: 8, color: COLOR.text }}>
                <Icon name={r.via === 'WhatsApp' ? 'chat' : 'mail'} size={18} color={r.via === 'WhatsApp' ? 'var(--wk-wa-icon)' : COLOR.navLabel} className="shrink-0" />
                <span style={{ fontWeight: 500 }}>{r.name}</span>
                <span style={{ color: COLOR.textSecondary, fontSize: 13 }}>
                  {r.via} · {r.address}
                </span>
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      <div style={{ marginBottom: 16 }}>
        <WhatsAppPreview message={alert.message} sample={alert.sample} />
      </div>
      <div className="flex justify-end" style={{ gap: 8 }}>
        <Btn variant="ghost" onClick={onCancel}>
          Cancelar
        </Btn>
        <Btn variant="primary" onClick={onConfirm}>
          Criar alerta
        </Btn>
      </div>
    </div>
  )
}

/** O que está entre asteriscos sai em negrito, como no WhatsApp. */
function waLine(line: string) {
  return line.split(/(\*[^*]+\*)/).map((part, i) => (part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <b key={i}>{part.slice(1, -1)}</b> : part))
}

/**
 * A mensagem como chega no celular: o balão do WhatsApp, com o remetente e a
 * hora, num fundo que lembra a conversa. Só para a pessoa ver o que os outros
 * vão receber; não imita a tela do WhatsApp inteira.
 */
function WhatsAppPreview({ message, sample }: { message: string; sample?: boolean }) {
  return (
    <figure className="wk-wa" style={{ margin: 0 }} aria-label="Prévia da mensagem no WhatsApp">
      <figcaption className="flex items-center" style={{ gap: 6, fontSize: 12, lineHeight: '16px', fontWeight: 500 }}>
        <Icon name="chat" size={16} color="var(--wk-wa-icon)" />
        {sample ? 'Prévia no WhatsApp, com um valor de exemplo' : 'Prévia no WhatsApp'}
      </figcaption>
      <div className="wk-wa-bubble">
        {message.split('\n').map((line, i) => (
          <p key={i} style={{ margin: 0 }}>
            {waLine(line)}
          </p>
        ))}
        <span className="wk-wa-time">06:02</span>
      </div>
    </figure>
  )
}
