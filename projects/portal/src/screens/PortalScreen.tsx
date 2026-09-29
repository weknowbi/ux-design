import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { useSidebar } from '@/design/sidebar'
import { useIsMobile } from '@/design/viewport'
import { Header, type Crumb, type MenuItem } from '@/components/Header'
import { Icon } from '@/components/icons'
import { PortalSidebar } from '@/components/PortalSidebar'
import { SidebarBrand } from '@/components/SidebarBrand'
import { FolderHeader } from '@/components/FolderHeader'
import { CONTENT_TYPES, DynamicHero, FADE, Hero, MobileHero, type SectionId } from '@/components/Hero'
import { MobileDrawer, MobileTopBar } from '@/components/MobileNav'
import { ContentBrowser } from '@/components/browser/ContentBrowser'
import { useBrowserPrefs, usePref } from '@/components/browser/prefs'
import { BrowserControls } from '@/components/browser/BrowserControls'
import { CARD_STYLES, CardStyleContext, ICON_MODES, IconModeContext, type CardStyle, type IconMode } from '@/components/browser/Items'
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
 * O menu "…" alterna o estágio do cadastro do cliente, não o desenho do card:
 * com as pastas já configuradas, ou como a atualização entra no ar, sem nenhum
 * ícone definido ainda. Mostra sempre o modo em que você NÃO está.
 *
 * Os desenhos de card alternativos (o atual, o tingido e a Referência Márcio)
 * saíram do menu, mas continuam no código: a preferência wk-portal-cards ainda
 * os aceita pelo localStorage.
 */
const ICON_MODE_MENU: Record<IconMode, { icon: string; label: string }> = {
  definidos: { icon: 'palette', label: 'Ícones de pasta definidos' },
  indefinidos: { icon: 'folder', label: 'Ícones de pasta não definidos' },
}

