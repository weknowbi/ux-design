import { useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import type { Folder } from '@/data/conversation'

/**
 * Menu de ações de uma conversa. O botão só aparece no hover da linha.
 *
 * O painel é `fixed` e posicionado a partir do retângulo do botão: a lista do
 * menu tem `overflow-y: auto`, então um painel absoluto seria recortado por ela.
 */

/** Painel e item — exportados para o menu da pasta usar o mesmo desenho. */
export const MENU_PANEL: React.CSSProperties = {
  background: 'var(--wk-surface)',
  border: `1px solid ${COLOR.border}`,
  borderRadius: 8,
  boxShadow: 'var(--wk-shadow-menu)',
  padding: 4,
  minWidth: 180,
}

export const MENU_ITEM =
  'w-full text-left flex items-center gap-2 px-3 rounded-md transition-colors hover:bg-[var(--wk-menu-hover)]'

export function menuItemStyle(danger?: boolean): React.CSSProperties {
  return {
    height: 36,
    fontFamily: FONT,
    fontSize: 14,
    color: danger ? COLOR.danger : COLOR.text,
    whiteSpace: 'nowrap',
  }
}

export function ChatRowMenu({
  visible,
  rowBackground,
  rowBase,
  folders,
  onMove,
  onRename,
  onDelete,
}: {
  /** A linha está sob o cursor — segue visível enquanto o menu estiver aberto. */
  visible: boolean
  /**
   * Realce da linha (hover/selecionada). No escuro é um véu translúcido, então
   * sozinho não esconde nada — anda sempre com `rowBase`.
   */
  rowBackground: string
  /** Cor opaca sob a linha. É ela que de fato cobre a cauda do título. */
  rowBase: string
  folders: Folder[]
  onMove: (folderId: string) => void
  onRename: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [submenu, setSubmenu] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setSubmenu(false)
      }
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (setOpen(false), setSubmenu(false))
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: r.left })
    setOpen((v) => !v)
    setSubmenu(false)
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-y-0 flex items-center"
      style={{
        right: 4,
        paddingLeft: 16,
        /* Duas camadas na mesma rampa: o véu por cima da cor opaca — é o
           que a linha realmente mostra. Uma camada só, com o véu de 8%,
           deixava o título aparecer por baixo do botão. */
        background:
          `linear-gradient(to right, transparent, ${rowBackground} 16px),` +
          `linear-gradient(to right, transparent, ${rowBase} 16px)`,
        opacity: visible || open ? 1 : 0,
        pointerEvents: visible || open ? 'auto' : 'none',
        transition: 'opacity .12s ease',
      }}
    >
      <button
        ref={btnRef}
        onClick={toggle}
        title="Ações da conversa"
        aria-label="Ações da conversa"
        aria-haspopup="menu"
        aria-expanded={open}
        className="wk-icon-btn flex items-center justify-center"
        style={{ width: 24, height: 24, color: COLOR.navLabel }}
      >
        <Icon name="more_horiz" size={24} />
      </button>

      {open && (
        /* Os dois painéis numa linha flex, separados por 1px: o submenu
           acompanha o painel de origem qualquer que seja a largura dele. O
           `left: 188` que havia aqui presumia 180 de largura e deixava 8 de
           folga — e quebraria assim que um rótulo crescesse. O 1px é a costura
           que impede as duas bordas de virarem um traço grosso só. */
        <div
          className="fixed z-50 flex items-start"
          style={{ top: pos.top, left: pos.left, gap: 1 }}
          role="menu"
        >
          <div style={MENU_PANEL}>
            <button
              className={MENU_ITEM}
              style={menuItemStyle()}
              onMouseEnter={() => setSubmenu(true)}
              onClick={() => setSubmenu((v) => !v)}
              role="menuitem"
            >
              <span className="flex-1">Mover para pasta</span>
              <Icon name="chevron_right" size={18} color={COLOR.navLabel} />
            </button>
            <button
              className={MENU_ITEM}
              style={menuItemStyle()}
              onMouseEnter={() => setSubmenu(false)}
              onClick={() => {
                onRename()
                setOpen(false)
              }}
              role="menuitem"
            >
              Renomear
            </button>
            <button
              className={MENU_ITEM}
              style={menuItemStyle(true)}
              onMouseEnter={() => setSubmenu(false)}
              onClick={() => {
                onDelete()
                setOpen(false)
              }}
              role="menuitem"
            >
              Excluir conversa
            </button>
          </div>

          {submenu && (
            <div style={MENU_PANEL} role="menu" aria-label="Pastas">
              {folders.map((f) => (
                <button
                  key={f.id}
                  className={MENU_ITEM}
                  style={menuItemStyle()}
                  onClick={() => {
                    onMove(f.id)
                    setOpen(false)
                    setSubmenu(false)
                  }}
                  role="menuitem"
                >
                  {f.label}
                </button>
              ))}
              {folders.length === 0 && (
                <p className="px-3 py-2 text-[13px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
                  Nenhuma pasta ainda.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
