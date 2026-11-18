import { catalogItem } from '@/engine/catalog'
import { CURRENT, DATA, PREVIOUS, YEAR_AGO, type Cell } from '@/engine/data'
import * as F from '@/engine/format'
import type { PlanOption } from '@/engine/mcp'
import { call, readCall, type Step } from '@/engine/tools'

/**
 * Perguntas que terminam numa resposta, e não num dashboard: "por que subiu",
 * "qual convênio mais glosou", "um resumo para a diretoria", "o que é". Nem
 * todo pedido no Weknow IA vira um painel; a maioria das dúvidas do dia a dia
 * se resolve lendo os dados e respondendo.
 *
 * A resposta é markdown (títulos, listas, tabelas, negrito), e os números
 * saem dos mesmos dados dos dashboards (`engine/data`), então batem com o que
 * o painel mostra. Num produto, quem escreve é o modelo, com as mesmas
 * ferramentas do MCP; aqui são regras, como o resto do `mcp.ts`.
 */

/** `about`: o metadado lido, ou os metadados, quando a resposta cruza mais de um. */
export type Answer = { reply: string; steps: Step[]; about: string | string[]; options?: PlanOption[] }

const read = (code: string) => readCall(catalogItem(code)!)
/** A consulta aos dados de um metadado, como o MCP a faria: o que se pediu e quantas linhas voltaram. */
const query = (code: string, labelText: string, input: Record<string, string>) => {
  const ind = code === '21' ? 'permanencia' : 'glosa'
  const months = (input.periodo ?? '').split(',').map((m) => m.trim())
  const rows = DATA[ind].filter((c) => months.includes(String(c.mes))).length
  return call('consultar_dados', labelText, { metadado: code, ...input }, [`${F.num(rows)} linhas agregadas`])
}

type Filter = Partial<Record<string, string>>
const cells = (ind: 'permanencia' | 'glosa', mes: string, f: Filter = {}) =>
  DATA[ind].filter((c) => c.mes === mes && Object.entries(f).every(([k, v]) => c[k] === v))
const sum = (xs: Cell[], field: string) => xs.reduce((a, c) => a + Number(c[field]), 0)
const uniq = (xs: Cell[], field: string) => [...new Set(xs.map((c) => String(c[field])))]

const days = (v: number) => `${F.num(v, 1)} dias`
const signedDays = (v: number) => `${F.signed(v, 1)} ${Math.abs(Number(v.toFixed(1))) === 1 ? 'dia' : 'dias'}`
const rate = (v: number) => `${F.num(v * 100, 1)}%`
const pp = (v: number, digits = 1) => `${F.signed(v * 100, digits)} p.p.`
const growth = (a: number, b: number) => `${F.signed(((b - a) / a) * 100, 0)}%`
const row = (xs: (string | number)[]) => `| ${xs.join(' | ')} |`
const table = (head: string[], rows: (string | number)[][], right: number[] = []) =>
  [row(head), row(head.map((_, i) => (right.includes(i) ? '---:' : '---'))), ...rows.map(row)].join('\n')

const cur = F.monthName(CURRENT)
const prev = F.monthName(PREVIOUS)

/* ───────────────────────────────────────────── permanência: por quê */

