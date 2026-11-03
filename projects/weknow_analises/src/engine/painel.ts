import { DATA, HISTORY } from '@/engine/data'
import { metadadoOf } from '@/engine/catalog'
import * as F from '@/engine/format'
import { DIMENSIONS, INDICATORS, type DimId, type IndicatorId } from '@/engine/semantic'

/**
 * O painel executivo lido do metadado.
 *
 * O desenho é o do modelo de referência (`public/modelos/painel-executivo.html`);
 * o que ele mostra sai daqui: as três medidas do metadado, um quarto número
 * de participação, o corte principal (filtro, barras por parte, tabela) e o
 * corte de composição (barras empilhadas e rosca). A página recebe as linhas
 * já agregadas por mês e corte e faz as contas de cada recorte sozinha, como
 * o modelo fazia com a base dele.
 */

type Cfg = {
  /** O corte do filtro, das barras por parte e da tabela. */
  main: DimId
  /** O corte da composição: barras empilhadas e rosca. */
  split: DimId
  /** Medida que a composição divide. */
  splitOf: 'num' | 'den'
  splitTitle: string
  /** O quarto número: quanto de uma medida cai num valor de um corte. */
  share: { dim: DimId; value: string; of: 'num' | 'den'; label: string; foot: string }
  money: boolean
  /** Para que lado é melhor cada volume; sem lado, a variação fica neutra. */
  better: { den: 'up' | 'down' | null; num: 'up' | 'down' | null }
  total: string
}

export const PAINEL: Record<IndicatorId, Cfg> = {
  permanencia: {
    main: 'setor',
    split: 'convenio',
    splitOf: 'den',
    splitTitle: 'Saídas por convênio',
    share: { dim: 'entrada', value: 'Urgência', of: 'den', label: 'Saídas pela urgência', foot: 'das saídas entraram pela urgência' },
    money: false,
    better: { den: null, num: null },
    total: 'Hospital (consolidado)',
  },
  glosa: {
    main: 'convenio',
    split: 'item',
    splitOf: 'num',
    splitTitle: 'Valor glosado por tipo de item',
    share: { dim: 'item', value: 'Materiais', of: 'num', label: 'Glosa em materiais', foot: 'do valor glosado é de materiais' },
    money: true,
    better: { den: 'up', num: 'down' },
    total: 'Todos os convênios',
  },
}

/** Até quatro cores na composição: com mais partes, as três maiores e "Outros". */
export type SplitGroup = { name: string; values: string[] }

export function splitGroups(ind: IndicatorId): SplitGroup[] {
  const cfg = PAINEL[ind]
  const field = cfg.splitOf === 'num' ? INDICATORS[ind].num.field : INDICATORS[ind].den.field
  const tot = new Map<string, number>()
  for (const c of DATA[ind]) tot.set(String(c[cfg.split]), (tot.get(String(c[cfg.split])) ?? 0) + Number(c[field]))
  const order = [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
  if (order.length <= 4) return order.map((k) => ({ name: k, values: [k] }))
  return [...order.slice(0, 3).map((k) => ({ name: k, values: [k] })), { name: 'Outros', values: order.slice(3) }]
}

/** Os valores do corte principal, do maior para o menor volume. */
export function mainValues(ind: IndicatorId): string[] {
  const cfg = PAINEL[ind]
  const field = INDICATORS[ind].den.field
  const tot = new Map<string, number>()
  for (const c of DATA[ind]) tot.set(String(c[cfg.main]), (tot.get(String(c[cfg.main])) ?? 0) + Number(c[field]))
  return [...tot.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k)
}

export type PainelSpec = {
  code: string
  name: string
  group: string
  months: { key: string; label: string; long: string }[]
  rate: { label: string; kind: 'days' | 'pct'; better: 'up' | 'down'; noun: string; article: string }
  den: { label: string; money: boolean; better: 'up' | 'down' | null }
  num: { label: string; money: boolean; better: 'up' | 'down' | null }
  share: { label: string; of: 'num' | 'den'; foot: string }
  main: { label: string; plural: string; values: string[] }
  split: { label: string; title: string; of: 'num' | 'den'; groups: string[] }
  total: string
  /** [mês, parte do corte principal, grupo da composição, entra no quarto número, num, den] */
  cells: [number, number, number, 0 | 1, number, number][]
  method: { h: string; p: string }[]
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export function painelSpec(ind: IndicatorId): PainelSpec {
  const I = INDICATORS[ind]
  const md = metadadoOf(ind)
  const cfg = PAINEL[ind]
  const values = mainValues(ind)
  const groups = splitGroups(ind)
  const groupOf = new Map(groups.flatMap((g, gi) => g.values.map((v) => [v, gi] as const)))

  /* Agrega as linhas por mês × parte × grupo × quarto número: é o que a página precisa. */
  const acc = new Map<string, [number, number, number, 0 | 1, number, number]>()
  for (const c of DATA[ind]) {
    const m = HISTORY.indexOf(c.mes)
    if (m < 0) continue
    const a = values.indexOf(String(c[cfg.main]))
    const b = groupOf.get(String(c[cfg.split])) ?? 0
    const s: 0 | 1 = String(c[cfg.share.dim]) === cfg.share.value ? 1 : 0
    const key = `${m}|${a}|${b}|${s}`
    const cur = acc.get(key) ?? [m, a, b, s, 0, 0]
    cur[4] += Number(c[I.num.field])
    cur[5] += Number(c[I.den.field])
    acc.set(key, cur)
  }

  const main = DIMENSIONS[cfg.main]
  return {
    code: md.code,
    name: md.name,
    group: md.group,
    months: HISTORY.map((key) => ({ key, label: `${F.monthTick(key)}/${key.slice(2, 4)}`, long: cap(F.monthLong(key)) })),
    rate: { label: md.measures.rate.label, kind: I.unit === '%' ? 'pct' : 'days', better: I.better, noun: I.rateNoun, article: I.article },
    den: { label: md.measures.den.label, money: cfg.money, better: cfg.better.den },
    num: { label: md.measures.num.label, money: cfg.money, better: cfg.better.num },
    share: { label: cfg.share.label, of: cfg.share.of, foot: cfg.share.foot },
    main: { label: cap(main.label), plural: main.plural, values },
    split: { label: cap(DIMENSIONS[cfg.split].label), title: cfg.splitTitle, of: cfg.splitOf, groups: groups.map((g) => g.name) },
    total: cfg.total,
    cells: [...acc.values()],
    method: [
      { h: md.measures.rate.label, p: `${cap(I.definition)}. Nos totais, a razão é das somas, nunca a média das médias de cada ${main.label}.` },
      {
        h: 'Composição e taxa',
        p: `A variação d${I.article} se divide em composição (mudou o peso de cada ${main.label}) e taxa (mudou ${I.article} dentro de cada um). O primeiro insight usa essa conta.`,
      },
      { h: 'Comparações', p: 'Cada variação compara o recorte com o período imediatamente anterior de mesma duração. Percentuais variam em pontos percentuais (p.p.). O período completo não tem comparação.' },
      ...I.missing.slice(0, 1).map((m) => ({ h: 'O que o metadado não traz', p: `${cap(m.what)}: ${m.why}.` })),
    ],
  }
}
