import { measureLabel } from '@/engine/format'
import { isMeasure, lowerTitle, profile, type FieldProfile } from '@/engine/planner'
import type { Op } from '@/engine/patch'
import type { BreakdownWidget, DashboardSpec, Grain, KpiWidget, Measure, Source, Span, Widget } from '@/engine/types'

/**
 * Intérprete LOCAL de pedidos — o substituto da IA neste protótipo.
 *
 * Entende português corrido por regras, o suficiente para demonstrar o
 * fluxo inteiro sem chave de API (o protótipo é estático e público). O
 * contrato é o que importa: texto entra, sai uma lista de `Op` mais notas.
 * No produto, este arquivo é trocado por uma chamada ao modelo com o prompt
 * de `contract.ts`, que devolve o mesmo formato — e o resto do app não muda,
 * inclusive a validação, que continua do lado de cá.
 *
 * As notas são o que não vira operação: recusas (pedido que mexe numa parte
 * fixa) e avisos (pedido que já está atendido por padrão).
 */

export type Note = { kind: 'refuse' | 'info' | 'unknown'; text: string }
export type Interpretation = { ops: Op[]; notes: Note[] }

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Campos citados na frase, pela posição em que aparecem. */
function mentions(text: string, prof: FieldProfile[]): { field: FieldProfile; at: number }[] {
  const found: { field: FieldProfile; at: number; len: number }[] = []
  for (const f of prof) {
    const terms = [f.title, f.name, ...(f.aliases ?? [])].map(norm).filter((t) => t.length >= 2)
    for (const t of terms) {
      const re = new RegExp(`(^|[^a-z0-9])${escape(t)}s?(?=$|[^a-z0-9])`)
      const m = re.exec(text)
      if (m) found.push({ field: f, at: m.index, len: t.length })
    }
  }
  // Um trecho, um campo: "valor total" não conta também como "valor".
  found.sort((a, b) => a.at - b.at || b.len - a.len)
  const out: { field: FieldProfile; at: number }[] = []
  let end = -1
  for (const f of found) {
    if (f.at < end || out.some((o) => o.field.name === f.field.name)) continue
    out.push({ field: f.field, at: f.at })
    end = f.at + f.len + 1
  }
  return out
}

const STYLE_WORDS: [RegExp, string][] = [
  [/\b(rosca|donut|pizza|torta)\b/, 'donut'],
  [/\b(linhas?)\b/, 'line'],
  [/\b(areas?)\b/, 'area'],
  [/\b(colunas?|verticais?)\b/, 'column'],
  [/\b(barras?|horizonta(l|is))\b/, 'bar'],
]

const GRAIN_WORDS: [RegExp, Grain][] = [
  [/\b(por dia|diari[oa]s?|dia a dia)\b/, 'day'],
  [/\b(por semana|semana(l|is))\b/, 'week'],
  [/\b(por mes|mensa(l|is)|mes a mes)\b/, 'month'],
  [/\b(por trimestre|trimestra(l|is))\b/, 'quarter'],
]

const KIND_WORDS: [RegExp, Widget['kind'] | 'donut' | 'bar' | 'column'][] = [
  [/\b(rosca|donut|pizza|torta)\b/, 'donut'],
  [/\b(barras?)\b/, 'bar'],
  [/\b(colunas?)\b/, 'column'],
  [/\b(evolucao|tendencia|ao longo|no tempo|linha do tempo|historico|mensal|temporal)\b/, 'trend'],
  [/\b(kpis?|indicador(es)?|cart(ao|oes)|numeros do topo|cards?)\b/, 'kpi'],
  [/\b(tabela|detalhe)\b/, 'table'],
]