function permanencia(): Answer {
  const los = (xs: Cell[]) => sum(xs, 'paciente_dias') / sum(xs, 'saidas')
  const a = cells('permanencia', PREVIOUS)
  const b = cells('permanencia', CURRENT)
  const total0 = sum(a, 'saidas')
  const total1 = sum(b, 'saidas')
  const sectors = uniq(b, 'setor').map((s) => {
    const x0 = a.filter((c) => c.setor === s)
    const x1 = b.filter((c) => c.setor === s)
    return { s, n0: sum(x0, 'saidas'), n1: sum(x1, 'saidas'), l0: los(x0), l1: los(x1) }
  })
  /* A alta separada em duas partes que somam o total: quem foi internado (o
     peso de cada setor) e quanto tempo ficou (a permanência dentro dele). */
  const mix = sectors.reduce((acc, x) => acc + (x.n1 / total1 - x.n0 / total0) * x.l0, 0)
  const within = sectors.reduce((acc, x) => acc + (x.n1 / total1) * (x.l1 - x.l0), 0)
  const delta = los(b) - los(a)
  const share = Math.round((mix / delta) * 100)

  const cm = { setor: 'Clínica médica' }
  const old = (mes: string) =>
    sum(cells('permanencia', mes, { ...cm, entrada: 'Urgência', faixa: '60 a 79 anos' }), 'saidas') +
    sum(cells('permanencia', mes, { ...cm, entrada: 'Urgência', faixa: '80 anos ou mais' }), 'saidas')
  const o0 = old(PREVIOUS)
  const o1 = old(CURRENT)
  const v0 = los(cells('permanencia', PREVIOUS, { ...cm, faixa: '80 anos ou mais' }))
  const v1 = los(cells('permanencia', CURRENT, { ...cm, faixa: '80 anos ou mais' }))
  const clinic = sectors.find((x) => x.s === cm.setor)!

  const reply = [
    `A permanência média foi de **${days(los(b))}** em ${cur}, contra **${days(los(a))}** em ${prev} (**${signedDays(delta)}**). A maior parte da alta (${share}%) vem de **quem foi internado**, e não de os pacientes ficarem mais tempo.`,
    '### O que mudou',
    `- **Mais idosos pela urgência na Clínica médica.** As saídas de 60 anos ou mais que entraram pela urgência foram de ${F.num(o0)} para **${F.num(o1)}** (${growth(o0, o1)}).`,
    `- **A Clínica médica é o setor de internação mais longa** (${days(clinic.l0)} em ${prev}). Quando ela recebe mais gente, a média do hospital sobe, mesmo sem ninguém ficar mais tempo.`,
    `- **Os de 80 anos ou mais também ficaram mais.** Na Clínica médica, a permanência deles foi de ${days(v0)} para **${days(v1)}**.`,
    '### Por setor',
    table(
      ['Setor', `Saídas ${F.monthTick(PREVIOUS)}`, `Saídas ${F.monthTick(CURRENT)}`, `Permanência ${F.monthTick(PREVIOUS)}`, `Permanência ${F.monthTick(CURRENT)}`],
      [...sectors].sort((x, y) => y.n1 - y.n0 - (x.n1 - x.n0)).map((x) => [x.s, F.num(x.n0), F.num(x.n1), F.num(x.l0, 1), F.num(x.l1, 1)]),
      [1, 2, 3, 4],
    ),
    '### De onde vem a alta',
    `- **Mix de setores:** ${signedDays(mix)}, por haver mais saídas nos setores de internação longa.`,
    `- **Tempo dentro de cada setor:** ${signedDays(within)}.`,
    `> Para acompanhar, vale olhar a Clínica médica por faixa etária e tipo de entrada: é ali que a mudança começa.`,
  ].join('\n\n')

  return {
    about: '21',
    reply,
    steps: [
      read('21'),
      query('21', `Comparando ${cur} com ${prev}`, { medidas: 'saídas, paciente-dia', por: 'setor, faixa etária, tipo de entrada', periodo: `${PREVIOUS}, ${CURRENT}` }),
      call('decompor_variacao', 'Separando o efeito de cada setor', { medida: 'permanência média', por: 'setor' }, [`Mix de setores: ${signedDays(mix)}`, `Dentro de cada setor: ${signedDays(within)}`]),
    ],
    options: [{ label: 'Criar um dashboard disso', text: 'Criar um dashboard da permanência média por setor e faixa etária' }],
  }
}

/* ─────────────────────────────────────── glosa: qual convênio mais glosou */

