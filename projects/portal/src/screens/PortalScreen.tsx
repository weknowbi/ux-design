import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { useIsMobile } from '@/design/viewport'
import { type Crumb, type MenuItem } from '@/components/Header'
import { AppShell } from '@/components/AppShell'
import { Icon } from '@/components/icons'
import { FolderHeader } from '@/components/FolderHeader'
import { CONTENT_TYPES, DynamicHero, FADE, FolderBar, Hero, MobileHero, SearchField, type SectionId } from '@/components/Hero'
import { ContentBrowser } from '@/components/browser/ContentBrowser'
import { useBrowserPrefs, usePref } from '@/components/browser/prefs'
import { BrowserControls } from '@/components/browser/BrowserControls'
import {
  CardStyleContext,
  ICON_MODES,
  IconModeContext,
  ToastContext,
  type CardStyle,
  type IconMode,
} from '@/components/browser/Items'
import { useAppearances } from '@/components/browser/appearance'
import type { PortalRoute } from '@/components/PortalSidebar'
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
 * saíram do menu e continuam no código, mas a tela não lê mais a preferência
 * wk-portal-cards: usa sempre o padrão (ver `cardStyle`).
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

export function PortalScreen({ onRoute }: { onRoute: (route: PortalRoute) => void }) {
  const isMobile = useIsMobile()
  const [folderId, setFolderId] = useState(readHash)
  const [query, setQuery] = useState('')
  /** A busca que está valendo é a geral, da barra de topo (ver `topbarSearch`). */
  const [globalSearch, setGlobalSearch] = useState(false)
  const [favorites, setFavorites] = useState(() => initialFavorites(PORTAL_ROOT))
  const [layout] = usePref<Layout>('wk-portal-layout', LAYOUTS, 'dinamico')
  /* Sempre o card padrão. Os desenhos alternativos saíram do menu, mas a
     preferência wk-portal-cards continuava valendo: um navegador que guardou
     o card "atual" de testes antigos mostrava a caixa azulada e o fio sob a
     imagem, e a mesma tela parecia outra conforme quem abria. */
  const cardStyle: CardStyle = 'padrao'
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

  /* O nome que o usuário deu à pasta no card vale em toda a tela — cabeçalho e
     caminho da barra de topo inclusive. Renomear no card e a pasta continuar
     com o nome antigo lá dentro seria dizer que foram duas coisas diferentes. */
  const customized = useAppearances()
  const folderName = (f: Folder) => customized[f.id]?.name?.trim() || f.name

  const path = (folderId && findFolderPath(PORTAL_ROOT, folderId)) || []
  const atRoot = path.length === 0
  const current = atRoot ? null : path[path.length - 1]
  const dynamicHero = layout === 'dinamico' && atRoot
  /** No dinâmico, a pasta abre com a barra da home já recolhida. */
  const folderBar = layout === 'dinamico' && !atRoot

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
    setGlobalSearch(false)
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
  const toCrumb = (f: Folder): Crumb => ({ label: folderName(f), onClick: () => navigate(f.id) })
  const hidden = path.length > 1 ? path.slice(0, -1) : []
  const trail: Crumb[] = path.length === 0 ? [] : [
    { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => navigate(null) },
    ...(hidden.length
      ? [{ label: '…', collapsed: hidden.map((f) => ({ label: folderName(f), onClick: () => navigate(f.id) })) }]
      : []),
    ...path.slice(hidden.length).map(toCrumb),
  ]

  const searchScope = `Pesquise em ${CONTENT_TYPES.find((t) => t.id === section)!.label}`

  /* Duas buscas na tela, dois papéis. A da barra de topo é a busca geral do
     Weknow: procura no portal inteiro, de qualquer tela, e é a única cujos
     resultados dizem o caminho — ali o item vem de qualquer lugar, e sem o
     caminho a lista não se explica. A busca da tela ("Pesquise em Pastas",
     "Pesquise nesta pasta") filtra o que já está listado, e por isso os cards
     dela seguem sem caminho: seria o cabeçalho repetido card a card.

     Uma caixa de texto só para as duas: o que muda é quem está com ela. Quem
     digita assume a busca e o campo do outro lado se esvazia — dois campos com
     o mesmo texto e escopos diferentes diriam que a tela tem duas respostas
     para a mesma pergunta. */
  const localQuery = globalSearch ? '' : query
  const onLocalQuery = useCallback((v: string) => {
    setGlobalSearch(false)
    setQuery(v)
  }, [])
  const onGlobalQuery = useCallback((v: string) => {
    setGlobalSearch(true)
    setQuery(v)
  }, [])

  /* A barra de topo fica com a busca geral do Weknow — a que procura além do
     que está listado — sempre que a tela já tem uma busca própria: na home do
     layout dinâmico (que leva a dela para a barra recolhida ao rolar), na do
     padrão e dentro de qualquer pasta, que tem a sua no cabeçalho. Só a home
     do compacto, que não tem busca, entrega a da barra para a lista.

     Dentro da pasta a barra já mudou de função: virava "Pesquise em <pasta>"
     e quem entrava numa pasta perdia a busca geral sem aviso. */
  const topbarSearch =
    !atRoot || dynamicHero || layout === 'padrao'
      ? { value: globalSearch ? query : '', onChange: onGlobalQuery, placeholder: 'Pesquise no Weknow', global: true }
      : { value: localQuery, onChange: onLocalQuery, placeholder: searchScope }

  const controls = <BrowserControls prefs={prefs} mobile={isMobile} />

  /* Busca da pasta: o mesmo campo da home, na medida compacta, mas procura só
     na pasta aberta e nas subpastas — o título e o voltar continuam na tela, e
     os resultados são dela. O texto não leva o nome da pasta: nome de cliente
     é longo e o campo cortaria no meio dele.

     Em tela larga ela fica na linha do título, antes da ordem e da
     visualização. Abaixo de `lg` não cabe ali sem espremer o nome da pasta
     até sumir, então desce para uma linha própria logo abaixo do título. */
  const folderSearchField = (
    <SearchField query={localQuery} onQuery={onLocalQuery} placeholder="Pesquise nesta pasta" compact />
  )
  const folderAside = (
    <div className="flex items-center gap-3 shrink-0">
      <div className="hidden lg:block w-[240px] xl:w-[280px]">{folderSearchField}</div>
      {controls}
    </div>
  )

  const showToast = useCallback((text: string) => setToast({ text, at: Date.now() }), [])

  const browser = (
    <ToastContext.Provider value={showToast}>
    <CardStyleContext.Provider value={cardStyle}>
      <IconModeContext.Provider value={iconMode}>
        <ContentBrowser
          root={PORTAL_ROOT}
          path={path}
          query={query}
          favorites={favorites}
          prefs={prefs}
          section={section}
          globalSearch={globalSearch}
          controls={atRoot ? controls : undefined}
          controlsHidden={dynamicHero && heroCollapsed}
          mobile={isMobile}
          onNavigate={navigate}
          onToggleFavorite={toggleFavorite}
        />
      </IconModeContext.Provider>
    </CardStyleContext.Provider>
    </ToastContext.Provider>
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
   * Celular: uma coluna só. A moldura (`AppShell`) já troca de layout sozinha;
   * aqui muda o recheio — pb-16 para a lista terminar acima da borda, e não
   * colada nela, onde o último item cai na área do gesto de voltar do sistema.
   */
  const mobileContent = (
    <div className="flex flex-col px-4 pb-16">
      {atRoot ? (
        <MobileHero
          query={localQuery}
          onQuery={onLocalQuery}
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
                name={folderName(current)}
                onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
                aside={controls}
                compact
              />
            </div>
            <MobileHero query={localQuery} onQuery={onLocalQuery} placeholder="Pesquise nesta pasta" />
          </>
        )
      )}
      <div ref={browserRef} className="scroll-mt-4">
        {browser}
      </div>
    </div>
  )

  const desktopContent = dynamicHero ? (
    <div className="@container mx-auto flex flex-col px-8 pb-24" style={{ maxWidth: WIDE_MAX_WIDTH }}>
      <DynamicHero
        query={localQuery}
        onQuery={onLocalQuery}
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
  ) : folderBar && current ? (
    /* Dentro da pasta, a barra da home já recolhida em cima e o título da
       pasta logo abaixo (ver `FolderBar`).

       A busca procura só nesta pasta e nas subpastas, então o título e o
       voltar ficam na tela durante a busca: os resultados são dela. Se ela
       varresse o acervo, o título teria de sair, e com ele o caminho de
       volta. */
    <div className="mx-auto flex flex-col px-8 pb-24" style={{ maxWidth: WIDE_MAX_WIDTH }}>
      <FolderBar
        query={localQuery}
        onQuery={onLocalQuery}
        placeholder="Pesquise nesta pasta"
        section={section}
        onSection={openSection}
        controls={controls}
      />
      <div className="mt-4">
        <FolderHeader
          name={folderName(current)}
          onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
        />
      </div>
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
          query={localQuery}
          onQuery={onLocalQuery}
          placeholder={searchScope}
          section={section}
          onSection={openSection}
        />
      )}
      {current && (
        <div>
          <FolderHeader
            name={folderName(current)}
            onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
            aside={folderAside}
          />
          <div className="lg:hidden">{folderSearchField}</div>
        </div>
      )}
      <div ref={browserRef} className="scroll-mt-8">
        {browser}
      </div>
    </div>
  )

  return (
    <AppShell
      route="portal"
      onNavigate={(route) => {
        if (route === 'portal') navigate(null)
        else onRoute(route)
      }}
      trail={trail}
      menuItems={iconModeMenuItems(iconMode, setIconMode)}
      search={topbarSearch}
      mainRef={mainRef}
      overlay={toastBox}
    >
      {isMobile ? mobileContent : desktopContent}
    </AppShell>
  )
}
