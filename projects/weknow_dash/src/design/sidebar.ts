import { useCallback, useState } from 'react'

/**
 * Menu lateral aberto ou recolhido em trilho de ícones.
 *
 * O estado é um só para o portal e para o Ask: os dois dividem o mesmo
 * layout, e quem recolheu num não espera encontrar o outro aberto. Como as
 * telas nunca estão montadas ao mesmo tempo, o `localStorage` basta para
 * levar a escolha de uma para a outra.
 *
 * Aberto é o padrão. Recolher é escolha de quem usa, nunca do produto.
 */

const KEY = 'wk-sidebar'

/** Curva "emphasized" do Material 3: sai rápido e assenta devagar. */
export const SIDEBAR_TRANSITION = '220ms cubic-bezier(0.2, 0, 0, 1)'

/** Embutido em outra página (ver `?embed` no App): sempre abre aberto e não grava. */
const embedded = new URLSearchParams(window.location.search).has('embed')

function stored(): boolean {
  if (embedded) return false
  try {
    return localStorage.getItem(KEY) === 'rail'
  } catch {
    return false
  }
}

function save(collapsed: boolean) {
  if (embedded) return
  try {
    localStorage.setItem(KEY, collapsed ? 'rail' : 'open')
  } catch {
    /* sem armazenamento, a escolha vale só enquanto a tela está aberta */
  }
}

export function useSidebar() {
  const [collapsed, setCollapsed] = useState(stored)

  const set = useCallback((next: boolean) => {
    save(next)
    setCollapsed(next)
  }, [])

  const toggle = useCallback(() => set(!collapsed), [collapsed, set])
  const expand = useCallback(() => set(false), [set])

  return { collapsed, toggle, expand }
}
