import { useCallback, useEffect, useState } from 'react'

/**
 * Tema claro/escuro.
 *
 * O valor vive em `data-theme` no elemento raiz, e é ele que troca as
 * variáveis de `index.css`. Guardar no `localStorage` evita o pisca-pisca de
 * voltar ao claro a cada recarga.
 *
 * A escolha inicial segue o sistema quando a pessoa nunca escolheu — mas uma
 * escolha explícita manda, mesmo que o sistema mude depois. Por isso o
 * listener de `prefers-color-scheme` só age quando não há nada guardado.
 */

export type Theme = 'light' | 'dark'

const KEY = 'wk-theme'

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function stored(): Theme | null {
  const v = localStorage.getItem(KEY)
  return v === 'light' || v === 'dark' ? v : null
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme
}

/**
 * `?theme=dark` força o tema e o grava, para links compartilhados e para
 * ferramentas que abrem a página fora deste navegador (captura para o Figma,
 * por exemplo) caírem no tema certo já na primeira pintura.
 */
function fromUrl(): Theme | null {
  const v = new URLSearchParams(window.location.search).get('theme')
  return v === 'light' || v === 'dark' ? v : null
}

/** Embutido em outra página (ver `?embed` no App). */
const embedded = new URLSearchParams(window.location.search).has('embed')

/** Roda antes do React montar, para a primeira pintura já sair no tema certo. */
export function initTheme() {
  const forced = fromUrl()
  if (forced) {
    // Embutido, o tema é emprestado da página que hospeda e não é
    // escolha de ninguém aqui dentro: aplicar sem gravar, senão a
    // preferência do site de fora contaminaria o app avulso.
    if (!embedded) localStorage.setItem(KEY, forced)
    apply(forced)
    ouvirHospedeiro()
    return
  }
  apply(stored() ?? systemTheme())
  ouvirHospedeiro()
}

/**
 * Embutido, a página que hospeda avisa quando o tema dela muda.
 *
 * Mora aqui e não no `useTheme` de propósito: o `useTheme` só existe
 * enquanto o `ThemeRow` está montado, e ele fica dentro do menu do topo,
 * que quase sempre está fechado. O ouvinte precisa valer sempre.
 *
 * Só mexe no `data-theme`, sem gravar. Quando o menu abrir, o `useTheme`
 * lê o estado inicial do próprio `data-theme`, então o interruptor já
 * aparece na posição certa.
 */
function ouvirHospedeiro() {
  if (!embedded) return
  window.addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== window.location.origin) return
    const next = (e.data as { wkTheme?: string } | null)?.wkTheme
    if (next === 'light' || next === 'dark') apply(next)
  })
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (document.documentElement.dataset.theme as Theme) ?? 'light',
  )

  useEffect(() => {
    if (stored()) return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      const next = systemTheme()
      apply(next)
      setTheme(next)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const choose = useCallback((next: Theme) => {
    localStorage.setItem(KEY, next)
    apply(next)
    setTheme(next)
  }, [])

  const toggle = useCallback(() => {
    choose(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')
  }, [choose])

  return { theme, choose, toggle }
}
