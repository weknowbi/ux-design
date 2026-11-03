import { MONTHS } from '@/engine/data'
import * as F from '@/engine/format'
import { DASHBOARDS, METADADOS, dashboardsOfCode, metadadoOf, type Measure } from '@/engine/catalog'
import {
  apply,
  appTheme,
  boardFilter,
  breakdownRows,
  dimValues,
  measureLabel,
  newBoard,
  starter,
  titleOf,
  wid,
  type Board,
  type BreakdownStyle,
  type Op,
  lookOf,
  PAINEL_LOOK,
  type PainelLook,
  type PainelSection,
  type PainelState,
  type Widget,
} from '@/engine/board'
import { explain, type Rich } from '@/engine/explain'
import { PAINEL, splitGroups } from '@/engine/painel'
import { DIMENSIONS, INDICATORS, type DimId } from '@/engine/semantic'

/**
 * O assistente, no lugar do modelo de verdade.
 *
 * Num produto, o modelo recebe o catálogo e o documento do painel e responde
 * com operações (`Op`), como o Weknow Dash faz com o dashboard. Aqui as
 * operações saem de regras sobre as palavras do pedido, para o protótipo
 * rodar sem chave de API. A tela não sabe a diferença: ela recebe operações
 * e um texto, e só aplica o que o documento aceita.
 */

export type Message = {
  id: string
  role: 'user' | 'ai'
  text: Rich
  /** De onde a resposta saiu: o metadado escolhido e os que também serviriam. */
  sources?: { code: string; name: string; dashboards: string[]; from?: { name: string; folder: string } }
  /** O que mudou no painel, item por item. */
  changes?: string[]
  /** O bloco sobre o qual a pessoa perguntou. */
  about?: string
}

const mid = () => wid('m')

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

