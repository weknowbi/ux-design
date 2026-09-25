import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Btn } from '@/components/Btn'
import { Icon } from '@/components/icons'
import { MENU_ITEM, MENU_PANEL, menuItemStyle } from '@/components/ChatRowMenu'
import { PromptModal } from '@/components/PromptModal'
import type { Folder, FolderItem } from '@/data/conversation'

/**
 * A pasta vista por inteiro, no lugar da conversa.
 *
 * O menu lateral mostra a pasta cortada — cinco itens e "Mostrar mais". Esta
 * tela existe para o oposto: ver tudo de uma vez, com o resumo e a data que
 * não cabem na largura do menu.
 *
 * A lista não usa divisórias: o que separa uma linha da outra é o respiro, e
 * o realce arredondado que aparece sob o cursor. Riscos entre itens fariam a
 * tela parecer uma tabela, e isto é uma lista de conversas.
 *
 * A data cede lugar ao menu no hover — as duas coisas disputam o mesmo canto,
 * e a data é referência passiva enquanto o menu é ação.
 */

const ROW = { padY: 12, padX: 16, radius: 8 } as const

function FolderChatRow({
  item,
  onOpen,
  onRename,
  onDelete,
}: {
  item: FolderItem
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const mostraMenu = hovered || menuOpen

  return (
    <div
      ref={rootRef}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative flex items-center transition-colors"
      style={{
        borderRadius: ROW.radius,
        background: mostraMenu ? 'var(--wk-list-hover)' : 'transparent',
      }}
    >
      <button
        onClick={onOpen}
        className="flex-1 min-w-0 text-left"
        style={{ paddingBlock: ROW.padY, paddingInline: ROW.padX }}
      >
        <span
          className="block truncate"
          style={{ fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.5, color: COLOR.text }}
        >
          {item.title}
        </span>
        {item.preview && (
          <span
            className="block truncate"
            style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: COLOR.textMuted }}
          >
            {item.preview}
          </span>
        )}
      </button>

      <div className="shrink-0 flex items-center" style={{ paddingRight: ROW.padX }}>
        {mostraMenu ? (
          <button
            ref={btnRef}
            onClick={() => {
              const r = btnRef.current?.getBoundingClientRect()
              if (r) setPos({ top: r.bottom + 4, left: r.left - 150 })
              setMenuOpen((v) => !v)
            }}
            title="Ações da conversa"
            aria-label="Ações da conversa"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="wk-icon-btn flex items-center justify-center"
            style={{ width: 24, height: 24, color: COLOR.navLabel }}
          >
            <Icon name="more_horiz" size={24} />
          </button>
        ) : (
          item.updatedAt && (
            <span
              style={{ fontFamily: FONT, fontSize: 13, lineHeight: 1.5, color: COLOR.textMuted }}
            >
              {item.updatedAt}
            </span>
          )
        )}
      </div>

      {menuOpen && (
        <div className="fixed z-50" style={{ top: pos.top, left: pos.left }} role="menu">
          <div style={MENU_PANEL}>
            <button
              className={MENU_ITEM}
              style={menuItemStyle()}
              onClick={() => {
                onRename()
                setMenuOpen(false)
              }}
              role="menuitem"
            >
              Renomear
            </button>
            <button
              className={MENU_ITEM}
              style={menuItemStyle(true)}
              onClick={() => {
                onDelete()
                setMenuOpen(false)
              }}
              role="menuitem"
            >
              Excluir conversa
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function FolderScreen({
  folder,
  onOpenChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
}: {
  folder: Folder
  onOpenChat: (id: string) => void
  onNewChat: () => void
  onRenameChat: (id: string, title: string) => void
  onDeleteChat: (id: string) => void
}) {
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null)
  const column = { maxWidth: LAYOUT.threadMaxWidth + 80 }

  return (
    /* Respiro maior no topo: sem a faixa de abas acima, os 24 padrão
       deixavam o título encostado na borda da folha. */
    <div className="flex-1 flex flex-col min-h-0 px-6" style={{ paddingTop: 48 }}>
      <div className="mx-auto w-full shrink-0" style={column}>
        <div className="flex items-center gap-3" style={{ paddingInline: ROW.padX }}>
          <Icon name="folder" size={24} color={COLOR.navLabel} className="shrink-0" />
          <h1
            className="flex-1 min-w-0 truncate"
            style={{
              fontFamily: FONT,
              fontSize: 26,
              lineHeight: '36px',
              fontWeight: 400,
              color: COLOR.text,
            }}
          >
            {folder.label}
          </h1>
          <Btn variant="primary" iconLeft={<Icon name="add" size={20} />} onClick={onNewChat}>
            Nova conversa
          </Btn>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto mx-auto w-full" style={column}>
        <div className="pb-8" style={{ paddingTop: 24 }}>
          {folder.items.map((item) => (
            <FolderChatRow
              key={item.id}
              item={item}
              onOpen={() => onOpenChat(item.id)}
              onRename={() => setRenaming({ id: item.id, title: item.title })}
              onDelete={() => onDeleteChat(item.id)}
            />
          ))}

          {folder.items.length === 0 && (
            <p
              className="text-[14px]"
              style={{ fontFamily: FONT, color: COLOR.textMuted, paddingInline: ROW.padX }}
            >
              Esta pasta ainda não tem conversas.
            </p>
          )}
        </div>
      </div>

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
    </div>
  )
}