function glosaConvenio(): Answer {
  const a = cells('glosa', PREVIOUS)
  const b = cells('glosa', CURRENT)
  const r = (xs: Cell[]) => sum(xs, 'valor_glosado') / sum(xs, 'valor_faturado')
  const list = uniq(b, 'convenio')
    .map((c) => {
      const x0 = a.filter((x) => x.convenio === c)
      const x1 = b.filter((x) => x.convenio === c)
      return { c, fat: sum(x1, 'valor_faturado'), glo: sum(x1, 'valor_glosado'), r0: r(x0), r1: r(x1) }
    })
    .sort((x, y) => y.glo - x.glo)
  const top = list[0]
  const up = [...list].sort((x, y) => y.r1 - y.r0 - (x.r1 - x.r0))[0]
  const items = uniq(b, 'item')
    .map((it) => {
      const x0 = a.filter((x) => x.convenio === up.c && x.item === it)
      const x1 = b.filter((x) => x.convenio === up.c && x.item === it)
      return { it, r0: r(x0), r1: r(x1), extra: sum(x1, 'valor_glosado') - sum(x1, 'valor_faturado') * r(x0) }
    })
    .sort((x, y) => y.extra - x.extra)
  const item = items[0]
  const extraTotal = up.glo - up.fat * up.r0

  const reply = [
    `Em ${cur}, quem mais glosou em valor foi **${top.c}**: **${F.money(top.glo)}** de ${F.money(top.fat)} faturados.${up.c !== top.c ? ` Mas a mudança do mês está em **${up.c}**, cuja taxa de glosa foi de ${rate(up.r0)} para **${rate(up.r1)}**.` : ''}`,
    table(
      ['Convênio', 'Faturado', 'Glosado', 'Taxa de glosa', `vs ${F.monthShort(PREVIOUS)}`],
      list.map((x) => [x.c === up.c ? `**${x.c}**` : x.c, F.money(x.fat), F.money(x.glo), rate(x.r1), pp(x.r1 - x.r0, 2)]),
      [1, 2, 3, 4],
    ),
    `### Onde está a alta da ${up.c}`,
    `- **${item.it}** concentram quase tudo: a taxa foi de ${rate(item.r0)} para **${rate(item.r1)}**.`,
    `- Com a taxa de ${prev}, a ${up.c} teria glosado cerca de **${F.money(extraTotal)} a menos** em ${cur}.`,
    `- O faturamento da ${up.c} ficou estável, então não é volume: é a operadora recusando mais itens.`,
    `> Vale levar ao time de contas médicas as glosas de ${item.it.toLowerCase()} da ${up.c} em ${cur}, para ver se o motivo se repete.`,
  ].join('\n\n')

  return {
    about: '32',
    reply,
    steps: [read('32'), query('32', `Comparando ${cur} com ${prev}`, { medidas: 'valor faturado, valor glosado', por: 'convênio, tipo de item', periodo: `${PREVIOUS}, ${CURRENT}` })],
    options: [{ label: `Detalhar ${item.it.toLowerCase()} da ${up.c}`, text: `Glosas de ${item.it.toLowerCase()} da ${up.c} por setor em ${cur}` }],
  }
}

/* ──────────────────────────────────── internações: resumo para a reunião */

function resumoInternacoes(): Answer {
  const b = cells('permanencia', CURRENT)
  const a = cells('permanencia', PREVIOUS)
  const y = cells('permanencia', YEAR_AGO)
  const n = (xs: Cell[]) => sum(xs, 'saidas')
  const pd = (xs: Cell[]) => sum(xs, 'paciente_dias')
  const los = (xs: Cell[]) => pd(xs) / n(xs)
  const urg = (xs: Cell[]) => n(xs.filter((c) => c.entrada === 'Urgência')) / n(xs)
  const old = (xs: Cell[]) => n(xs.filter((c) => c.faixa === '80 anos ou mais' || c.faixa === '60 a 79 anos')) / n(xs)
  const bySector = uniq(b, 'setor')
    .map((s) => ({ s, n: n(b.filter((c) => c.setor === s)) }))
    .sort((p, q) => q.n - p.n)

  const reply = [
    `**Internações · ${F.monthLong(CURRENT)}**`,
    table(
      ['Indicador', F.monthShort(CURRENT), `vs ${F.monthShort(PREVIOUS)}`, `vs ${F.monthShort(YEAR_AGO)}`],
      [
        ['Saídas', F.num(n(b)), growth(n(a), n(b)), growth(n(y), n(b))],
        ['Paciente-dia', F.num(pd(b)), growth(pd(a), pd(b)), growth(pd(y), pd(b))],
        ['Permanência média', days(los(b)), signedDays(los(b) - los(a)), signedDays(los(b) - los(y))],
        ['Entradas pela urgência', F.pct(urg(b)), pp(urg(b) - urg(a)), pp(urg(b) - urg(y))],
      ],
      [1, 2, 3],
    ),
    '### Destaques',
    `1. **A permanência média subiu para ${days(los(b))}**, puxada pela Clínica médica, que recebeu mais idosos pela urgência.`,
    `2. **${F.pct(old(b))} das saídas foram de pacientes com 60 anos ou mais**, contra ${F.pct(old(a))} em ${prev}.`,
    `3. **${bySector[0].s}** segue com o maior volume (${F.num(bySector[0].n)} saídas), seguida de ${bySector[1].s} (${F.num(bySector[1].n)}).`,
    '### Para a pauta',
    '- Capacidade da Clínica médica, se a procura de idosos pela urgência continuar em novembro.',
    '- Plano de alta para os pacientes de 80 anos ou mais, o grupo que mais ficou internado.',
  ].join('\n\n')

  return {
    about: '21',
    reply,
    steps: [read('21'), query('21', `Comparando com ${prev} e com ${F.monthLong(YEAR_AGO)}`, { medidas: 'saídas, paciente-dia', por: 'setor, faixa etária, tipo de entrada', periodo: `${YEAR_AGO}, ${PREVIOUS}, ${CURRENT}` })],
  }
}

