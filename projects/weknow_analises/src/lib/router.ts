import { useEffect, useState } from 'react'

/**
 * Rotas do portal, no hash, como a pasta aberta já fazia (`#/pasta/<id>`).
 *
 *   (vazio)                        portal
 *   #/pasta/<id>                   portal, dentro de uma pasta
 *   #/tarefas                      portal, na aba Tarefas
 *   #/ia                           Weknow Ask: perguntar, analisar, pedir
 *   #/ia/<id>                      uma conversa do Weknow Ask
 *   #/analise/<id>                 uma análise salva (momento, texto, comentários)
 *   #/dashboard/<id>/aba/<n>       um dashboard aberto numa aba (o momento de uma análise)
 *   #/configuracoes                índice de configurações
 *   #/configuracoes/<id>           uma tela de configuração
 *   #/dashboard/novo               criar dashboard
 *   #/dashboard/novo/de/<id>       criar dashboard já a partir de um dashboard
 *                                  (o "Criar a partir deste" de dentro dele)
 *   #/dashboard/<id>               um dashboard aberto: o criado aqui abre no
 *                                  editor com a conversa; o do acervo, na
 *                                  moldura do Weknow web
 */

export type Route =
  | { name: 'portal' }
  | { name: 'ia'; id?: string }
  | { name: 'settings' }
  | { name: 'settings-page'; page: string }
  | { name: 'new'; dashboard?: string }
  | { name: 'dashboard'; id: string; tab?: number }
  | { name: 'insight'; id: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const ia = path.match(/^\/ia(?:\/([^/]+))?\/?$/)
  if (ia) return { name: 'ia', id: ia[1] ? decodeURIComponent(ia[1]) : undefined }
  const an = path.match(/^\/analise\/([^/]+)\/?$/)
  if (an) return { name: 'insight', id: decodeURIComponent(an[1]) }
  const tabbed = path.match(/^\/dashboard\/([^/]+)\/aba\/(\d+)\/?$/)
  if (tabbed) return { name: 'dashboard', id: decodeURIComponent(tabbed[1]), tab: Number(tabbed[2]) }
  const n = path.match(/^\/dashboard\/novo(?:\/de\/([^/]+))?\/?$/)
  if (n) return { name: 'new', dashboard: n[1] ? decodeURIComponent(n[1]) : undefined }
  const dash = path.match(/^\/dashboard\/([^/]+)\/?$/)
  if (dash) return { name: 'dashboard', id: decodeURIComponent(dash[1]) }
  const m = path.match(/^\/configuracoes(?:\/([^/]+))?\/?$/)
  if (!m) return { name: 'portal' }
  return m[1] ? { name: 'settings-page', page: decodeURIComponent(m[1]) } : { name: 'settings' }
}

/**
 * Trava de saída: a tela que tem trabalho por publicar (o editor) pergunta
 * antes de deixar sair. Ela recebe o "sair" e devolve `true` se segurou a
 * navegação (e vai chamar o "sair" quando a pessoa confirmar), ou `false`
 * para deixar passar. Vale para o `go` e para o voltar do navegador. `target`
 * é o hash para onde se vai.
 */
type LeaveGuard = (leave: () => void, target: string) => boolean
let guard: LeaveGuard | null = null
/** O endereço da tela que está aberta, para desfazer um voltar que a trava segurou. */
let shown = window.location.href

/**
 * Por onde a pessoa passou, em hashes. É o que faz a seta "Voltar" de qualquer
 * tela voltar para a tela anterior, e não para o pai dela: quem abriu um
 * dashboard pela conversa volta para a conversa, e não para o portal. Fica na
 * sessão para recarregar a página não perder o caminho.
 */
const STACK_KEY = 'wk-nav'
let stack: string[] = (() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STACK_KEY) ?? '[]') as string[]
    if (saved[saved.length - 1] === window.location.hash) return saved
  } catch {
    /* sem armazenamento: o caminho começa aqui */
  }
  return [window.location.hash]
})()
/** A próxima tela substitui a atual no caminho, em vez de somar a ela. */
let replaceTop = false

function remember(hash: string) {
  if (replaceTop) stack[stack.length - 1] = hash
  else if (stack[stack.length - 2] === hash) stack.pop()
  else stack.push(hash)
  replaceTop = false
  stack = stack.slice(-50)
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack))
  } catch {
    /* sem armazenamento: vale enquanto a página está aberta */
  }
}

export function setLeaveGuard(g: LeaveGuard) {
  guard = g
  return () => {
    if (guard === g) guard = null
  }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))

  useEffect(() => {
    const sync = () => {
      const target = window.location.href
      if (target === shown) {
        replaceTop = false
        return
      }
      /* Voltar do navegador com a trava armada: o endereço já mudou, então
         ele volta para o da tela aberta enquanto a pergunta está na tela. */
      const g = guard
      if (g) {
        const leave = () => {
          guard = null
          window.history.pushState(null, '', target)
          window.dispatchEvent(new Event('popstate'))
        }
        if (g(leave, window.location.hash)) {
          window.history.pushState(null, '', shown)
          return
        }
      }
      shown = target
      remember(window.location.hash)
      setRoute(parseRoute(window.location.hash))
    }
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  return route
}

/**
 * Vai para uma rota. A raiz apaga o hash em vez de virar `#/`: um hash vazio
 * pendurado na barra de endereço não diz nada e ainda atrapalha o voltar.
 */
export function go(path: string | null) {
  leaveTo(path, false)
}

/**
 * A seta "Voltar": a tela anterior. Sem anterior (a tela abriu direto, por um
 * link), vai para `fallback`, o pai dela, que toma o lugar da atual: senão a
 * seta do pai traria de volta para cá.
 */
export function goBack(fallback: string | null) {
  const prev = stack[stack.length - 2]
  if (prev === undefined) leaveTo(fallback, true)
  else leaveTo(prev.replace(/^#/, '') || null, false)
}

/** Troca de tela sem somar ao caminho: abas da mesma tela, ou o "novo" que vira a conversa. */
export function replace(path: string) {
  replaceTop = true
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#${path}`)
  window.dispatchEvent(new Event('popstate'))
}

function leaveTo(path: string | null, replacing: boolean) {
  const run = () => {
    replaceTop = replacing
    navigate(path)
  }
  const g = guard
  if (g && g(() => ((guard = null), run()), path ? `#${path}` : '')) return
  run()
}

function navigate(path: string | null) {
  if (path) window.location.hash = path
  else if (window.location.hash)
    window.history.pushState(null, '', window.location.pathname + window.location.search)
  // `pushState` não dispara `popstate`: quem chama precisa avisar a tela.
  window.dispatchEvent(new Event('popstate'))
}
