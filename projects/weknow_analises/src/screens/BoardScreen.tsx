import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Btn, IconBtn } from '@ds/Btn'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { AppShell } from '@/components/AppShell'
import { Composer } from '@/components/Composer'
import { Dropdown, MenuOption } from '@/components/browser/Menu'
import type { PortalRoute } from '@/components/PortalSidebar'
import { FactsContext, RichText } from '@/blocks/Rich'
import { WidgetView } from '@/blocks/Widgets'
import { PublishDialog } from '@/blocks/PublishDialog'
import { DataDialog } from '@/blocks/DataDialog'
import { GuideDialog } from '@/blocks/GuideDialog'
import { WEKNOW_GUIDE_NAME } from '@/engine/guide'
import { PainelFrame } from '@/blocks/PainelFrame'
import { folderIdOf } from '@/data/created'
import { modelPrompt } from '@/engine/config'
import { aiMessage, respond, suggestions, userMessage, type Message } from '@/engine/assistant'
import { boardFilter, dimValues, measureValue, prevMonth, titleOf, type Board, type Op, type Widget } from '@/engine/board'
import { concentration, decompose } from '@/engine/decompose'
import { scopeOf } from '@/engine/explain'
import { metadadoOf } from '@/engine/catalog'
import { MONTHS } from '@/engine/data'
import * as F from '@/engine/format'
import { DIMENSIONS, INDICATORS } from '@/engine/semantic'
import { Modal, ModalFooter } from '@ds/Modal'
import { go, setLeaveGuard } from '@/lib/router'
import { addMessages, change, redo, undo, useStore, type Analysis } from '@/lib/store'

/**
 * O editor do dashboard criado aqui: o painel com a folha inteira e a
 * conversa numa folha ao lado, que abre quando há resposta para ler. Só o
 * dashboard vazio tem a caixa de pedido presa embaixo, para o primeiro pedido.
 *
 * A conversa é o jeito de pedir, mas a resposta não se perde no histórico:
 * ela vira bloco num painel vivo, com filtro que funciona e clique que
 * explica. Publicar põe o dashboard numa pasta do portal.
 */

/**
 * O editor pede espaço: ao abrir, o menu lateral recolhe se estiver aberto,
 * e volta ao sair, se a pessoa não mexeu nele. Ela pode abrir de novo a
 * qualquer momento pelo botão de sempre.
 */
const SIDEBAR_KEY = 'wk-sidebar'

function useRoomyMenu() {
  const restore = useRef(false)
  useState(() => {
    try {
      if (localStorage.getItem(SIDEBAR_KEY) !== 'rail') {
        localStorage.setItem(SIDEBAR_KEY, 'rail')
        restore.current = true
      }
    } catch {
      /* sem armazenamento: o menu fica como está */
    }
  })
  useEffect(
    () => () => {
      try {
        if (restore.current && localStorage.getItem(SIDEBAR_KEY) === 'rail') localStorage.setItem(SIDEBAR_KEY, 'open')
      } catch {
        /* nada a devolver */
      }
    },
    [],
  )
}

export function BoardScreen({ id, onRoute }: { id: string; onRoute: (r: PortalRoute) => void }) {
  useRoomyMenu()
  const store = useStore()
  const a = store.analyses.find((x) => x.board.id === id)
  if (!a) {
    return (
      <AppShell route="portal" onNavigate={onRoute} trail={[{ label: 'Portal', onClick: () => go(null) }, { label: 'Dashboard não encontrado' }]}>
        <div className="mx-auto px-12 text-center" style={{ paddingTop: 96, maxWidth: 560 }}>
          <p style={{ fontFamily: FONT, fontSize: 15, lineHeight: 1.7, color: COLOR.textSecondary }}>
            Este dashboard não está neste navegador. No protótipo os dashboards criados ficam guardados só na máquina em que foram criados.
          </p>
          <div style={{ marginTop: 16 }}>
            <Btn variant="secondary" onClick={() => go(null)}>
              Voltar para o início
            </Btn>
          </div>
        </div>
      </AppShell>
    )
  }
  return <Workspace key={a.board.id} a={a} canUndo={store.canUndo(id)} canRedo={store.canRedo(id)} onRoute={onRoute} />
}

/** O tema do Weknow agora, acompanhando a troca no menu (que muda o `data-theme` da página). */
function useAppTheme(): 'dark' | 'light' {
  return useSyncExternalStore(
    (onChange) => {
      const mo = new MutationObserver(onChange)
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
      return () => mo.disconnect()
    },
    () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'),
  )
}

function useNarrow(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const sync = () => setM(mq.matches)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [q])
  return m
}

export const FOCUS_KEY = 'wk-an-focus'
const CHAT_KEY = 'wk-an-chat'
const EXPANDED_KEY = 'wk-an-expanded'

