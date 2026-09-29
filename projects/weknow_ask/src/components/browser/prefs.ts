import { useCallback, useState } from 'react'
import type { Item } from '@/data/portal'

export type ViewMode = 'list' | 'grid' | 'thumbs'
/**
 * Ordem do menu: do mais visual ao mais denso.
 *
 * A Lista saiu das opções. Ela era uma tabela — cabeçalho de colunas,
 * "Detalhes", "Última alteração" —, e tabela se lê como relatório, não como
 * acervo: ali o ícone do tipo cabia em 20px e voltava a ser a pasta cinza
 * genérica, sem o ícone nem a cor que o cliente cadastrou. Eram duas telas
 * para o mesmo conteúdo, e a mais densa era justamente a que dizia menos.
 *
 * O renderer de lista continua no código, mas só onde ele é mesmo uma
 * tabela: Tarefas e Apresentações, que têm descrição e código em coluna.
 */
export const VIEW_MODES: ViewMode[] = ['thumbs', 'grid']
export type SortKey = 'default' | 'name' | 'updated'
export type SortDir = 'asc' | 'desc'

export const VIEW_LABEL: Record<ViewMode, string> = { list: 'Lista', grid: 'Compacto', thumbs: 'Expandido' }
export const VIEW_ICON: Record<ViewMode, string> = { list: 'view_list', grid: 'grid_view', thumbs: 'gallery_thumbnail' }
export const SORT_LABEL: Record<SortKey, string> = { default: 'Padrão', name: 'Nome', updated: 'Modificado' }

function read<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return allowed.includes(v as T) ? (v as T) : fallback
  } catch {
    return fallback
  }
}

export function usePref<T extends string>(key: string, allowed: readonly T[], fallback: T) {
  const [value, setValue] = useState<T>(() => read(key, allowed, fallback))
  const set = useCallback(
    (next: T) => {
      setValue(next)
      try {
        localStorage.setItem(key, next)
      } catch {
        // sem armazenamento, a escolha vale só nesta visita
      }
    },
    [key],
  )
  return [value, set] as const
}

export function useBrowserPrefs() {
  const [view, setView] = usePref<ViewMode>('wk-portal-view', VIEW_MODES, 'thumbs')
  const [sort, setSort] = usePref('wk-portal-sort', ['default', 'name', 'updated'] as const, 'name')
  const [dir, setDir] = usePref('wk-portal-dir', ['asc', 'desc'] as const, 'asc')
  return { view, setView, sort, setSort, dir, setDir }
}

export type BrowserPrefs = ReturnType<typeof useBrowserPrefs>

/** "Padrão" mantém a ordem definida na origem; a seta só a inverte. */
export function sortItems<T extends Item>(items: T[], sort: SortKey, dir: SortDir): T[] {
  const sign = dir === 'asc' ? 1 : -1
  if (sort === 'default') return dir === 'asc' ? items : [...items].reverse()
  return [...items].sort((a, b) => {
    const cmp = sort === 'name' ? a.name.localeCompare(b.name, 'pt-BR') : a.updatedAt.localeCompare(b.updatedAt)
    return cmp * sign
  })
}