const MONTH_NAMES = ['janeiro', 'fevereiro', 'marco', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

/* ──────────────────────────────────────────────────────── vocabulário */

/** O que a frase menciona: valores de corte, cortes, medida e mês. */
function read(b: Board, raw: string) {
  const t = norm(raw)
  const md = metadadoOf(b.ind)
  const values: { dim: DimId; value: string }[] = []
  const vals = dimValues(b.ind)
  for (const [dim, list] of Object.entries(vals) as [DimId, string[]][]) {
    for (const v of list) {
      const n = norm(v)
      const first = n.split(/[\s(]/)[0]
      const aliases = [n, first.length >= 4 ? first : '', n.match(/\d+/)?.[0] ? n.replace(' anos', '').replace(' ou mais', '+') : '']
      if (dim === 'faixa' && /idos/.test(t) && v === '80 anos ou mais') aliases.push('idos')
      if (aliases.some((a) => a && t.includes(a))) values.push({ dim, value: v })
    }
  }
  const dims = INDICATORS[b.ind].dims.filter((d) =>
    DIMENSIONS[d].aliases.some((a) => new RegExp(`\\b${norm(a)}`).test(t) && !values.some((v) => v.dim === d && norm(v.value).includes(norm(a)))),
  )
  let measure: Measure | undefined
  for (const m of ['num', 'den', 'rate'] as Measure[]) if (md.measures[m].aliases.some((a) => t.includes(norm(a)))) {
    measure = m
    break
  }
  let mes: string | undefined
  MONTH_NAMES.forEach((name, i) => {
    if (!t.includes(name)) return
    const mm = String(i + 1).padStart(2, '0')
    const year = t.includes('2025') ? '2025' : t.includes('2026') ? '2026' : undefined
    const hit = [...MONTHS].reverse().find((x) => x.endsWith(`-${mm}`) && (!year || x.startsWith(year)))
    if (hit) mes = hit
  })
  return { t, values, dims, measure, mes }
}

/* ──────────────────────────────────────────────────────────── pedidos */

export type Response = { ops: Op[]; reply: Rich; changes: string[]; understood: boolean; focus?: string }

/**
 * Entende um pedido e devolve as operações. `about` é o bloco em que a
 * pessoa clicou "Editar com IA": "em colunas" vale para ele.
 */
export function respond(b: Board, raw: string, about?: string): Response {
  if (!b.widgets.length) return compose(b, raw)
  const painel = b.widgets.find((w) => w.kind === 'painel')
  if (painel?.kind === 'painel') return respondPainel(b, painel, raw)
  const r = read(b, raw)
  const { t } = r
  const I = INDICATORS[b.ind]
  const ops: Op[] = []
  const changes: string[] = []
  let reply: Rich | null = null
  let focus: string | undefined
  const target = b.widgets.find((w) => w.id === about)
  const lastBreakdown = [...b.widgets].reverse().find((w) => w.kind === 'breakdown')
  const kpiCount = b.widgets.findIndex((w) => w.kind !== 'kpi')
  const afterKpis = kpiCount < 0 ? b.widgets.length : kpiCount

  /* Explicar uma variação. */
  if (/por ?qu|explic|motivo|caus|o que (aconteceu|houve)|por que/.test(t)) {
    const filter = { ...boardFilter(b) }
    for (const v of r.values) filter[v.dim] = v.value
    // Perguntar sobre um bloco de corte é perguntar sobre aquele corte.
    const asked = r.dims[0] ?? (target?.kind === 'breakdown' && !r.values.length ? target.dim : undefined)
    const mes = r.mes ?? b.mes
    const e = explain(b.ind, mes, filter, asked)
    ops.push({ op: 'facts', facts: e.facts }, { op: 'add', widget: e.widget, at: afterKpis })
    changes.push(`Adicionei “${titleOf(b.ind, e.widget)}”`)
    reply = e.reply
    focus = e.widget.id
    return { ops, reply, changes, understood: true, focus }
  }

  /* Filtros. */
  if (/limpa|sem filtro|(tira|remov\w*|apag\w*) (o |os )?filtro/.test(t)) {
    ops.push({ op: 'clearFilters' })
    changes.push('Limpei os filtros')
  } else if (r.values.length && !/troca|muda/.test(t)) {
    // Citar um valor ("só SUS", "Clínica médica por faixa") é recortar o painel nele.
    const byDim = new Map<DimId, string[]>()
    for (const v of r.values) byDim.set(v.dim, [...(byDim.get(v.dim) ?? []), v.value])
    for (const [dim, values] of byDim) {
      ops.push({ op: 'filter', dim, values })
      changes.push(`Filtrei o painel por ${values.join(' e ')}`)
    }
  }

  /* Mês. */
  if (r.mes && r.mes !== b.mes) {
    ops.push({ op: 'month', mes: r.mes })
    changes.push(`Mudei o mês para ${F.monthShort(r.mes)}, comparando com o anterior`)
  }

  /* Tipo de gráfico. */
  const style: BreakdownStyle | undefined = /tabela/.test(t) ? 'table' : /coluna/.test(t) ? 'column' : /barra/.test(t) ? 'bar' : undefined

  /* Remover. */
  if (/remov|\btira\b|apag|exclu|esconde/.test(t) && !/filtro/.test(t)) {
    const victim =
      target ??
      b.widgets.find((w) => r.dims.some((d) => w.kind === 'breakdown' && w.dim === d)) ??
      b.widgets.find((w) => (/tend|mes a mes/.test(t) ? w.kind === 'trend' : /explic/.test(t) ? w.kind === 'explain' : false))
    if (victim) {
      ops.push({ op: 'remove', id: victim.id })
      changes.push(`Removi “${titleOf(b.ind, victim)}”`)
    }
  } else if (r.dims.length && !(/troca|muda/.test(t) && target?.kind === 'breakdown')) {
    /* Novo corte. */
    for (const dim of r.dims) {
      const measure = r.measure ?? 'rate'
      const exists = b.widgets.find((w) => w.kind === 'breakdown' && w.dim === dim && w.measure === measure)
      if (exists) {
        if (style && exists.kind === 'breakdown' && exists.style !== style) {
          ops.push({ op: 'update', id: exists.id, set: { style } })
          changes.push(`Mudei “${titleOf(b.ind, exists)}” para ${styleName(style)}`)
        } else changes.push(`“${titleOf(b.ind, exists)}” já está no painel`)
        focus = exists.id
        continue
      }
      const w: Widget = { id: wid(), kind: 'breakdown', dim, measure, style: style ?? 'bar', span: 3 }
      ops.push({ op: 'add', widget: w })
      changes.push(`Adicionei “${titleOf(b.ind, w)}”`)
      focus = w.id
    }
  } else if (r.dims.length && target?.kind === 'breakdown') {
    ops.push({ op: 'update', id: target.id, set: { dim: r.dims[0] } })
    changes.push(`Troquei o corte de “${titleOf(b.ind, target)}” para ${DIMENSIONS[r.dims[0]].label}`)
    focus = target.id
  } else if (style) {
    const w = target?.kind === 'breakdown' ? target : lastBreakdown
    if (w && w.kind === 'breakdown') {
      ops.push({ op: 'update', id: w.id, set: { style } })
      changes.push(`Mudei “${titleOf(b.ind, w)}” para ${styleName(style)}`)
      focus = w.id
    }
  }

  /* Tendência. */
  if (/tend|mes a mes|evolu|ao longo|histori|por mes/.test(t)) {
    const measure = r.measure ?? 'rate'
    const exists = b.widgets.find((w) => w.kind === 'trend' && w.measure === measure)
    if (!exists) {
      const w: Widget = { id: wid(), kind: 'trend', measure, span: 3 }
      ops.push({ op: 'add', widget: w })
      changes.push(`Adicionei “${titleOf(b.ind, w)}”`)
      focus = w.id
    } else changes.push(`“${titleOf(b.ind, exists)}” já está no painel`)
  } else if (r.measure && target && (target.kind === 'breakdown' || target.kind === 'trend' || target.kind === 'kpi') && /troca|muda|mostra|em /.test(t)) {
    ops.push({ op: 'update', id: target.id, set: { measure: r.measure } })
    changes.push(`“${titleOf(b.ind, target)}” agora mostra ${measureLabel(b.ind, r.measure).toLowerCase()}`)
    focus = target.id
  }

  /* Largura. */
  const w = target ?? undefined
  if (w && /maior|largur|inteir|linha toda|aument/.test(t)) {
    ops.push({ op: 'update', id: w.id, set: { span: 6 } })
    changes.push(`“${titleOf(b.ind, w)}” agora ocupa a linha toda`)
  } else if (w && /menor|metade|diminu/.test(t)) {
    ops.push({ op: 'update', id: w.id, set: { span: 3 } })
    changes.push(`“${titleOf(b.ind, w)}” agora ocupa meia linha`)
  }

  /* Título do painel. */
  const named = raw.match(/(?:chama(?:r)?|renome\w*|t[ií]tulo)(?: (?:de|para|como))?\s*[:“"]?\s*(.+?)["”]?$/i)
  if (named && named[1].length > 2) {
    ops.push({ op: 'title', title: named[1].trim() })
    changes.push(`Renomeei o painel para “${named[1].trim()}”`)
  }

  if (!ops.length && !changes.length) {
    const dims = I.dims.map((d) => DIMENSIONS[d].label).join(', ')
    return {
      ops,
      changes,
      understood: false,
      reply: [
        `Não entendi o que mudar no painel. Neste protótipo eu consigo abrir por ${dims}; filtrar (“só SUS”); trocar o mês; explicar uma variação (“por que a Clínica médica subiu?”); mudar o tipo de gráfico (“em tabela”); ou remover um bloco.`,
      ],
    }
  }
  return { ops, changes, understood: true, focus, reply: reply ?? [ops.length ? 'Apliquei no painel.' : 'O painel já tem isso.'] }
}

/**
 * O primeiro pedido, com o dashboard vazio: qualquer pedido monta o painel
 * executivo do modelo de referência (ver `composePainel`), com tema e menu
 * próprios, e o resto do pedido (período, filtro, destaque, tema, visual)
 * vale sobre ele. Criar nunca cai nos blocos no visual do Weknow: eles só
 * entram quando a pessoa pede, já com o painel montado ("trocar pelos blocos").
 *
 * Com uma diretriz do cliente, o painel já nasce com o tema e o visual que
 * ela pede; o pedido vem depois e ainda pode mudar o que ela disse.
 */
function compose(b: Board, raw: string): Response {
  const base = composePainel(b, b.guide ? guideSet(b, b.guide.text) : {})
  const add = base.ops[0]
  if (add.op !== 'add' || add.widget.kind !== 'painel') return base
  const rest = respondPainel(apply(b, base.ops), add.widget, raw)
  // A troca pelos blocos não vale no primeiro pedido: o "blocos" de um pedido longo não é isso.
  if (!rest.understood || rest.ops.some((o) => o.op === 'remove')) return base
  return { ...base, ops: [...base.ops, ...rest.ops], changes: [...base.changes, ...rest.changes] }
}

/**
 * O que uma diretriz pede ao painel: o tema (o primeiro que ela cita, como
 * em "tema claro ao abrir, com o botão para o escuro"; sem citar, ele abre no
 * do Weknow) e o visual que o Criar com IA entende (cores, cor própria,
 * densidade, cantos, linhas e seções escondidas). O resto do texto é para a
 * IA de verdade, no produto.
 */
export function guideSet(b: Board, text: string): Partial<PainelState> {
  const t = norm(text)
  const w: Extract<Widget, { kind: 'painel' }> = { id: '', kind: 'painel', span: 6, period: '12m', filter: 'all', highlight: null, theme: 'dark' }
  const set: Partial<PainelState> = { ...readLook(b, w, text, t).set }
  const theme = t.match(/\b(claro|branco|light|escuro|dark|preto)\b/)?.[1]
  if (theme) set.theme = /claro|branco|light/.test(theme) ? 'light' : 'dark'
  return set
}

/* ─────────────────────────────────────────────────── painel executivo */

/* O pedido de painel inteiro monta o painel executivo: o desenho do modelo
   de referência (`public/modelos/painel-executivo.html`) com os números do
   metadado (`engine/painel.ts`). Pela conversa se muda o que ele expõe:
   período, filtro no corte principal, destaque na composição e tema. */
const PERIODOS: Record<PainelState['period'], string> = { '6m': 'os últimos 6 meses', '12m': 'os últimos 12 meses', all: 'o período completo' }

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)

/** `guide`: o que a diretriz do cliente pede (ver `guideSet`); vazio, vale o padrão do Weknow. */
function composePainel(b: Board, guide: Partial<PainelState> = {}): Response {
  const md = metadadoOf(b.ind)
  const cfg = PAINEL[b.ind]
  const main = DIMENSIONS[cfg.main]
  /* Abre no tema do Weknow de quem cria, a não ser que a diretriz peça outro. */
  const widget: Extract<Widget, { kind: 'painel' }> = { id: wid(), kind: 'painel', span: 6, period: '12m', filter: 'all', highlight: null, theme: appTheme(), ...guide }
  const m = md.measures
  const dark = widget.theme === 'dark'
  return {
    ops: [{ op: 'add', widget }],
    understood: true,
    changes: [
      ...(b.guide ? [`Segui a diretriz “${b.guide.name}”`] : []),
      `${m.rate.label}, ${lower(m.den.label)}, ${lower(m.num.label)} e ${lower(cfg.share.label)} no topo, com seta e % contra o período anterior`,
      `${m.rate.label} mês a mês contra o mesmo mês do ano anterior, com os insights do recorte ao lado`,
      `${m.den.label} por mês e ${lower(m.rate.label)} por ${main.label}`,
      `${cfg.splitTitle} e o desempenho de cada ${main.label}`,
    ],
    reply: [
      `Montei o painel executivo com os dados do metadado ${md.code} - ${md.name}, nos últimos 12 meses contra os 12 anteriores. Os insights saem das contas do recorte, inclusive quanto da variação de ${lower(m.rate.label)} vem da composição e quanto vem de cada ${main.label}. Ele abre no tema ${dark ? 'escuro' : 'claro'}, e o botão “Tema ${dark ? 'claro' : 'escuro'}” fica no topo. Por aqui eu mudo o período, filtro por ${main.label}, destaco uma parte de ${lower(cfg.splitTitle)} e troco o tema; e também o visual: cores, densidade, cantos, linhas e quais seções aparecem.`,
    ],
  }
}

function respondPainel(b: Board, w: Extract<Widget, { kind: 'painel' }>, raw: string): Response {
  const r = read(b, raw)
  const { t } = r
  const cfg = PAINEL[b.ind]
  const main = DIMENSIONS[cfg.main]
  const groups = splitGroups(b.ind)

  /* A saída para quem quer editar bloco a bloco: troca o painel pelos blocos de sempre. */
  if (/\bblocos?\b|editave/.test(t)) {
    const widgets = starter(b.ind, INDICATORS[b.ind].dims.slice(0, 2))
    return {
      // Os blocos herdam o tema que o painel estava mostrando.
      ops: [{ op: 'remove', id: w.id }, ...widgets.map((widget): Op => ({ op: 'add', widget })), { op: 'theme', theme: w.theme }],
      understood: true,
      changes: ['Troquei o painel executivo pelos blocos do metadado'],
      reply: ['Troquei o painel executivo pelos blocos do metadado, que se editam um a um: tipo de gráfico, medida, largura, filtro e explicação.'],
    }
  }

  const set: Partial<PainelState> = {}
  if (/limpa|tira (os )?filtros|sem filtro/.test(t)) {
    set.filter = 'all'
    set.highlight = null
  } else {
    if (/\b6 meses|seis meses|semestre/.test(t)) set.period = '6m'
    else if (/\b12 meses|doze meses|ultimo ano|um ano/.test(t)) set.period = '12m'
    else if (/periodo (completo|todo|inteiro)|todo o periodo|desde o inicio/.test(t) || (/\btudo\b/.test(t) && !/(mostra|volta)\w* tudo/.test(t))) set.period = 'all'
    if (new RegExp(`todos os ${norm(main.plural)}|consolidad|tira o filtro`).test(t)) set.filter = 'all'
    else {
      const v = r.values.find((x) => x.dim === cfg.main)
      if (v) set.filter = v.value
    }
    if (/tira o destaque|sem destaque/.test(t)) set.highlight = null
    else {
      const v = r.values.find((x) => x.dim === cfg.split)
      const g = v && groups.find((x) => x.values.includes(v.value))
      if (g) set.highlight = g.name
    }
  }
  if (/\b(claro|branco|light)\b/.test(t)) set.theme = 'light'
  else if (/\b(escuro|dark|preto)\b/.test(t)) set.theme = 'dark'
  const look = readLook(b, w, raw, t)
  Object.assign(set, look.set)

  const changes: string[] = []
  if (set.period && set.period !== w.period) changes.push(`Período: ${PERIODOS[set.period]}`)
  if (set.filter !== undefined && set.filter !== w.filter) changes.push(set.filter === 'all' ? `Todos os ${main.plural}` : `${main.label.charAt(0).toUpperCase() + main.label.slice(1)}: ${set.filter}`)
  if (set.highlight !== undefined && set.highlight !== w.highlight) changes.push(set.highlight ? `Destaque: ${set.highlight}` : 'Sem destaque')
  if (set.theme && set.theme !== w.theme) changes.push(set.theme === 'light' ? 'Tema claro' : 'Tema escuro')
  changes.push(...look.changes)

  if (!Object.keys(set).length)
    return {
      ops: [],
      understood: false,
      changes: [],
      reply: [
        look.note ??
          `Neste painel eu mudo o período (6 meses, 12 meses ou o período completo), filtro por ${main.label}, destaco uma parte de ${lower(cfg.splitTitle)} e troco o tema. No visual, troco as cores (azul, verde, roxo ou uma cor própria em hexadecimal), a densidade, os cantos, as linhas e escondo ou volto seções. Para montar gráfico a gráfico, peça “trocar pelos blocos”.`,
      ],
    }
  if (!changes.length) return { ops: [], understood: true, changes: [], reply: ['O painel já está assim.'] }
  const visualOnly = Object.keys(set).every((k) => k in PAINEL_LOOK || k === 'theme')
  return {
    ops: [{ op: 'painel', id: w.id, set }],
    understood: true,
    changes,
    reply: [
      // O que mudou já vem na lista embaixo da resposta; o texto diz só o efeito.
      ['Apliquei no painel.', visualOnly ? 'Os números não mudam.' : 'Os números, gráficos e insights acompanham.', look.note].filter(Boolean).join(' '),
    ],
  }
}

/* ── O visual do painel pelo Criar com IA ──
   Paleta, cor própria, densidade, cantos, linhas e seções. A página do painel
   aplica; aqui só se entende o pedido e se diz o que mudou. */

const PALETTE_NAME: Record<PainelLook['palette'], string> = { blue: 'azul, o padrão do Weknow', green: 'verde', violet: 'roxo' }
const CORNER_NAME: Record<PainelLook['corners'], string> = { round: 'Cantos arredondados', soft: 'Cantos suaves', square: 'Cantos retos' }

function sectionNames(b: Board): Record<PainelSection, string> {
  const md = metadadoOf(b.ind)
  const cfg = PAINEL[b.ind]
  return {
    insights: 'os insights',
    volume: `o gráfico de ${lower(md.measures.den.label)} por mês`,
    rate: `o gráfico de ${lower(md.measures.rate.label)} por ${DIMENSIONS[cfg.main].label}`,
    composition: `a composição (${lower(cfg.splitTitle)})`,
    table: 'a tabela',
    notes: 'as notas de método',
    sparks: 'as minilinhas dos números',
  }
}

const listPt = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)