function Workspace({ a, canUndo, canRedo, onRoute }: { a: Analysis; canUndo: boolean; canRedo: boolean; onRoute: (r: PortalRoute) => void }) {
  const { board, messages } = a
  const id = board.id
  const narrow = useNarrow('(max-width: 1099px)')
  const phone = useNarrow('(max-width: 640px)')
  /** Estreito: a conversa abre por cima, como gaveta. */
  const [chatOpen, setChatOpen] = useState(false)
  /** Largo: o painel da conversa fica ao lado e se fecha para o painel ocupar tudo. */
  const [chatShown, setChatShown] = useState(() => {
    /* Recém-criado, vazio: a conversa ainda não tem o que mostrar. O painel
       fica com a folha e o pedido com a caixa de baixo; a conversa abre
       quando chega a primeira resposta. */
    if (!board.widgets.length) return false
    try {
      return localStorage.getItem(CHAT_KEY) !== 'closed'
    } catch {
      return true
    }
  })
  /**
   * Modo expandido: some a barra de cima e o menu lateral, e a conversa e o
   * painel ficam com a janela inteira. A escolha fica guardada.
   *
   * Atalhos: F entra e sai (o F de tela cheia dos players de vídeo), Esc
   * sai. Tecla solta só vale fora de campo de texto, sem Ctrl/Alt/⌘ (o
   * Ctrl+F do navegador continua) e sem diálogo aberto; com o foco dentro
   * do painel executivo, a moldura repassa a tecla (`PainelFrame`).
   */
  const [expandedPref, setExpandedPref] = useState(() => {
    try {
      return localStorage.getItem(EXPANDED_KEY) === '1'
    } catch {
      return false
    }
  })
  const expanded = expandedPref && !narrow
  const expand = (v: boolean) => {
    setExpandedPref(v)
    try {
      localStorage.setItem(EXPANDED_KEY, v ? '1' : '0')
    } catch {
      /* sem armazenamento: vale enquanto a tela está aberta */
    }
  }
  const shortcut = (key: 'f' | 'escape') => {
    if (narrow || document.querySelector('[role="dialog"]')) return
    if (key === 'f') expand(!expanded)
    else if (expanded) expand(false)
  }
  const shortcutRef = useRef(shortcut)
  shortcutRef.current = shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.defaultPrevented || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return
      if (el.closest?.('input, textarea, select, [contenteditable]')) return
      const key = e.key.toLowerCase()
      if (key === 'f' || key === 'escape') shortcutRef.current(key)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const showChat = (v: boolean) => {
    setChatShown(v)
    try {
      localStorage.setItem(CHAT_KEY, v ? 'open' : 'closed')
    } catch {
      /* sem armazenamento: vale enquanto a tela está aberta */
    }
  }
  const [thinking, setThinking] = useState(false)
  const [about, setAbout] = useState<string | null>(null)
  /* O realce de abertura não rola a tela: quem acabou de chegar precisa ver o
     topo do painel (título, fonte, salvar), não ser levado para o meio dele. */
  const [arriving, setArriving] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(FOCUS_KEY)
    } catch {
      return null
    }
  })
  const opening = useRef(arriving)
  useEffect(() => {
    try {
      sessionStorage.removeItem(FOCUS_KEY)
    } catch {
      /* sem armazenamento: nada a limpar */
    }
  }, [])
  const [saving, setSaving] = useState(false)
  /**
   * Sair com trabalho por publicar (o rascunho que nunca foi publicado, ou
   * alterações depois de publicar) pergunta antes: pelo logo, pelo caminho,
   * pelo menu ou pelo voltar do navegador. O dashboard vazio sai direto, não
   * há o que perder. Publicar por ali publica e depois sai.
   */
  const [leaving, setLeaving] = useState<(() => void) | null>(null)
  const leaveAfterPublish = useRef<(() => void) | null>(null)
  const pending = board.widgets.length > 0 && (!board.saved || !!board.saved.dirty)
  const pendingRef = useRef(pending)
  pendingRef.current = pending
  useEffect(
    () =>
      setLeaveGuard((leave) => {
        if (!pendingRef.current) return false
        setLeaving(() => leave)
        return true
      }),
    [],
  )
  /** "Dados" aberto, e em qual aba. */
  const [data, setData] = useState<'amostra' | 'config' | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)
  /** Aviso depois de publicar, com o caminho até a pasta. */
  const [published, setPublished] = useState<string | null>(null)
  /** Texto posto na caixa de baixo pelo exemplo (o modelo do raio-x). */
  const [draft, setDraft] = useState<{ text: string; at: number } | null>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  /* Bloco que acabou de entrar ou mudar: rola até ele e acende. */
  useEffect(() => {
    if (!arriving) return
    if (arriving !== opening.current) {
      const el = canvasRef.current?.querySelector(`[data-widget="${arriving}"]`)
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
    const t = setTimeout(() => setArriving(null), 1800)
    return () => clearTimeout(t)
  }, [arriving])

  const ops = (o: Op[]) => change(id, o)
  const painel = board.widgets.find((w): w is Extract<Widget, { kind: 'painel' }> => w.kind === 'painel')
  /** O dashboard em blocos (o formato antigo), com área e tema próprios. */
  const blocks = !painel && board.widgets.length > 0
  const liveTheme = useAppTheme()

  const ask = (text: string, aboutId?: string) => {
    const target = aboutId ?? about ?? undefined
    addMessages(id, [userMessage(text, target ? titleOf(board.ind, board.widgets.find((w) => w.id === target)!) : undefined)])
    setThinking(true)
    setAbout(null)
    if (narrow) setChatOpen(true)
    else if (!chatShown) showChat(true)
    setTimeout(() => {
      const r = respond(board, text, target)
      change(id, r.ops, [aiMessage(r.reply, r.understood ? r.changes : undefined)])
      setThinking(false)
      if (r.focus) setArriving(r.focus)
    }, 650)
  }

  /* Abrir o Criar com IA pela mão (o botão da barra ou o "Editar com IA" de
     um bloco) já deixa o cursor na caixa, pronto para digitar. Abrir a
     tela com ele aberto não rouba o foco: o F e o Esc continuam valendo. */
  const [focusAsk, setFocusAsk] = useState(0)
  const openChat = () => {
    if (narrow) setChatOpen(true)
    else showChat(true)
    setFocusAsk((n) => n + 1)
  }

  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const chat = (
    <Chat
      focusKey={focusAsk}
      board={board}
      messages={messages}
      thinking={thinking}
      about={about ? board.widgets.find((w) => w.id === about) && titleOf(board.ind, board.widgets.find((w) => w.id === about)!) : undefined}
      onClearAbout={() => setAbout(null)}
      onAsk={(t) => ask(t)}
      onFocus={(wid) => setArriving(wid)}
      onClose={narrow ? () => setChatOpen(false) : () => showChat(false)}
    />
  )

  /* O painel é a análise e fica com a folha inteira. A conversa mora numa
     folha própria ao lado, que se fecha: antes ela dividia a folha do painel,
     o canto arredondado ficava com ela e o painel parecia solto ao lado. */
  return (
    <AppShell
      route="portal"
      bare={expanded}
      gutter={!painel && !blocks}
      onNavigate={onRoute}
      trail={[{ label: 'Portal', onClick: () => go(null) }, { label: board.title }]}
      aside={!narrow && chatShown ? <FactsContext.Provider value={board.facts}>{chat}</FactsContext.Provider> : undefined}
    >
      <FactsContext.Provider value={board.facts}>
        {/* A folha inteira de altura: com o painel vazio, a caixa de pedido
            fica no pé da tela, e não logo abaixo do convite. */}
        <div ref={canvasRef} className={painel || blocks ? 'flex flex-col h-full' : 'flex flex-col min-h-full'}>
          <div
            className={painel || blocks ? 'w-full shrink-0' : 'mx-auto w-full flex-1'}
            /* Com o dashboard montado (painel ou blocos), uma linha de 56 (a
               altura do cabeçalho da conversa, que fica ao lado no modo
               expandido) alinhada às margens dele. */
            style={painel || blocks ? { padding: narrow ? '12px 16px' : '12px 28px' } : { maxWidth: 1280, padding: narrow ? '20px 16px 64px' : '28px 32px 64px' }}
          >
            <BoardHeader
              compact={!!painel || blocks}
              expanded={expanded}
              onExpand={narrow ? undefined : () => expand(!expanded)}
              board={board}
              canUndo={canUndo}
              canRedo={canRedo}
              chat={narrow ? 'drawer' : chatShown ? 'shown' : 'hidden'}
              onOpenChat={openChat}
              onRename={(t) => ops([{ op: 'title', title: t }])}
              onSave={() => setSaving(true)}
              onData={() => setData('amostra')}
              phone={phone}
            />
            {board.widgets.length === 0 && (
              <EmptyBoard
                board={board}
                thinking={thinking}
                onAsk={(t) => ask(t)}
                onModel={(text) => setDraft({ text, at: Date.now() })}
                onConfig={() => setData('config')}
                onGuide={() => setGuideOpen(true)}
              />
            )}
          </div>
          {/* Os blocos são o dashboard, no mesmo lugar do painel executivo:
              embaixo do cabeçalho de uma linha, rolando por dentro e com o
              tema dele. Sem tema escolhido, a área fica no do Weknow; o botão
              da barra de filtros troca só ela. A frase do resumo é do
              dashboard, então mora aqui dentro, e não no cabeçalho. */}
          {blocks && (
            <div
              className={`flex-1 min-h-0 overflow-y-auto ${board.theme ? `wk-scope-${board.theme}` : ''}`}
              style={{ background: 'var(--wk-surface)', borderTop: `1px solid ${COLOR.border}` }}
            >
              <div className="mx-auto w-full" style={{ maxWidth: 1280, padding: narrow ? '16px 16px 64px' : '24px 32px 64px' }}>
            <Lead board={board} onAsk={(t) => ask(t)} />
            <FilterBar board={board} onOps={ops} theme={board.theme ?? liveTheme} />

            <div className="grid" style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: phone ? 12 : 16, marginTop: 20 }}>
                {board.widgets.map((w, i) => (
                  <WidgetView
                    key={w.id}
                    board={board}
                    /* Estreito: os três números continuam lado a lado e o resto ocupa a linha;
                       no celular, tudo em uma coluna. */
                    w={phone || (narrow && w.kind !== 'kpi') ? { ...w, span: 6 } : w}
                    act={{ ops, ask, about: (wid) => (setAbout(wid === about ? null : wid), openChat()) }}
                    arriving={arriving === w.id}
                    isAbout={about === w.id}
                    drag={{
                      onStart: () => setDragId(w.id),
                      onOver: () => dragId && dragId !== w.id && setOverId(w.id),
                      onEnd: () => {
                        if (dragId && overId && dragId !== overId) ops([{ op: 'move', id: dragId, to: i }])
                        setDragId(null)
                        setOverId(null)
                      },
                      over: overId === w.id,
                    }}
                  />
                ))}
            </div>
              </div>
            </div>
          )}
          {/* O painel executivo ocupa o resto da folha e rola por dentro. */}
          {painel && (
            <div className="relative flex-1 min-h-0" style={{ borderTop: `1px solid ${COLOR.border}` }}>
              <PainelFrame w={painel} ind={board.ind} onOps={ops} onKey={(k) => shortcut(k)} />
            </div>
          )}
          {/* A caixa de pedido no pé só existe com o dashboard vazio, onde ela
              é o começo. Montado o painel, pedir é pelo "Criar com IA": a
              caixa flutuando sobre o pé tapava o dashboard, e o botão do topo
              já se destaca na barra. */}
          {board.widgets.length === 0 && (narrow ? !chatOpen : !chatShown) && (
            <AskDock key={draft?.at ?? 0} initial={draft?.text} onAsk={(t) => ask(t)} disabled={thinking} phone={phone} />
          )}
        </div>

        {narrow && chatOpen && (
          <div className="fixed inset-0 z-40 flex justify-end" style={{ background: 'var(--wk-backdrop)' }} onClick={(e) => e.target === e.currentTarget && setChatOpen(false)}>
            <aside className="flex flex-col h-full" style={{ width: 'min(400px, 100%)', background: 'var(--wk-surface)' }}>
              {chat}
            </aside>
          </div>
        )}
        {saving && (
          <PublishDialog
            board={board}
            onClose={() => {
              setSaving(false)
              leaveAfterPublish.current = null
            }}
            onPublished={(folder) => {
              setSaving(false)
              const leave = leaveAfterPublish.current
              leaveAfterPublish.current = null
              if (leave) leave()
              else setPublished(folder)
            }}
          />
        )}
        {leaving && (
          <LeaveDialog
            board={board}
            onStay={() => setLeaving(null)}
            onLeave={() => {
              const leave = leaving
              setLeaving(null)
              leave()
            }}
            onPublish={() => {
              leaveAfterPublish.current = leaving
              setLeaving(null)
              setSaving(true)
            }}
          />
        )}
        {data && (
          <DataDialog
            board={board}
            onOps={ops}
            initialTab={data}
            onClose={() => setData(null)}
            onGuide={() => {
              setData(null)
              setGuideOpen(true)
            }}
          />
        )}
        {guideOpen && <GuideDialog board={board} onOps={ops} onClose={() => setGuideOpen(false)} />}
        {published && <PublishedToast folder={published} onClose={() => setPublished(null)} />}
      </FactsContext.Provider>
      <UndoKeys id={id} />
    </AppShell>
  )
}

