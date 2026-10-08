import { COLOR } from './tokens'

/**
 * Switch: liga e desliga uma coisa só, e o efeito é imediato.
 *
 * As medidas saem do nó 5121:2948, a linha "Tema" do menu lateral, que foi
 * onde o primeiro switch do produto apareceu. Ele vinha colado aos ícones de
 * sol e lua, então quem precisava de um switch para outra coisa herdava a
 * decoração do tema junto. Aqui ficou só o controle; o alternador de tema
 * passou a ser este switch com os dois ícones ao lado.
 *
 *   trilho   36 × 20, raio total
 *   botão    16 de diâmetro, 2 de folga de cada lado
 *   ligado   trilho na primária; desligado, no contorno forte
 *
 * É um `role="switch"` com `aria-checked` de verdade: quem navega por teclado
 * precisa ouvir "ligado" ou "desligado", e uma caixa decorativa não fala.
 */

export const SWITCH = { width: 36, height: 20, knob: 16, inset: 2 } as const

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  /** Rótulo acessível. O switch não tem texto dentro, então ele é obrigatório. */
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 rounded-full transition-colors"
      style={{
        width: SWITCH.width,
        height: SWITCH.height,
        background: checked ? COLOR.primary : COLOR.borderStrong,
      }}
    >
      <span
        className="absolute rounded-full transition-[left] duration-150"
        style={{
          width: SWITCH.knob,
          height: SWITCH.knob,
          top: SWITCH.inset,
          left: checked ? SWITCH.width - SWITCH.knob - SWITCH.inset : SWITCH.inset,
          background: '#fff',
        }}
      />
    </button>
  )
}