const VERB = {
  remove: /\b(remov\w*|tir[ae]\w*|tirar|apag\w*|exclu\w*|elimin\w*|delet\w*|nao quero)\b/,
  add: /\b(adicion\w*|inclu\w*|cri[ae]\w*|coloc\w*|acrescent\w*|bot[ae]\w*|insir\w*|insere|quero (um|uma|ver)|mostr[ae]\w*|gere|gera)\b/,
  change: /\b(transform\w*|troc\w*|mud\w*|vir[ae]\w*|faz\w*|faca\w*|deix\w*|convert\w*|pass[ae]\w*|use|usa)\b/,
}

/** Separa o pedido em frases sem quebrar "verde e roxo". */
function sentences(text: string): string[] {
  return text
    .split(/[.;!?\n]+|,\s*(?=(?:e\s+)?(?:adicion|inclu|cri|coloc|remov|tir|apag|troc|mud|transform|deix|fac|faz|mostr|bot|acrescent))|\s+e\s+(?=(?:tambem\s+)?(?:adicion|inclu|cri|coloc|remov|tir|apag|troc|mud|transform|deix|fac|faz|mostr|bot|acrescent))/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function interpretLocal(prompt: string, spec: DashboardSpec, source: Source): Interpretation {
  const prof = profile(source)
  const text = norm(prompt)
  const ops: Op[] = []
  const notes: Note[] = []
  const used = new Set<string>()
  const note = (kind: Note['kind'], t: string) => {
    if (!notes.some((n) => n.text === t)) notes.push({ kind, text: t })
  }

  /* ── Partes fixas: recusa com o motivo e uma alternativa ─────────────── */

  if (/\b(html|css|javascript|codigo|script|react)\b/.test(text))
    note('refuse', 'Por aqui eu mudo a montagem e a aparência do dashboard, não o código. O código é o mesmo para todo dashboard, e é isso que garante que filtro e totais funcionem igual em todos.')
  if (/\b(dois eixos|eixo duplo|eixo secundario|segundo eixo)\b/.test(text))
    note('refuse', 'Gráfico com dois eixos não entra: com duas escalas, qualquer cruzamento das linhas é ilusão. Posso pôr as duas medidas lado a lado, em dois gráficos.')
  if (/\b3d\b/.test(text)) note('refuse', 'Gráfico 3D distorce o tamanho das partes: a fatia da frente parece maior. Fico no 2D.')
  if (/\b(aument\w*|diminu\w*|infl\w*|arredond\w*|ajust\w*|corrig\w*|alter\w*)\b.{0,25}\b(os |as )?(valores|numeros|dados|totais)\b/.test(text))
    note('refuse', 'Não altero números: eles vêm direto do metadado. Se algum valor parece errado, a tabela de detalhe mostra as linhas que formam cada total.')

  const removing = VERB.remove.test(text) || /\b(sem|desativ\w*|deslig\w*|esconde\w*|ocult\w*)\b/.test(text)
  if (removing && /\b(periodo|filtro de data|filtro por data|filtros)\b/.test(text))
    note('refuse', 'O filtro de período é parte fixa de todo dashboard, assim como a barra de filtros. Posso mudar quais categorias aparecem na barra.')
  if (removing && /\b(limpar)\b/.test(text))
    note('refuse', 'O “Limpar filtros” é fixo: ele aparece sempre que existe um filtro ativo, para nunca ficar sem caminho de volta à visão geral.')
  if (removing && /\b(clique|clicavel|cruzad\w*|interativ\w*)\b/.test(text))
    note('refuse', 'O filtro por clique não desliga: é o mesmo em todo gráfico, e é o que faz o dashboard inteiro responder junto.')
  if (VERB.remove.test(text) && /\b(tabela|detalhe)\b/.test(text))
    note('refuse', 'A tabela de detalhe é fixa: é onde qualquer número do dashboard pode ser conferido linha a linha. Posso movê-la ou mudar as colunas.')

  /* ── Já atendido por padrão ──────────────────────────────────────────── */

  if (!removing && /\b(clicav\w*|clique|clicar|ao clicar|interativ\w*)\b/.test(text))
    note('info', 'Isso já funciona em todo dashboard: clicar numa fatia, barra ou ponto filtra todos os outros gráficos, e clicar de novo desfaz. Não precisei mudar nada.')
  if (!removing && /\b(limpar filtro|limpar os filtros|botao de limpar|voltar a visao geral)\b/.test(text))
    note('info', 'O “Limpar filtros” já aparece na barra sempre que há filtro ativo.')
  if (!removing && /\b(filtro (global )?de periodo|filtro de data|filtrar por periodo)\b/.test(text))
    note('info', 'O filtro de período já é fixo no topo, e vale para tudo, inclusive para a comparação com o período anterior nos indicadores.')

  /* ── Aparência: livre ────────────────────────────────────────────────── */

  const theme: Record<string, unknown> = {}
  if (/\b(sem|tir\w*|remov\w*)\b.{0,12}\b(dark|escuro)\b|\b(modo|fundo|tema) (claro|branco)\b|\blight\b/.test(text)) theme.mode = 'light'
  else if (/\b(dark|escuro|noturno|fundo preto)\b/.test(text)) theme.mode = 'dark'
  if (/\b(acompanh\w* o tema|automatic\w*|tema do weknow|igual ao weknow)\b/.test(text)) theme.mode = 'auto'

  if (/\b(neon|vibrant\w*|vivas?|chamativ\w*|roxo|verde)\b/.test(text)) theme.palette = 'neon'
  else if (/\b(classic\w*|colorid\w*|mais cores|daltonism\w*|acessivel)\b/.test(text) && !/\bcart(ao|oes) colorid/.test(text)) theme.palette = 'classico'
  else if (/\b(sobri\w*|corporativ\w*|discret\w*|paleta padrao|paleta original|da marca|weknow)\b/.test(text) && /\b(paleta|cores?|sobri\w*|corporativ\w*|discret\w*)\b/.test(text)) theme.palette = 'weknow'

  if (/\b(sem|tir\w*|remov\w*)\b.{0,10}\bbrilho\b/.test(text)) theme.glow = false
  else if (/\b(brilho|glow|brilh\w*|reluz\w*|luminos\w*)\b/.test(text)) theme.glow = true

  if (/\b(fundo colorido|cart(ao|oes) colorid\w*|kpis? colorid\w*|indicadores colorid\w*|tingid\w*)\b/.test(text)) theme.kpiTint = true
  if (/\b(sem fundo colorido|kpis? (brancos|neutros)|indicadores neutros)\b/.test(text)) theme.kpiTint = false

  if (/\b(compact\w*|dens[oa]|mais junt\w*|menos espaco|apertad\w*)\b/.test(text)) theme.density = 'compact'
  else if (/\b(espacad\w*|arejad\w*|respir\w*|mais espaco)\b/.test(text)) theme.density = 'comfortable'

  if (/\b(arredond\w*|redond\w*)\b/.test(text)) theme.corners = 'round'
  else if (/\b(quadrad\w*|cantos retos|retos)\b/.test(text)) theme.corners = 'square'
  else if (/\bcantos suaves\b/.test(text)) theme.corners = 'soft'

  if (Object.keys(theme).length) ops.push({ op: 'theme', set: theme })

  /* Título do dashboard: "renomeie o dashboard para “Comercial 2026”". */
  const quoted = prompt.match(/["“”'‘’]([^"“”'‘’]{2,80})["“”'‘’]/)
  if (quoted && /\b(titulo|renomei\w*|chame|nome do dashboard|chamar)\b/.test(text) && !/\b(grafico|indicador|kpi|tabela|bloco)\b/.test(text)) {
    ops.push({ op: 'title', title: quoted[1].trim() })
  }

  /* ── Blocos: validados ───────────────────────────────────────────────── */

  const defaultMeasure: Measure =
    (spec.widgets.find((w) => w.kind !== 'table' && 'measure' in w && w.measure.agg === 'sum') as Exclude<Widget, { kind: 'table' }> | undefined)?.measure ??
    { field: null, agg: 'count' }
  const firstKpi = spec.widgets.findIndex((w) => w.kind === 'kpi')
  const afterKpis = spec.widgets.map((w) => w.kind).lastIndexOf('kpi') + 1
  const tableAt = spec.widgets.findIndex((w) => w.kind === 'table')

  let lastTarget: Widget | undefined
  for (const s of sentences(text)) {
    const ms = mentions(s, prof)
    const dims = ms.filter((m) => m.field.type === 'text' || m.field.type === 'boolean')
    const nums = ms.filter((m) => m.field.type === 'number')
    const kinds = KIND_WORDS.filter(([re]) => re.test(s)).map(([, k]) => k)
    const style = STYLE_WORDS.find(([re]) => re.test(s))?.[1]
    const grain = GRAIN_WORDS.find(([re]) => re.test(s))?.[1]
    const wantsAvg = /\b(media|medio)\b/.test(s)

    /* Identificador citado ("pedidos", "chamados") é contagem — a mesma que o
       dashboard já usa no indicador, para os números baterem entre si. */
    const countInUse = spec.widgets.find((w) => w.kind === 'kpi' && (w.measure.agg === 'count' || w.measure.agg === 'distinct'))
    const toMeasure = (f: FieldProfile): Measure =>
      f.key
        ? (countInUse as KpiWidget | undefined)?.measure ?? { field: f.name, agg: 'distinct', label: f.aliases?.[1] ? cap(f.aliases[1]) : f.title }
        : { field: f.name, agg: wantsAvg ? 'avg' : 'sum' }
    const measure = nums[0] ? toMeasure(nums[0].field) : defaultMeasure

    /** Bloco a que a frase se refere: o que mais bate com tipo e campos. */
    const target = (filter?: (w: Widget) => boolean): Widget | undefined => {
      let best: Widget | undefined
      let score = 0
      for (const w of spec.widgets) {
        if (filter && !filter(w)) continue
        let sc = 0
        if (w.kind === 'breakdown') {
          if (dims.some((d) => d.field.name === w.dimension)) sc += 3
          if (kinds.includes(w.style)) sc += 2
        }
        if (kinds.includes(w.kind)) sc += 2
        if ('measure' in w && nums.some((n) => n.field.name === w.measure.field)) sc += 1
        if (sc > score) {
          score = sc
          best = w
        }
      }
      // Frase sem referência própria ("e mostre o top 5") herda o bloco da
      // frase anterior, como numa conversa.
      if (!best && lastTarget && (!filter || filter(lastTarget))) best = lastTarget
      if (best) lastTarget = best
      return best
    }

    /* Filtro na barra: "adicione um filtro de vendedor". Precisa do
       substantivo e de um verbo — "ao clicar na categoria os gráficos devem
       filtrar" descreve o filtro por clique, que já existe. */
    const barFilter = /\bfiltros? (de|por|da|do|das|dos)\b/.test(s)
    if (barFilter && dims.length && (VERB.add.test(s) || VERB.remove.test(s) || VERB.change.test(s))) {
      const names = dims.map((d) => d.field.name)
      if (VERB.remove.test(s)) ops.push({ op: 'filters', remove: names.filter((n) => spec.filterFields.includes(n)) })
      else ops.push({ op: 'filters', add: names })
      used.add(s)
      continue
    }
    if (/\bfiltr\w*\b/.test(s)) {
      used.add(s)
      continue
    }

    /* Trocar a medida: "mostre lucro em vez de receita". */
    const swap = s.match(/\b(em vez de|ao inves de|no lugar de)\b/)
    if (swap && nums.length >= 2) {
      const cut = swap.index!
      const to = nums.find((n) => n.at < cut)?.field
      const from = nums.find((n) => n.at > cut)?.field
      if (to && from) {
        // Indicador que já existe com a medida nova não é duplicado.
        const kpiHasTo = spec.widgets.some((w) => w.kind === 'kpi' && w.measure.field === to.name && !w.measure.per)
        for (const w of spec.widgets) {
          if (w.kind === 'table' || w.measure.field !== from.name || w.measure.per) continue
          if (w.kind === 'kpi' && kpiHasTo) continue
          const m: Measure = { ...w.measure, field: to.name, label: undefined }
          ops.push({ op: 'update', id: w.id, set: { measure: m, title: w.title.replace(from.title, to.title) } })
        }
        used.add(s)
        continue
      }
    }

    if (VERB.remove.test(s) && !/\b(tabela|detalhe|filtro|periodo|limpar|brilho|escuro|dark|compara\w*|fundo|cantos|clique|cruzad\w*)\b/.test(s)) {
      const t = target((w) => w.kind !== 'table')
      if (t) {
        ops.push({ op: 'remove', id: t.id })
        used.add(s)
      } else note('unknown', 'Não achei qual bloco remover. Cite o gráfico pelo campo, como “remova o gráfico de UF”.')
      continue
    }

    const wantsAdd = VERB.add.test(s) && (/\b(grafico|visao|analise|kpi|indicador|cart(ao|oes)|bloco|ranking|evolucao)\b/.test(s) || (dims.length > 0 && /\bpor\b/.test(s)))
    if (wantsAdd) {
      if (kinds.includes('kpi')) {
        const f = nums[0]?.field
        if (f) {
          const m = toMeasure(f)
          ops.push({ op: 'add', widget: { kind: 'kpi', title: measureLabel(m, source), span: 3, measure: m, compare: !!spec.dateField, spark: !!spec.dateField }, at: firstKpi >= 0 ? afterKpis : 0 })
        } else note('unknown', `Para um indicador novo, diga qual medida: ${prof.filter(isMeasure).map((f) => f.title.toLowerCase()).join(', ')}.`)
      } else if (dims.length) {
        const d = dims[0].field
        const st = (style === 'line' || style === 'area' ? undefined : style) ?? (d.distinct <= 6 ? 'donut' : 'bar')
        const top = st === 'donut' ? Math.min(6, d.distinct) : Math.min(10, Math.max(2, d.distinct))
        /* O mesmo gráfico já existe: ajusta o que está lá em vez de duplicar. */
        const same = spec.widgets.find(
          (x): x is BreakdownWidget => x.kind === 'breakdown' && x.dimension === d.name && x.measure.field === measure.field && x.measure.agg === measure.agg,
        )
        if (same) {
          if (style && style !== same.style && style !== 'line' && style !== 'area') {
            ops.push({ op: 'update', id: same.id, set: { style, ...(style === 'donut' ? { top: Math.min(same.top, 6) } : {}) } })
          } else note('info', `“${same.title}” já está no dashboard.`)
        } else {
          const w: Omit<BreakdownWidget, 'id'> = {
            kind: 'breakdown', style: st as BreakdownWidget['style'], dimension: d.name, measure, top,
            title: `${measureLabel(measure, source)} por ${lowerTitle(d.title)}`, span: st === 'donut' ? 4 : 6,
          }
          ops.push({ op: 'add', widget: w })
        }
      } else if (spec.dateField && (grain || kinds.includes('trend') || /\b(tempo|mes|meses)\b/.test(s))) {
        ops.push({
          op: 'add',
          widget: { kind: 'trend', measure, grain: grain ?? 'month', style: style === 'column' ? 'column' : style === 'line' ? 'line' : 'area', span: 12, title: `${measureLabel(measure, source)} ao longo do tempo` },
        })
      } else {
        note('unknown', `Não identifiquei por qual campo abrir o gráfico. Dá para usar: ${prof.filter((f) => f.type === 'text' && f.distinct <= 5000).map((f) => lowerTitle(f.title)).join(', ')}.`)
      }
      used.add(s)
      continue
    }

    /* Ajustes num bloco existente. */
    const set: Record<string, unknown> = {}
    let t: Widget | undefined

    if (style) {
      const timeStyle = style === 'line' || style === 'area'
      t = target((w) => (timeStyle ? w.kind === 'trend' : w.kind === 'breakdown' || w.kind === 'trend'))
      if (t && t.kind === 'trend' && (style === 'line' || style === 'area' || style === 'column') && t.style !== style) set.style = style
      if (t && t.kind === 'breakdown' && style !== 'line' && style !== 'area' && t.style !== style) {
        set.style = style
        if (style === 'donut' && t.top > 6) set.top = 6
        if (style === 'donut' && t.span > 6) set.span = 4
      }
      // "deixe as barras da forma de pagamento" — estilo citado é o atual: não é troca.
    }
    if (grain) {
      t = t ?? target((w) => w.kind === 'trend')
      if (t?.kind === 'trend') set.grain = grain
    }
    const top = s.match(/\btop\s*(\d{1,2})\b|\b(\d{1,2}) (maiores|principais|primeir[oa]s|melhores)\b/)
    if (top) {
      t = t ?? target((w) => w.kind === 'breakdown') ?? spec.widgets.find((w) => w.kind === 'breakdown')
      if (t?.kind === 'breakdown') set.top = Number(top[1] ?? top[2])
    }
    if (/\b(largura (inteira|toda|total)|linha inteira|ocup\w* a linha|tela toda|maior|aument\w* o grafico)\b/.test(s)) {
      t = t ?? target()
      if (t) set.span = 12 as Span
    } else if (/\b(metade|menor|meia largura|diminu\w* o grafico)\b/.test(s)) {
      t = t ?? target()
      if (t) set.span = (t.kind === 'kpi' ? 3 : 6) as Span
    }
    if (/\b(sem compara\w*|tir\w* a compara\w*)\b/.test(s)) {
      for (const w of spec.widgets) if (w.kind === 'kpi' && w.compare) ops.push({ op: 'update', id: w.id, set: { compare: false } })
      used.add(s)
    }
    if (quoted && /\b(titulo|renomei\w*|chame)\b/.test(s) && /\b(grafico|indicador|kpi|bloco|rosca|barras)\b/.test(s)) {
      t = t ?? target()
      if (t) set.title = quoted[1].trim()
    }
    if (t && Object.keys(set).length) {
      ops.push({ op: 'update', id: t.id, set })
      used.add(s)
    }

    const up = /\b(primeir[oa]|no topo|para cima|pra cima|no comeco|em cima|antes)\b/.test(s)
    const down = /\b(no fim|no final|por ultimo|embaixo|para baixo|pra baixo|depois)\b/.test(s)
    if ((up || down) && /\b(mov\w*|coloc\w*|pass\w*|lev\w*|pos\w*|joga\w*|mand\w*)\b/.test(s)) {
      const m = t ?? target((w) => w.kind !== 'kpi')
      if (m) {
        ops.push({ op: 'move', id: m.id, to: up ? afterKpis : Math.max(afterKpis, tableAt - 1) })
        used.add(s)
      }
    }
  }

  const didTheme = ops.some((o) => o.op === 'theme' || o.op === 'title')
  if (!ops.length && !notes.length) {
    note('unknown', 'Não consegui transformar isso numa mudança. Tente algo como “paleta neon com fundo escuro”, “gráfico de lucro por vendedor”, “evolução por semana” ou “remova o gráfico de UF”.')
  } else if (!didTheme && used.size === 0 && !notes.length) {
    note('unknown', 'Entendi só parte do pedido.')
  }
  // Uma recusa já responde o pedido; "não entendi" junto dela só confunde.
  const refused = notes.some((n) => n.kind === 'refuse')
  return { ops: ops.filter((o) => !(o.op === 'filters' && !o.add?.length && !o.remove?.length)), notes: refused ? notes.filter((n) => n.kind !== 'unknown') : notes }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Ponto de troca: no produto, uma chamada ao modelo com `contract.ts`. */
export const interpret = interpretLocal
