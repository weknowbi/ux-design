import { COLOR } from '@/design/tokens'

/**
 * Ícones — Material Symbols Outlined (Google Fonts), nas definições do
 * design system: **weight 200, grade 0, optical size 24, cor #8C98A8**.
 *
 * É a mesma família usada nos nós do Figma, cujos nomes carregam os eixos:
 * `home_24dp_6C757D_FILL0_wght200_GRAD0_opsz24`.
 *
 * O eixo FILL alterna entre traçado e preenchido — o menu do portal usa
 * FILL 1 no item ativo.
 */

export const ICON_DEFAULTS = {
  weight: 200,
  grade: 0,
  opticalSize: 24,
  size: 24,
  color: COLOR.navLabel, // #8c98a8
} as const

export type IconProps = {
  /** Nome do símbolo, ex.: `search`, `folder`, `settings`. */
  name?: string
  size?: number
  /** FILL 1 — usado no estado ativo. */
  filled?: boolean
  /** Sobrescreve o eixo wght; o padrão do design system é 200. */
  weight?: number
  className?: string
  color?: string
}

export function Icon({
  name = 'help',
  size = ICON_DEFAULTS.size,
  filled = false,
  weight = ICON_DEFAULTS.weight,
  className,
  color,
}: IconProps) {
  return (
    <span
      className={`wk-icon${className ? ` ${className}` : ''}`}
      aria-hidden="true"
      style={{
        fontSize: size,
        width: size,
        height: size,
        color,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${ICON_DEFAULTS.grade}, 'opsz' ${ICON_DEFAULTS.opticalSize}`,
      }}
    >
      {name}
    </span>
  )
}

/** Fábrica dos ícones nomeados usados no app. */
const symbol = (name: string) => (props: Omit<IconProps, 'name'>) => <Icon name={name} {...props} />

export const IconMenu = symbol('menu')
export const IconChevronLeft = symbol('chevron_left')
export const IconSearch = symbol('search')
export const IconNewChat = symbol('add_comment')
export const IconFolder = symbol('folder')
export const IconFolderPlus = symbol('create_new_folder')
export const IconSettings = symbol('settings')
export const IconShare = symbol('share')
export const IconMore = symbol('more_horiz')
export const IconExpand = symbol('open_in_full')
export const IconAccount = symbol('account_circle')
export const IconHelp = symbol('help')
export const IconAttach = symbol('library_add')
export const IconMic = symbol('mic')
export const IconArrowUp = symbol('arrow_upward')
export const IconClose = symbol('close')
export const IconSparkle = symbol('auto_awesome')
export const IconCopy = symbol('content_copy')
export const IconRefresh = symbol('refresh')
export const IconThumbUp = symbol('thumb_up')
export const IconTable = symbol('table')
export const IconInfo = symbol('info')
export const IconDatabase = symbol('database')

/** Ícone oficial do Weknow Ask (weknow_ask_24px.svg), herdando currentColor. */
export function IconWeknowAsk({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M3.5 18.7885V5.1155C3.5 4.67117 3.65817 4.29083 3.9745 3.9745C4.29083 3.65817 4.67117 3.5 5.1155 3.5H16.8845C17.3288 3.5 17.7092 3.65817 18.0255 3.9745C18.3418 4.29083 18.5 4.67117 18.5 5.1155V10.0173C18.4167 10.0096 18.3333 10.0048 18.25 10.003C18.1667 10.001 18.0833 10 18 10C17.9167 10 17.8333 10.001 17.75 10.003C17.6667 10.0048 17.5833 10.0096 17.5 10.0173V5.1155C17.5 4.936 17.4423 4.7885 17.327 4.673C17.2115 4.55767 17.064 4.5 16.8845 4.5H5.1155C4.936 4.5 4.7885 4.55767 4.673 4.673C4.55767 4.7885 4.5 4.936 4.5 5.1155V15.5H12.0173C12.0096 15.5833 12.0048 15.6667 12.003 15.75C12.001 15.8333 12 15.9167 12 16C12 16.0833 12.001 16.1667 12.003 16.25C12.0048 16.3333 12.0096 16.4167 12.0173 16.5H5.7885L3.5 18.7885ZM7.1155 8.5H14.8845V7.5H7.1155V8.5ZM7.1155 12.5H11.8845V11.5H7.1155V12.5Z" fill="currentColor" />
      <path d="M18 12L19.2143 14.7857L22 16L19.2143 17.2143L18 20L16.7857 17.2143L14 16L16.7857 14.7857L18 12Z" fill="currentColor" stroke="currentColor" strokeWidth="0.8" strokeMiterlimit="6" strokeLinecap="round" />
    </svg>
  )
}