/** Contraste WCAG entre duas cores em hexadecimal. */
function contrast(a: string, b: string) {
  const lum = (h: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(h.slice(i, i + 2), 16) / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    })
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl
  }
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
  return (x + 0.05) / (y + 0.05)
}

function readLook(b: Board, w: Extract<Widget, { kind: 'painel' }>, raw: string, t: string) {
  const cur = lookOf(w)
  const set: Partial<PainelLook> = {}
  const changes: string[] = []
  let note: string | undefined

  if (/(visual|aparencia|estilo|layout) (do )?padrao|restaur|reset|volta\w* (tudo |o visual )?(ao|pro|para o) padrao/.test(t)) {
    Object.assign(set, PAINEL_LOOK)
    if (JSON.stringify(cur) !== JSON.stringify(PAINEL_LOOK)) changes.push('Visual de volta ao padrão do Weknow')
    return { set, changes, note }
  }

  /* Cores: uma das paletas, ou uma cor própria (a do cliente) para a principal. */
  const hex = raw.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i)
  if (hex) {
    const h = hex[1].length === 3 ? hex[1].replace(/./g, (c) => c + c) : hex[1]
    set.accent = `#${h.toUpperCase()}`
    if (set.accent !== cur.accent) changes.push(`Cor principal: ${set.accent}`)
    const low = (
      [
        ['escuro', '#1A1B1C'],
        ['claro', '#FFFFFF'],
      ] as const
    )
      .map(([n, bg]) => ({ n, c: contrast(set.accent!, bg) }))
      .filter((x) => x.c < 3)
    if (low.length)
      note = `Atenção: no tema ${low.map((x) => x.n).join(' e no ')} essa cor fica com contraste de ${low
        .map((x) => x.c.toFixed(1).replace('.', ','))
        .join(' e ')}:1 contra o cartão, e abaixo de 3:1 as linhas e barras se perdem. Um tom ${low[0].n === 'escuro' ? 'mais claro' : 'mais escuro'} resolve.`
  } else if (/cor(es)? (padrao|do weknow|original)|paleta padrao|tira a cor (propria|principal)/.test(t)) {
    set.palette = 'blue'
    set.accent = null
    if (cur.palette !== 'blue' || cur.accent) changes.push(`Cores: ${PALETTE_NAME.blue}`)
  } else {
    const pal: PainelLook['palette'] | undefined = /\b(azul|azuis)\b/.test(t)
      ? 'blue'
      : /\bverdes?\b/.test(t)
        ? 'green'
        : /\b(roxo|roxa|roxos|roxas|violeta|lilas)\b/.test(t)
          ? 'violet'
          : undefined
    if (pal) {
      set.palette = pal
      set.accent = null
      if (pal !== cur.palette || cur.accent) changes.push(`Cores: ${PALETTE_NAME[pal]}`)
    } else if (/\b(vermelh\w*|rosa|laranja|amarel\w*|marrom|dourad\w*)\b/.test(t))
      note =
        'Vermelho, laranja e amarelo ficam para piora e alerta, por isso não viram paleta. As paletas são azul (a do Weknow), verde e roxo; e qualquer cor entra como a principal se vier em hexadecimal, como “cor principal #0F766E”.'
  }

  /* Densidade */
  const dens: PainelLook['density'] | undefined = /compact|mais dens|menos espaco|menos respiro|mais junto|apertad|caber mais/.test(t)
    ? 'compact'
    : /confortave|espacad|arejad|mais respiro|mais espaco|densidade normal/.test(t)
      ? 'comfortable'
      : undefined
  if (dens) {
    set.density = dens
    if (dens !== cur.density) changes.push(dens === 'compact' ? 'Densidade compacta' : 'Densidade confortável')
  }

  /* Cantos dos cartões */
  if (/canto|borda|quina|cart(ao|oes)/.test(t)) {
    const c: PainelLook['corners'] | undefined = /reto|quadrad|sem arredond/.test(t)
      ? 'square'
      : /suave|pouco arredond|menos arredond/.test(t)
        ? 'soft'
        : /arredond|redond/.test(t)
          ? 'round'
          : undefined
    if (c) {
      set.corners = c
      if (c !== cur.corners) changes.push(CORNER_NAME[c])
    }
  }

  /* Linhas dos gráficos */
  const lines: PainelLook['lines'] | undefined = /linhas? (mais )?(retas?|quebradas?)|sem curva/.test(t)
    ? 'straight'
    : /linhas? (mais )?(curvas?|suaves?|suavizadas?|arredondadas?)/.test(t)
      ? 'smooth'
      : undefined
  if (lines) {
    set.lines = lines
    if (lines !== cur.lines) changes.push(lines === 'straight' ? 'Linhas retas' : 'Linhas curvas')
  }

  /* Seções: esconder e voltar */
  const names = sectionNames(b)
  const cfg = PAINEL[b.ind]
  const md = metadadoOf(b.ind)
  const hidden = new Set(cur.hidden)
  if (/mostra\w* (tudo|todas)|todas as secoes|volta\w* (tudo|todas)/.test(t)) hidden.clear()
  else {
    const table = /tabela|desempenho/
    const found: [PainelSection, RegExp][] = [
      ['insights', /insights?|sinais/],
      ['volume', new RegExp(`volume|${norm(md.measures.den.label)} por mes`)],
      ['table', table],
      ['rate', new RegExp(`(grafico|barras|${norm(md.measures.rate.label)}) por ${norm(DIMENSIONS[cfg.main].label)}`)],
      ['composition', new RegExp(`composicao|rosca|empilhad|${norm(cfg.splitTitle)}`)],
      ['notes', /\bnotas?\b|metodo|como ler|rodape/],
      ['sparks', /mini ?graficos?|minilinhas?|sparks?|linhas? (dos|nos) (numeros|kpis|cartoes)/],
    ]
    /* Cada seção segue o verbo mais próximo antes dela: em "sem a tabela e
       com os insights" a tabela some e os insights voltam. */
    const lastAt = (re: RegExp, s: string) => Math.max(-1, ...[...s.matchAll(re)].map((m) => m.index!))
    for (const [sec, re] of found) {
      const m = re.exec(t)
      if (!m || (sec === 'rate' && table.test(t))) continue
      const before = t.slice(0, m.index)
      const show = lastAt(/\b(mostra\w*|volta\w*|exib\w*|reexib\w*|poe|coloca\w*|traz\w*|com)\b/g, before)
      const hide = lastAt(/\b(escond\w*|ocult\w*|tira\w*|remov\w*|sem|some|sumir|apaga\w*)\b/g, before)
      if (show > hide) hidden.delete(sec)
      else if (hide >= 0) hidden.add(sec)
    }
  }
  const order = Object.keys(names) as PainelSection[]
  const next = order.filter((s) => hidden.has(s))
  if (next.join() !== cur.hidden.join()) {
    set.hidden = next
    const gone = next.filter((s) => !cur.hidden.includes(s))
    const back = cur.hidden.filter((s) => !next.includes(s))
    if (gone.length) changes.push(`Escondi ${listPt(gone.map((s) => names[s]))}`)
    if (back.length) changes.push(`Voltei ${listPt(back.map((s) => names[s]))}`)
  }

  return { set, changes, note }
}

