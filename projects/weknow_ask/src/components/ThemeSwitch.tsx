import { COLOR, FONT } from '@/design/tokens'
import { Icon } from '@/components/icons'
import { useTheme } from '@/design/theme'

/**
 * Alternador de tema — espec. do nó 5121:2948 (linha "Tema" do menu lateral):
 *
 *   grupo   gap 8: ícone `light_mode` (FILL 1) · chave · ícone `dark_mode`
 *   chave   36 × 20, raio total, botão de 16 com 2 de folga
 *
 * A chave é um `role="switch"` de verdade, não uma caixa decorativa: quem
 * navega por teclado precisa ouvir "ligado/desligado", e os dois ícones ao
 * lado dizem para que lado é cada estado.
 *
 * O ícone do lado ativo acende no tom primário; o outro fica no tom de ícone.
 */

const SWITCH = { width: 36, height: 20, knob: 16, inset: 2 } as const

export function ThemeSwitch() {
  const { theme, choose } = useTheme()
  const dark = theme === 'dark'

  return (
    <span className="inline-flex items-center shrink-0" style={{ gap: 8 }}>
      <Icon
        name="light_mode"
        size={24}
        filled={!dark}
        color={dark ? COLOR.navLabel : COLOR.primary}
        className="shrink-0"
      />

      <button
        type="button"
        role="switch"
        aria-checked={dark}
        aria-label="Tema escuro"
        onClick={() => choose(dark ? 'light' : 'dark')}
        className="relative shrink-0 rounded-full transition-colors"
        style={{
          width: SWITCH.width,
          height: SWITCH.height,
          background: dark ? COLOR.primary : COLOR.borderStrong,
        }}
      >
        <span
          className="absolute rounded-full transition-[left] duration-150"
          style={{
            width: SWITCH.knob,
            height: SWITCH.knob,
            top: SWITCH.inset,
            left: dark ? SWITCH.width - SWITCH.knob - SWITCH.inset : SWITCH.inset,
            background: '#fff',
          }}
        />
      </button>

      <Icon
        name="dark_mode"
        size={24}
        filled={dark}
        color={dark ? COLOR.primary : COLOR.navLabel}
        className="shrink-0"
      />
    </span>
  )
}

/** Linha "Tema" — o rótulo à esquerda e o alternador à direita. */
export function ThemeRow() {
  return (
    <div className="flex items-center gap-2" style={{ height: 40, paddingInline: 8 }}>
      <Icon name="palette" size={24} color={COLOR.navLabel} className="shrink-0" />
      <span
        className="flex-1 min-w-0"
        style={{ fontFamily: FONT, fontSize: 14, lineHeight: 1.5, color: COLOR.navText }}
      >
        Tema
      </span>
      <ThemeSwitch />
    </div>
  )
}
