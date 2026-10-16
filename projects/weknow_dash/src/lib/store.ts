import { useSyncExternalStore } from 'react'
import { plan } from '@/engine/planner'
import { loadMetadado, sourceFromCsv } from '@/engine/sources'
import type { DashboardSpec, Source } from '@/engine/types'

/**
 * Os dashboards da pessoa, guardados no navegador.
 *
 * Cada edição vira uma versão, e a versão publicada é uma marca nessa lista —
 * não uma cópia. É o que resolve o vaivém do vídeo (despublicar, gerar "um
 * novo artefato", publicar de novo e trocar o link): aqui o link é um só,
 * para sempre, e "Publicar alterações" só move a marca para a versão atual.
 * Quem está com o link aberto vê a versão publicada; quem edita vê o
 * rascunho; um não atrapalha o outro.
 */

export type Author = 'gerado' | 'ia' | 'voce'

export type Version = { spec: DashboardSpec; at: number; note: string; author: Author; prompt?: string }

export type SourceRef = { kind: 'metadado'; id: string } | { kind: 'arquivo'; key: string; name: string }

export type Dashboard = {
  id: string
  sourceRef: SourceRef
  versions: Version[]
  /** Índice da versão em edição — desfazer anda para trás nesta lista. */
  current: number
  published: { version: number; at: number } | null
  createdAt: number
}

export type ChatEntry =
  | { role: 'user'; text: string; at: number }
  | { role: 'ai'; at: number; applied: string[]; rejected: { text: string; reason: string }[]; notes: { kind: string; text: string }[]; version?: number }

const KEY = 'wk-dash-v1'
const CHAT_KEY = 'wk-dash-chat-v1'
const FILE_PREFIX = 'wk-dash-file:'

type State = { dashboards: Dashboard[]; chats: Record<string, ChatEntry[]> }

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* Cota cheia ou navegação privada: o protótipo segue, só não lembra. */
  }
}

/* Rascunhos da primeira versão nasciam "Vendas — visão geral". O título
   gerado agora é só o nome da origem; os antigos perdem o sufixo ao abrir. */
const renamed = (d: Dashboard): Dashboard => ({
  ...d,
  versions: d.versions.map((v) => (v.spec.title.endsWith(' — visão geral') ? { ...v, spec: { ...v.spec, title: v.spec.title.replace(/ — visão geral$/, '') } } : v)),
})

let state: State = { dashboards: read<Dashboard[]>(KEY, []).map(renamed), chats: read<Record<string, ChatEntry[]>>(CHAT_KEY, {}) }
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  write(KEY, state.dashboards)
  write(CHAT_KEY, state.chats)
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useDashboards() {
  return useSyncExternalStore(subscribe, () => state.dashboards)
}

export function useDashboard(id: string | null) {
  return useSyncExternalStore(subscribe, () => (id ? state.dashboards.find((d) => d.id === id) ?? null : null))
}

export function useChat(id: string) {
  return useSyncExternalStore(subscribe, () => state.chats[id] ?? EMPTY)
}
const EMPTY: ChatEntry[] = []

/* ── Origens ──────────────────────────────────────────────────────────────── */

const files = new Map<string, Source>()

export function registerFile(source: Source, text: string): SourceRef {
  const key = source.id
  files.set(key, source)
  // Guarda o CSV se couber, para o dashboard sobreviver a um F5.
  if (text.length < 2_500_000) write(FILE_PREFIX + key, { name: source.group, text })
  return { kind: 'arquivo', key, name: source.group }
}

export function resolveSource(ref: SourceRef): Source | null {
  if (ref.kind === 'metadado') return loadMetadado(ref.id)
  const hit = files.get(ref.key)
  if (hit) return hit
  const saved = read<{ name: string; text: string } | null>(FILE_PREFIX + ref.key, null)
  if (!saved) return null
  const src = { ...sourceFromCsv(saved.name, saved.text), id: ref.key }
  files.set(ref.key, src)
  return src
}

/* ── Operações ────────────────────────────────────────────────────────────── */

const uid = () => Math.random().toString(36).slice(2, 9)

export function createDashboard(sourceRef: SourceRef, spec: DashboardSpec, prompt?: string): string {
  const id = uid()
  const d: Dashboard = {
    id,
    sourceRef,
    versions: [{ spec, at: Date.now(), note: 'Dashboard gerado', author: 'gerado', prompt }],
    current: 0,
    published: null,
    createdAt: Date.now(),
  }
  set({ ...state, dashboards: [d, ...state.dashboards] })
  return id
}

function update(id: string, fn: (d: Dashboard) => Dashboard) {
  set({ ...state, dashboards: state.dashboards.map((d) => (d.id === id ? fn(d) : d)) })
}

/** Nova versão depois da atual; o que estava "à frente" (refazer) se perde. */
export function commit(id: string, spec: DashboardSpec, note: string, author: Author, prompt?: string): number {
  let index = 0
  update(id, (d) => {
    const versions = [...d.versions.slice(0, d.current + 1), { spec, at: Date.now(), note, author, prompt }]
    index = versions.length - 1
    // Versão publicada que ficou "à frente" e foi descartada: a marca volta
    // para a última que ainda existe, para o link não apontar para o nada.
    const published = d.published && d.published.version >= versions.length ? { ...d.published, version: d.current } : d.published
    return { ...d, versions, current: index, published }
  })
  return index
}

export function goToVersion(id: string, index: number) {
  update(id, (d) => ({ ...d, current: Math.max(0, Math.min(index, d.versions.length - 1)) }))
}

export function publish(id: string) {
  update(id, (d) => ({ ...d, published: { version: d.current, at: Date.now() } }))
}

export function unpublish(id: string) {
  update(id, (d) => ({ ...d, published: null }))
}

export function removeDashboard(id: string) {
  const chats = { ...state.chats }
  delete chats[id]
  set({ dashboards: state.dashboards.filter((d) => d.id !== id), chats })
}

export function pushChat(id: string, entry: ChatEntry) {
  set({ ...state, chats: { ...state.chats, [id]: [...(state.chats[id] ?? []), entry] } })
}

export const currentSpec = (d: Dashboard) => d.versions[d.current].spec
export const publishedSpec = (d: Dashboard) => (d.published ? d.versions[Math.min(d.published.version, d.versions.length - 1)].spec : null)
export const hasUnpublished = (d: Dashboard) => !!d.published && d.published.version !== d.current

export const shareUrl = (id: string) => `${window.location.origin}${window.location.pathname}#/ver/${id}`

/**
 * Primeiro acesso: um dashboard de exemplo, para a lista não abrir vazia e a
 * pessoa ver o resultado antes de ter de criar o seu.
 */
export function seedIfEmpty() {
  if (state.dashboards.length || read<boolean>('wk-dash-seeded', false)) return
  const src = loadMetadado('vendas')
  if (!src) return
  createDashboard({ kind: 'metadado', id: 'vendas' }, plan(src))
  write('wk-dash-seeded', true)
}
