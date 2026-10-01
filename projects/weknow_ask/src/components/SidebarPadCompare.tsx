import { useSyncExternalStore } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Icon } from '@/components/icons'

/**
 * TEMPORÁRIO — não commitar. Alterna a margem lateral do menu entre 8 (a
 * nova) e 16 (a anterior), para comparar com o dev. A escolha fica no
 * navegador. Ao decidir, apagar este arquivo e voltar os usos para
 * `LAYOUT.sidebarPad` e `LAYOUT.sidebarRailWidth`.
 */

export type SidebarPad = 8 | 16

const KEY = 'wk-compare-sidebar-pad'
let pad: SidebarPad = read()
const listeners = new Set<() => void>()

function read(): SidebarPad {
  try {
    return localStorage.getItem(KEY) === '16' ? 16 : 8
  } catch {
    return 8
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

function setPad(next: SidebarPad) {
  pad = next
  try {
    localStorage.setItem(KEY, String(next))
  } catch {
    // sem armazenamento, vale só nesta visita
  }
  listeners.forEach((fn) => fn())
}

/** Margem lateral e largura do trilho (margem + item de 40 + margem). */
export function useSidebarPad() {
  const value = useSyncExternalStore(subscribe, () => pad)
  return { pad: value, rail: value * 2 + LAYOUT.navItemHeight }
}

/** Linha do menu "…": rótulo à esquerda, 8 | 16 à direita. */
export function SidebarPadRow() {
  const { pad: current } = useSidebarPad()

  return (
    <div className="flex items-center gap-2" style={{ height: 40, paddingInline: 8 }}>
      <Icon name="padding" size={24} color={COLOR.navLabel} className="shrink-0" />
      <span
        className="flex-1 whitespace-nowrap"
        style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.5, color: COLOR.navText }}
      >
        Margem do menu
      </span>
      <span
        role="radiogroup"
        aria-label="Margem do menu"
        className="inline-flex shrink-0 rounded-full"
        style={{ padding: 2, background: COLOR.hoverStrong }}
      >
        {([8, 16] as const).map((v) => {
          const on = v === current
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setPad(v)}
              className="rounded-full transition-colors"
              style={{
                height: 24,
                paddingInline: 10,
                fontFamily: FONT,
                fontSize: 12,
                fontWeight: on ? 600 : 400,
                color: on ? COLOR.primary : COLOR.navText,
                background: on ? COLOR.surface : 'transparent',
              }}
            >
              {v}px
            </button>
          )
        })}
      </span>
    </div>
  )
}
