import { concentration, decompose, usualness, type Filter } from '@/engine/decompose'
import * as F from '@/engine/format'
import { DIMENSIONS, INDICATORS, type DimId, type IndicatorId } from '@/engine/semantic'
import { prevMonth, wid, type Widget } from '@/engine/board'

/**
 * "Por que mudou?", como bloco do painel.
 *
 * O texto só cita número por fato: cada `Fact` nasce do resultado do motor,
 * com a conta e o recorte de onde saiu, e a tela mostra isso no clique. Não
 * há como o texto trazer um número que a conta não produziu.
 */

export type Fact = {
  id: string
  text: string
  label: string
  formula: string
  scope: string[]
  period: string
  metadado: string
}

export type Rich = (string | { fact: string })[]

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export const scopeOf = (filter: Filter) =>
  Object.entries(filter)
    .filter(([, v]) => (Array.isArray(v) ? v.length > 0 : !!v))
    .map(([k, v]) => `${DIMENSIONS[k as DimId].label} = ${Array.isArray(v) ? v.join(' ou ') : v}`)

export function factory(ind: IndicatorId) {
  const I = INDICATORS[ind]
  const facts: Record<string, Fact> = {}
  const meta = `${I.metadado.code} - ${I.metadado.name}`
  const p = wid('f')
  const add = (id: string, f: Omit<Fact, 'id' | 'metadado'>) => {
    const full = `${p}-${id}`
    facts[full] = { id: full, metadado: meta, ...f }
    return { fact: full }
  }
  const rateFormula = `soma de ${I.num.label} ÷ soma de ${I.den.label}`
  return {
    facts,
    add,
    rate: (id: string, v: number, mes: string, filter: Filter = {}) =>
      add(id, { text: F.value(ind, v), label: I.name, formula: rateFormula, scope: scopeOf(filter), period: F.monthShort(mes) }),
    share: (id: string, v: number, label: string, formula: string, period: string, filter: Filter = {}) =>
      add(id, { text: F.pct(v), label, formula, scope: scopeOf(filter), period }),
  }
}

/** Qual corte abrir: o que a pessoa pediu, ou o primeiro da árvore que concentra a variação. */
function chooseDim(ind: IndicatorId, mes: string, filter: Filter, asked?: DimId) {
  const fixed = new Set(
    Object.entries(filter)
      .filter(([, v]) => (Array.isArray(v) ? v.length === 1 : !!v))
      .map(([k]) => k),
  )
  const from = prevMonth(mes)
  if (asked) return decompose(ind, asked, from, mes, filter)
  const tried = INDICATORS[ind].dims.filter((d) => !fixed.has(d)).map((d) => decompose(ind, d, from, mes, filter))
  return tried.find((d) => concentration(d) >= 0.5) ?? tried.sort((a, b) => concentration(b) - concentration(a))[0]
}

export function explain(ind: IndicatorId, mes: string, filter: Filter, asked?: DimId) {
  const I = INDICATORS[ind]
  const f = factory(ind)
  const from = prevMonth(mes)
  const d = chooseDim(ind, mes, filter, asked)
  const dim = DIMENSIONS[d.dim]
  const S = d.segments[0]
  const segTxt = scopeOf(filter).length ? ` em ${Object.values(filter).flat().join(', ')}` : ''
  const u = usualness(ind, filter, mes)
  const mixShare = d.delta ? d.mix / d.delta : 0
  const isMix = mixShare >= 0.5
  const sum = d.segments.reduce((s, x) => s + Math.abs(x.total), 0)
  const segFilter: Filter = { ...filter, [d.dim]: S.key }
  const period = `${F.monthShort(from)} → ${F.monthShort(mes)}`

  const r0 = f.rate('r0', d.R0, from, filter)
  const r1 = f.rate('r1', d.R1, mes, filter)
  const usualF = f.add('usual', {
    text: F.usual(ind, u.sd),
    label: 'Variação mensal típica',
    formula: `desvio-padrão das variações mês a mês de ${I.name.toLowerCase()}`,
    scope: scopeOf(filter),
    period: 'últimos 12 meses',
  })
  const shareF = f.share(
    'share',
    Math.abs(isMix ? mixShare : 1 - mixShare),
    `Parte da variação que é ${isMix ? 'mix' : 'taxa'}`,
    `contribuição de ${isMix ? 'mix' : 'taxa'} ÷ variação total, por ${dim.label}`,
    period,
    filter,
  )
  const topF = f.share('top', sum ? Math.abs(S.total) / sum : 0, `Parte da variação em ${S.key}`, 'contribuição do segmento ÷ soma das contribuições em módulo', period, filter)

  const verb = d.delta >= 0 ? 'subiu' : 'caiu'
  const text: Rich = [`${cap(I.article)}${segTxt} ${verb} de `, r0, ' para ', r1, ` de ${F.monthName(from)} para ${F.monthName(mes)}. `]
  if (u.ratio < 2) text.push('É uma variação dentro do usual (', usualF, '), então talvez não haja o que explicar. ')
  else text.push('A variação típica de um mês é de ', usualF, ', então esta é fora do comum. ')
  text.push(
    'A maior parte dela, ',
    shareF,
    isMix
      ? `, é mix: mudou a composição de ${I.den.label} entre ${dim.plural}, e não ${I.rateNoun} dentro de cada um. `
      : `, é taxa: ${I.rateNoun} mudou dentro de cada ${dim.label}, com a composição estável. `,
  )
  if (S.mix > S.rate) {
    const w0 = f.share('w0', S.w0, `Participação de ${S.key} em ${I.den.label}`, `${I.den.label} de ${S.key} ÷ total`, F.monthShort(from), segFilter)
    const w1 = f.share('w1', S.w1, `Participação de ${S.key} em ${I.den.label}`, `${I.den.label} de ${S.key} ÷ total`, F.monthShort(mes), segFilter)
    text.push(`${S.key} concentra `, topF, ` da variação: passou de `, w0, ' para ', w1, ` de ${I.den.label}.`)
  } else {
    const s0 = f.rate('s0', S.r0, from, segFilter)
    const s1 = f.rate('s1', S.r1, mes, segFilter)
    text.push(`${S.key} concentra `, topF, ` da variação: ${I.rateNoun} ali foi de `, s0, ' para ', s1, '.')
  }

  // Abrir mais um nível só faz sentido se ainda houver corte livre.
  const canGoDeeper = INDICATORS[ind].dims.some((x) => x !== d.dim && !(x in filter))
  const widget: Widget = {
    id: wid(),
    kind: 'explain',
    span: 6,
    mes,
    filter,
    d,
    text,
    next: canGoDeeper ? { dim: d.dim, key: S.key } : undefined,
  }
  const reply: Rich = [
    `Abri por ${dim.label}. ${S.key} concentra `,
    topF,
    ` da variação, e o efeito principal é ${isMix ? 'mix (mudou a composição)' : `taxa (${I.rateNoun} dentro de cada ${dim.label})`}. Coloquei a explicação no painel.`,
  ]
  return { widget, facts: f.facts, reply }
}
