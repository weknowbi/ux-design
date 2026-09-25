import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { Header, type Crumb, type MenuItem } from '@/components/Header'
import { Icon } from '@/components/icons'
import { PortalSidebar } from '@/components/PortalSidebar'
import { FolderHeader } from '@/components/FolderHeader'
import { CONTENT_TYPES, DynamicHero, FADE, Hero, type SectionId } from '@/components/Hero'
import { ContentBrowser } from '@/components/browser/ContentBrowser'
import { useBrowserPrefs, usePref } from '@/components/browser/prefs'
import { BrowserControls } from '@/components/browser/BrowserControls'
import { CARD_STYLES, CardStyleContext, type CardStyle } from '@/components/browser/Items'
import { PORTAL_ROOT, findFolderPath, initialFavorites, type Folder } from '@/data/portal'

/** Espec. do frame `home` (WP-832): conteúdo de 1159px centrado na coluna de 1617. */
const CONTENT_WIDTH = 1159
/** Largura total da folha; o teto só evita grades absurdas em ultrawide. */
const WIDE_MAX_WIDTH = 1760

/**
 * Layouts em teste. A alternância saiu do menu "…"; o que estiver salvo na
 * preferência continua valendo, e o padrão é o dinâmico:
 * - dinâmico: como a home do Drive — saudação, busca grande e chips no topo;
 *   ao rolar, a busca sobe para a barra de topo. Dentro de pasta não há
 *   saudação e a busca já nasce na barra;
 * - padrão: saudação, busca grande e chips sempre, conteúdo em 1159px (nó `home`);
 * - compacto: sem saudação, Pastas/Tarefas/Apresentações no menu lateral e a
 *   busca sempre na barra de topo.
 */
type Layout = 'dinamico' | 'padrao' | 'compacto'
const LAYOUTS: Layout[] = ['dinamico', 'padrao', 'compacto']

/**
 * Alternância de teste nossa, não do cliente: mora no menu "…" com as outras
 * preferências, e a barra fica com o que o usuário realmente usa.
 */
const CARD_STYLE_MENU: Record<CardStyle, { icon: string; label: string }> = {
  atual: { icon: 'grid_view', label: 'Cards atuais (teste)' },
  limpo: { icon: 'auto_awesome', label: 'Cards limpos (teste)' },
  referencia: { icon: 'palette', label: 'Referência Márcio (teste)' },
}

/** O menu oferece os outros dois estilos; o que está em uso fica de fora. */
function cardStyleMenuItems(style: CardStyle, onChange: (s: CardStyle) => void): MenuItem[] {
  return CARD_STYLES.filter((s) => s !== style).map((s) => ({
    ...CARD_STYLE_MENU[s],
    onClick: () => onChange(s),
  }))
}

/**
 * A pasta aberta vive na URL (`#/pasta/<id>`): o voltar do navegador sobe um
 * nível e o link da pasta pode ser compartilhado.
 */
