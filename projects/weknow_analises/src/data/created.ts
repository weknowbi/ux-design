import { useMemo } from 'react'
import { useStore } from '@/lib/store'
import type { Board, Widget } from '@/engine/board'
import { CURRENT_USER } from '@/data/account'
import { PORTAL_ROOT, flatten, type Dashboard, type Folder, type Item, type SketchBlock } from '@/data/portal'

/**
 * Os dashboards criados aqui entram na árvore do portal como os outros.
 *
 * O publicado mora na pasta escolhida ao publicar. O rascunho é de quem
 * criou e ainda não tem pasta: fica em "Meus rascunhos", no começo da home,
 * que só aparece enquanto houver algum.
 */
export const DRAFTS_ID = 'meus-rascunhos'

/** As pastas do portal, para o "Pasta no portal" de publicar. */
export const PORTAL_FOLDERS = flatten(PORTAL_ROOT)
  .filter((e) => e.item.kind === 'folder')
  .map((e) => e.item.name)

/* O croqui do card sai dos blocos de verdade: largura em 12 colunas, os
   números numa linha baixa e os gráficos em duas. */
const SKETCH: Record<Widget['kind'], SketchBlock[4]> = { kpi: 'label', trend: 'line', breakdown: 'bar', explain: 'text', insight: 'text', painel: 'bar' }

/* O painel executivo tem desenho fixo: quatro números, linha e insights,
   ocupação e permanência, receita e a rosca das fontes. */
const PAINEL: SketchBlock[] = [
  [0, 0, 3, 1, 'label'], [3, 0, 3, 1, 'label'], [6, 0, 3, 1, 'label'], [9, 0, 3, 1, 'label'],
  [0, 1, 8, 2, 'line'], [8, 1, 4, 2, 'text'],
  [0, 3, 7, 1.5, 'bar'], [7, 3, 5, 1.5, 'bar'],
  [0, 4.5, 8, 1.5, 'bar'], [8, 4.5, 4, 1.5, 'pie'],
]

export function sketchOf(widgets: Widget[]): SketchBlock[] {
  if (widgets.some((w) => w.kind === 'painel')) return PAINEL
  const out: SketchBlock[] = []
  let x = 0
  let y = 0
  let rowH = 0
  for (const w of widgets) {
    const width = w.span * 2
    const h = w.kind === 'kpi' ? 1 : 2
    if (x + width > 12) {
      x = 0
      y += rowH
      rowH = 0
    }
    out.push([x, y, width, h, SKETCH[w.kind]])
    x += width
    rowH = Math.max(rowH, h)
  }
  // O croqui tem 6 linhas; painel mais alto encolhe por igual para caber.
  const total = y + rowH
  if (total <= 6) return out
  const k = 6 / total
  return out.map(([bx, by, bw, bh, kind]) => [bx, by * k, bw, bh * k, kind])
}

const toDashboard = (b: Board): Dashboard => ({
  kind: 'dashboard',
  id: b.id,
  name: b.saved?.name ?? b.title,
  updatedAt: new Date(b.createdAt).toISOString(),
  updatedBy: CURRENT_USER.name,
  layout: sketchOf(b.widgets),
})

function insert(f: Folder, folderName: string, d: Dashboard): Folder {
  if (f.name === folderName) return { ...f, children: [d, ...f.children] }
  return { ...f, children: f.children.map((c) => (c.kind === 'folder' ? insert(c, folderName, d) : c)) }
}

/** A raiz do portal com os dashboards criados no lugar deles. */
export function usePortalRoot(): Folder {
  const { analyses } = useStore()
  return useMemo(() => {
    let root = PORTAL_ROOT
    const drafts: Item[] = []
    for (const { board } of analyses) {
      if (board.saved) root = insert(root, board.saved.folder, toDashboard(board))
      else drafts.push(toDashboard(board))
    }
    if (!drafts.length) return root
    const folder: Folder = {
      kind: 'folder',
      id: DRAFTS_ID,
      name: 'Meus rascunhos',
      updatedAt: drafts[0].updatedAt,
      updatedBy: CURRENT_USER.name,
      children: drafts,
    }
    return { ...root, children: [folder, ...root.children] }
  }, [analyses])
}

/**
 * O dashboard criado com IA que entra nos favoritos ao abrir o portal: o
 * publicado de exemplo ("Permanência média em outubro"); se ele não estiver
 * neste navegador, o publicado mais recente; sem nenhum publicado, o
 * rascunho mais recente que já tenha conteúdo (favorito é de quem o vê, e
 * quem criou vê os próprios rascunhos). O vazio não entra.
 */
export function aiFavorite(analyses: { board: Board }[]): string | undefined {
  const published = analyses.filter((a) => a.board.saved)
  const pick =
    published.find((a) => a.board.saved!.name === 'Permanência média em outubro') ??
    published[0] ??
    analyses.find((a) => a.board.widgets.length > 0)
  return pick?.board.id
}

/** A pasta pelo nome, para "Ver no portal" abrir onde o dashboard entrou. */
export function folderIdOf(name: string): string | undefined {
  return flatten(PORTAL_ROOT).find((e) => e.item.kind === 'folder' && e.item.name === name)?.item.id
}