/* ─────────────────────────────────────────────── glosa: o que é */

function glosaConceito(): Answer {
  const b = cells('glosa', CURRENT)
  const fat = sum(b, 'valor_faturado')
  const glo = sum(b, 'valor_glosado')
  const reply = [
    'Glosa é a parte de uma conta que o convênio **se recusa a pagar**: um material sem autorização, um procedimento sem justificativa no prontuário, um valor fora da tabela combinada.',
    '### Como o Weknow calcula',
    '`Taxa de glosa = valor glosado ÷ valor faturado`',
    `Em ${cur}, o hospital faturou **${F.money(fat)}** e teve **${F.money(glo)}** glosados, uma taxa de **${rate(glo / fat)}**.`,
    '### Os tipos mais comuns',
    '- **Administrativa:** falta de guia, autorização ou assinatura.',
    '- **Técnica:** o convênio discorda do procedimento ou da quantidade usada.',
    '- **Linear:** um corte em todas as contas, sem análise uma a uma.',
    '> Parte do valor glosado volta com recurso. A taxa do Weknow é a glosa inicial, antes dele.',
  ].join('\n\n')
  return { about: '32', reply, steps: [read('32'), query('32', `Somando ${cur}`, { medidas: 'valor faturado, valor glosado', periodo: CURRENT })] }
}

/* ──────────────────────────────────────── metadado com a execução falhando */

function mapaFalhou(): Answer {
  const reply = [
    'O **16 - MAPA** não aparece porque **a última execução dele falhou**. Enquanto ele não roda de novo com sucesso, não há dados novos, e o Weknow não deixa montar um dashboard em cima dele.',
    '### O que fazer',
    '1. Peça a quem administra os metadados para abrir o 16 - MAPA e ver o erro da última execução.',
    '2. Corrigida a causa, uma nova execução libera o metadado.',
    '3. Os dashboards que já usam o MAPA continuam abertos, mas mostram os dados da última execução que deu certo.',
  ].join('\n\n')
  return {
    about: '16',
    reply,
    steps: [call('buscar_metadados', 'Procurando nos metadados', { busca: 'MAPA ANS' }, ['16 - MAPA (última execução falhou)']), read('16')],
  }
}

/* ──────────────────────────── dois metadados: permanência × glosa por setor */

/**
 * O que o Claude faz pelo MCP e um dashboard sozinho não faz: ler dois
 * metadados e cruzar pelo campo que eles têm em comum. Aqui, o setor.
 */
