import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { COLOR, FONT } from './tokens'
import { Icon } from './icons'

export const MENU_PANEL: CSSProperties = {
  background: COLOR.surface,
  border: `1px solid ${COLOR.border}`,
  borderRadius: 8,
  boxShadow: 'var(--wk-shadow-menu)',
  padding: 4,
}

/**
 * Respiro entre o menu e o gatilho (o mt-1/mb-1) e entre o menu e a borda da
 * janela. O segundo existe para o menu não encostar no fim da tela, onde ele
 * parece cortado mesmo quando cabe inteiro.
 */
const MENU_GAP = 4
const MENU_MARGIN = 8
/** Abaixo disto não vale virar: o menu viraria para um lado igualmente apertado. */
const MENU_MIN_HEIGHT = 160

/**
 * A moldura em que o menu realmente aparece — não a janela.
 *
 * O menu é `absolute` dentro do card, e o card mora na folha de conteúdo, que
 * rola. Quem rola, corta: nos dois eixos. O que passa do topo da folha some
 * atrás do cabeçalho, e o que passa da esquerda dela some atrás do menu
 * lateral, por mais janela que ainda exista desse lado. Medir contra a janela
 * fazia a conta achar espaço onde não há.
 *
 * Nenhum eixo escapa: quando um lado é recortado e o outro é `visible`, o CSS
 * promove o `visible` a `auto` — então basta o overflow do eixo para saber se
 * ele corta.
 */
function clipFrame(el: HTMLElement) {
  const cuts = (v: string) => v === 'auto' || v === 'scroll' || v === 'hidden'
  let top = 0
  let bottom = window.innerHeight
  let left = 0
  let right = window.innerWidth
  for (let node = el.parentElement; node; node = node.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(node)
    if (!cuts(overflowX) && !cuts(overflowY)) continue
    const r = node.getBoundingClientRect()
    if (cuts(overflowY)) {
      top = Math.max(top, r.top)
      bottom = Math.min(bottom, r.bottom)
    }
    if (cuts(overflowX)) {
      left = Math.max(left, r.left)
      right = Math.min(right, r.right)
    }
  }
  return { top, bottom, left, right }
}