/** O que sugerir no painel: a parte que mais mudou no mês, a maior da composição, o outro período, o outro tema e um ajuste de visual. */
function painelSuggestions(b: Board, p: Extract<Widget, { kind: 'painel' }>): string[] {
  const cfg = PAINEL[b.ind]
  const mover = breakdownRows(b, cfg.main, 'rate').sort((x, y) => Math.abs(y.v - y.v0) - Math.abs(x.v - x.v0))[0]
  const top = splitGroups(b.ind)[0]
  const look = lookOf(p)
  return [
    p.filter === 'all' ? (mover ? `Só ${mover.key}` : '') : `Todos os ${DIMENSIONS[cfg.main].plural}`,
    p.period === '6m' ? 'Últimos 12 meses' : 'Últimos 6 meses',
    p.highlight ? 'Tira o destaque' : top ? `Destacar ${top.name}` : '',
    p.theme === 'dark' ? 'Tema claro' : 'Tema escuro',
    look.density === 'comfortable' ? 'Densidade compacta' : look.palette === 'blue' && !look.accent ? 'Cores em verde' : 'Visual padrão',
  ].filter(Boolean)
}

const styleName = (s: BreakdownStyle) => (s === 'table' ? 'tabela' : s === 'column' ? 'colunas' : 'barras')

