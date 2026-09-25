import { useMemo, useState } from 'react'
import { COLOR, FONT, LAYOUT, TOPBAR } from '@/design/tokens'
import { Icon, IconNewChat, IconSearch } from '@/components/icons'
import { ChatRowMenu } from '@/components/ChatRowMenu'
import { FolderRowMenu } from '@/components/FolderRowMenu'
import { MarqueeText } from '@/components/MarqueeText'
import { PromptModal } from '@/components/PromptModal'
import { WeknowLogo } from '@/components/WeknowLogo'
import type { Conversation, Folder, FolderItem } from '@/data/conversation'
import type { PortalRoute } from '@/components/PortalSidebar'

/**
 * Menu lateral no estilo do portal (WP-832, nó "sidebar white"): sem borda e
 * sem sombra, com o mesmo tom de fundo da página — por isso lê como "vazado".
 *
 * Pastas levam ícone e abrem/fecham; conversas não levam, para ganharem
 * largura de título. Todas as linhas têm a mesma altura.
 */

/** Altura única para toda linha do menu: ação, pasta e conversa. */
const ROW_H = 34

/** Itens visíveis antes do "Mostrar mais" — o mesmo corte que o ChatGPT usa. */
const FOLDER_PREVIEW = 5

function SectionHeader({
  label,
  action,
}: {
  label: string
  action?: { title: string; icon: string; onClick?: () => void }
}) {
  return (
    <div className="flex items-center justify-between h-[32px] pl-3 pr-1 mt-3">
      <span
        className="text-[11px] font-semibold uppercase tracking-wider"
        style={{ fontFamily: FONT, color: COLOR.navLabel }}
      >
        {label}
      </span>
      {action && (
        <button
          onClick={action.onClick}
          title={action.title}
          aria-label={action.title}
          className="wk-icon-btn w-7 h-7 flex items-center justify-center"
          style={{ color: COLOR.navLabel }}
        >
          <Icon name={action.icon} size={18} />
        </button>
      )}
    </div>
  )
}