/** Menu suspenso ancorado no gatilho; fecha com clique fora ou Esc. */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  minWidth = 160,
  onClose,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  children: (close: () => void) => ReactNode
  align?: 'left' | 'right'
  minWidth?: number
  /**
   * Fechou, não importa como: botão, Esc ou clique fora. Quem tem rascunho
   * dentro do menu precisa saber disso para desfazer — sem isso, clicar ao
   * lado valeria como salvar.
   */
  onClose?: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  /* Para cima quando não cabe para baixo. O menu do card cresceu com o painel
     de editar a pasta, e num card perto do rodapé ele saía da janela: o
     "Salvar" ficava fora da tela, que é o pior lugar para um botão estar. */
  const [place, setPlace] = useState<'bottom' | 'top'>('bottom')
  const [maxHeight, setMaxHeight] = useState<number>()
  /* Empurrão lateral para o menu não vazar pela borda da folha. O alinhamento
     continua sendo o do gatilho; isto só o traz de volta para dentro quando o
     card está na primeira coluna e o painel largo passaria por baixo do menu
     lateral. Em ref também, porque a medida seguinte precisa descontar o
     empurrão que ela mesma já aplicou — senão a conta se persegue. */
  const [shiftX, setShiftX] = useState(0)
  const shiftRef = useRef(0)
  shiftRef.current = shiftX
  // Em ref, e não na dependência do efeito: o callback muda a cada render
  // (ele lê o rascunho), e o ouvinte de clique fora é montado uma vez só.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  /* Mede depois de pintar, e remede quando o conteúdo muda de tamanho — o
     mesmo menu abre com duas ações e vira um formulário de 470px. O
     ResizeObserver é o que cobre essa troca sem o componente ter de saber que
     ela existe. O scroll entra com `capture` porque quem rola é o <main>, não
     a janela. */
  useLayoutEffect(() => {
    if (!open) return
    const trigger = ref.current
    const panel = panelRef.current
    if (!trigger || !panel) return

    const measure = () => {
      const r = trigger.getBoundingClientRect()
      const band = clipFrame(trigger)
      const below = band.bottom - r.bottom - MENU_GAP - MENU_MARGIN
      const above = r.top - band.top - MENU_GAP - MENU_MARGIN
      // scrollHeight, e não offsetHeight: é a altura que o menu QUER ter,
      // independente do limite que esta mesma conta acabou de impor a ele.
      const wanted = panel.scrollHeight
      // Só vira se virar resolver: tem de caber em cima, ou pelo menos sobrar
      // bem mais espaço lá. Virar para um lado igualmente apertado só muda o
      // lado por onde o menu é cortado.
      const up = wanted > below && above > below
      setPlace(up ? 'top' : 'bottom')
      // Sem espaço dos dois lados (janela baixa), o menu rola por dentro em vez
      // de vazar: o fim dele continua alcançável.
      setMaxHeight(Math.max(up ? above : below, MENU_MIN_HEIGHT))

      /* No eixo deitado não há para onde virar — o menu tem a largura que tem.
         O que cabe é trazê-lo para dentro da moldura: a borda que vazou encosta
         na margem e o resto acompanha. A conta parte da posição sem empurrão
         (daí o desconto do shift atual), e a direita é conferida antes da
         esquerda para que, num menu mais largo que a moldura, sobre o começo
         dele à vista, não o fim. */
      const p = panel.getBoundingClientRect()
      const natLeft = p.left - shiftRef.current
      const natRight = p.right - shiftRef.current
      let shift = 0
      if (natRight > band.right - MENU_MARGIN) shift = band.right - MENU_MARGIN - natRight
      if (natLeft + shift < band.left + MENU_MARGIN) shift = band.left + MENU_MARGIN - natLeft
      setShiftX(Math.round(shift))
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(panel)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const close = () => {
      setOpen(false)
      onCloseRef.current?.()
    }
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative" data-open={open || undefined}>
      {trigger({
        open,
        toggle: () => {
          if (open) {
            setOpen(false)
            onCloseRef.current?.()
          } else setOpen(true)
        },
      })}
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className={`absolute z-30 overflow-y-auto ${place === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'} ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{
            ...MENU_PANEL,
            minWidth,
            maxHeight,
            transform: shiftX ? `translateX(${shiftX}px)` : undefined,
          }}
        >
          {children(() => {
            setOpen(false)
            onCloseRef.current?.()
          })}
        </div>
      )}
    </div>
  )
}

const ITEM = 'w-full flex items-center gap-2 rounded-md h-9 pl-2 pr-4 transition-colors hover:bg-[var(--wk-menu-hover)]'

/** Opção de escolha única — check à esquerda, como no seletor de visualização do Weknow. */
export function MenuOption({ checked, label, onSelect }: { checked: boolean; label: string; onSelect: () => void }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={checked} onClick={onSelect} className={ITEM}>
      <span className="w-5 shrink-0 flex justify-center">
        {checked && <Icon name="check" size={20} color={COLOR.navLabel} />}
      </span>
      <span className="text-left text-[14px] whitespace-nowrap" style={{ fontFamily: FONT, color: COLOR.navText }}>
        {label}
      </span>
    </button>
  )
}

export function MenuAction({ icon, label, onSelect }: { icon: string; label: string; onSelect: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onSelect} className={ITEM}>
      <Icon name={icon} size={20} color={COLOR.navLabel} className="shrink-0" />
      <span className="text-left text-[14px] whitespace-nowrap" style={{ fontFamily: FONT, color: COLOR.navText }}>
        {label}
      </span>
    </button>
  )
}
