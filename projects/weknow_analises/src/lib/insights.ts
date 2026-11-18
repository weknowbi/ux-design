import { useSyncExternalStore } from 'react'
import { CURRENT_USER } from '@/data/account'
import { PORTAL_ROOT, flatten } from '@/data/portal'
import { analyzeMoment, captureMoment, type Moment } from '@/engine/moment'

/**
 * As análises: o que antes era a Análise inteligente (a "fase 2" da análise
 * automática). Cada uma guarda um momento de um dashboard e o texto sobre
 * ele, escrito pela IA ou pela pessoa, com comentários e compartilhamento.
 *
 * Ela é um objeto do Weknow, como um dashboard ou uma tarefa: mora no
 * dashboard de onde veio (a lista "Análises" da barra dele) e não na conversa.
 * A conversa do Weknow Ask é um dos caminhos para criá-la e para continuar
 * perguntando sobre aquele momento; quem só lê e comenta não precisa abrir o
 * Ask.
 *
 * Fica no navegador, como as conversas (`lib/conversations`).
 */

export type InsightComment = { id: number; author: string; text: string; at: number }
export type ShareRole = 'pode ver' | 'pode comentar'
export type InsightShare = { name: string; email: string; role: ShareRole }

export type Insight = {
  id: string
  title: string
  moment: Moment
  /** Markdown. */
  text: string
  /** Quem escreveu o texto: a IA, a pedido de alguém, ou a própria pessoa. */
  by: 'ia' | 'pessoa'
  author: string
  createdAt: number
  updatedAt: number
  /** A conversa do Ask em que ela nasceu, para continuar perguntando. */
  conversation?: string
  comments: InsightComment[]
  shared: InsightShare[]
}

const KEY = 'wk-insights-v1'
let seq = Date.now()

const dashboardByName = (name: string) => flatten(PORTAL_ROOT).find((e) => e.item.kind === 'dashboard' && e.item.name === name)?.item

/** Exemplos, para a lista do dashboard já abrir com cara de uso: uma da IA, comentada, e uma escrita à mão. */
function examples(): Insight[] {
  const d = dashboardByName('Tempo de espera no PS')
  if (!d) return []
  const ago = (h: number) => Date.now() - h * 3600e3
  const m1 = { ...captureMoment(d.id, d.name, 0), at: ago(26) }
  const a1 = analyzeMoment(m1)
  const m2 = { ...captureMoment(d.id, d.name, 4), at: ago(74) }
  return [
    {
      id: `an-${(++seq).toString(36)}`,
      title: a1.title,
      moment: m1,
      text: a1.text,
      by: 'ia',
      author: 'Camila Ferraz',
      createdAt: ago(26),
      updatedAt: ago(25),
      comments: [
        { id: ++seq, author: 'Fernanda Klein', text: 'Confirmei com a coordenação: ontem a pediatria estava com um médico a menos à tarde.', at: ago(24) },
        { id: ++seq, author: 'Camila Ferraz', text: 'Obrigada! Vou acompanhar a semana que vem.', at: ago(23) },
      ],
      shared: [
        { name: 'Fernanda Klein', email: 'fernanda.klein@weknow.com.br', role: 'pode comentar' },
        { name: CURRENT_USER.name, email: CURRENT_USER.email, role: 'pode comentar' },
      ],
    },
    {
      id: `an-${(++seq).toString(36)}`,
      title: 'SUS segue concentrando o PS',
      moment: m2,
      text: 'O SUS continua com a maior parte dos atendimentos por convênio. Vou levar o número para a reunião com a Secretaria de Saúde.\n\n- Rever a meta de atendimentos SUS do contrato.',
      by: 'pessoa',
      author: 'Mariana Souza',
      createdAt: ago(74),
      updatedAt: ago(74),
      comments: [],
      shared: [{ name: CURRENT_USER.name, email: CURRENT_USER.email, role: 'pode ver' }],
    },
  ]
}

function load(): Insight[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) return list
    }
  } catch {
    /* sem armazenamento: os exemplos valem só nesta visita */
  }
  const list = examples()
  save(list)
  return list
}

function save(list: Insight[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
  } catch {
    /* idem */
  }
}

let list: Insight[] = load()
const listeners = new Set<() => void>()
function commit(next: Insight[]) {
  list = next
  save(next)
  listeners.forEach((l) => l())
}

export function useInsights() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => list,
  )
}

/** "agora", "há 5 min", "há 3 h", "ontem", "há 4 dias". */
export function ago(at: number) {
  const min = Math.round((Date.now() - at) / 60e3)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ontem' : `há ${d} dias`
}

export const insightById = (id: string) => list.find((i) => i.id === id)
export const insightsOf = (dashboard: string, all = list) => all.filter((i) => i.moment.dashboard === dashboard).sort((a, b) => b.updatedAt - a.updatedAt)

export function createInsight(p: Pick<Insight, 'title' | 'moment' | 'text' | 'by'> & { conversation?: string }): Insight {
  const now = Date.now()
  const it: Insight = { id: `an-${(++seq).toString(36)}`, author: CURRENT_USER.name, createdAt: now, updatedAt: now, comments: [], shared: [], ...p }
  commit([it, ...list])
  return it
}

export function updateInsight(id: string, set: Partial<Pick<Insight, 'title' | 'text' | 'conversation' | 'shared'>>) {
  commit(list.map((i) => (i.id === id ? { ...i, ...set, updatedAt: set.shared ? i.updatedAt : Date.now() } : i)))
}

export function addComment(id: string, text: string) {
  commit(list.map((i) => (i.id === id ? { ...i, comments: [...i.comments, { id: ++seq, author: CURRENT_USER.name, text, at: Date.now() }] } : i)))
}

export function deleteInsight(id: string) {
  commit(list.filter((i) => i.id !== id))
}
