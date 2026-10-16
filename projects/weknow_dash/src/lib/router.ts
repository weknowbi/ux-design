import { useEffect, useState } from 'react'

/**
 * Rotas no hash, como no Portal.
 *
 *   (vazio)        lista de dashboards
 *   #/novo         gerar um dashboard
 *   #/d/<id>       dashboard em edição
 *   #/ver/<id>     link publicado: só o dashboard, sem editor
 */

export type Route =
  | { name: 'home' }
  | { name: 'new' }
  | { name: 'edit'; id: string }
  | { name: 'view'; id: string }

export function parseRoute(hash: string): Route {
  const path = hash.replace(/^#/, '')
  if (/^\/novo\/?$/.test(path)) return { name: 'new' }
  const d = path.match(/^\/d\/([^/]+)\/?$/)
  if (d) return { name: 'edit', id: decodeURIComponent(d[1]) }
  const v = path.match(/^\/ver\/([^/]+)\/?$/)
  if (v) return { name: 'view', id: decodeURIComponent(v[1]) }
  return { name: 'home' }
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

/** A raiz apaga o hash em vez de deixar um `#/` pendurado. */
export function go(path: string | null) {
  if (path) window.location.hash = path
  else if (window.location.hash)
    window.history.pushState(null, '', window.location.pathname + window.location.search)
  window.dispatchEvent(new Event('popstate'))
}