/**
 * A caixa de pedido presa ao pé da folha, no dashboard vazio. O convite some
 * atrás de uma rampa suave até a cor da folha, e não atrás de uma faixa com
 * corte seco.
 */
/* Antes do primeiro pedido a caixa convida a descrever o dashboard. Não
   restringe o pedido a filtro ou aparência. */
const FIRST_PLACEHOLDER = 'Descreva o dashboard que você quer criar...'
/** O exemplo da caixa do Criar com IA, como no Claude: só como enviar. */
const SEND_HINT = 'Enter para enviar, Shift+Enter para nova linha'

function AskDock({
  onAsk,
  disabled,
  phone,
  initial,
}: {
  onAsk: (t: string) => void
  disabled: boolean
  phone: boolean
  /** Texto que já entra na caixa (o modelo do raio-x), para ler e ajustar antes de enviar. */
  initial?: string
}) {
  return (
    <div className="sticky bottom-0 z-10 pointer-events-none">
      <div
        aria-hidden
        style={{
          height: 32,
          background:
            'linear-gradient(to bottom, color-mix(in srgb, var(--wk-surface) 0%, transparent), color-mix(in srgb, var(--wk-surface) 35%, transparent) 40%, color-mix(in srgb, var(--wk-surface) 75%, transparent) 70%, var(--wk-surface))',
        }}
      />
      <div className="bg-[var(--wk-surface)]" style={{ padding: phone ? '0 12px 12px' : '0 32px 20px' }}>
        <div className="mx-auto pointer-events-auto" style={{ maxWidth: 760 }}>
          <Composer onSend={onAsk} placeholder={FIRST_PLACEHOLDER} label="Instrução para a IA" disabled={disabled} initial={initial} autoFocus={!!initial} />
        </div>
      </div>
    </div>
  )
}

