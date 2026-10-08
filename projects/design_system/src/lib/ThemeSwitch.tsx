import { COLOR, FONT } from './tokens'
import { Icon } from './icons'
import { Switch } from './Switch'
import { useTheme } from './theme'

/**
 * Alternador de tema: o switch do design system com um ícone de cada lado.
 *
 * Espec. do nó 5121:2948, a linha "Tema" do menu lateral: grupo com gap 8,
 * `light_mode` à esquerda, o switch, `dark_mode` à direita.
 *
 * Os ícones não são enfeite. O switch sozinho diz "ligado", mas não diz ligado
 * para quê, e "tema ligado" não quer dizer nada. Com sol e lua nas pontas, o
 * controle passa a dizer para que lado é cada estado.
 *
 * O ícone do lado ativo acende no tom primário e vem preenchido; o outro fica
 * em traço, no tom de ícone. Os dois têm 24px, como os demais ícones do menu.
 */

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

      <Switch checked={dark} onChange={(on) => choose(on ? 'dark' : 'light')} label="Tema escuro" />

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

/** Linha "Tema": o rótulo à esquerda e o alternador à direita. */
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
