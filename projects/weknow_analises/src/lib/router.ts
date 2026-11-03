import { useEffect, useState } from 'react'

/**
 * Rotas do portal, no hash, como a pasta aberta já fazia (`#/pasta/<id>`).
 *
 *   (vazio)                        portal
 *   #/pasta/<id>                   portal, dentro de uma pasta
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
  | { name: 'settings' }
  | { name: 'settings-page'; page: string }
  | { name: 'new'; dashboard?: string }
  | { name: 'dashboard'; id: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '')
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
 * para deixar passar. Vale para o `go` e para o voltar do navegador.
 */
type LeaveGuard = (leave: () => void) => boolean
let guard: LeaveGuard | null = null
/** O endereço da tela que está aberta, para desfazer um voltar que a trava segurou. */
let shown = window.location.href

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
      if (target === shown) return
      /* Voltar do navegador com a trava armada: o endereço já mudou, então
         ele volta para o da tela aberta enquanto a pergunta está na tela. */
      const g = guard
      if (g) {
        const leave = () => {
          guard = null
          window.history.pushState(null, '', target)
          window.dispatchEvent(new Event('popstate'))
        }
        if (g(leave)) {
          window.history.pushState(null, '', shown)
          return
        }
      }
      shown = target
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
  const g = guard
  if (g && g(() => ((guard = null), navigate(path)))) return
  navigate(path)
}

function navigate(path: string | null) {
  if (path) window.location.hash = path
  else if (window.location.hash)
    window.history.pushState(null, '', window.location.pathname + window.location.search)
  // `pushState` não dispara `popstate`: quem chama precisa avisar a tela.
  window.dispatchEvent(new Event('popstate'))
}
