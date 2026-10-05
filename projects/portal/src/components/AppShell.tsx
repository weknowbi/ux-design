import { useState, type ReactNode, type RefObject } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { useSidebar } from '@/design/sidebar'
import { useIsMobile } from '@/design/viewport'
import { Header, type Crumb, type MenuItem } from '@/components/Header'
import { PortalSidebar, type PortalRoute } from '@/components/PortalSidebar'
import { SidebarBrand } from '@/components/SidebarBrand'
import { MobileDrawer, MobileTopBar } from '@/components/MobileNav'

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
}: {
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

  return (
    <div
      className="flex flex-col"
      style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}
    >
      {/* Faixa de topo inteira com a marca; só o menu de baixo recolhe.
          `relative z-40`: os menus que abrem daqui (o "…" e o "…" do caminho)
          descem por cima da folha, e lá a busca gruda numa camada própria
          (z-30) — sem isto ela passava por cima do menu aberto. */}
      <div className="relative z-40 flex shrink-0" style={{ paddingRight: LAYOUT.sheetMarginRight }}>
        <SidebarBrand collapsed={sidebar.collapsed} onToggle={sidebar.toggle} />
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
          className="flex-1 overflow-y-auto [scrollbar-gutter:stable] bg-[var(--wk-surface)] min-w-0"
          style={{ borderTopLeftRadius: LAYOUT.sheetRadius, borderTopRightRadius: LAYOUT.sheetRadius }}
        >
          {children}
        </main>

        {overlay}
      </div>
    </div>
  )
}
