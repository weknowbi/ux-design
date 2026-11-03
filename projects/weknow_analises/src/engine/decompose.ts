import { DATA, MONTHS, type Cell } from '@/engine/data'
import { INDICATORS, type DimId, type IndicatorId } from '@/engine/semantic'

/**
 * O motor. Tudo aqui é conta, sem IA: a IA escolhe o que abrir e escreve o
 * texto, mas cada número que ela cita sai destas funções.
 */

/**
 * Recorte: um valor (o segmento que a análise abriu) ou vários (o filtro da
 * barra, onde a pessoa marca SUS e Unimed juntos). Lista vazia = sem filtro.
 */
export type Filter = Partial<Record<DimId, string | string[]>>

export const matches = (c: Cell, filter: Filter) =>
  Object.entries(filter).every(([k, v]) =>
    Array.isArray(v) ? v.length === 0 || v.includes(c[k] as string) : c[k] === v,
  )

export function cellsOf(ind: IndicatorId, mes: string, filter: Filter = {}): Cell[] {
  return DATA[ind].filter((c) => c.mes === mes && matches(c, filter))
}

export type Totals = { num: number; den: number; rate: number }

export function totals(ind: IndicatorId, cells: Cell[]): Totals {
  const { num, den } = INDICATORS[ind]
  let n = 0
  let d = 0
  for (const c of cells) {
    n += c[num.field] as number
    d += c[den.field] as number
  }
  return { num: n, den: d, rate: d ? n / d : 0 }
}

export function series(ind: IndicatorId, filter: Filter = {}) {
  return MONTHS.map((mes) => ({ mes, ...totals(ind, cellsOf(ind, mes, filter)) }))
}

/**
 * A variação deste mês é fora do comum? Compara com o desvio das variações
 * mês a mês dos doze meses anteriores. Não é teste estatístico; é o "isso
 * costuma mexer quanto?" que o gestor faria de cabeça, só que conferido.
 */
export function usualness(ind: IndicatorId, filter: Filter = {}, mes = MONTHS[MONTHS.length - 1]) {
  const s = series(ind, filter)
  const at = Math.max(1, MONTHS.indexOf(mes))
  const deltas = s.slice(1, at + 1).map((p, i) => p.rate - s[i].rate)
  // Sem doze meses antes do mês escolhido, compara com o ano inteiro.
  const past = deltas.length > 3 ? deltas.slice(0, -1) : s.slice(1).map((p, i) => p.rate - s[i].rate)
  const mean = past.reduce((a, b) => a + b, 0) / past.length
  const sd = Math.sqrt(past.reduce((a, b) => a + (b - mean) ** 2, 0) / past.length)
  const last = deltas[deltas.length - 1]
  return { delta: last, sd, ratio: sd ? Math.abs(last) / sd : Infinity }
}

export type Segment = {
  key: string
  den0: number
  den1: number
  /** Participação no denominador. */
  w0: number
  w1: number
  r0: number
  r1: number
  /** Contribuição para a variação da razão total. */
  mix: number
  rate: number
  total: number
}

export type Decomposition = {
  dim: DimId
  filter: Filter
  from: string
  to: string
  R0: number
  R1: number
  delta: number
  mix: number
  rate: number
  segments: Segment[]
}

/**
 * Mix × taxa, na forma simétrica (ponto médio), que fecha a conta sem resto:
 *
 *   w1·r1 − w0·r0 = Δw · r̄ + w̄ · Δr
 *
 * A parte de mix de cada segmento usa r̄ − R̄ em vez de r̄. Como Σ Δw = 0, o
 * total não muda, mas a leitura por segmento passa a fazer sentido: ganhar
 * participação só aumenta a média se o segmento estiver ACIMA dela. Sem esse
 * ajuste, todo segmento que cresce pareceria empurrar a média para cima.
 */
export function decompose(ind: IndicatorId, dim: DimId, from: string, to: string, filter: Filter = {}): Decomposition {
  const a = cellsOf(ind, from, filter)
  const b = cellsOf(ind, to, filter)
  const T0 = totals(ind, a)
  const T1 = totals(ind, b)
  const Rbar = (T0.rate + T1.rate) / 2
  const keys = [...new Set([...a, ...b].map((c) => String(c[dim])))]

  const segments = keys.map((key): Segment => {
    const s0 = totals(ind, a.filter((c) => c[dim] === key))
    const s1 = totals(ind, b.filter((c) => c[dim] === key))
    const w0 = T0.den ? s0.den / T0.den : 0
    const w1 = T1.den ? s1.den / T1.den : 0
    // Segmento que some num dos meses: a razão dele vale a do outro mês.
    const r0 = s0.den ? s0.rate : s1.rate
    const r1 = s1.den ? s1.rate : s0.rate
    const mix = (w1 - w0) * ((r0 + r1) / 2 - Rbar)
    const rate = ((w0 + w1) / 2) * (r1 - r0)
    return { key, den0: s0.den, den1: s1.den, w0, w1, r0, r1, mix, rate, total: mix + rate }
  })
  segments.sort((x, y) => Math.abs(y.total) - Math.abs(x.total))

  return {
    dim,
    filter,
    from,
    to,
    R0: T0.rate,
    R1: T1.rate,
    delta: T1.rate - T0.rate,
    mix: segments.reduce((s, x) => s + x.mix, 0),
    rate: segments.reduce((s, x) => s + x.rate, 0),
    segments,
  }
}

/**
 * Quanto um corte concentra a variação: a parte do maior segmento na soma
 * das contribuições em módulo. 1 quer dizer "um segmento explica tudo";
 * perto de 1/n quer dizer "espalhado, este corte não conta história".
 */
export function concentration(d: Decomposition) {
  const sum = d.segments.reduce((s, x) => s + Math.abs(x.total), 0)
  return sum ? Math.abs(d.segments[0].total) / sum : 0
}

export type VolumeRow = { key: string; v0: number; v1: number; diff: number }

/** De onde veio a mudança de volume (o denominador), segmento a segmento. */
export function volume(ind: IndicatorId, dim: DimId, from: string, to: string, filter: Filter = {}) {
  const a = cellsOf(ind, from, filter)
  const b = cellsOf(ind, to, filter)
  const field = INDICATORS[ind].den.field
  const keys = [...new Set([...a, ...b].map((c) => String(c[dim])))]
  const sum = (cs: Cell[], key: string) =>
    cs.filter((c) => c[dim] === key).reduce((s, c) => s + (c[field] as number), 0)
  const rows: VolumeRow[] = keys.map((key) => {
    const v0 = sum(a, key)
    const v1 = sum(b, key)
    return { key, v0, v1, diff: v1 - v0 }
  })
  rows.sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff))
  const t0 = rows.reduce((s, x) => s + x.v0, 0)
  const t1 = rows.reduce((s, x) => s + x.v1, 0)
  return { dim, filter, from, to, rows, t0, t1, diff: t1 - t0 }
}
export type Volume = ReturnType<typeof volume>
