import { useEffect, type ReactNode } from 'react'
import { COLOR, LAYOUT, TOPBAR } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { WeknowLogo } from '@/components/WeknowLogo'
import avatar from '@/assets/avatar.png'

/**
 * Navegação do portal no celular.
 *
 * No protótipo mobile do redesign (nó 5121:3576) a barra de topo tem 56px e
 * três coisas: o botão de menu à esquerda, a marca no meio e a conta à
 * direita. O menu lateral não cabe ao lado do conteúdo numa tela de 375px,
 * então ele vira gaveta — o padrão do Gmail e do Drive.
 *
 * O que mudou em relação ao protótipo: os alvos de toque. Lá o menu é um
 * ícone de 24px solto dentro de uma caixa de 56; aqui o botão inteiro tem
 * 40px de área clicável, que é o piso do Material (48dp com a folga da
 * barra) e do iOS (44pt).
 */

/** Altura do logo na barra: a mesma proporção usada na versão de mesa. */
const LOGO_H = 28
const LOGO_W = (91.95 * LOGO_H) / 28

export function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  return (
    <header
      className="relative shrink-0 flex items-center justify-between"
      style={{ height: TOPBAR.height, paddingInline: 8, background: COLOR.canvas }}
    >
      <button
        type="button"
        onClick={onMenu}
        aria-label="Abrir menu"
        title="Menu"
        className="wk-icon-btn shrink-0 flex items-center justify-center"
        style={{ width: 40, height: 40, color: COLOR.navText }}
      >
        <Icon name="menu" size={24} />
      </button>

      {/* A marca fica centrada por conta própria, não pelo espaço que sobra:
          assim ela não anda quando o botão da direita muda de tamanho. */}
      <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none">
        <WeknowLogo width={LOGO_W} height={LOGO_H} />
      </div>

      <button
        type="button"
        title="Conta"
        aria-label="Conta"
        className="shrink-0 rounded-full overflow-hidden relative transition-opacity active:opacity-80"
        style={{ width: 32, height: 32 }}
      >
        <img
          src={avatar}
          alt=""
          className="absolute max-w-none"
          style={{ width: '200%', height: '249.91%', left: '-50%', top: '-11.84%' }}
        />
      </button>
    </header>
  )
}

/**
 * Gaveta do menu: entra pela esquerda por cima do conteúdo, com um véu atrás.
 *
 * Fecha no véu, no Esc e ao navegar — três saídas, porque numa tela pequena
 * a gaveta cobre tudo e ficar preso nela é o pior que pode acontecer. Sai do
 * fluxo com `inert` quando fechada: sem isso o menu continuaria recebendo
 * foco do teclado atrás do conteúdo.
 */
export function MobileDrawer({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    // Trava a rolagem de trás: sem isso o dedo rola o conteúdo por baixo da gaveta.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden
        className={`fixed inset-0 z-40 bg-black transition-opacity duration-200 ${
          open ? 'opacity-30' : 'opacity-0 pointer-events-none'
        }`}
      />
      <div
        // Fechada, a gaveta sai do alcance do teclado e do leitor de tela —
        // ela continua no DOM, deslocada para fora, e sem isto o Tab passaria
        // por dentro dela antes de chegar ao conteúdo.
        inert={!open}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-[220ms] ease-[cubic-bezier(0.2,0,0,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ width: LAYOUT.sidebarWidth, background: COLOR.canvas }}
      >
        <div className="shrink-0 flex items-center" style={{ height: TOPBAR.height, paddingInline: 8 }}>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar menu"
            title="Fechar"
            className="wk-icon-btn shrink-0 flex items-center justify-center"
            style={{ width: 40, height: 40, color: COLOR.navText }}
          >
            <Icon name="menu_open" size={24} />
          </button>
          <div className="flex items-center" style={{ paddingInline: LAYOUT.navItemPadX }}>
            <WeknowLogo width={LOGO_W} height={LOGO_H} />
          </div>
        </div>
        <div className="flex-1 min-h-0">{children}</div>
      </div>
    </>
  )
}