/** Ctrl+Z e Ctrl+Shift+Z fora dos campos de texto, onde o desfazer é do próprio campo. */
function UndoKeys({ id }: { id: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (el.closest('input, textarea, [contenteditable]')) return
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        if (e.shiftKey) redo(id)
        else undo(id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [id])
  return null
}

/* ──────────────────────────────────────────────────────────── cabeçalho */

function BoardHeader({
  board,
  canUndo,
  canRedo,
  chat,
  onOpenChat,
  onRename,
  onSave,
  onData,
  compact,
  expanded,
  onExpand,
  phone,
}: {
  board: Board
  /** Celular: as ações descem para uma linha própria, só com ícones (ver abaixo). */
  phone?: boolean
  /** Modo expandido ligado: o botão vira "Sair do modo expandido". */
  expanded?: boolean
  /** Sem ele (tela estreita) não há modo expandido. */
  onExpand?: () => void
  /** Uma linha só (nome, situação e ações), com o dashboard montado: ele ganha a altura. */
  compact?: boolean
  canUndo: boolean
  canRedo: boolean
  /** Onde o "Criar com IA" está: ao lado, fechado, ou em gaveta (tela estreita). */
  chat: 'shown' | 'hidden' | 'drawer'
  onOpenChat: () => void
  onRename: (t: string) => void
  onSave: () => void
  /** Abre "Dados": a amostra do metadado e a configuração. */
  onData: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(board.title)
  const inputRef = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])
  const commit = () => {
    setEditing(false)
    if (draft.trim() && draft.trim() !== board.title) onRename(draft.trim())
    else setDraft(board.title)
  }
  const TITLE = compact
    ? ({ fontFamily: FONT, fontSize: 18, lineHeight: '26px', fontWeight: 600, letterSpacing: '-0.2px', color: COLOR.text } as const)
    : ({ fontFamily: FONT, fontSize: 26, lineHeight: '34px', fontWeight: 600, letterSpacing: '-0.3px', color: COLOR.text } as const)
  /* O metadado não entra aqui: ele está em "Dados", junto da amostra. */
  const status = !board.saved ? 'Rascunho' : `Publicado em ${board.saved.folder}${board.saved.dirty ? ', com alterações' : ''}`
  const meta = ['Dashboard', board.from && `criado a partir de “${board.from.dashboard}”`, status]
    .filter(Boolean)
    .join('  ·  ')

  /* A barra de ações segue a das barras densas do sistema (a do dashboard do
     portal): `Btn` pequeno (32) nas ações com rótulo e `IconBtn` (32 × 32,
     símbolo de 24) nas de ícone. Tudo na mesma altura, uma linha só.

     O ícone dos fantasmas vai no cinza dos ícones (--wk-nav-label, wght 200),
     e não na cor do rótulo, que é o padrão do `Btn`: ao lado dos `IconBtn`
     a barra ficava com dois cinzas e duas espessuras de ícone. É o mesmo par
     dos controles da barra do portal (ordenar, visualização): ícone cinza e
     fino, rótulo no tom de texto. */
  /* No celular a barra não cabe ao lado do nome: ela desce para uma linha
     própria, "Dados" e "Criar com IA" viram ícone (com o nome no title) e o
     publicar encosta à direita com o rótulo curto. */
  const ghostIcon = (name: string) => <Icon name={name} size={20} color={COLOR.navLabel} />
  /* "Criar com IA" fechado: o ícone é de conversa (é assim que se cria aqui)
     e vai na primária, o único colorido entre os cinzas da barra. Cinza como
     os outros, quem fechava a conversa não achava o caminho de volta. */
  const actions = (
    <div className={phone ? 'flex items-center w-full' : 'flex items-center shrink-0'} style={{ gap: 4 }}>
      {phone ? (
        <IconBtn title="Dados" onClick={onData}>
          <Icon name="database" size={24} />
        </IconBtn>
      ) : (
        <Btn size="sm" variant="ghost" iconLeft={ghostIcon('database')} onClick={onData}>
          Dados
        </Btn>
      )}
      {chat !== 'shown' &&
        (phone ? (
          <IconBtn title="Criar com IA" onClick={onOpenChat}>
            <Icon name="quickreply" size={24} color={COLOR.primary} />
          </IconBtn>
        ) : (
          <Btn size="sm" variant="ghost" iconLeft={<Icon name="quickreply" size={20} color={COLOR.primary} />} onClick={onOpenChat}>
            Criar com IA
          </Btn>
        ))}
      <span aria-hidden style={{ width: 1, height: 20, background: COLOR.border, margin: '0 4px' }} />
      <IconBtn title="Desfazer (Ctrl+Z)" disabled={!canUndo} onClick={() => undo(board.id)}>
        <Icon name="undo" size={24} />
      </IconBtn>
      <IconBtn title="Refazer (Ctrl+Shift+Z)" disabled={!canRedo} onClick={() => redo(board.id)}>
        <Icon name="redo" size={24} />
      </IconBtn>
      {onExpand && (
        <IconBtn title={expanded ? 'Sair do modo expandido (F ou Esc)' : 'Modo expandido (F)'} onClick={onExpand}>
          <Icon name={expanded ? 'collapse_content' : 'expand_content'} size={24} />
        </IconBtn>
      )}
      <span className={phone ? 'flex-1' : undefined} style={phone ? undefined : { width: 8 }} />
      {board.saved && !board.saved.dirty ? (
        <Btn size="sm" variant="outlined" iconLeft="check" disabled>
          Publicado
        </Btn>
      ) : (
        <Btn size="sm" variant="primary" iconLeft="publish" onClick={onSave}>
          {phone ? 'Publicar' : board.saved ? 'Publicar alterações' : 'Publicar dashboard'}
        </Btn>
      )}
    </div>
  )

  const title = editing ? (
    <input
      ref={inputRef}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        if (e.key === 'Escape') {
          setDraft(board.title)
          setEditing(false)
        }
      }}
      aria-label="Nome do dashboard"
      className={compact ? 'flex-1 min-w-0 outline-none bg-transparent' : 'w-full outline-none bg-transparent'}
      style={{ ...TITLE, borderBottom: `1px solid ${COLOR.primary}` }}
    />
  ) : (
    <button
      type="button"
      onClick={() => {
        setDraft(board.title)
        setEditing(true)
      }}
      title="Renomear dashboard"
      aria-label={`Renomear dashboard: ${board.title}`}
      className="inline-flex items-center text-left max-w-full min-w-0 shrink rounded-md cursor-text hover:bg-[var(--wk-hover-strong)] transition-colors outline-none focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]"
      style={{ ...TITLE, padding: '0 6px', marginLeft: -6 }}
    >
      <span className="min-w-0 truncate">{board.title}</span>
    </button>
  )

  /* Com o painel executivo, o cabeçalho cabe numa linha: o painel tem os
     próprios controles e precisa da altura. A situação (rascunho ou
     publicado) vira texto miúdo ao lado do nome, a origem fica no title. */
  if (compact)
    return (
      <div className={phone ? 'flex flex-col' : 'flex items-center'} style={{ gap: phone ? 8 : 16 }}>
        <div className="flex items-center flex-1 min-w-0" style={{ gap: 12 }}>
          {title}
          {!editing && (
            <span className="truncate" title={meta} style={{ fontFamily: FONT, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, minWidth: phone ? 0 : 80, maxWidth: phone ? '45%' : undefined }}>
              {status}
            </span>
          )}
        </div>
        {actions}
      </div>
    )

  return (
    <div>
      <div className="flex items-center justify-between" style={{ gap: 12 }}>
        {/* A linha de cima diz o que é e de onde vem, antes do nome: é o que
            separa o dashboard criado aqui de um do acervo. */}
        <div className="flex items-center flex-1 min-w-0" style={{ gap: 6, fontFamily: FONT, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
          <Icon name="dashboard" size={20} color={COLOR.navLabel} className="shrink-0" />
          <span className="truncate">{meta}</span>
        </div>
        {!phone && actions}
      </div>

      <div style={{ marginTop: 8 }}>{title}</div>
      {phone && <div style={{ marginTop: 8 }}>{actions}</div>}
    </div>
  )
}

/**
 * O resumo do mês em uma frase, no topo do dashboard em blocos, com os
 * números do painel. Ele muda com o filtro e o mês, e o "Por quê?" leva a
 * pergunta para a conversa.
 */
function Lead({ board, onAsk }: { board: Board; onAsk: (t: string) => void }) {
  const lead = headline(board)
  if (!lead) return null
  return (
    <p style={{ fontFamily: FONT, fontSize: 15, lineHeight: '24px', color: COLOR.textSecondary, margin: '0 0 16px', maxWidth: 860 }}>
      {lead.text}{' '}
      <button
        type="button"
        onClick={() => onAsk(lead.ask)}
        className="inline-flex items-center align-baseline rounded hover:underline"
        style={{ gap: 2, color: COLOR.primary, fontWeight: 500 }}
      >
        Por quê?
      </button>
    </p>
  )
}

/**
 * "A taxa de glosa subiu de 3,1% para 3,7% em outubro; Bradesco Saúde
 * concentra 81% da variação." A segunda parte só entra quando um valor de
 * algum corte livre explica mais da metade dela.
 */
function headline(board: Board): { text: string; ask: string } | null {
  const I = INDICATORS[board.ind]
  const f = boardFilter(board)
  const prev = prevMonth(board.mes)
  if (prev === board.mes) return null
  const r1 = measureValue(board.ind, 'rate', board.mes, f)
  const r0 = measureValue(board.ind, 'rate', prev, f)
  const d = r1 - r0
  const mes = F.monthName(board.mes)
  const scope = scopeOf(f)
  const who = cap(I.article) + (scope.length ? ` em ${scope.join(', ')}` : '')
  const ask = `Por que ${I.article} mudou em ${mes} de ${board.mes.slice(0, 4)}?`
  if (Math.abs(d) < 10 ** -(I.digits + (I.unit === '%' ? 2 : 0)) / 2)
    return { text: `${who} ficou estável em ${F.value(board.ind, r1)} em ${mes}.`, ask }
  const verb = d > 0 ? 'subiu' : 'caiu'
  let text = `${who} ${verb} de ${F.value(board.ind, r0)} para ${F.value(board.ind, r1)} em ${mes}`
  /* A mesma conta e o mesmo corte da explicação (o primeiro da árvore que
     concentra metade da variação), para a frase e o bloco não discordarem. */
  const dec = I.dims
    .filter((x) => !board.dims[x]?.length)
    .map((x) => decompose(board.ind, x, prev, board.mes, f))
    .find((x) => concentration(x) >= 0.5)
  if (dec) text += `; ${dec.segments[0].key} concentra ${F.pct(concentration(dec))} da variação`
  return { text: text + '.', ask }
}

/* ─────────────────────────────────────────────────────────────── filtros */

/**
 * A barra de filtros do painel, uma linha só acima dos blocos. O mês sempre
 * compara com o anterior; cada corte do metadado vira um filtro. Escolher no
 * menu troca o valor; somar mais de um se faz clicando nas barras.
 */
function FilterBar({ board, onOps, theme }: { board: Board; onOps: (o: Op[]) => void; theme: 'dark' | 'light' }) {
  const I = INDICATORS[board.ind]
  const vals = dimValues(board.ind)
  const active = Object.entries(board.dims).filter(([, v]) => v && v.length)
  const other = theme === 'dark' ? 'light' : 'dark'
  return (
    <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
      <Dropdown
        align="left"
        minWidth={200}
        trigger={({ toggle, open }) => (
          <FilterPill icon="calendar_month" label={`${F.monthShort(board.mes)} vs ${F.monthShort(prevMonth(board.mes))}`} open={open} onClick={toggle} active />
        )}
      >
        {(close) => (
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {[...MONTHS].slice(1).reverse().map((m) => (
              <MenuOption
                key={m}
                checked={m === board.mes}
                label={F.monthShort(m)}
                onSelect={() => {
                  onOps([{ op: 'month', mes: m }])
                  close()
                }}
              />
            ))}
          </div>
        )}
      </Dropdown>
      {I.dims.map((d) => {
        const sel = board.dims[d] ?? []
        const label = sel.length === 0 ? cap(DIMENSIONS[d].label) : sel.length === 1 ? sel[0] : `${sel.length} ${DIMENSIONS[d].plural}`
        return (
          <Dropdown
            key={d}
            align="left"
            minWidth={220}
            trigger={({ toggle, open }) => <FilterPill icon="filter_alt" label={label} open={open} onClick={toggle} active={sel.length > 0} />}
          >
            {(close) => (
              <>
                <MenuOption
                  checked={sel.length === 0}
                  label={`Todos os ${DIMENSIONS[d].plural}`}
                  onSelect={() => {
                    onOps([{ op: 'filter', dim: d, values: [] }])
                    close()
                  }}
                />
                {(vals[d] ?? []).map((v) => (
                  <MenuOption
                    key={v}
                    checked={sel.length === 1 && sel[0] === v}
                    label={v}
                    onSelect={() => {
                      onOps([{ op: 'filter', dim: d, values: [v] }])
                      close()
                    }}
                  />
                ))}
              </>
            )}
          </Dropdown>
        )
      })}
      {active.length > 0 && (
        <Btn variant="ghost" size="sm" iconLeft="filter_alt_off" onClick={() => onOps([{ op: 'clearFilters' }])}>
          Limpar filtros
        </Btn>
      )}
      {/* O tema do dashboard, como o botão do painel executivo: troca só a
          área dos blocos, e entra no desfazer. */}
      <span className="flex-1" />
      <Btn variant="ghost" size="sm" iconLeft={other === 'light' ? 'light_mode' : 'dark_mode'} onClick={() => onOps([{ op: 'theme', theme: other }])}>
        {other === 'light' ? 'Tema claro' : 'Tema escuro'}
      </Btn>
    </div>
  )
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

/**
 * Pílula de filtro: a altura e o raio do chip do design system, com o rótulo
 * do valor escolhido. O texto do ativo usa a primária de hover, um passo mais
 * escura: a cor do chip ativo dava 4,36:1 sobre o fundo dele, abaixo dos 4,5.
 */
function FilterPill({ icon, label, open, onClick, active }: { icon: string; label: string; open: boolean; onClick: () => void; active: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      className={`inline-flex items-center whitespace-nowrap rounded-full transition-colors ${active ? 'bg-[var(--wk-chip-active-bg)]' : 'bg-[var(--wk-chip-bg)] hover:bg-[var(--wk-chip-bg-hover)]'}`}
      style={{ height: 36, gap: 6, paddingLeft: 12, paddingRight: 10, fontFamily: FONT, fontSize: 14, color: active ? 'var(--wk-primary-hover)' : COLOR.textSecondary }}
    >
      <Icon name={icon} size={20} color="currentColor" />
      {label}
      <Icon name="keyboard_arrow_down" size={20} color="currentColor" className={open ? 'wk-flip' : undefined} />
    </button>
  )
}

/* ──────────────────────────────────────────────────────────── criar com IA */

/** O tipo de edição que a sugestão faz, no ícone: ela é um passo de construção, não uma pergunta. */
function editIcon(s: string) {
  const t = s.toLowerCase()
  if (/^por que/.test(t)) return 'query_stats'
  if (/^só |^todos os|filtro/.test(t)) return /limpar/.test(t) ? 'filter_alt_off' : 'filter_alt'
  if (/meses|período/.test(t)) return 'date_range'
  if (/destac|destaque/.test(t)) return 'highlight'
  if (/tema claro/.test(t)) return 'light_mode'
  if (/tema escuro/.test(t)) return 'dark_mode'
  if (/densidade/.test(t)) return 'density_medium'
  if (/cores|visual/.test(t)) return 'palette'
  if (/mês a mês/.test(t)) return 'show_chart'
  return 'add_chart'
}

/**
 * "Criar com IA": a ferramenta que monta e edita o painel por instrução em
 * português. Cada resposta diz primeiro o que mudou no painel (e o item leva
 * ao bloco), e as sugestões são as próximas edições, com o ícone do tipo de
 * mudança. Não é um lugar para conversar sobre os dados: o resultado é o
 * painel, e o histórico é o registro de como ele foi feito.
 */
function Chat({
  focusKey,
  board,
  messages,
  thinking,
  about,
  onClearAbout,
  onAsk,
  onFocus,
  onClose,
}: {
  /** Muda quando a pessoa abre o Criar com IA: o cursor vai para a caixa. */
  focusKey: number
  board: Board
  messages: Message[]
  thinking: boolean
  about?: string
  onClearAbout: () => void
  onAsk: (t: string) => void
  onFocus: (widgetId: string) => void
  onClose?: () => void
}) {
  /* A conversa fica presa no fim: a cada mensagem nova, e também quando a
     área de baixo cresce (a etiqueta do bloco em edição, as sugestões) e a
     conversa encolhe. Antes ela ficava parada, com a última mensagem
     cortada embaixo. Quem subiu para ler o histórico não é puxado de volta. */
  const scrollRef = useRef<HTMLDivElement>(null)
  const atEnd = useRef(true)
  /* A altura da área na última medida: a rolagem que vem junto com uma
     mudança de altura é do navegador ajeitando o fim, não da pessoa subindo. */
  const lastH = useRef(0)
  const toEnd = () => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }
  useEffect(() => {
    atEnd.current = true
    toEnd()
  }, [messages.length, thinking])
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      lastH.current = el.clientHeight
      if (atEnd.current) toEnd()
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const sugg = suggestions(board)
  const md = metadadoOf(board.ind)

  const boxRef = useRef<HTMLDivElement>(null)
  const focusBox = () => boxRef.current?.querySelector('textarea')?.focus()
  useEffect(() => {
    if (focusKey) focusBox()
  }, [focusKey])
  /* A caixa fica desligada enquanto a IA responde, e o cursor cai dela.
     Quando a resposta chega, ele volta, se não foi para outro lugar. */
  const wasThinking = useRef(thinking)
  useEffect(() => {
    if (wasThinking.current && !thinking && (!document.activeElement || document.activeElement === document.body)) focusBox()
    wasThinking.current = thinking
  }, [thinking])

  return (
    <>
      {/* Sem fio embaixo: o painel já é uma folha própria, e a linha só
          cortava a conversa do título dela. */}
      <div className="shrink-0 flex items-center" style={{ height: 56, paddingInline: '20px 12px', gap: 8 }}>
        <span className="flex-1 flex items-center" style={{ gap: 8, fontFamily: FONT, fontSize: 15, fontWeight: 600, color: COLOR.text }}>
          <Icon name="quickreply" size={20} color={COLOR.primary} />
          Criar com IA
        </span>
        {onClose && (
          <IconBtn title="Fechar Criar com IA" onClick={onClose}>
            <Icon name="close" size={24} />
          </IconBtn>
        )}
      </div>

      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget
          if (el.clientHeight !== lastH.current) return
          atEnd.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
        }}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ padding: '4px 20px 20px' }}
      >
        <div className="flex flex-col" style={{ gap: 16 }}>
          {messages.map((m) =>
            m.role === 'user' ? (
              <div key={m.id} className="self-end flex flex-col items-end" style={{ maxWidth: '88%', gap: 4 }}>
                {m.about && (
                  <span className="flex items-center" style={{ gap: 4, fontFamily: FONT, fontSize: 12, color: COLOR.textSecondary }}>
                    <Icon name="subdirectory_arrow_right" size={16} color={COLOR.navLabel} />
                    Em “{m.about}”
                  </span>
                )}
                <UserBubble text={m.text} />
              </div>
            ) : (
              <div key={m.id} className="flex flex-col wk-enter" style={{ gap: 10 }}>
                {m.sources && <Sources s={m.sources} />}
                <p style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.6, color: COLOR.text, margin: 0 }}>
                  <RichText text={m.text} />
                </p>
                {m.changes && m.changes.length > 0 && (
                  <ul className="flex flex-col" style={{ listStyle: 'none', margin: 0, padding: 0, gap: 4 }} aria-label="Alterações no painel">
                    {m.changes.map((c) => {
                      const w = board.widgets.find((x) => c.includes(`“${titleOf(board.ind, x)}”`))
                      return (
                        <li key={c} className="flex items-start" style={{ gap: 6, fontFamily: FONT, fontSize: 13, lineHeight: '20px', color: COLOR.textSecondary }}>
                          <Icon name="check" size={20} color={COLOR.primary} />
                          {w ? (
                            <button type="button" onClick={() => onFocus(w.id)} className="text-left hover:underline" style={{ color: COLOR.textSecondary }}>
                              {c}
                            </button>
                          ) : (
                            <span>{c}</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            ),
          )}
          {thinking && (
            <div className="flex items-center" style={{ gap: 8, fontFamily: FONT, fontSize: 14, color: COLOR.textSecondary }}>
              <Icon name="progress_activity" size={20} color={COLOR.primary} className="an-spin" />
              {board.widgets.length ? 'Editando o painel' : `Montando o painel com ${md.code} - ${md.name}`}
            </div>
          )}
        </div>
      </div>

      <div ref={boxRef} className="shrink-0" style={{ padding: '0 16px 12px' }}>
        {/* As sugestões são para o painel inteiro: com um bloco em edição
            elas saem, e a etiqueta dele fica no lugar. */}
        {!thinking && !about && sugg.length > 0 && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontFamily: FONT, fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary, marginBottom: 8 }}>Sugestões de ajustes</div>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {sugg.map((s) => (
                <Btn key={s} variant="outlined" size="sm" iconLeft={editIcon(s)} onClick={() => onAsk(s)}>
                  {s}
                </Btn>
              ))}
            </div>
          </div>
        )}
        {about && (
          /* Uma linha só: nome longo de bloco corta com reticências (inteiro
             no title), em vez de quebrar dentro da pílula de 28. */
          <div className="flex items-center" style={{ gap: 6, marginBottom: 8, fontFamily: FONT, fontSize: 13, color: COLOR.text }}>
            <span
              title={`Editando “${about}”`}
              className="inline-flex items-center rounded-full max-w-full min-w-0"
              style={{ height: 28, gap: 4, paddingLeft: 10, paddingRight: 4, background: 'var(--wk-chip-active-bg)', color: 'var(--wk-chip-active-text)' }}
            >
              <Icon name="edit" size={16} color="currentColor" className="shrink-0" />
              <span className="min-w-0 truncate">Editando “{about}”</span>
              <button type="button" onClick={onClearAbout} title="Editar o painel inteiro" aria-label="Editar o painel inteiro" className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full hover:bg-[var(--wk-icon-hover)]">
                <Icon name="close" size={16} color="currentColor" />
              </button>
            </span>
          </div>
        )}
        <Composer
          onSend={onAsk}
          placeholder={SEND_HINT}
          compact
          label="Instrução para a IA"
          disabled={thinking}
        />
      </div>
    </>
  )
}

/**
 * O pedido de quem escreveu. Um pedido longo (o modelo do raio-x) fica
 * recolhido em seis linhas, para não empurrar a resposta para fora da tela;
 * "Mostrar tudo" abre o texto inteiro.
 */
function UserBubble({ text }: { text: Message['text'] }) {
  const long = text.join('').length > 280
  const [open, setOpen] = useState(false)
  return (
    <div className="flex flex-col items-end" style={{ gap: 2 }}>
      {/* O corte fica no texto, e não na caixa: com o padding na mesma caixa,
          a sétima linha aparecia pela metade embaixo. */}
      <div style={{ background: COLOR.userBubble, borderRadius: 16, padding: '10px 14px', fontFamily: FONT, fontSize: 14, lineHeight: 1.5, color: COLOR.text }}>
        <div className={`whitespace-pre-line ${long && !open ? 'line-clamp-6' : ''}`}>
          <RichText text={text} />
        </div>
      </div>
      {long && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="rounded hover:underline" style={{ fontFamily: FONT, fontSize: 13, lineHeight: '20px', color: COLOR.primary, padding: '0 4px' }}>
          {open ? 'Mostrar menos' : 'Mostrar tudo'}
        </button>
      )}
    </div>
  )
}

