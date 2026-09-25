import { useEffect, useRef, useState } from 'react'
import { COLOR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { MENU_ITEM, MENU_PANEL, menuItemStyle } from '@/components/ChatRowMenu'

/**
 * Ações da pasta, no hover da linha: abrir a pasta inteira e o menu.
 *
 * O painel é `fixed` e posicionado a partir do botão, pela mesma razão do
 * menu da conversa: a lista do menu lateral rola, e um painel absoluto seria
 * recortado por ela.
 *
 * O degradê que cobre a cauda do nome compõe o realce da linha (que no tema
 * escuro é translúcido) sobre a cor opaca do menu — o véu sozinho não esconde
 * nada.
 */

export function FolderRowMenu({
  visible,
  rowBackground,
  rowBase,
  onOpen,
  onRename,
  onDelete,
}: {
  visible: boolean
  rowBackground: string
  rowBase: string
  /** Abre a pasta por inteiro, no lugar da conversa. */
  onOpen: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', close)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = () => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 4, left: r.left - 150 })
    setOpen((v) => !v)
  }

  return (
    <div
      ref={rootRef}
      className="absolute inset-y-0 flex items-center"
      style={{
        right: 4,
        paddingLeft: 16,
        gap: 2,
        background:
          `linear-gradient(to right, transparent, ${rowBackground} 16px),` +
          `linear-gradient(to right, transparent, ${rowBase} 16px)`,
        opacity: visible || open ? 1 : 0,
        pointerEvents: visible || open ? 'auto' : 'none',
        transition: 'opacity .12s ease',
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          onOpen()
        }}
        title="Abrir pasta"
        aria-label="Abrir pasta"
        className="wk-icon-btn flex items-center justify-center"
        style={{ width: 24, height: 24, color: COLOR.navLabel }}
      >
        <Icon name="edit_square" size={24} />
      </button>

      <button
        ref={btnRef}
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        title="Ações da pasta"
        aria-label="Ações da pasta"
        aria-haspopup="menu"
        aria-expanded={open}
        className="wk-icon-btn flex items-center justify-center"
        style={{ width: 24, height: 24, color: COLOR.navLabel }}
      >
        <Icon name="more_horiz" size={24} />
      </button>

      {open && (
        <div className="fixed z-50" style={{ top: pos.top, left: pos.left }} role="menu">
          <div style={MENU_PANEL}>
            <button
              className={MENU_ITEM}
              style={menuItemStyle()}
              onClick={() => {
                onRename()
                setOpen(false)
              }}
              role="menuitem"
            >
              Renomear pasta
            </button>
            <button
              className={MENU_ITEM}
              style={menuItemStyle(true)}
              onClick={() => {
                onDelete()
                setOpen(false)
              }}
              role="menuitem"
            >
              Excluir pasta
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