function iconModeMenuItems(mode: IconMode, onChange: (m: IconMode) => void): MenuItem[] {
  return ICON_MODES.filter((m) => m !== mode).map((m) => ({
    ...ICON_MODE_MENU[m],
    onClick: () => onChange(m),
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
  const sidebar = useSidebar()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [folderId, setFolderId] = useState(readHash)
  const [query, setQuery] = useState('')
  const [favorites, setFavorites] = useState(() => initialFavorites(PORTAL_ROOT))
  const [layout] = usePref<Layout>('wk-portal-layout', LAYOUTS, 'dinamico')
  const [cardStyle] = usePref<CardStyle>('wk-portal-cards', CARD_STYLES, 'padrao')
  const [iconMode, setIconMode] = usePref<IconMode>('wk-portal-icones', ICON_MODES, 'definidos')
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

  const controls = <BrowserControls prefs={prefs} mobile={isMobile} />

  const browser = (
    <CardStyleContext.Provider value={cardStyle}>
      <IconModeContext.Provider value={iconMode}>
        <ContentBrowser
          root={PORTAL_ROOT}
          path={path}
          query={query}
          favorites={favorites}
          prefs={prefs}
          section={section}
          controls={atRoot ? controls : undefined}
          controlsHidden={dynamicHero && heroCollapsed}
          mobile={isMobile}
          onNavigate={navigate}
          onToggleFavorite={toggleFavorite}
        />
      </IconModeContext.Provider>
    </CardStyleContext.Provider>
  )

  const toastBox = (
    <div
      role="status"
      aria-live="polite"
      className={`pointer-events-none fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-lg px-4 py-3 ${FADE} ${
        toast ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ background: 'var(--wk-toast-bg)', color: 'var(--wk-toast-text)', fontFamily: FONT, fontSize: 14 }}
    >
      {toast?.text}
    </div>
  )

  /**
   * Celular: uma coluna só, sem menu ao lado.
   *
   * A folha mantém os cantos arredondados do topo, como na versão de mesa: é
   * o que separa a barra — que é da aplicação — do conteúdo, que é do
   * cliente. O que ela larga é a margem lateral, que ali só comeria largura.
   * A barra de topo fica, porque é ela que carrega o menu, a marca e a conta
   * (protótipo mobile, nó 5121:3576).
   *
   * `100dvh` e não `100vh`: no celular a barra de endereço do navegador
   * entra e sai, e com `vh` a última linha da lista fica permanentemente
   * escondida atrás dela.
   */
  if (isMobile) {
    return (
      <div
        className="flex flex-col"
        style={{ width: '100%', height: '100dvh', background: COLOR.canvas, fontFamily: FONT }}
      >
        <MobileTopBar onMenu={() => setDrawerOpen(true)} />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto min-h-0"
          style={{
            background: COLOR.surface,
            borderTopLeftRadius: LAYOUT.sheetRadius,
            borderTopRightRadius: LAYOUT.sheetRadius,
          }}
        >
          {/* pb-16: a lista termina acima da borda, e não colada nela — no
              celular o último item cai na área do gesto de voltar do sistema. */}
          <div className="flex flex-col px-4 pb-16">
            {atRoot ? (
              <MobileHero
                query={query}
                onQuery={setQuery}
                placeholder={searchScope}
                section={section}
                onSection={openSection}
              />
            ) : (
              current && (
                <>
                  {/* O nome da pasta rola junto com o conteúdo e a busca gruda
                      em cima dele: ao descer numa pasta longa, o que precisa
                      ficar à mão é o campo, não o título — para voltar basta
                      subir, e o gesto do sistema continua valendo. */}
                  <div className="pt-4">
                    <FolderHeader
                      name={current.name}
                      onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
                      aside={controls}
                      compact
                    />
                  </div>
                  <MobileHero query={query} onQuery={setQuery} placeholder={`Pesquise em ${current.name}`} />
                </>
              )
            )}
            <div ref={browserRef} className="scroll-mt-4">
              {browser}
            </div>
          </div>
        </main>

        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <PortalSidebar
            active="portal"
            onNavigate={(route) => {
              setDrawerOpen(false)
              if (route === 'portal') navigate(null)
            }}
            collapsed={false}
          />
        </MobileDrawer>

        {toastBox}
      </div>
    )
  }

  return (
    <div
      className="flex flex-col"
      style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}
    >
      {/* Faixa de topo inteira com a marca; só o menu de baixo recolhe. */}
      <div className="flex shrink-0" style={{ paddingRight: LAYOUT.sheetMarginRight }}>
        <SidebarBrand collapsed={sidebar.collapsed} onToggle={sidebar.toggle} />
        <div className="flex-1 min-w-0">
          <Header trail={trail} menuItems={iconModeMenuItems(iconMode, setIconMode)} search={topbarSearch} />
        </div>
      </div>

      <div
        className="flex flex-1 overflow-hidden relative"
        style={{ minHeight: 0, paddingRight: LAYOUT.sheetMarginRight }}
      >
        {/* As áreas de conteúdo saíram do menu lateral: os chips ficam sempre
            à mão, na barra que gruda ao rolar a home. Aqui só "Página inicial"
            navega — Ask e SQL AI são outros apps. */}
        <PortalSidebar
          active="portal"
          onNavigate={(route) => route === 'portal' && navigate(null)}
          collapsed={sidebar.collapsed}
        />

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
              {/* 32 e não 40, o vão que separa uma seção da outra: ali os 40
                  separam uma grade densa de cards do título seguinte, aqui
                  separam três pílulas leves. Vão igual ao lado de elemento leve
                  lê maior, então 32 é o que *parece* igual — com os 48 que havia
                  antes, o herói não lia como bloco à parte, lia como mais uma
                  seção com folga sobrando. */}
              <div ref={browserRef} className="mt-8 scroll-mt-24">
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

        {toastBox}
      </div>
    </div>
  )
}