/** De onde a análise saiu: o dashboard de partida, quando houver, e o metadado por trás. */
function Sources({ s }: { s: NonNullable<Message['sources']> }) {
  return (
    <div style={{ border: `1px solid ${COLOR.border}`, borderRadius: 12, padding: '12px 14px', fontFamily: FONT }}>
      {s.from && (
        <div style={{ marginBottom: 10 }}>
          <div className="flex items-center" style={{ gap: 6, marginBottom: 2 }}>
            <Icon name="space_dashboard" size={20} color="var(--wk-dashboard-icon)" filled />
            <span style={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary }}>Partiu do dashboard</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: COLOR.text }}>{s.from.name}</div>
          <div style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>{s.from.folder}</div>
        </div>
      )}
      <div className="flex items-center" style={{ gap: 6, marginBottom: 2 }}>
        <Icon name="database" size={20} color={COLOR.navLabel} />
        <span style={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: COLOR.textSecondary }}>Metadado</span>
      </div>
      <div style={{ fontSize: 14, lineHeight: '20px', fontWeight: 600, color: COLOR.text }}>
        {s.code} - {s.name}
      </div>
      {s.dashboards.length > 0 && (
        <div style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, marginTop: 2 }}>Alimenta: {s.dashboards.join(', ')}</div>
      )}
    </div>
  )
}