function permanenciaGlosa(): Answer {
  const a = cells('permanencia', CURRENT)
  const g = cells('glosa', CURRENT)
  const common = uniq(a, 'setor').filter((s) => g.some((c) => c.setor === s))
  const left = uniq(a, 'setor').filter((s) => !common.includes(s))
  const rows = common
    .map((s) => {
      const x = a.filter((c) => c.setor === s)
      const y = g.filter((c) => c.setor === s)
      return { s, los: sum(x, 'paciente_dias') / sum(x, 'saidas'), rate: sum(y, 'valor_glosado') / sum(y, 'valor_faturado'), fat: sum(y, 'valor_faturado') }
    })
    .sort((p, q) => q.los - p.los)
  /* Correlação entre as duas colunas: com cinco setores, é uma pista, não prova. */
  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length
  const ml = mean(rows.map((r) => r.los))
  const mr = mean(rows.map((r) => r.rate))
  const cov = rows.reduce((s, r) => s + (r.los - ml) * (r.rate - mr), 0)
  const sd = (f: (r: (typeof rows)[number]) => number, m: number) => Math.sqrt(rows.reduce((s, r) => s + (f(r) - m) ** 2, 0))
  const corr = cov / (sd((r) => r.los, ml) * sd((r) => r.rate, mr))
  const byRate = [...rows].sort((p, q) => q.rate - p.rate)
  const longest = rows[0]
  const rank = byRate.indexOf(longest) + 1
  /* Correlação alta com diferença pequena não é achado: diz isso antes. */
  const spread = byRate[0].rate - byRate[byRate.length - 1].rate
  const verdict =
    spread < 0.005
      ? `**Pouco.** ${corr >= 0.5 ? `A ordem até combina (o setor de internação mais longa é também o que mais glosa), mas` : 'Não há um padrão claro, e'} a taxa de glosa quase não muda de um setor para outro: vai de ${rate(byRate[byRate.length - 1].rate)} a ${rate(byRate[0].rate)}. O que explica a glosa está no convênio e no tipo de item, não no setor.`
      : corr >= 0.5
      ? `**Sim, tendem a andar juntos.** Os setores em que o paciente fica mais tempo são, em geral, os que mais glosam.`
      : corr <= -0.5
        ? `**Não, é quase o contrário.** Os setores de internação mais longa estão entre os que menos glosam.`
        : `**Não há relação clara.** Permanência longa e glosa alta não andam juntas nos setores.`

  const reply = [
    `Cruzei o **21 - Internações** com o **32 - Faturamento e glosas** pelo campo que os dois têm em comum, o **setor**, em ${cur}.`,
    verdict,
    table(
      ['Setor', 'Permanência média', 'Taxa de glosa', 'Faturado'],
      rows.map((r) => [r.s, days(r.los), rate(r.rate), F.money(r.fat)]),
      [1, 2, 3],
    ),
    '### O que se vê',
    ...(rank === 1
      ? [`- **${longest.s}** tem a internação mais longa (${days(longest.los)}) e também a maior taxa de glosa (${rate(longest.rate)}).`]
      : [
          `- **${longest.s}** tem a internação mais longa (${days(longest.los)}) e é o ${rank}º em taxa de glosa (${rate(longest.rate)}).`,
          `- A maior taxa de glosa é da **${byRate[0].s}** (${rate(byRate[0].rate)}), com permanência de ${days(byRate[0].los)}.`,
        ]),
    `- A menor é da **${byRate[byRate.length - 1].s}** (${rate(byRate[byRate.length - 1].rate)}), com permanência de ${days(byRate[byRate.length - 1].los)}.`,
    ...(left.length ? [`- ${list(left)} não entra: não há faturamento ${left.length === 1 ? 'dela' : 'deles'} no 32.`] : []),
    `> Com ${rows.length} setores, a comparação é uma pista, não uma prova. Vale repetir mês a mês antes de tirar conclusão.`,
  ].join('\n\n')

  return {
    about: ['21', '32'],
    reply,
    steps: [
      call('buscar_metadados', 'Procurando nos metadados', { busca: 'permanência, glosa, setor' }, ['21 - Internações: cobre permanência e setor', '32 - Faturamento e glosas: cobre glosas e setor']),
      read('21'),
      read('32'),
      query('21', 'Consultando a permanência por setor', { medidas: 'saídas, paciente-dia', por: 'setor', periodo: CURRENT }),
      query('32', 'Consultando a glosa por setor', { medidas: 'valor faturado, valor glosado', por: 'setor', periodo: CURRENT }),
      call('cruzar_resultados', 'Cruzando pelo setor', { campo: 'setor' }, [`${rows.length} setores em comum`, `Correlação: ${F.num(corr, 2)}`]),
    ],
  }
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} e ${xs[xs.length - 1]}`)

/** A pergunta que dá para responder lendo os dados, se for uma delas. `t` vem sem acento e em minúsculas. */
export function answerFor(t: string): Answer | null {
  if ((/setor/.test(t) || /cruz/.test(t)) && /permanencia/.test(t) && /glos/.test(t)) return permanenciaGlosa()
  const question = /^(por ?que|pq|qual|quais|quem|quanto|como|o que)\b|\?\s*$/.test(t)
  if (/(por ?que|pq|o que houve|explica).*(permanencia|tempo de internacao)|permanencia.*(subiu|aumentou|cresceu|piorou)/.test(t)) return permanencia()
  if (/(qual|quais|quem).*(convenio|operadora).*glos|(convenio|operadora).*mais glos|mais glos/.test(t)) return glosaConvenio()
  if (/resum/.test(t) && /internac|permanencia|saidas/.test(t)) return resumoInternacoes()
  if (/(o que (e|sao|significa)|como (se )?calcula|explica).*glosa/.test(t)) return glosaConceito()
  if (/\bmapa\b|\bans\b/.test(t) && (question || /nao (aparece|carrega|funciona)|falh|erro/.test(t))) return mapaFalhou()
  return null
}
