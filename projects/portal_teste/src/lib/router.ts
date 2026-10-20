import { useEffect, useState } from 'react'

/**
 * Rotas do portal — no hash, como a pasta aberta já fazia (`#/pasta/<id>`).
 *
 * Não é um roteador: é o mínimo para que Configurações tenha endereço
 * próprio. Sem isso, entrar em Configurações e apertar o voltar do navegador
 * sairia do site em vez de voltar ao portal — e o link de uma tela de
 * administração não poderia ser colado num chamado de suporte.
 *
 *   (vazio)                  portal
 *   #/pasta/<id>             portal, dentro de uma pasta
 *   #/configuracoes          índice de configurações
 *   #/configuracoes/<id>     uma tela de configuração
 */

export type Route =
  | { name: 'portal' }
  | { name: 'settings' }
  | { name: 'settings-page'; page: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '')
  const m = path.match(/^\/configuracoes(?:\/([^/]+))?\/?$/)
  if (!m) return { name: 'portal' }
  return m[1] ? { name: 'settings-page', page: decodeURIComponent(m[1]) } : { name: 'settings' }
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))

  useEffect(() => {
    const sync = () => setRoute(parseRoute(window.location.hash))
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
  if (path) window.location.hash = path
  else if (window.location.hash)
    window.history.pushState(null, '', window.location.pathname + window.location.search)
  // `pushState` não dispara `popstate`: quem chama precisa avisar a tela.
  window.dispatchEvent(new Event('popstate'))
}