/** Linha genérica do menu. Sem ícone, o texto encosta na borda do padding. */
function Row({
  icon,
  label,
  active,
  height = ROW_H,
  indent = 0,
  onClick,
  trailing,
}: {
  icon?: React.ReactNode
  label: string
  active?: boolean
  height?: number
  indent?: number
  onClick?: () => void
  trailing?: React.ReactNode
}) {
  const [hovered, setHovered] = useState(false)
  const background = active ? COLOR.navActive : hovered ? COLOR.navHover : 'transparent'
  const color = active ? COLOR.navActiveText : hovered ? COLOR.navHoverText : COLOR.navText

  return (
    <button
      onClick={onClick}
      title={label}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center overflow-hidden transition-colors"
      style={{
        height,
        gap: LAYOUT.navItemGap,
        paddingLeft: LAYOUT.navItemPadX + indent,
        paddingRight: LAYOUT.navItemPadX,
        borderRadius: LAYOUT.navItemRadius,
        background,
      }}
    >
      {icon && (
        <span
          className="shrink-0 flex items-center justify-center"
          style={{
            width: LAYOUT.navIconSize,
            height: LAYOUT.navIconSize,
            color: active ? COLOR.navActiveText : COLOR.navLabel,
          }}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 min-w-0 text-[14px] leading-[1.4] text-left" style={{ fontFamily: FONT, color }}>
        <MarqueeText text={label} active={hovered} />
      </span>
      {trailing}
    </button>
  )
}

/**
 * Linha de conversa com menu de ações no hover.
 *
 * Precisa ser um `div` com dois botões irmãos: o menu não pode ficar aninhado
 * dentro do botão de seleção — botão dentro de botão é HTML inválido.
 */
function ChatRow({
  label,
  active,
  indent = 0,
  folders,
  onSelect,
  onMove,
  onRename,
  onDelete,
}: {
  label: string
  active?: boolean
  indent?: number
  folders: Folder[]
  onSelect: () => void
  onMove: (folderId: string) => void
  onRename: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const background = active ? COLOR.navActive : hovered ? COLOR.navHover : 'transparent'
  const color = active ? COLOR.navActiveText : hovered ? COLOR.navHoverText : COLOR.navText

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative w-full flex items-center overflow-hidden transition-colors"
      style={{
        height: ROW_H,
        paddingLeft: LAYOUT.navItemPadX + indent,
        paddingRight: LAYOUT.navItemPadX,
        borderRadius: LAYOUT.navItemRadius,
        background,
      }}
    >
      {/* Ocupa a largura toda: o menu flutua por cima da cauda esmaecida. */}
      <button
        onClick={onSelect}
        title={label}
        className="w-full min-w-0 text-left text-[14px] leading-[1.4]"
        style={{ fontFamily: FONT, color }}
      >
        <MarqueeText text={label} active={hovered} />
      </button>
      <ChatRowMenu
        visible={hovered}
        rowBackground={background}
        rowBase={COLOR.canvas}
        folders={folders}
        onMove={onMove}
        onRename={onRename}
        onDelete={onDelete}
      />
    </div>
  )
}

function FolderRow({
  label,
  items,
  activeId,
  folders,
  onSelect,
  onMove,
  onRename,
  onDelete,
  onOpenFolder,
  onRenameFolder,
  onDeleteFolder,
}: {
  label: string
  items: FolderItem[]
  activeId: string
  folders: Folder[]
  onSelect: (id: string) => void
  onMove: (chatId: string, folderId: string) => void
  onRename: (chatId: string, title: string) => void
  onDelete: (chatId: string) => void
  onOpenFolder: () => void
  onRenameFolder: () => void
  onDeleteFolder: () => void
}) {
  const [open, setOpen] = useState(false)
  const [tudo, setTudo] = useState(false)
  const [hovered, setHovered] = useState(false)

  /* Pasta cheia não pode engolir a lista de chats ao abrir: mostra as
     primeiras e deixa o resto atrás de um pedido explícito. Ao fechar a
     pasta o corte volta, senão a próxima abertura repete o problema. */
  const visiveis = tudo ? items : items.slice(0, FOLDER_PREVIEW)
  const restantes = items.length - visiveis.length

  const alternar = () => {
    setOpen((v) => {
      if (v) setTudo(false)
      return !v
    })
  }

  return (
    <>
      {/* Não dá para usar `Row`: ela é um <button>, e as ações da pasta são
          botões também — botão dentro de botão é HTML inválido. */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative w-full flex items-center overflow-hidden transition-colors"
        style={{
          height: ROW_H,
          paddingLeft: LAYOUT.navItemPadX,
          paddingRight: LAYOUT.navItemPadX,
          borderRadius: LAYOUT.navItemRadius,
          background: hovered ? COLOR.navHover : 'transparent',
        }}
      >
        <button
          onClick={alternar}
          title={label}
          className="w-full min-w-0 flex items-center text-left"
          style={{ gap: LAYOUT.navItemGap, color: hovered ? COLOR.navHoverText : COLOR.navText }}
        >
          <span
            className="shrink-0 flex items-center justify-center"
            style={{ width: LAYOUT.navIconSize, height: LAYOUT.navIconSize }}
          >
            <Icon name={open ? 'folder_open' : 'folder'} size={24} />
          </span>
          {/* Sem chevron: o próprio ícone já alterna entre `folder` e
              `folder_open`, então a seta repetia o mesmo estado e ainda
              disputava espaço com as ações do hover. */}
          <span
            className="flex-1 min-w-0 truncate text-[14px] leading-[1.4]"
            style={{ fontFamily: FONT }}
          >
            {label}
          </span>
        </button>
        <FolderRowMenu
          visible={hovered}
          rowBackground={hovered ? COLOR.navHover : 'transparent'}
          rowBase={COLOR.canvas}
          onOpen={onOpenFolder}
          onRename={onRenameFolder}
          onDelete={onDeleteFolder}
        />
      </div>
      {open &&
        visiveis.map((item) => (
          <ChatRow
            key={item.id}
            label={item.title}
            indent={LAYOUT.navIconSize + LAYOUT.navItemGap}
            active={item.id === activeId}
            folders={folders}
            onSelect={() => onSelect(item.id)}
            onMove={(folderId) => onMove(item.id, folderId)}
            onRename={() => onRename(item.id, item.title)}
            onDelete={() => onDelete(item.id)}
          />
        ))}

      {open && (restantes > 0 || tudo) && (
        <button
          onClick={() => setTudo((v) => !v)}
          className="w-full flex items-center transition-colors rounded-lg"
          style={{
            height: ROW_H,
            paddingLeft: LAYOUT.navItemPadX + LAYOUT.navIconSize + LAYOUT.navItemGap,
            paddingRight: LAYOUT.navItemPadX,
            fontFamily: FONT,
            fontSize: 14,
            lineHeight: 1.4,
            color: COLOR.navLabel,
          }}
        >
          {tudo ? 'Mostrar menos' : `Mostrar mais (${restantes})`}
        </button>
      )}
    </>
  )
}

export function Sidebar({
  onNavigate,
  conversations,
  folders: allFolders,
  activeId,
  onSelect,
  onNewChat,
  onMoveToFolder,
  onRenameChat,
  onDeleteChat,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onOpenFolder,
}: {
  onNavigate?: (route: PortalRoute) => void
  conversations: Conversation[]
  folders: Folder[]
  activeId: string
  onSelect: (id: string) => void
  onNewChat: () => void
  onMoveToFolder: (chatId: string, folderId: string) => void
  onRenameChat: (chatId: string, title: string) => void
  onDeleteChat: (chatId: string) => void
  onCreateFolder: (label: string) => void
  onRenameFolder: (folderId: string, label: string) => void
  onDeleteFolder: (folderId: string) => void
  onOpenFolder: (folderId: string) => void
}) {
  /* Os dois modais moram aqui porque quem dispara está aqui: o cabeçalho de
     Pastas e o menu de cada conversa. O Sidebar só coleta o texto e devolve
     ao chamador — quem guarda pasta e conversa é a tela. */
  const [novaPasta, setNovaPasta] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const [renamingFolder, setRenamingFolder] = useState<{ id: string; label: string } | null>(null)
  const [search, setSearch] = useState('')
  const term = search.trim().toLowerCase()

  const folders = allFolders.filter(
    (f) =>
      f.label.toLowerCase().includes(term) ||
      f.items.some((i) => i.title.toLowerCase().includes(term)),
  )

  /** Lista única, na ordem de chegada — sem separação por data. */
  const chats = useMemo(
    () => conversations.filter((c) => c.title.toLowerCase().includes(term)),
    [conversations, term],
  )

  const nothingFound = chats.length === 0 && folders.length === 0

  return (
    <aside
      className="shrink-0 flex flex-col h-full"
      style={{
        width: LAYOUT.sidebarWidth,
        background: COLOR.canvas,
        paddingInline: LAYOUT.sidebarPad,
        paddingBottom: 8,
      }}
    >
      {/* Marca. Volta para o portal quando existe portal para voltar; sem
          onNavigate ela é só a marca, sem afordância de clique.
          O bloco tem a altura da barra de topo para os centros baterem; o
          botão é menor, para o realce não encostar no topo da tela. */}
      <div className="flex items-center shrink-0" style={{ height: TOPBAR.height }}>
        {onNavigate ? (
          <button
            onClick={() => onNavigate('portal')}
            title="Voltar ao portal"
            className="wk-icon-btn flex items-center"
            style={{
              height: 40,
              paddingLeft: LAYOUT.navItemPadX + LAYOUT.glyphInset,
              paddingRight: LAYOUT.navItemPadX,
            }}
          >
            <WeknowLogo />
          </button>
        ) : (
          <div
            className="flex items-center"
            style={{
              height: 40,
              paddingLeft: LAYOUT.navItemPadX + LAYOUT.glyphInset,
              paddingRight: LAYOUT.navItemPadX,
            }}
          >
            <WeknowLogo />
          </div>
        )}
      </div>

      <div className="pb-1 shrink-0" style={{ paddingTop: 24 }}>
        <Row icon={<IconNewChat size={24} />} label="Nova conversa" onClick={onNewChat} />
      </div>

      <div className="pb-2 shrink-0">
        <div
          className="flex items-center gap-2 rounded-full px-3 h-[36px] focus-within:shadow-[0_0_0_2px_rgba(51,102,204,0.18)] transition-shadow"
          style={{ background: COLOR.searchPill }}
        >
          <IconSearch size={24} color={COLOR.navLabel} />
          <input
            type="text"
            placeholder="Buscar conversas"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-[14px] outline-none"
            style={{ fontFamily: FONT, color: COLOR.text }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto -mr-2 pr-2">
        <SectionHeader
          label="Pastas"
          action={{ title: 'Nova pasta', icon: 'create_new_folder', onClick: () => setNovaPasta(true) }}
        />
        <div className="flex flex-col gap-0.5">
          {folders.map((f) => (
            <FolderRow
              key={f.id}
              label={f.label}
              items={f.items}
              activeId={activeId}
              folders={folders}
              onSelect={onSelect}
              onMove={onMoveToFolder}
              onRename={(id, title) => setRenaming({ id, title })}
              onDelete={onDeleteChat}
              onOpenFolder={() => onOpenFolder(f.id)}
              onRenameFolder={() => setRenamingFolder({ id: f.id, label: f.label })}
              onDeleteFolder={() => onDeleteFolder(f.id)}
            />
          ))}
        </div>

        <SectionHeader label="Chats" />
        <div className="flex flex-col gap-0.5">
          {chats.map((c) => (
            <ChatRow
              key={c.id}
              label={c.title}
              active={c.id === activeId}
              folders={folders}
              onSelect={() => onSelect(c.id)}
              onMove={(folderId) => onMoveToFolder(c.id, folderId)}
              onRename={() => setRenaming({ id: c.id, title: c.title })}
              onDelete={() => onDeleteChat(c.id)}
            />
          ))}
        </div>

        {nothingFound && (
          <p className="px-3 py-3 text-[13px]" style={{ fontFamily: FONT, color: COLOR.navLabel }}>
            Nada encontrado para “{search}”.
          </p>
        )}
      </div>

      {novaPasta && (
        <PromptModal
          title="Nova pasta"
          label="Nome da pasta"
          placeholder="Ex: Financeiro"
          confirmLabel="Criar pasta"
          onConfirm={onCreateFolder}
          onClose={() => setNovaPasta(false)}
        />
      )}

      {renamingFolder && (
        <PromptModal
          title="Renomear pasta"
          label="Nome da pasta"
          initialValue={renamingFolder.label}
          confirmLabel="Renomear"
          onConfirm={(nome) => onRenameFolder(renamingFolder.id, nome)}
          onClose={() => setRenamingFolder(null)}
        />
      )}

      {renaming && (
        <PromptModal
          title="Renomear conversa"
          label="Nome da conversa"
          initialValue={renaming.title}
          confirmLabel="Renomear"
          onConfirm={(titulo) => onRenameChat(renaming.id, titulo)}
          onClose={() => setRenaming(null)}
        />
      )}
    </aside>
  )
}
