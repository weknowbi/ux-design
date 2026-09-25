import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Chip } from '@/components/Chip'
import { Composer } from '@/components/Composer'
import { MetadataTab } from '@/components/MetadataTab'
import { NewConversation } from '@/components/NewConversation'
import { FolderScreen } from '@/components/FolderScreen'
import { Header } from '@/components/Header'
import { Icon } from '@/components/icons'
import { Sidebar } from '@/components/Sidebar'
import { Thread } from '@/components/Thread'
import { AI_FALLBACK, AI_PROVIDERS, CONVERSATIONS, FOLDERS } from '@/data/conversation'
import type { Conversation, FilterChip, Folder, MetaContext, Message } from '@/data/conversation'
import type { PortalRoute } from '@/components/PortalSidebar'

type Tab = 'conversa' | 'metadado'

const TABS: { id: Tab; label: string }[] = [
  { id: 'conversa', label: 'Conversa' },
  { id: 'metadado', label: 'Metadado' },
]

const DEFAULT_CHIPS: FilterChip[] = [{ id: 'f1', label: 'birth.Mês/ano', value: 'Todos' }]

let seq = 0
const nextId = () => `m-${Date.now()}-${seq++}`

function now() {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function AskScreen({ onNavigate }: { onNavigate?: (route: PortalRoute) => void } = {}) {
  const [conversations, setConversations] = useState<Conversation[]>(CONVERSATIONS)
  const [folders, setFolders] = useState<Folder[]>(FOLDERS)
  const [activeId, setActiveId] = useState(CONVERSATIONS[0].id)
  const [tab, setTab] = useState<Tab>('conversa')
  const [chips, setChips] = useState<FilterChip[]>(DEFAULT_CHIPS)
  const [loading, setLoading] = useState(false)
  /** Pasta aberta por inteiro — ocupa a área principal no lugar da conversa. */
  const [openFolderId, setOpenFolderId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? conversations[0],
    [conversations, activeId],
  )

  useEffect(() => {
    if (tab !== 'conversa') return
    const fim = bottomRef.current
    if (!fim) return

    // Rola o contêiner da conversa na mão, em vez de scrollIntoView.
    // scrollIntoView rola TODOS os ancestrais roláveis, e quando o
    // protótipo está embutido num iframe isso inclui a página que o
    // hospeda: cada resposta empurrava a página de fora para baixo.
    // Subindo até o primeiro ancestral que realmente rola, o efeito
    // para dentro do protótipo.
    let alvo: HTMLElement | null = fim.parentElement
    while (alvo && alvo.scrollHeight <= alvo.clientHeight) alvo = alvo.parentElement
    alvo?.scrollTo({ top: alvo.scrollHeight, behavior: 'smooth' })
  }, [active.messages.length, loading, tab])

  const appendMessage = (conversationId: string, message: Message) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, messages: [...c.messages, message] } : c)),
    )
  }

  const handleSend = (text: string) => {
    if (loading) return
    setTab('conversa')
    const targetId = active.id
    appendMessage(targetId, {
      id: nextId(),
      role: 'user',
      text,
      ts: now(),
      filters: chips.length ? chips : undefined,
    })
    setLoading(true)
    window.setTimeout(() => {
      appendMessage(targetId, { id: nextId(), role: 'ai', blocks: AI_FALLBACK, ts: now() })
      setLoading(false)
    }, 1200)
  }

  /** Tira a conversa da lista solta e a coloca dentro da pasta. */
  const handleMoveToFolder = (chatId: string, folderId: string) => {
    const chat = conversations.find((c) => c.id === chatId)
    const fromFolder = folders.find((f) => f.items.some((i) => i.id === chatId))
    const title = chat?.title ?? fromFolder?.items.find((i) => i.id === chatId)?.title
    if (!title) return

    setConversations((prev) => prev.filter((c) => c.id !== chatId))
    setFolders((prev) =>
      prev.map((f) => {
        const without = f.items.filter((i) => i.id !== chatId)
        return f.id === folderId ? { ...f, items: [...without, { id: chatId, title }] } : { ...f, items: without }
      }),
    )
  }

  /** Renomear vale para a conversa solta ou dentro de pasta — pode estar nas duas listas. */
  const handleRenameChat = (chatId: string, title: string) => {
    setConversations((prev) => prev.map((c) => (c.id === chatId ? { ...c, title } : c)))
    setFolders((prev) =>
      prev.map((f) => ({
        ...f,
        items: f.items.map((i) => (i.id === chatId ? { ...i, title } : i)),
      })),
    )
  }

  const handleCreateFolder = (label: string) => {
    setFolders((prev) => [...prev, { id: `f-${Date.now()}`, label, items: [] }])
  }

  const handleRenameFolder = (folderId: string, label: string) => {
    setFolders((prev) => prev.map((f) => (f.id === folderId ? { ...f, label } : f)))
  }

  /** Excluir a pasta devolve as conversas à lista solta — some a pasta, não o histórico. */
  const handleDeleteFolder = (folderId: string) => {
    const alvo = folders.find((f) => f.id === folderId)
    if (alvo) {
      setConversations((prev) => [
        ...alvo.items.map((i) => ({
          id: i.id,
          title: i.title,
          updatedAt: i.updatedAt ?? 'agora',
          messages: [] as Message[],
        })),
        ...prev,
      ])
    }
    setFolders((prev) => prev.filter((f) => f.id !== folderId))
    if (openFolderId === folderId) setOpenFolderId(null)
  }

  const handleDeleteChat = (chatId: string) => {
    setConversations((prev) => prev.filter((c) => c.id !== chatId))
    setFolders((prev) => prev.map((f) => ({ ...f, items: f.items.filter((i) => i.id !== chatId) })))
    if (chatId === activeId) {
      const next = conversations.find((c) => c.id !== chatId)
      if (next) setActiveId(next.id)
    }
  }

  /** Conversa recém-criada, ainda sem metadado escolhido. */
  const needsContext = active.messages.length === 0 && !active.context

  /** Fecha a escolha: grava contexto e provedor, e o título passa a nomeá-la. */
  const handleCreateConversation = (context: MetaContext, provider: string) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id === active.id ? { ...c, context, provider, title: context.label } : c,
      ),
    )
  }

  /** Trocar o modelo vale só para esta conversa, daqui em diante. */
  const handleProviderChange = (provider: string) => {
    setConversations((prev) => prev.map((c) => (c.id === active.id ? { ...c, provider } : c)))
  }

  const openFolder = folders.find((f) => f.id === openFolderId) ?? null

  const handleNewChat = () => {
    const conversation: Conversation = {
      id: `c-${Date.now()}`,
      title: 'Nova conversa',
      updatedAt: 'agora',
      messages: [],
    }
    setConversations((prev) => [conversation, ...prev])
    setActiveId(conversation.id)
    setChips([])
    setTab('conversa')
    setOpenFolderId(null)
  }

  const makeComposer = (inline?: boolean) => (
    <Composer
      inline={inline}
      chips={chips}
      onRemoveChip={(id) => setChips((prev) => prev.filter((c) => c.id !== id))}
      onAddFilters={setChips}
      onUpdateChip={(id, value) =>
        setChips((prev) => prev.map((c) => (c.id === id ? { ...c, value } : c)))
      }
      onSend={handleSend}
      provider={active.provider ?? AI_PROVIDERS[0].id}
      onProviderChange={handleProviderChange}
      disabled={loading}
    />
  )

  return (
    <div
      className="flex"
      style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}
    >
      {/* Shell do protótipo: o menu ocupa a altura inteira e carrega a marca;
          a barra de topo cobre só a coluna de conteúdo. */}
      <Sidebar
        onNavigate={onNavigate}
        conversations={conversations}
        folders={folders}
        activeId={active.id}
        onSelect={(id) => {
          setActiveId(id)
          setTab('conversa')
          setOpenFolderId(null)
        }}
        onNewChat={handleNewChat}
        onMoveToFolder={handleMoveToFolder}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onCreateFolder={handleCreateFolder}
        onRenameFolder={handleRenameFolder}
        onDeleteFolder={handleDeleteFolder}
        onOpenFolder={setOpenFolderId}
      />

      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ minHeight: 0, paddingRight: LAYOUT.sheetMarginRight }}
      >
        <Header
          trail={[
            {
              label: 'Portal',
              icon: <Icon name="home" size={24} />,
              iconOnly: true,
              // A casa continua na trilha mesmo embutido: sem ela o topo
              // fica órfão. O que some é o link. O Header só vira botão
              // quando a migalha tem onClick, então basta não passar um.
              onClick: onNavigate ? () => onNavigate('portal') : undefined,
            },
            { label: 'Weknow Ask' },
          ]}
        />

        <div className="flex flex-1 overflow-hidden">
          <main
            className="flex-1 flex flex-col overflow-hidden bg-[var(--wk-surface)] min-w-0"
            style={{
              borderTopLeftRadius: LAYOUT.sheetRadius,
              borderTopRightRadius: LAYOUT.sheetRadius,
            }}
          >
            {/* A pasta aberta ocupa a área inteira: nesse estado não há
                conversa nem metadado para alternar, então as abas somem. */}
            {openFolder ? (
              <FolderScreen
                folder={openFolder}
                onOpenChat={(id) => {
                  setActiveId(id)
                  setTab('conversa')
                  setOpenFolderId(null)
                }}
                onNewChat={handleNewChat}
                onRenameChat={handleRenameChat}
                onDeleteChat={handleDeleteChat}
              />
            ) : (
              <>
            {/* Abas — nav-pills, mesmo padrão do Weknow Insight */}
            <div className="shrink-0 flex items-center gap-1 px-3 pt-2 pb-2">
              {TABS.map(({ id, label }) => {
                const on = tab === id
                return (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`px-3 py-1.5 mb-2 text-[13px] rounded-md font-medium transition-colors ${
                      on ? '' : 'hover:bg-[var(--wk-hover)]'
                    }`}
                    style={{
                      fontFamily: FONT,
                      background: on ? COLOR.pillActive : 'transparent',
                      color: on ? COLOR.text : COLOR.textSecondary,
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>

            {tab === 'conversa' ? (
              needsContext ? (
                /* Conversa nova: escolher metadado e provedor antes de começar. */
                <NewConversation onCreate={handleCreateConversation} />
              ) : active.messages.length === 0 && !loading ? (
                /* Sem mensagens: contexto, saudação e composer formam um bloco
                   só, a ~25% do topo — o composer não vai para o rodapé. */
                <Greeting context={active.context} onOpenMetadata={() => setTab('metadado')}>
                  {makeComposer(true)}
                </Greeting>
              ) : (
                <>
                  <Thread
                    messages={active.messages}
                    loading={loading}
                    bottomRef={bottomRef}
                    onSuggest={handleSend}
                  />
                  {makeComposer()}
                </>
              )
            ) : (
              <MetadataTab name={active.context?.label} />
            )}
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

/**
 * Contexto + saudação + composer, antes da primeira pergunta.
 *
 * O composer fica no centro vertical da área, com chip e saudação empilhados
 * logo acima dele. O centro é estrutural: dois espaçadores `flex-1` idênticos
 * cercam o composer, então ele permanece no meio mesmo quando a saudação
 * quebra em duas linhas — que foi o que derrubou a versão anterior, baseada
 * em alturas fixas.
 *
 * Alturas de referência do nó 11558:3328: chip 44, composer 48, respiro 24.
 */
const GREETING_GAP = 24

/**
 * Repartição do espaço livre acima e abaixo do composer, tirada do nó
 * 11558:3328: container de 968, composer em y=384,5 com 48 de altura.
 * Descontadas as margens de 24, sobram 360,5 acima e 511,5 abaixo — por isso
 * o bloco fica acima do centro, e não centrado.
 */
const SPACE_ABOVE = 384.5 - GREETING_GAP
const SPACE_BELOW = 968 - (384.5 + 48) - GREETING_GAP

function Greeting({
  context,
  onOpenMetadata,
  children,
}: {
  context?: MetaContext
  /** O chip de contexto abre o metadado que está por trás da conversa. */
  onOpenMetadata: () => void
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-center" style={{ paddingBlock: 24 }}>
      {/* Metade de cima: conteúdo encostado na base, junto do composer. */}
      <div
        className="w-full flex flex-col items-center justify-end"
        style={{ flex: SPACE_ABOVE, gap: GREETING_GAP }}
      >
        {context && (
          <Chip icon="database" onClick={onOpenMetadata} title="Ver o metadado desta conversa">
            {context.label}
          </Chip>
        )}

        <p
          className="text-center shrink-0"
          style={{
            fontFamily: FONT,
            fontSize: 32,
            lineHeight: '48px',
            fontWeight: 400,
            color: COLOR.text,
          }}
        >
          Como posso te ajudar a explorar seus dados?
        </p>
      </div>

      {/* O composer entra no bloco, não no rodapé. As margens são iguais dos
          dois lados de propósito: com flex-basis 0 e box-sizing border-box,
          um respiro só de um lado desequilibra os espaçadores em 24px. */}
      <div className="w-full shrink-0" style={{ marginBlock: GREETING_GAP }}>
        {children}
      </div>

      {/* Espaço abaixo, maior que o de cima — o composer não é centrado. */}
      <div className="w-full" style={{ flex: SPACE_BELOW }} />
    </div>
  )
}