/* ──────────────────────────────────────────────────────── sugestões */

/** O que pedir em seguida, a partir do que o painel mostra agora. */
export function suggestions(b: Board): string[] {
  const p = b.widgets.find((w) => w.kind === 'painel')
  if (p?.kind === 'painel') return painelSuggestions(b, p)
  const I = INDICATORS[b.ind]
  const out: string[] = []
  const firstBd = b.widgets.find((w) => w.kind === 'breakdown')
  const hasExplain = b.widgets.some((w) => w.kind === 'explain')
  if (!hasExplain) out.push(`Por que ${I.article} mudou em ${F.monthName(b.mes)}?`)
  if (firstBd && firstBd.kind === 'breakdown') {
    const top = breakdownRows(b, firstBd.dim, 'rate').sort((x, y) => Math.abs(y.v - y.v0) - Math.abs(x.v - x.v0))[0]
    if (top && !b.dims[firstBd.dim]?.length) out.push(`Só ${top.key}`)
  }
  const unused = I.dims.find((d) => !b.widgets.some((w) => w.kind === 'breakdown' && w.dim === d))
  if (unused) out.push(`Abrir por ${DIMENSIONS[unused].label}`)
  if (!b.widgets.some((w) => w.kind === 'trend' && w.measure === 'den')) out.push(`${metadadoOf(b.ind).measures.den.label} mês a mês`)
  if (Object.values(b.dims).some((v) => v?.length)) out.push('Limpar filtros')
  return out.slice(0, 4)
}

