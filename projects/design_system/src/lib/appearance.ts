import { useSyncExternalStore } from 'react'

/**
 * A cara que o usuário deu a cada item: nome, imagem, ícone e cor. É a parte
 * visual do "Cadastro de menus" do desk, trazida para onde a pasta aparece.
 * Aqui fica no navegador (localStorage), fora dos dados: no produto são
 * campos do cadastro, gravados pelo Salvar do painel.
 */
export type Appearance = {
  icon?: string
  color?: string
  /** O "Descrição" do cadastro: o nome que a pasta mostra no portal. */
  name?: string
  /** Imagem da pasta, já reduzida (ver readImageFile). `null` é imagem retirada. */
  image?: string | null
}

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
 * Cores do círculo: as do card de referência (azul, verde-água, roxo,
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

function commit(next: Record<string, Appearance>) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // sem armazenamento (ou imagem grande demais), vale só nesta visita
  }
  listeners.forEach((fn) => fn())
}

/** Mescla um campo no registro do item. `null` volta ao padrão do tipo. */
export function setAppearance(id: string, next: Appearance | null) {
  const copy = { ...state }
  if (next) copy[id] = { ...copy[id], ...next }
  else delete copy[id]
  commit(copy)
}

/** O registro como está agora: o painel tira uma foto antes de deixar mexer. */
export function getAppearance(id: string): Appearance | undefined {
  return state[id]
}

/** Troca o registro inteiro em vez de mesclar: é o Cancelar do painel. */
export function replaceAppearance(id: string, value: Appearance | undefined) {
  const copy = { ...state }
  if (value) copy[id] = value
  else delete copy[id]
  commit(copy)
}

/** Tudo o que foi personalizado, para quem resolve vários itens de uma vez: o nome da pasta no cabeçalho e no caminho da barra de topo. */
export function useAppearances(): Record<string, Appearance> {
  return useSyncExternalStore(subscribe, () => state)
}

/**
 * Imagem escolhida pelo usuário, reduzida antes de guardar: o card mostra a
 * miniatura em ~300px de largura e foto de celular tem 4000, então guardar o
 * arquivo como veio é megabyte à toa, e aqui ele ainda passa pelo
 * localStorage. Vira JPEG porque capa de pasta é foto; PNG com transparência
 * perderia o fundo, e não é esse o caso de uso.
 */
export const IMAGE_MAX_WIDTH = 720

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, IMAGE_MAX_WIDTH / img.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('sem canvas'))
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.82))
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('imagem inválida'))
    }
    img.src = url
  })
}