function readHash(): string | null {
  const m = window.location.hash.match(/^#\/pasta\/([^/]+)$/)
  return m ? decodeURIComponent(m[1]) : null
}

export function PortalScreen() {
  const [folderId, setFolderId] = useState(readHash)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(() => initialFavorites(PORTAL_ROOT))
  const [layout] = usePref<Layout>('wk-portal-layout', LAYOUTS, 'dinamico')
  const [cardStyle, setCardStyle] = usePref<CardStyle>('wk-portal-cards', CARD_STYLES, 'atual')
  const [heroCollapsed, setHeroCollapsed] = useState(false)
  const [section, setSection] = useState<SectionId>('pastas')
  const prefs = useBrowserPrefs()
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null)
  const mainRef = useRef<HTMLElement>(null)
  const browserRef = useRef<HTMLDivElement>(null)

  /* Trocar de área volta para a raiz: Tarefas e Apresentações não têm pasta,
     e voltar depois para Pastas dentro de uma subpasta antiga seria confuso. */
  const openSection = useCallback((id: SectionId) => {
    setSection(id)
    navigate(null)
  }, [])

  const path = (folderId && findFolderPath(PORTAL_ROOT, folderId)) || []
  const atRoot = path.length === 0
  const current = atRoot ? null : path[path.length - 1]
  const dynamicHero = layout === 'dinamico' && atRoot

  // Aviso curto de favorito, como no Weknow: aparece, fica ~2,5s e some.
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    const sync = () => setFolderId(readHash())
    window.addEventListener('hashchange', sync)
    window.addEventListener('popstate', sync)
    return () => {
      window.removeEventListener('hashchange', sync)
      window.removeEventListener('popstate', sync)
    }
  }, [])

  // Ao trocar de pasta, o conteúdo precisa ficar à vista — mas sem voltar ao
  // topo se ele já estiver na tela.
  useEffect(() => {
    const main = mainRef.current
    const nav = browserRef.current
    if (main && nav && nav.getBoundingClientRect().top < main.getBoundingClientRect().top) {
      nav.scrollIntoView({ block: 'start' })
    }
  }, [folderId])

  const navigate = useCallback((id: string | null) => {
    setQuery('')
    if (id) window.location.hash = `/pasta/${encodeURIComponent(id)}`
    else if (window.location.hash) window.history.pushState(null, '', window.location.pathname + window.location.search)
    setFolderId(id)
  }, [])

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      setToast({ text: next.has(id) ? 'Item adicionado aos favoritos' : 'Item removido dos favoritos', at: Date.now() })
      return next
    })
  }, [])

  /* Caminho na barra de topo, no padrão do design (nó 5132:3761):
     [ícone do item do menu] › subitem › páginas.
     Nome de pasta de cliente é longo e a barra tem uma linha só: só a pasta
     atual aparece por extenso, e os níveis acima dela recolhem em "…", que
     lista os nomes completos.
     Na home não há caminho a mostrar — o breadcrumb só aparece depois que o
     usuário entra em alguma pasta. */
  const toCrumb = (f: Folder): Crumb => ({ label: f.name, onClick: () => navigate(f.id) })
  const hidden = path.length > 1 ? path.slice(0, -1) : []
  const trail: Crumb[] = path.length === 0 ? [] : [
    { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => navigate(null) },
    ...(hidden.length
      ? [{ label: '…', collapsed: hidden.map((f) => ({ label: f.name, onClick: () => navigate(f.id) })) }]
      : []),
    ...path.slice(hidden.length).map(toCrumb),
  ]

  const searchScope = `Pesquise em ${CONTENT_TYPES.find((t) => t.id === section)!.label}`

  /* A barra de topo fica com a busca geral do Weknow — a que procura além do
     que está listado — sempre que a tela já tem uma busca própria: na home do
     layout dinâmico (que leva a dela para a barra recolhida ao rolar) e na do
     padrão. Dentro de pasta a tela não tem busca, então a da barra assume e
     diz em que pasta procura. */
  const topbarSearch =
    dynamicHero || (layout === 'padrao' && atRoot)
      ? undefined
      : {
          value: query,
          onChange: setQuery,
          placeholder: current ? `Pesquise em ${current.name}` : searchScope,
        }

  const controls = <BrowserControls prefs={prefs} />

  const browser = (
    <CardStyleContext.Provider value={cardStyle}>
      <ContentBrowser
        root={PORTAL_ROOT}
        path={path}
        query={query}
        favorites={favorites}
        prefs={prefs}
        section={section}
        controls={atRoot ? controls : undefined}
        controlsHidden={dynamicHero && heroCollapsed}
        onNavigate={navigate}
        onToggleFavorite={toggleFavorite}
      />
    </CardStyleContext.Provider>
  )

  return (
    <div className="flex" style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}>
      {/* As áreas de conteúdo saíram do menu lateral: os chips agora ficam
          sempre à mão, na barra que gruda ao rolar a home. */}
      <PortalSidebar active="portal" onNavigate={() => navigate(null)} />

      <div className="flex-1 flex flex-col min-w-0 relative" style={{ minHeight: 0, paddingRight: LAYOUT.sheetMarginRight }}>
        <Header trail={trail} menuItems={cardStyleMenuItems(cardStyle, setCardStyle)} search={topbarSearch} />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto [scrollbar-gutter:stable] bg-[var(--wk-surface)] min-w-0"
          style={{ borderTopLeftRadius: LAYOUT.sheetRadius, borderTopRightRadius: LAYOUT.sheetRadius }}
        >
          {dynamicHero ? (
            <div className="mx-auto flex flex-col px-8 pb-24" style={{ maxWidth: WIDE_MAX_WIDTH }}>
              <DynamicHero
                query={query}
                onQuery={setQuery}
                placeholder={searchScope}
                section={section}
                onSection={openSection}
                scrollRef={mainRef}
                onCollapsedChange={setHeroCollapsed}
                controls={controls}
              />
              {/* Mais folga entre os chips e a lista: grudada, a busca ocupa
                  a faixa do título, e a lista encostada nela ficava apertada. */}
              <div ref={browserRef} className="mt-12 scroll-mt-24">
                {browser}
              </div>
            </div>
          ) : (
            <div
              className={`mx-auto flex flex-col gap-8 pb-24 ${layout === 'padrao' ? 'px-6 pt-16' : 'px-8 pt-8'}`}
              style={{ maxWidth: layout === 'padrao' ? CONTENT_WIDTH : WIDE_MAX_WIDTH }}
            >
              {layout === 'padrao' && atRoot && (
                <Hero
                  query={query}
                  onQuery={setQuery}
                  placeholder={searchScope}
                  section={section}
                  onSection={openSection}
                />
              )}
              {current && (
                <FolderHeader
                  name={current.name}
                  onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
                  aside={controls}
                />
              )}
              <div ref={browserRef} className="scroll-mt-8">
                {browser}
              </div>
            </div>
          )}
        </main>

        <div
          role="status"
          aria-live="polite"
          className={`pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 rounded-lg px-4 py-3 ${FADE} ${
            toast ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ background: 'var(--wk-toast-bg)', color: 'var(--wk-toast-text)', fontFamily: FONT, fontSize: 14 }}
        >
          {toast?.text}
        </div>
      </div>
    </div>
  )
}