/* ──────────────────────────────────────────────────────────── início */

/** De onde a análise parte: um metadado, ou um dashboard do portal (e o metadado dele). */
export type Origin = { kind: 'metadado'; code: string } | { kind: 'dashboard'; id: string }

/**
 * Cria o dashboard, vazio: escolher a fonte já abre o editor, e o primeiro
 * pedido na caixa de baixo é que monta o painel (ver `compose`). Do dashboard
 * de origem vêm os dados e os cortes que a barra dele oferece; ele não muda.
 *
 * Com `request`, o dashboard já nasce montado: é o caminho dos exemplos.
 */
export function create(origin: Origin, request?: string): { board: Board; messages: Message[]; focus?: string } | null {
  const dash = origin.kind === 'dashboard' ? DASHBOARDS.find((d) => d.id === origin.id) : undefined
  const md = METADADOS.find((m) => m.code === (dash ? dash.code : origin.kind === 'metadado' ? origin.code : ''))
  if (!md) return null
  const q = request?.trim()
  /* Nome provisório, para trocar no título: o do dashboard de origem com
     "(novo)", senão o "Original" e o novo apareceriam iguais na pasta. */
  const title = dash ? `${dash.name} (novo)` : cap(md.name)
  let board = newBoard(md.ind, title, [], dash ? { dashboard: dash.name, folder: dash.folder, dims: dash.dims } : undefined)
  let r: Response | null = null
  if (q) {
    r = respond(board, q)
    board = apply(board, r.ops)
  }
  // Criar não conta como mudança a publicar.
  board = { ...board, saved: undefined }

  const sources: Message['sources'] = {
    code: md.code,
    name: md.name,
    dashboards: dashboardsOfCode(md.code).map((d) => d.name),
    from: dash ? { name: dash.name, folder: dash.folder } : undefined,
  }
  const intro: Rich = dash
    ? [`Carreguei os dados de “${dash.name}”: o metadado ${md.code} - ${md.name}, com os mesmos filtros. O original continua como está. `]
    : [`Carreguei o metadado ${md.code} - ${md.name}. `]
  intro.push('Diga o que você quer ver e eu monto o dashboard seguindo a configuração do metadado.')
  return {
    board,
    focus: r?.focus,
    messages: [
      { id: mid(), role: 'ai', text: intro, sources },
      ...(q && r
        ? [
            { id: mid(), role: 'user' as const, text: [q] },
            { id: mid(), role: 'ai' as const, text: r.reply, changes: r.understood ? r.changes : undefined },
          ]
        : []),
    ],
  }
}

const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function userMessage(text: string, about?: string): Message {
  return { id: mid(), role: 'user', text: [text], about }
}
export function aiMessage(text: Rich, changes?: string[]): Message {
  return { id: mid(), role: 'ai', text, changes }
}
