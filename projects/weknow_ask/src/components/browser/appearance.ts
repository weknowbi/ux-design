import { useSyncExternalStore } from 'react'

/**
 * Ícone e cor escolhidos para cada item nos cards limpos — teste, a pedido.
 * Fica no navegador (localStorage), fora dos dados: no produto isso seria um
 * campo do cadastro da pasta.
 */
export type Appearance = { icon?: string; color?: string }

/** Ícones oferecidos: os temas que aparecem nas pastas dos clientes. */
export const APPEARANCE_ICONS = [
  'folder',
  'dashboard',
  'domain',
  'local_hospital',
  'bed',
  'monitor_heart',
  'stethoscope',
  'emergency',
  'medication',
  'biotech',
  'science',
  'payments',
  'groups',
  'inventory_2',
  'engineering',
  'school',
  'gavel',
  'bar_chart',
]

/**
 * Cores do círculo — as do card de referência (azul, verde-água, roxo,
 * laranja, vermelho, grafite) mais um azul-céu e um verde. Ícone branco por
 * cima. Azul é o padrão da pasta; vermelho, o do dashboard.
 */
export const APPEARANCE_COLORS = [
  '#1d63c6',
  '#0f9d8a',
  '#6d3fd3',
  '#f39c12',
  '#d81b4a',
  '#2f3542',
  '#0ea5e9',
  '#22a55b',
]

const KEY = 'wk-portal-appearance'
let state: Record<string, Appearance> = read()
const listeners = new Set<() => void>()

function read(): Record<string, Appearance> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}
  } catch {
    return {}
  }
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useAppearance(id: string): Appearance | undefined {
  return useSyncExternalStore(subscribe, () => state[id])
}

/** `null` volta ao padrão do tipo. */
export function setAppearance(id: string, next: Appearance | null) {
  const copy = { ...state }
  if (next) copy[id] = { ...copy[id], ...next }
  else delete copy[id]
  state = copy
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // sem armazenamento, vale só nesta visita
  }
  listeners.forEach((fn) => fn())
}