/* ──────────────────────────────────────────────────────── painel vazio */

/**
 * O dashboard recém-criado: nada no painel ainda. O pedido é na caixa de
 * baixo; aqui só o convite, a fonte (com a configuração que a IA segue, que
 * se abre) e os começos: a análise completa e três pedidos curtos, que vão
 * direto. Só o ícone da análise completa leva o pedido para a caixa, para
 * ler e ajustar antes de enviar.
 */

/* Os pedidos curtos, escritos por metadado: o nome natural do volume
   ("internações", e não "saídas") não sai dos campos. Todos são pedidos que
   o motor entende: medida, corte e evolução. */
const STARTERS: Record<keyof typeof INDICATORS, string[]> = {
  permanencia: ['Internações por setor', 'Evolução mensal das internações', 'Permanência média por especialidade'],
  glosa: ['Glosas por convênio', 'Evolução mensal do faturamento', 'Taxa de glosa por tipo de item'],
}
function EmptyBoard({
  board,
  thinking,
  onAsk,
  onModel,
  onConfig,
  onGuide,
}: {
  board: Board
  thinking: boolean
  onAsk: (t: string) => void
  onModel: (text: string) => void
  onConfig: () => void
  onGuide: () => void
}) {
  const md = metadadoOf(board.ind)
  const I = INDICATORS[board.ind]
  const cuts = I.dims.map((d) => DIMENSIONS[d].label)
  const short = STARTERS[board.ind]
  return (
    <div className="wk-enter flex flex-col items-center text-center mx-auto" style={{ maxWidth: 620, padding: '72px 0 32px', fontFamily: FONT }}>
      <span className="flex items-center justify-center rounded-2xl" style={{ width: 56, height: 56, background: 'var(--wk-surface-subtle)', border: `1px solid ${COLOR.border}` }}>
        <Icon name="dashboard_customize" size={28} color={COLOR.navLabel} />
      </span>
      <h2 style={{ fontSize: 22, lineHeight: '30px', fontWeight: 600, color: COLOR.text, margin: '20px 0 0' }}>Vamos criar seu dashboard?</h2>
      <p style={{ fontSize: 15, lineHeight: '24px', color: COLOR.textSecondary, margin: '8px 0 0' }}>
        Conte o que você deseja analisar. A IA cria gráficos e indicadores usando os dados selecionados.
      </p>
      <p className="flex flex-wrap items-center justify-center" style={{ gap: 6, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: '12px 0 0' }}>
        <Icon name="database" size={16} color={COLOR.navLabel} className="shrink-0" />
        <span>
          Fonte de dados: {md.code} - {md.name}
        </span>
        <span aria-hidden>·</span>
        <button type="button" onClick={onConfig} className="hover:underline" style={{ color: COLOR.primary, fontWeight: 500 }}>
          {board.config ? 'Configuração deste dashboard' : 'Configuração'}
        </button>
      </p>
      <p className="flex flex-wrap items-center justify-center" style={{ gap: 6, fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary, margin: '6px 0 0' }}>
        <Icon name="palette" size={16} color={COLOR.navLabel} className="shrink-0" />
        <span>
          Estilo visual: <b style={{ fontWeight: 600, color: COLOR.text }}>{board.guide ? board.guide.name : WEKNOW_GUIDE_NAME}</b>
        </span>
        <button type="button" onClick={onGuide} className="hover:underline" style={{ color: COLOR.primary, fontWeight: 500 }}>
          Alterar
        </button>
      </p>
      <div className="flex flex-col items-stretch w-full" style={{ gap: 8, marginTop: 28 }}>
        {/* O cartão gera direto, como os chips. O ícone à direita é o
            caminho de quem quer ler e ajustar o pedido antes: ele vai para a
            caixa de baixo, sem enviar. */}
        <div className="relative">
          <button
            type="button"
            disabled={thinking}
            onClick={() => onAsk(modelPrompt(md, cuts))}
            className="w-full flex items-center text-left rounded-xl transition-colors hover:bg-[var(--wk-list-hover)] outline-none focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]"
            style={{ gap: 14, padding: '14px 60px 14px 16px', border: `1px solid ${COLOR.border}` }}
          >
            <Icon name="draw" size={24} color={COLOR.primary} className="shrink-0" />
            <span className="flex-1 flex flex-col min-w-0" style={{ gap: 2 }}>
              <span style={{ fontSize: 15, lineHeight: '22px', fontWeight: 600, color: COLOR.text }}>Gerar uma análise completa</span>
              <span style={{ fontSize: 13, lineHeight: '18px', color: COLOR.textSecondary }}>
                Comece com os principais indicadores, tendências e comparações dos seus dados.
              </span>
            </span>
          </button>
          <span className="absolute top-1/2 -translate-y-1/2" style={{ right: 12 }}>
            <IconBtn title="Editar o pedido antes de gerar" disabled={thinking} onClick={() => onModel(modelPrompt(md, cuts))}>
              <Icon name="edit_note" size={24} />
            </IconBtn>
          </span>
        </div>
        <div className="flex flex-wrap justify-center" style={{ gap: 8, marginTop: 4 }}>
          {short.map((s) => (
            <Btn key={s} variant="outlined" size="sm" disabled={thinking} onClick={() => onAsk(s)}>
              {s}
            </Btn>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────────── sair */

/**
 * Sair sem publicar. O rascunho não se perde (fica em "Meus rascunhos", e as
 * alterações de um publicado ficam guardadas aqui), então o texto diz o que
 * acontece de verdade: ninguém mais vê até publicar. A ação principal é
 * publicar, com o mesmo nome do botão da barra.
 */
function LeaveDialog({ board, onStay, onLeave, onPublish }: { board: Board; onStay: () => void; onLeave: () => void; onPublish: () => void }) {
  const saved = board.saved
  return (
    <Modal title={saved ? 'Sair sem publicar as alterações?' : 'Sair sem publicar?'} width={540} role="alertdialog" describedBy="leave-desc" onClose={onStay}>
      <p id="leave-desc" style={{ fontFamily: FONT, fontSize: 14, lineHeight: '21px', color: COLOR.textSecondary, margin: 0, padding: '0 24px 20px' }}>
        {saved
          ? 'Suas alterações serão salvas como rascunho e poderão ser publicadas depois. Até lá, os usuários continuarão vendo a versão publicada do dashboard.'
          : 'Seu dashboard será salvo como rascunho e poderá ser publicado depois. Até lá, só você o vê, em Meus rascunhos.'}
      </p>
      <ModalFooter>
        <Btn variant="ghost" onClick={onStay}>
          Continuar editando
        </Btn>
        <Btn variant="outlined" onClick={onLeave}>
          Sair sem publicar
        </Btn>
        <Btn variant="primary" onClick={onPublish}>
          {saved ? 'Publicar alterações' : 'Publicar dashboard'}
        </Btn>
      </ModalFooter>
    </Modal>
  )
}

/* ──────────────────────────────────────────────────────────── publicado */

/** Depois de publicar: onde ele entrou, e o caminho até lá. */
function PublishedToast({ folder, onClose }: { folder: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 8000)
    return () => clearTimeout(t)
  }, [onClose])
  const fid = folderIdOf(folder)
  return (
    <div role="status" className="fixed left-1/2 -translate-x-1/2 z-50 wk-enter flex items-center" style={{ bottom: 24, gap: 12, padding: '10px 10px 10px 16px', borderRadius: 12, background: 'var(--wk-toast-bg)', color: 'var(--wk-toast-text)', fontFamily: FONT, fontSize: 14, boxShadow: '0 6px 24px rgba(0,0,0,.24)', maxWidth: 'calc(100vw - 32px)' }}>
      <Icon name="check_circle" size={20} color="currentColor" className="shrink-0" />
      <span className="min-w-0 truncate">Publicado em {folder}</span>
      {fid && (
        <button type="button" onClick={() => go(`/pasta/${encodeURIComponent(fid)}`)} className="shrink-0 rounded-md underline underline-offset-2 hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)]" style={{ padding: '6px 10px', color: 'inherit', fontWeight: 600 }}>
          Ver no portal
        </button>
      )}
      <button type="button" onClick={onClose} aria-label="Fechar aviso" className="shrink-0 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[color-mix(in_srgb,currentColor_12%,transparent)]">
        <Icon name="close" size={20} color="currentColor" />
      </button>
    </div>
  )
}
