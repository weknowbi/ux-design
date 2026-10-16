import { useEffect, useState } from 'react'
import type { DashTheme, PaletteId } from '@/engine/types'

/**
 * Paletas que a pessoa pode pedir por prompt.
 *
 * É uma lista fechada de propósito. "Deixa mais vibrante, verde neon e roxo"
 * escolhe uma delas — não inventa oito cores na hora. Cada uma passou pelo
 * validador de paleta (faixa de luminosidade, croma, separação para daltonismo
 * entre vizinhas, contraste) nas duas superfícies do Weknow: branco
 * `#ffffff` no claro e `#131314` no escuro. O escuro não é o claro invertido:
 * são os mesmos matizes, com o passo escolhido para o fundo escuro.
 *
 * Cor segue a categoria, nunca a posição: a fatia "Notebooks" tem a mesma cor
 * filtrada ou não (ver `stableOrder` em query.ts).
 */

export type Palette = { label: string; hint: string; light: string[]; dark: string[] }

export const PALETTES: Record<PaletteId, Palette> = {
  weknow: {
    label: 'Weknow',
    hint: 'Sóbria, abre no azul da marca',
    light: ['#3366cc', '#e07b39', '#2a9d8f', '#c9a227', '#c25b8f', '#5a8f29', '#6a51b5', '#d64545'],
    dark: ['#5a88dc', '#d9702e', '#24a091', '#b38a10', '#d1609a', '#5d9a2d', '#9283e6', '#e06464'],
  },
  neon: {
    label: 'Neon',
    hint: 'Vibrante: verde e roxo na frente',
    light: ['#2fbf71', '#9b5cf6', '#d4a017', '#e0558f', '#2b8fd9', '#d9622b'],
    dark: ['#17a85c', '#9a6cf2', '#b8870c', '#ee4f93', '#2a96e6', '#e6672a'],
  },
  classico: {
    label: 'Clássica',
    hint: 'Oito matizes bem separados',
    light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
    dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  },
}

export type Mode = 'light' | 'dark'

/** Moldura dos gráficos: fundo, cartão, tinta e linhas — nunca cor de série. */
const CHROME: Record<Mode, Record<string, string>> = {
  light: {
    '--d-bg': '#f3f6fc',
    '--d-card': '#ffffff',
    '--d-card-border': '#e2e8f0',
    '--d-text': '#1f2937',
    '--d-text-2': '#475569',
    '--d-muted': '#8c98a8',
    '--d-grid': '#eef1f5',
    '--d-axis': '#cfd6e0',
    '--d-other': '#b4bcc8',
    '--d-good': '#198754',
    '--d-bad': '#b91c1c',
    '--d-hover': '#f1f5f9',
    '--d-chip': '#edf0f3',
    '--d-shadow': '0 0 2px rgba(16,24,40,.07), 0 1px 2px rgba(16,24,40,.06), 0 3px 6px -3px rgba(16,24,40,.1)',
    '--d-tip-bg': '#ffffff',
  },
  dark: {
    '--d-bg': '#0e0f10',
    '--d-card': '#1a1b1c',
    '--d-card-border': 'rgba(255,255,255,0.07)',
    '--d-text': '#eff0f0',
    '--d-text-2': '#d3d4d5',
    '--d-muted': '#9a9da1',
    '--d-grid': '#26282a',
    '--d-axis': '#3a3c3f',
    '--d-other': '#5f646b',
    '--d-good': '#3ecf8e',
    '--d-bad': '#f87171',
    '--d-hover': '#232426',
    '--d-chip': '#2a2b2d',
    '--d-shadow': '0 1px 2px rgba(0,0,0,.4)',
    '--d-tip-bg': '#232426',
  },
}

export function themeVars(theme: DashTheme, mode: Mode): Record<string, string> {
  const series = PALETTES[theme.palette][mode]
  const vars: Record<string, string> = { ...CHROME[mode] }
  series.forEach((c, i) => (vars[`--d-s${i + 1}`] = c))
  vars['--d-accent'] = series[0]
  vars['--d-radius'] = theme.corners === 'square' ? '4px' : theme.corners === 'round' ? '20px' : '12px'
  vars['--d-gap'] = theme.density === 'compact' ? '12px' : '16px'
  vars['--d-pad'] = theme.density === 'compact' ? '14px' : '20px'
  return vars
}

/** Cor da categoria pela posição estável; passou da paleta, cai no cinza. */
export const seriesColor = (index: number, palette: PaletteId) =>
  index >= 0 && index < PALETTES[palette].light.length ? `var(--d-s${index + 1})` : 'var(--d-other)'

/**
 * Tema do Weknow agora — para o dashboard em `auto` acompanhar a chave de
 * tema do menu sem depender de quem a guardou.
 */
export function useAppMode(): Mode {
  const read = (): Mode => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const [mode, setMode] = useState<Mode>(read)
  useEffect(() => {
    const obs = new MutationObserver(() => setMode(read()))
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return mode
}
