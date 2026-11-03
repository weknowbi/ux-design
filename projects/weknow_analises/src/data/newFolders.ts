import { useSyncExternalStore } from 'react'
import { storageKey } from '@ds/prefs'
import { CURRENT_USER } from '@/data/account'
import { PORTAL_ROOT, findFolderPath, type Folder } from '@/data/portal'

/**
 * Pastas criadas pelo usuário no portal ("Nova pasta").
 *
 * O acervo da maquete é constante (`PORTAL_ROOT`); a pasta nova entra nele, na
 * pasta onde foi criada, e daí a busca, o caminho, os favoritos e a ordenação
 * já a tratam como qualquer outra. Fica no navegador (localStorage), como a
 * aparência das pastas: no produto é um cadastro gravado no servidor.
 *
 * Cada pasta guarda só o necessário para ser recriada ao abrir o portal, na
 * ordem em que nasceu: assim a pasta criada dentro de outra pasta nova sempre
 * encontra a mãe já no lugar.
 */
type Saved = { id: string; parentId: string | null; name: string; createdAt: string }

const KEY = storageKey('wk-portal-pastas-novas')
let saved: Saved[] = read()
let revision = 0
const listeners = new Set<() => void>()

function read(): Saved[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function attach(s: Saved) {
  const path = s.parentId ? findFolderPath(PORTAL_ROOT, s.parentId) : [PORTAL_ROOT]
  const parent = path?.[path.length - 1]
  if (!parent) return
  const folder: Folder = {
    kind: 'folder',
    id: s.id,
    name: s.name,
    updatedAt: s.createdAt,
    updatedBy: CURRENT_USER.name,
    children: [],
  }
  // Lista nova, e não push: quem memoriza pela lista de filhos vê a mudança.
  parent.children = [...parent.children, folder]
}

saved.forEach(attach)

/** Cria a pasta dentro de `parentId` (`null` é a home) e devolve o id dela. */
export function createFolder(parentId: string | null, name: string): string {
  const s: Saved = { id: `n${Date.now().toString(36)}`, parentId, name, createdAt: new Date().toISOString() }
  attach(s)
  saved = [...saved, s]
  try {
    localStorage.setItem(KEY, JSON.stringify(saved))
  } catch {
    // sem armazenamento, a pasta vale só nesta visita
  }
  revision++
  listeners.forEach((fn) => fn())
  return s.id
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Muda a cada pasta criada: é o que faz a tela redesenhar o acervo. */
export function useFolderRevision(): number {
  return useSyncExternalStore(subscribe, () => revision)
}
