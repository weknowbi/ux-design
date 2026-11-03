import { useState, type ReactNode, type RefObject } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { useSidebar } from '@/design/sidebar'
import { useIsMobile } from '@/design/viewport'
import { Header, type Crumb, type MenuItem } from '@/components/Header'
import { PortalSidebar, type PortalRoute } from '@/components/PortalSidebar'
import { SidebarBrand } from '@/components/SidebarBrand'
import { MobileDrawer, MobileTopBar } from '@/components/MobileNav'
import { ResizableAside } from '@/components/ResizableAside'
import { AccountMenu } from '@ds/AccountMenu'
import { CURRENT_USER } from '@/data/account'

/**
 * A moldura de toda tela do portal: marca, barra de topo, menu lateral e a
 * folha branca de conteúdo.
 *
 * Nasceu quando Configurações ganhou tela própria. Até então isto vivia dentro
 * do `PortalScreen`, e copiá-lo para a tela nova significaria manter dois
 * esqueletos iguais — o tipo de coisa que diverge em uma semana: um ganha o
 * ajuste de margem e o outro não, e as duas telas deixam de ser o mesmo
 * produto.
 *
 * O que a moldura NÃO faz é decidir o recheio. Cada tela monta o próprio
 * bloco dentro da folha, com o respiro que o conteúdo dela pede — a home tem
 * um cabeçalho que gruda ao rolar, a tabela de cadastro não tem nada disso.
 */
export function AppShell({
  route,
  onNavigate,
  trail,
  menuItems,
  search,
  mainRef,
  children,
  overlay,
  aside,
  bare,
  gutter = true,
}: {
  /**
   * Reserva o lugar da barra de rolagem da folha, para o conteúdo não pular
   * quando ela aparece. Sem ele, para a tela que rola por dentro (o painel
   * executivo do editor): a folha nunca rola, e a faixa vazia cortava a
   * linha do cabeçalho e o painel antes da borda.
   */
  gutter?: boolean
  /**
   * Painel à direita da folha, numa folha própria: a conversa do dashboard.
   * Ele não divide a folha do conteúdo; fica ao lado, com o mesmo vão do
   * menu, para o painel e a conversa não parecerem um bloco só.
   *
   * À direita, e não à esquerda (onde morou antes): a conversa abre e fecha
   * o tempo todo, e o botão que a abre fica na ponta direita da barra do
   * dashboard, então ela abre embaixo dele. Abrir e fechar mexe só na borda
   * direita do dashboard, que não pula de lugar, e a esquerda fica só com o
   * menu do portal.
   */
  aside?: ReactNode
  /**
   * Modo expandido: sem a barra de cima e sem o menu lateral, a conversa e
   * a folha ocupam a janela inteira, separadas por um fio.
   */
  bare?: boolean
  /** Item marcado no menu lateral. */
  route: PortalRoute
  onNavigate: (route: PortalRoute) => void
  trail?: Crumb[]
  menuItems?: MenuItem[]
  search?: { value: string; onChange: (q: string) => void; placeholder: string; hidden?: boolean; global?: boolean }
  /** A tela que precisa ouvir a rolagem da folha (cabeçalho que gruda). */
  mainRef?: RefObject<HTMLElement | null>
  children: ReactNode
  /** Avisos e outras camadas soltas sobre a folha. */
  overlay?: ReactNode
}) {
  const sidebar = useSidebar()
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)

  /**
   * Celular: uma coluna só, sem menu ao lado.
   *
   * A folha mantém os cantos arredondados do topo, como na versão de mesa: é
   * o que separa a barra — que é da aplicação — do conteúdo, que é do
   * cliente. O que ela larga é a margem lateral, que ali só comeria largura.
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
        <MobileTopBar
          onMenu={() => setDrawerOpen(true)}
          /* 32 e não 36: a barra do celular tem 56 de altura e o alvo de toque
             do botão é a foto inteira, com a folga de 8 das laterais. */
          account={
            <AccountMenu
              name={CURRENT_USER.name}
              email={CURRENT_USER.email}
              photo={CURRENT_USER.photo}
              size={32}
            />
          }
        />

        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto min-h-0"
          style={{
            background: COLOR.surface,
            borderTopLeftRadius: LAYOUT.sheetRadius,
            borderTopRightRadius: LAYOUT.sheetRadius,
          }}
        >
          {children}
        </main>

        <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <PortalSidebar
            active={route}
            onNavigate={(next) => {
              setDrawerOpen(false)
              onNavigate(next)
            }}
            collapsed={false}
          />
        </MobileDrawer>

        {overlay}
      </div>
    )
  }

  if (bare)
    return (
      /* `overflow-hidden`: a conversa entra com animação pela borda direita, e
         sem o corte a janela ganhava barras de rolagem que ficavam (com elas,
         os 100vw já não cabiam). */
      <div className="wk-thin-scroll flex relative overflow-hidden" style={{ width: '100vw', height: '100vh', background: COLOR.surface, fontFamily: FONT }}>
        <main ref={mainRef} className="flex-1 overflow-y-auto min-w-0">
          {children}
        </main>
        {aside && (
          <ResizableAside defaultWidth={400} className="shrink-0 flex flex-col min-h-0 wk-enter" style={{ borderLeft: `1px solid ${COLOR.border}` }}>
            {aside}
          </ResizableAside>
        )}
        {overlay}
      </div>
    )

  return (
    <div
      className="wk-thin-scroll flex flex-col"
      style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}
    >
      {/* Faixa de topo inteira com a marca; só o menu de baixo recolhe.
          `relative z-40`: os menus que abrem daqui (o "…" e o "…" do caminho)
          descem por cima da folha, e lá a busca gruda numa camada própria
          (z-30) — sem isto ela passava por cima do menu aberto. */}
      <div className="relative z-40 flex shrink-0" style={{ paddingRight: LAYOUT.sheetMarginRight }}>
        <SidebarBrand collapsed={sidebar.collapsed} onToggle={sidebar.toggle} onLogoClick={() => onNavigate('portal')} />
        <div className="flex-1 min-w-0">
          <Header trail={trail} menuItems={menuItems} search={search} />
        </div>
      </div>

      <div
        className="flex flex-1 overflow-hidden relative"
        style={{ minHeight: 0, paddingRight: LAYOUT.sheetMarginRight }}
      >
        <PortalSidebar active={route} onNavigate={onNavigate} collapsed={sidebar.collapsed} />

        <main
          ref={mainRef}
          className={`flex-1 overflow-y-auto ${gutter ? '[scrollbar-gutter:stable] ' : ''}bg-[var(--wk-surface)] min-w-0`}
          style={{ borderTopLeftRadius: LAYOUT.sheetRadius, borderTopRightRadius: LAYOUT.sheetRadius }}
        >
          {children}
        </main>

        {aside && (
          <ResizableAside
            defaultWidth={380}
            gap={8}
            className="shrink-0 flex flex-col min-h-0 bg-[var(--wk-surface)] wk-enter"
            style={{ marginLeft: 8, borderTopLeftRadius: LAYOUT.sheetRadius, borderTopRightRadius: LAYOUT.sheetRadius }}
          >
            {aside}
          </ResizableAside>
        )}

        {overlay}
      </div>
    </div>
  )
}
