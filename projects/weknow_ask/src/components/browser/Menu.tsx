import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'

export const MENU_PANEL: CSSProperties = {
  background: COLOR.surface,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 8,
  boxShadow: 'var(--wk-shadow-menu)',
  padding: 4,
}

/** Menu suspenso ancorado no gatilho; fecha com clique fora ou Esc. */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  minWidth = 160,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  minWidth?: number
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative" data-open={open || undefined}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          role="menu"
          className={`absolute top-full mt-1 z-30 ${align === 'right' ? 'right-0' : 'left-0'}`}
          style={{ ...MENU_PANEL, minWidth }}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

const ITEM = 'w-full flex items-center gap-2 rounded-md h-9 pl-2 pr-4 transition-colors hover:bg-[var(--wk-menu-hover)]'

/** Opção de escolha única — check à esquerda, como no seletor de visualização do Weknow. */
export function MenuOption({ checked, label, onSelect }: { checked: boolean; label: string; onSelect: () => void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={checked} onClick={onSelect} className={ITEM}>
      <span className="w-5 shrink-0 flex justify-center">
        {checked && <Icon name="check" size={20} color={COLOR.navLabel} />}
      </span>
      <span className="text-left text-[14px] whitespace-nowrap" style={{ fontFamily: FONT, color: COLOR.navText }}>
        {label}
      </span>
    </button>
  )
}

export function MenuAction({ icon, label, onSelect }: { icon: string; label: string; onSelect: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onSelect} className={ITEM}>
      <Icon name={icon} size={20} color={COLOR.navLabel} className="shrink-0" />
      <span className="text-left text-[14px] whitespace-nowrap" style={{ fontFamily: FONT, color: COLOR.navText }}>
        {label}
      </span>
    </button>
  )
}
