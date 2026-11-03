import { INDICATORS, type IndicatorId } from '@/engine/semantic'

/** Números e datas em pt-BR. O sinal de menos é o tipográfico (−), não o hífen. */

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/** "2026-10" → "out/2026". */
export const monthShort = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  return `${MESES[m - 1]}/${y}`
}
/** "2026-10" → "out" (eixo do gráfico). */
export const monthTick = (mes: string) => MESES[Number(mes.split('-')[1]) - 1]
/** "2026-10" → "outubro de 2026". */
export const monthLong = (mes: string) => {
  const [y, m] = mes.split('-').map(Number)
  return `${MESES_LONGOS[m - 1]} de ${y}`
}
/** "2026-10" → "outubro". */
export const monthName = (mes: string) => MESES_LONGOS[Number(mes.split('-')[1]) - 1]

const minus = (s: string) => s.replace('-', '−')

export const num = (v: number, digits = 0) =>
  minus(v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }))

/** Com sinal; o que arredonda para zero sai sem sinal, em vez de um "−0,00". */
export const signed = (v: number, digits = 0) => {
  const r = Number(v.toFixed(digits))
  return r === 0 ? num(0, digits) : (r > 0 ? '+' : '') + num(r, digits)
}

/** Valor do indicador com a unidade: "4,4 dias", "3,2%". */
export function value(ind: IndicatorId, v: number) {
  const i = INDICATORS[ind]
  return i.unit === '%' ? `${num(v * 100, i.digits)}%` : `${num(v, i.digits)} ${i.unit}`
}

/** Variação do indicador: "+0,3 dia", "+0,9 p.p.". */
export function delta(ind: IndicatorId, d: number) {
  const i = INDICATORS[ind]
  if (i.unit === '%') return `${signed(d * 100, 1)} p.p.`
  const s = signed(d, i.digits)
  return `${s} ${Math.abs(d) < 2 ? 'dia' : 'dias'}`
}

/** Só o número, sem unidade, para eixo e tabela. */
export function bare(ind: IndicatorId, v: number) {
  const i = INDICATORS[ind]
  return i.unit === '%' ? num(v * 100, i.digits) : num(v, i.digits)
}

export const pct = (share: number, digits = 0) => `${num(share * 100, digits)}%`

/** Dinheiro compacto: "R$ 2,3 mi", "R$ 640 mil". */
export function money(v: number) {
  if (Math.abs(v) >= 1_000_000) return `R$ ${num(v / 1_000_000, 1)} mi`
  if (Math.abs(v) >= 1_000) return `R$ ${num(v / 1_000, 0)} mil`
  return `R$ ${num(v, 0)}`
}

/** Volume do denominador, na unidade do indicador. */
export function amount(ind: IndicatorId, v: number) {
  return INDICATORS[ind].den.field === 'valor_faturado' ? money(v) : num(v, 0)
}
export function amountDiff(ind: IndicatorId, v: number) {
  const s = amount(ind, Math.abs(v))
  return (v > 0 ? '+' : v < 0 ? '−' : '') + s
}

/** Variação típica, com uma casa a mais: "±0,04 dia" em vez de um "±0,0" que diz nada. */
export function usual(ind: IndicatorId, sd: number) {
  const i = INDICATORS[ind]
  if (i.unit === '%') return `±${num(sd * 100, i.digits + 1)} p.p.`
  return `±${num(sd, i.digits + 1)} dia`
}

/** Contribuição de um segmento: uma casa a mais que o indicador, senão quase tudo vira "+0,0". */
export function contrib(ind: IndicatorId, d: number) {
  const i = INDICATORS[ind]
  if (i.unit === '%') return `${signed(d * 100, i.digits + 1)} p.p.`
  return `${signed(d, i.digits + 1)} ${Math.abs(d) < 2 ? 'dia' : 'dias'}`
}
