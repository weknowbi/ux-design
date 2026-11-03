import { useSyncExternalStore } from 'react'
import type { Access, Board, Op } from '@/engine/board'
import { apply } from '@/engine/board'
import { create, type Message } from '@/engine/assistant'
import { METADADOS } from '@/engine/catalog'
import { modelPrompt } from '@/engine/config'
import { DIMENSIONS, INDICATORS } from '@/engine/semantic'

/**
 * Dashboards criados aqui, no navegador.
 *
 * Cada análise é o painel mais a conversa que o montou. Toda mudança no
 * painel, venha da conversa ou de um clique, passa por `change`, que guarda
 * o estado anterior: desfazer e refazer valem para os dois caminhos.
 *
 * No produto isto é do servidor, com as permissões do metadado. Aqui é o
 * `localStorage`, e a leitura aceita falhar (janela anônima, armazenamento
 * bloqueado): o protótipo continua, só não lembra.
 */

export type Analysis = { board: Board; messages: Message[] }

type State = { analyses: Analysis[] }

const KEY = 'wk-dashboards-v1'

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw) as State
      if (Array.isArray(s.analyses)) return s
    }
  } catch {
    /* sem armazenamento: começa vazio */
  }
  return { analyses: seed() }
}

/**
 * Dois dashboards de exemplo, criados aqui: um publicado, que partiu de uma
 * pergunta sobre o metadado, e um rascunho montado com o modelo do raio-x a
 * partir do dashboard de glosas.
 */
function seed(): Analysis[] {
  const a = create({ kind: 'metadado', code: '21' }, 'Por que a permanência média subiu em outubro?')
  const md = METADADOS.find((m) => m.code === '32')!
  const b = create({ kind: 'dashboard', id: 'glosas' }, modelPrompt(md, INDICATORS[md.ind].dims.map((d) => DIMENSIONS[d].label)))
  const out: Analysis[] = []
  if (b) out.push({ board: { ...b.board, title: 'Raio-x do faturamento e das glosas', createdAt: Date.now() - 3 * 3600e3 }, messages: b.messages })
  if (a) {
    const name = 'Permanência média em outubro'
    out.push({
      board: { ...a.board, title: name, createdAt: Date.now() - 26 * 3600e3, saved: { name, folder: 'Internação Clínica e Cirúrgica (Alas A, B e C)', dirty: false } },
      messages: a.messages,
    })
  }
  return out
}

let state = load()
const listeners = new Set<() => void>()

/** Histórico por análise, só nesta visita: desfazer depois de recarregar não é promessa do protótipo. */
const past = new Map<string, Board[]>()
const future = new Map<string, Board[]>()

function commit(next: State) {
  state = next
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  listeners.forEach((l) => l())
}

export function useStore(): State & { canUndo: (id: string) => boolean; canRedo: (id: string) => boolean } {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
  return { ...s, canUndo: (id) => !!past.get(id)?.length, canRedo: (id) => !!future.get(id)?.length }
}

export function createAnalysis(a: Analysis) {
  commit({ analyses: [a, ...state.analyses.filter((x) => x.board.id !== a.board.id)] })
}

const replace = (id: string, f: (a: Analysis) => Analysis) =>
  commit({ analyses: state.analyses.map((a) => (a.board.id === id ? f(a) : a)) })

/** Aplica operações ao painel, guardando o estado anterior para o desfazer. */
export function change(id: string, ops: Op[], messages: Message[] = []) {
  const cur = state.analyses.find((a) => a.board.id === id)
  if (!cur) return
  const next = ops.length ? apply(cur.board, ops) : cur.board
  if (next !== cur.board) {
    past.set(id, [...(past.get(id) ?? []), cur.board].slice(-50))
    future.set(id, [])
  }
  replace(id, (a) => ({ board: next, messages: [...a.messages, ...messages] }))
}

export function addMessages(id: string, messages: Message[]) {
  replace(id, (a) => ({ ...a, messages: [...a.messages, ...messages] }))
}

export function undo(id: string) {
  const stack = past.get(id)
  const cur = state.analyses.find((a) => a.board.id === id)
  if (!stack?.length || !cur) return
  const prev = stack[stack.length - 1]
  past.set(id, stack.slice(0, -1))
  future.set(id, [...(future.get(id) ?? []), cur.board])
  replace(id, (a) => ({ ...a, board: prev }))
}

export function redo(id: string) {
  const stack = future.get(id)
  const cur = state.analyses.find((a) => a.board.id === id)
  if (!stack?.length || !cur) return
  const nxt = stack[stack.length - 1]
  future.set(id, stack.slice(0, -1))
  past.set(id, [...(past.get(id) ?? []), cur.board])
  replace(id, (a) => ({ ...a, board: nxt }))
}

/** Publicar: quem tem o link, ou abre a pasta no portal, vê esta versão. */
export function publish(id: string, name: string, folder: string, access?: Access) {
  replace(id, (a) => ({ ...a, board: { ...a.board, title: name, saved: { name, folder, dirty: false, access } } }))
}

export function deleteAnalysis(id: string) {
  commit({ analyses: state.analyses.filter((a) => a.board.id !== id) })
}
