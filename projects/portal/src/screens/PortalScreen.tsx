import { useCallback, useEffect, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { useIsMobile } from '@/design/viewport'
import { type Crumb, type MenuItem } from '@/components/Header'
import { AppShell } from '@/components/AppShell'
import { Icon } from '@/components/icons'
import { FolderHeader } from '@/components/FolderHeader'
import { DynamicHero, FADE, FolderBar, Hero, MobileHero, type SectionId } from '@/components/Hero'
import { ContentBrowser } from '@/components/browser/ContentBrowser'
import { useBrowserPrefs, usePref } from '@/components/browser/prefs'
import { BrowserControls } from '@/components/browser/BrowserControls'
import {
  CardStyleContext,
  DashThumbContext,
  FolderEditButton,
  FolderMark,
  ICON_MODES,
  IconModeContext,
  ToastContext,
  type CardStyle,
  type DashThumb,
  type IconMode,
} from '@/components/browser/Items'
import { useAppearances } from '@/components/browser/appearance'
import type { PortalRoute } from '@/components/PortalSidebar'
import { PORTAL_ROOT, findFolderPath, initialFavorites, type Folder } from '@/data/portal'
import { createFolder, useFolderRevision } from '@/data/newFolders'
import { NewFolderButton } from '@/components/browser/NewFolderButton'
import { PromptModal } from '@/components/PromptModal'

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

/** O botão "Nova pasta" saiu da tela por enquanto; o resto do fluxo fica pronto. */
const NEW_FOLDER = false

/* A busca da barra de topo procura no acervo, de qualquer tela. */
const SEARCH_PLACEHOLDER = 'Pesquise por nome ou tag'

/* A da folha procura só na aba aberta, e o texto diz qual: é ele que
   explica por que, em Tarefas, um painel não aparece no resultado. */
const SECTION_PLACEHOLDER: Record<SectionId, string> = {
  pastas: SEARCH_PLACEHOLDER,
  tarefas: 'Pesquise por tarefas',
  apresentacoes: 'Pesquise por apresentações',
}

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

/* Dashboard sem imagem mostra o croqui do layout. A alternativa com o ícone
   saiu do menu "…": o croqui ficou. */
const DASH_THUMB: DashThumb = 'croqui'

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
  /** A busca que está valendo é a da barra de topo (ver `topbarSearch`). */
  const [globalSearch, setGlobalSearch] = useState(false)
  const [favorites, setFavorites] = useState(() => initialFavorites(PORTAL_ROOT))
  const [layout] = usePref<Layout>('wk-portal-layout', LAYOUTS, 'dinamico')
  /* Sempre o card padrão. Os desenhos alternativos saíram do menu, mas a
     preferência wk-portal-cards continuava valendo: um navegador que guardou
     o card "atual" de testes antigos mostrava a caixa azulada e o fio sob a
     imagem, e a mesma tela parecia outra conforme quem abria. */
  const cardStyle: CardStyle = 'padrao'
  const [heroCollapsed, setHeroCollapsed] = useState(false)
  const [openTab, setSection] = useState<SectionId>('pastas')
  const [iconMode, setIconMode] = usePref<IconMode>('wk-portal-icones', ICON_MODES, 'definidos')
  const prefs = useBrowserPrefs()
  const [toast, setToast] = useState<{ text: string; at: number } | null>(null)
  /** O modal de "Nova pasta" está aberto. */
  const [creating, setCreating] = useState(false)
  const folderRevision = useFolderRevision()
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
  /* Tarefas e Apresentações não têm pasta: dentro de uma, a aba é Pastas.
     A escolhida fica guardada para a volta à home — sem isto, abrir uma
     pasta pelo voltar do navegador, com Tarefas acesa, listava as tarefas
     sob o nome da pasta. */
  const section: SectionId = atRoot ? openTab : 'pastas'
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
  /* Dentro da pasta, o cabeçalho mostra o ícone que ela tem no card e o lápis
     que abre o mesmo painel de editar do ⋮. A chave é a pasta: ao descer para
     uma subpasta, o lápis não herda o rascunho da de cima. */
  const folderHeaderParts = (f: Folder, compact = false) => ({
    mark: <FolderMark item={f} />,
    action: <FolderEditButton key={f.id} item={f} compact={compact} />,
  })

  const toCrumb = (f: Folder): Crumb => ({ label: folderName(f), onClick: () => navigate(f.id) })
  const hidden = path.length > 1 ? path.slice(0, -1) : []
  const pathTrail: Crumb[] = path.length === 0 ? [] : [
    { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => navigate(null) },
    ...(hidden.length
      ? [{ label: '…', collapsed: hidden.map((f) => ({ label: folderName(f), onClick: () => navigate(f.id) })) }]
      : []),
    ...path.slice(hidden.length).map(toCrumb),
  ]

  /* Uma busca por tela, e cada uma com o seu alcance:

     - a da folha só existe na home. Procura na aba aberta — o texto do campo
       muda com ela — e o resultado entra no lugar das seções, com a busca e
       os chips ainda em cima;
     - a da barra de topo é a de dentro da pasta (e a do compacto, que não
       tem herói). Varre o acervo e troca a folha inteira pelo resultado;
       apagar o texto devolve a pasta onde o usuário estava.

     Enquanto a home está aberta a barra recolhe a sua: duas caixas na mesma
     tela, parecidas e com escopos diferentes, deixavam o usuário sem saber
     qual usar. */
  const sheetQuery = globalSearch ? '' : query
  const topQuery = globalSearch ? query : ''
  const onSheetQuery = useCallback((v: string) => {
    setGlobalSearch(false)
    setQuery(v)
  }, [])
  const onTopQuery = useCallback((v: string) => {
    setGlobalSearch(true)
    setQuery(v)
  }, [])
  /** A folha mostra o resultado da barra de topo no lugar do que estava aberto. */
  const results = globalSearch && query.trim() !== ''

  /* O resultado tem página própria, e o caminho diz isso: casa › Resultado
     da pesquisa. A casa sai da busca e volta à home, como em qualquer pasta. */
  const trail: Crumb[] = results
    ? [
        { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => navigate(null) },
        { label: 'Resultado da pesquisa' },
      ]
    : pathTrail

  // O resultado começa do alto, e não da rolagem da pasta de onde ele veio.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 })
  }, [results])

  /* A home tem busca no meio da tela no dinâmico, no padrão e no celular — e
     é lá que ela fica. O compacto não tem herói nenhum. */
  const heroAtRoot = atRoot && !results && (isMobile || dynamicHero || layout === 'padrao')

  /* Escondida, e não ausente: o campo sai de vista mas guarda o lugar dele na
     barra, senão o caminho e o menu da conta dançariam ao entrar e sair de uma
     pasta. */
  const topbarSearch = { value: topQuery, onChange: onTopQuery, placeholder: SEARCH_PLACEHOLDER, hidden: heroAtRoot }

  /* "Nova pasta" vem antes da ordem e da visualização, na home e dentro de
     pasta, sempre no mesmo lugar. Fica fora de Tarefas e Apresentações, que
     não têm pasta, e do resultado da busca, que não é lugar nenhum. Desligado
     por enquanto (NEW_FOLDER): as pastas já criadas continuam aparecendo. */
  const canCreate = NEW_FOLDER && section === 'pastas' && !results
  /* Ordem e visualização são do acervo de pastas. Tarefas e Apresentações
     são uma tabela fixa no Weknow — sempre em lista, na ordem do código —,
     então ali não há o que escolher e os controles saem. */
  const controls =
    section === 'pastas' || results ? (
      <div className="flex items-center">
        {canCreate && <NewFolderButton mobile={isMobile} onClick={() => setCreating(true)} />}
        <BrowserControls prefs={prefs} mobile={isMobile} />
      </div>
    ) : undefined
  const sheetPlaceholder = SECTION_PLACEHOLDER[section]
  const resultsHeader = (compact?: boolean) => (
    <FolderHeader name="Resultado da pesquisa" icon="search" aside={controls} compact={compact} />
  )

  const showToast = useCallback((text: string) => setToast({ text, at: Date.now() }), [])

  /* A pasta nova entra no fim da lista, que na home pode estar duas telas
     abaixo. Sem levar a pessoa até ela, o "criada" do aviso não teria nada
     para mostrar: a tela rola até a pasta e a contorna por um instante. */
  const createIn = (name: string) => {
    const id = createFolder(current?.id ?? null, name)
    showToast(`Pasta "${name}" criada`)
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-item="${id}"]`)
      if (!el) return
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' })
      el.animate(
        [{ boxShadow: '0 0 0 2px var(--wk-primary)' }, { boxShadow: '0 0 0 2px transparent' }],
        { duration: still ? 0 : 2000, easing: 'ease-in', delay: still ? 0 : 300 },
      )
    })
  }

  const browser = (
    <CardStyleContext.Provider value={cardStyle}>
      <DashThumbContext.Provider value={DASH_THUMB}>
        <ContentBrowser
          root={PORTAL_ROOT}
          path={path}
          query={query}
          favorites={favorites}
          prefs={prefs}
          section={section}
          globalSearch={results}
          controls={atRoot && !results ? controls : undefined}
          controlsHidden={dynamicHero && heroCollapsed}
          mobile={isMobile}
          revision={folderRevision}
          onNavigate={navigate}
          onToggleFavorite={toggleFavorite}
        />
      </DashThumbContext.Provider>
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
   * Celular: uma coluna só. A moldura (`AppShell`) já troca de layout sozinha;
   * aqui muda o recheio — pb-16 para a lista terminar acima da borda, e não
   * colada nela, onde o último item cai na área do gesto de voltar do sistema.
   */
  const mobileContent = (
    <div className="flex flex-col px-4 pb-16">
      {atRoot && !results ? (
        <MobileHero
          query={sheetQuery}
          onQuery={onSheetQuery}
          placeholder={sheetPlaceholder}
          section={section}
          onSection={openSection}
        />
      ) : (
        <>
          {/* O nome da pasta rola junto com o conteúdo e a busca gruda
              em cima dele: ao descer numa pasta longa, o que precisa
              ficar à mão é o campo, não o título — para voltar basta
              subir, e o gesto do sistema continua valendo.

              A barra de topo do celular não tem lugar para a busca, então
              ela mora aqui — mas é a da barra: varre o acervo e troca a
              pasta pelo resultado. As três peças ficam sempre na mesma
              ordem para o campo não ser recriado, e perder o foco, quando
              o resultado entra. */}
          {!results && current && (
            <div className="pt-4">
              <FolderHeader
                name={folderName(current)}
                onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
                aside={controls}
                compact
                {...folderHeaderParts(current, true)}
              />
            </div>
          )}
          <MobileHero query={topQuery} onQuery={onTopQuery} placeholder={SEARCH_PLACEHOLDER} />
          {results && resultsHeader(true)}
        </>
      )}
      <div ref={browserRef} className="scroll-mt-4">
        {browser}
      </div>
    </div>
  )

  const desktopContent = results ? (
    <div className="mx-auto w-full flex flex-col px-8 pt-8 pb-24" style={{ maxWidth: WIDE_MAX_WIDTH }}>
      {resultsHeader()}
      <div ref={browserRef} className="mt-4">
        {browser}
      </div>
    </div>
  ) : dynamicHero ? (
    <div className="@container mx-auto flex flex-col px-8 pb-24" style={{ maxWidth: WIDE_MAX_WIDTH }}>
      <DynamicHero
        query={sheetQuery}
        onQuery={onSheetQuery}
        placeholder={sheetPlaceholder}
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
       pasta logo abaixo (ver `FolderBar`). A busca é a da barra de topo. */
    <div className="mx-auto flex flex-col px-8 pb-24" style={{ maxWidth: WIDE_MAX_WIDTH }}>
      <FolderBar
        section={section}
        onSection={openSection}
        controls={controls}
      />
      <div className="mt-4">
        <FolderHeader
          name={folderName(current)}
          onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
          {...folderHeaderParts(current)}
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
          query={sheetQuery}
          onQuery={onSheetQuery}
          placeholder={sheetPlaceholder}
          section={section}
          onSection={openSection}
        />
      )}
      {current && (
        <div>
          <FolderHeader
            name={folderName(current)}
            onBack={() => navigate(path.length > 1 ? path[path.length - 2].id : null)}
            aside={controls}
            {...folderHeaderParts(current)}
          />
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
      overlay={
        <>
          {toastBox}
          {creating && (
            <PromptModal
              title="Nova pasta"
              label="Nome"
              placeholder="Nome da pasta"
              confirmLabel="Criar pasta"
              onConfirm={createIn}
              onClose={() => setCreating(false)}
            />
          )}
        </>
      }
    >
      {/* Aviso e modo dos ícones valem para a tela toda, e não só para o
          acervo: o cabeçalho da pasta também resolve o ícone dela e salva
          pelo mesmo painel. */}
      <ToastContext.Provider value={showToast}>
        <IconModeContext.Provider value={iconMode}>
          {isMobile ? mobileContent : desktopContent}
        </IconModeContext.Provider>
      </ToastContext.Provider>
    </AppShell>
  )
}
