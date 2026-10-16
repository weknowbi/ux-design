import type { Cell, Field, FieldType, NumberFormat, Row, Source } from '@/engine/types'

/**
 * Origens de dados do protótipo.
 *
 * Os metadados são gerados aqui, com semente fixa: o mesmo metadado devolve
 * sempre as mesmas linhas, então um dashboard salvo continua batendo com o
 * que foi gerado. Nada aqui é dado de cliente — o repositório é público.
 *
 * No produto, `loadMetadado` vira uma chamada ao Weknow: o metadado já tem
 * campos tipados e título de negócio, que é exatamente o que o gerador usa.
 */

/* ── Aleatório com semente (mulberry32) ───────────────────────────────────── */

function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function pickWeighted<T>(r: () => number, items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0)
  let x = r() * total
  for (const [v, w] of items) {
    x -= w
    if (x <= 0) return v
  }
  return items[items.length - 1][0]
}

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const round2 = (n: number) => Math.round(n * 100) / 100

/** Dias entre `from` e `to`, inclusive, com um peso de volume por dia. */
function eachDay(from: string, to: string, fn: (iso: string, d: Date) => void) {
  const d = new Date(from + 'T00:00:00Z')
  const end = new Date(to + 'T00:00:00Z').getTime()
  while (d.getTime() <= end) {
    fn(isoDate(d), new Date(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
}

/* ── Catálogo de metadados ────────────────────────────────────────────────── */

export type MetaEntry = {
  id: string
  code: string
  name: string
  group: string
  /** Metadado cuja última execução falhou: aparece, mas não gera dashboard. */
  failed?: boolean
  /** Quantas linhas, para a lista dizer o tamanho antes de abrir. */
  rowsHint?: string
}

export const METADADOS: MetaEntry[] = [
  { id: 'vendas', code: '34', name: 'Vendas', group: '2.2 - Sample Data (SQLite)', rowsHint: '≈ 32 mil linhas' },
  { id: 'procedimentos', code: '15', name: 'Procedimentos', group: 'ANS', rowsHint: '≈ 14 mil linhas' },
  { id: 'mapa', code: '16', name: 'MAPA', group: 'ANS', failed: true },
]

export const metaLabel = (m: { code?: string; name: string }) => (m.code ? `${m.code} - ${m.name}` : m.name)

const cache = new Map<string, Source>()

export function loadMetadado(id: string): Source | null {
  const hit = cache.get(id)
  if (hit) return hit
  const meta = METADADOS.find((m) => m.id === id)
  if (!meta || meta.failed) return null
  const built = id === 'vendas' ? buildVendas(meta) : id === 'procedimentos' ? buildProcedimentos(meta) : null
  if (built) cache.set(id, built)
  return built
}

/* ── 34 - Vendas ──────────────────────────────────────────────────────────── */

const CATALOG: { category: string; products: [string, number, number][] }[] = [
  // [produto, preço, custo relativo]
  { category: 'Notebooks', products: [['Notebook Pro 14', 7899, 0.78], ['Notebook Air 13', 5499, 0.76], ['Notebook Gamer 16', 9899, 0.8], ['Ultrabook 15', 6299, 0.77]] },
  { category: 'Monitores', products: [['Monitor 27" 4K', 2399, 0.7], ['Monitor 24" IPS', 1099, 0.68], ['Monitor Ultrawide 34"', 3499, 0.72], ['Monitor Gamer 27" 165Hz', 1899, 0.7]] },
  { category: 'Periféricos', products: [['Teclado mecânico', 449, 0.55], ['Mouse sem fio', 189, 0.5], ['Webcam Full HD', 349, 0.56], ['Mouse gamer', 279, 0.52], ['Mesa digitalizadora', 699, 0.6]] },
  { category: 'Áudio', products: [['Headset sem fio', 799, 0.58], ['Caixa de som Bluetooth', 499, 0.55], ['Fone intra-auricular', 299, 0.5], ['Microfone USB', 589, 0.57]] },
  { category: 'Armazenamento', products: [['SSD 1 TB', 549, 0.66], ['SSD 2 TB', 999, 0.67], ['HD externo 4 TB', 799, 0.64], ['Pendrive 128 GB', 89, 0.45]] },
  { category: 'Acessórios', products: [['Hub USB-C', 259, 0.42], ['Suporte para notebook', 159, 0.38], ['Mochila para notebook', 229, 0.4], ['Cabo HDMI 2.1', 79, 0.35], ['Carregador 65 W', 199, 0.45]] },
]

const CATEGORY_WEIGHT: Record<string, number> = {
  Notebooks: 0.9, Monitores: 1.1, Periféricos: 2.2, Áudio: 1.4, Armazenamento: 1.3, Acessórios: 2.4,
}

/* Nomes inventados, sem sobrenome real de ninguém em especial. */
const SELLERS: [string, number][] = [
  ['Ana Ribeiro', 1.4], ['Bruno Tavares', 1.2], ['Carla Menezes', 1.1], ['Diego Fontes', 1.0],
  ['Elisa Prado', 0.95], ['Fábio Lacerda', 0.9], ['Gabriela Rocha', 0.85], ['Heitor Sales', 0.8],
  ['Isabela Nunes', 0.75], ['João Pedro Lima', 0.7], ['Karen Duarte', 0.6], ['Lucas Moreira', 0.5],
]

const PAYMENTS: [string, number][] = [['Cartão de crédito', 4.6], ['Pix', 3.4], ['Boleto', 1.2], ['Cartão de débito', 0.9]]

const STATES: [string, number][] = [['SP', 3.2], ['SC', 1.6], ['PR', 1.4], ['RS', 1.2], ['MG', 1.3], ['RJ', 1.5], ['BA', 0.6], ['GO', 0.5]]

function buildVendas(meta: MetaEntry): Source {
  const r = rng(34)
  const rows: Row[] = []
  let orderId = 100000
  const products = CATALOG.flatMap((c) => c.products.map((p) => ({ category: c.category, name: p[0], price: p[1], cost: p[2] })))
  const productWeights = products.map((p) => [p, CATEGORY_WEIGHT[p.category] / CATALOG.find((c) => c.category === p.category)!.products.length] as const)

  eachDay('2024-10-01', '2026-09-30', (iso, d) => {
    const month = d.getUTCMonth()
    const dow = d.getUTCDay()
    const t = (d.getTime() - Date.UTC(2024, 9, 1)) / (730 * 86400000)
    const season = month === 10 ? 1.55 : month === 11 ? 1.4 : month === 0 ? 0.8 : month === 1 ? 0.85 : 1
    const week = dow === 0 ? 0.45 : dow === 6 ? 0.7 : 1.08
    const orders = Math.round((25 + 11 * t) * season * week * (0.85 + r() * 0.3))
    for (let o = 0; o < orders; o++) {
      orderId++
      const seller = pickWeighted(r, SELLERS)
      const payment = pickWeighted(r, PAYMENTS)
      const state = pickWeighted(r, STATES)
      const items = r() < 0.62 ? 1 : r() < 0.75 ? 2 : 3
      for (let i = 0; i < items; i++) {
        const p = pickWeighted(r, productWeights)
        const qty = p.price > 1500 ? 1 : 1 + Math.floor(r() * r() * 4)
        const discount = r() < 0.55 ? 0 : [0.05, 0.1, 0.15][Math.floor(r() * 3)]
        const unit = round2(p.price * (0.96 + r() * 0.08))
        const total = round2(unit * qty * (1 - discount))
        const returned = r() < 0.035
        const profit = returned ? 0 : round2(total - unit * qty * p.cost)
        rows.push({
          order_id: orderId,
          order_date: iso,
          product_category: p.category,
          product_name: p.name,
          seller_name: seller,
          order_payment_method: payment,
          company_state: state,
          order_quantity: qty,
          product_unit_price: unit,
          order_discount_pct: discount,
          order_total_value: total,
          order_profit: profit,
          order_is_returned: returned,
        })
      }
    }
  })

  const fields: Field[] = [
    { name: 'order_id', title: 'Pedido', type: 'number', key: true, aliases: ['pedido', 'pedidos'] },
    { name: 'order_date', title: 'Data do pedido', type: 'date', aliases: ['data', 'dia'] },
    { name: 'product_category', title: 'Categoria', type: 'text', aliases: ['categoria', 'categorias'] },
    { name: 'product_name', title: 'Produto', type: 'text', aliases: ['produto', 'produtos', 'item', 'itens'] },
    { name: 'seller_name', title: 'Vendedor', type: 'text', aliases: ['vendedor', 'vendedores', 'vendedora', 'equipe de vendas'] },
    { name: 'order_payment_method', title: 'Forma de pagamento', type: 'text', aliases: ['pagamento', 'forma de pagamento', 'meio de pagamento'] },
    { name: 'company_state', title: 'UF', type: 'text', aliases: ['uf', 'estado', 'estados', 'regiao'] },
    { name: 'order_quantity', title: 'Quantidade', type: 'number', format: 'integer', aliases: ['quantidade', 'unidades', 'volume'] },
    { name: 'product_unit_price', title: 'Preço unitário', type: 'number', format: 'currency', aliases: ['preco', 'preco unitario'] },
    { name: 'order_discount_pct', title: 'Desconto', type: 'number', format: 'percent', aliases: ['desconto', 'descontos'] },
    { name: 'order_total_value', title: 'Receita', type: 'number', format: 'currency', aliases: ['receita', 'faturamento', 'vendas', 'valor', 'valor total'] },
    { name: 'order_profit', title: 'Lucro', type: 'number', format: 'currency', aliases: ['lucro', 'margem', 'resultado'] },
    { name: 'order_is_returned', title: 'Devolvido', type: 'boolean', aliases: ['devolvido', 'devolucao', 'devolucoes'] },
  ]

  return { id: `metadado:${meta.id}`, kind: 'metadado', name: meta.name, group: meta.group, code: meta.code, fields, rows }
}

/* ── 15 - Procedimentos ───────────────────────────────────────────────────── */

function buildProcedimentos(meta: MetaEntry): Source {
  const r = rng(15)
  const rows: Row[] = []
  const specialties: [string, number, number][] = [
    ['Cardiologia', 1.3, 420], ['Ortopedia', 1.4, 380], ['Pediatria', 1.6, 210], ['Dermatologia', 0.9, 260],
    ['Ginecologia', 1.2, 290], ['Oftalmologia', 1.0, 330], ['Neurologia', 0.6, 520], ['Clínica geral', 2.1, 160],
  ]
  const units: [string, number][] = [['Clínica Central', 2.4], ['Unidade Norte', 1.5], ['Unidade Sul', 1.2], ['Hospital Dia', 0.8]]
  const plans: [string, number][] = [['Particular', 1.0], ['Plano Alfa', 2.2], ['Plano Beta', 1.6], ['Plano Gama', 1.1], ['Plano Delta', 0.7], ['SUS', 1.4]]
  const kinds: [string, number, number][] = [['Consulta', 4, 1], ['Exame', 3, 1.4], ['Retorno', 2, 0.4], ['Cirurgia', 0.4, 9]]
  let id = 500000

  eachDay('2025-04-01', '2026-09-30', (iso, d) => {
    const dow = d.getUTCDay()
    const month = d.getUTCMonth()
    const week = dow === 0 ? 0.2 : dow === 6 ? 0.45 : 1
    const season = month === 5 || month === 6 ? 1.25 : month === 11 ? 0.8 : 1
    const n = Math.round(30 * week * season * (0.85 + r() * 0.3))
    for (let i = 0; i < n; i++) {
      const sp = pickWeighted(r, specialties.map((s) => [s, s[1]] as const))
      const kind = pickWeighted(r, kinds.map((k) => [k, k[1]] as const))
      const unit = pickWeighted(r, units)
      const wait = Math.round((unit === 'Clínica Central' ? 38 : 24) * (0.4 + r() * 1.4))
      rows.push({
        atendimento_id: ++id,
        data_atendimento: iso,
        especialidade: sp[0],
        unidade: unit,
        convenio: pickWeighted(r, plans),
        tipo: kind[0],
        valor: round2(sp[2] * kind[2] * (0.85 + r() * 0.3)),
        tempo_espera_min: wait,
      })
    }
  })

  const fields: Field[] = [
    { name: 'atendimento_id', title: 'Atendimento', type: 'number', key: true, aliases: ['atendimento', 'atendimentos'] },
    { name: 'data_atendimento', title: 'Data do atendimento', type: 'date', aliases: ['data', 'dia'] },
    { name: 'especialidade', title: 'Especialidade', type: 'text', aliases: ['especialidade', 'especialidades'] },
    { name: 'unidade', title: 'Unidade', type: 'text', aliases: ['unidade', 'unidades', 'clinica'] },
    { name: 'convenio', title: 'Convênio', type: 'text', aliases: ['convenio', 'convenios', 'plano'] },
    { name: 'tipo', title: 'Tipo', type: 'text', aliases: ['tipo', 'tipo de atendimento'] },
    { name: 'valor', title: 'Valor faturado', type: 'number', format: 'currency', aliases: ['valor', 'faturamento', 'receita'] },
    { name: 'tempo_espera_min', title: 'Espera (min)', type: 'number', format: 'integer', aliases: ['espera', 'tempo de espera'] },
  ]
  return { id: `metadado:${meta.id}`, kind: 'metadado', name: meta.name, group: meta.group, code: meta.code, fields, rows }
}

/* ── Arquivo (CSV) ────────────────────────────────────────────────────────── */

/** Separa um CSV respeitando aspas. Detecta `;` (Excel pt-BR) ou `,`. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '')
  const firstLine = clean.slice(0, clean.indexOf('\n') === -1 ? undefined : clean.indexOf('\n'))
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const out: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"'
        i++
      } else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === sep) {
      row.push(cell)
      cell = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++
      row.push(cell)
      if (row.some((c) => c.trim() !== '')) out.push(row)
      row = []
      cell = ''
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) out.push(row)
  return out
}

const BR_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/
const BR_NUMBER = /^-?\d{1,3}(\.\d{3})*(,\d+)?$|^-?\d+,\d+$/
const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/
const BOOL = new Set(['sim', 'nao', 'não', 'true', 'false', 'verdadeiro', 'falso'])

function toDate(v: string): string | null {
  const iso = v.match(ISO_DATE)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const br = v.match(BR_DATE)
  if (br) return `${br[3]}-${br[2]}-${br[1]}`
  return null
}

function toNumber(v: string): number | null {
  const s = v.replace(/^R\$\s*/, '').replace(/%$/, '').trim()
  if (PLAIN_NUMBER.test(s)) return Number(s)
  if (BR_NUMBER.test(s)) return Number(s.replace(/\./g, '').replace(',', '.'))
  return null
}

const words = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** "valor_total" → "Valor total". */
function humanize(name: string) {
  const s = name.replace(/[_\-.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim().toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function guessFormat(name: string, values: number[]): NumberFormat {
  const n = words(name)
  if (/(pct|percent|taxa|%)/.test(n)) return 'percent'
  if (/(valor|preco|receita|custo|lucro|fatur|price|value|revenue|amount|cost|total|ticket|salario)/.test(n)) return 'currency'
  return values.every((v) => Number.isInteger(v)) ? 'integer' : 'decimal'
}

/**
 * Lê um CSV e devolve uma origem tipada — o que o metadado do Weknow já traz
 * pronto, aqui é inferido coluna a coluna. Uma coluna só vira número/data se
 * *todos* os valores preenchidos baterem; na dúvida, fica texto, que é o tipo
 * que não quebra nada.
 */
export function sourceFromCsv(fileName: string, text: string): Source {
  const table = parseCsv(text)
  if (table.length < 2) throw new Error('O arquivo precisa de um cabeçalho e pelo menos uma linha.')
  const header = table[0].map((h, i) => h.trim() || `coluna_${i + 1}`)
  const body = table.slice(1)
  if (body.length > 200000) throw new Error('Este protótipo lê até 200 mil linhas por arquivo.')

  const fields: Field[] = header.map((name, c) => {
    const values = body.map((r) => (r[c] ?? '').trim()).filter((v) => v !== '')
    const sample = values.slice(0, 5000)
    let type: FieldType = 'text'
    if (sample.length && sample.every((v) => toDate(v))) type = 'date'
    else if (sample.length && sample.every((v) => toNumber(v) !== null)) type = 'number'
    else if (sample.length && sample.every((v) => BOOL.has(words(v)))) type = 'boolean'
    const n = words(name)
    const key = /(^id$|_id$|^id_|^cod|codigo|^num_|_num$)/.test(n) || (type === 'number' && new Set(values).size === values.length && values.length > 50)
    const nums = type === 'number' ? sample.map((v) => toNumber(v)!) : []
    // Identificador: "id_chamado" vira "Chamado" — o "id" é técnico, e o
    // indicador de contagem diz "Chamados", não "Id chamados".
    const title = key ? humanize(name.replace(/(^id[_\s-]?|[_\s-]?id$)/i, '')) || humanize(name) : humanize(name)
    return {
      name,
      title,
      type,
      key: key || undefined,
      format: type === 'number' ? guessFormat(name, nums) : undefined,
      aliases: [words(humanize(name))],
    }
  })

  const percentScale = fields.map((f, c) => {
    if (f.format !== 'percent') return 1
    const max = Math.max(...body.map((r) => toNumber((r[c] ?? '').trim()) ?? 0))
    return max > 1 ? 0.01 : 1
  })

  const rows: Row[] = body.map((r) => {
    const row: Row = {}
    fields.forEach((f, c) => {
      const raw = (r[c] ?? '').trim()
      let v: Cell = raw === '' ? null : raw
      if (raw !== '') {
        if (f.type === 'date') v = toDate(raw)
        else if (f.type === 'number') v = (toNumber(raw) ?? 0) * percentScale[c]
        else if (f.type === 'boolean') v = ['sim', 'true', 'verdadeiro'].includes(words(raw))
      }
      row[f.name] = v
    })
    return row
  })

  const base = fileName.replace(/\.[^.]+$/, '')
  return { id: `arquivo:${base}:${Date.now()}`, kind: 'arquivo', name: humanize(base), group: fileName, fields, rows }
}

/**
 * Arquivo de exemplo para quem não tem um CSV à mão. É texto CSV de verdade
 * e passa pelo mesmo leitor de um arquivo enviado — não é um atalho que pula
 * a inferência de tipos.
 */
export function sampleCsv(): { name: string; text: string } {
  const r = rng(77)
  const teams: [string, number][] = [['Suporte N1', 3], ['Suporte N2', 1.6], ['Infraestrutura', 1], ['Financeiro', 0.7], ['Comercial', 0.5]]
  const channels: [string, number][] = [['E-mail', 2], ['Chat', 3], ['Telefone', 1.2], ['Portal', 1.6]]
  const priorities: [string, number][] = [['Baixa', 3], ['Média', 2.5], ['Alta', 1.2], ['Crítica', 0.3]]
  const lines = ['id_chamado;data_abertura;equipe;canal;prioridade;status;tempo_resolucao_h;satisfacao']
  let id = 1
  eachDay('2026-01-01', '2026-09-30', (_iso, d) => {
    const n = Math.round((d.getUTCDay() % 6 === 0 ? 4 : 17) * (0.8 + r() * 0.4))
    for (let i = 0; i < n; i++) {
      const pr = pickWeighted(r, priorities)
      const hours = (pr === 'Crítica' ? 3 : pr === 'Alta' ? 9 : pr === 'Média' ? 20 : 34) * (0.4 + r() * 1.3)
      const status = r() < 0.86 ? 'Resolvido' : r() < 0.6 ? 'Em andamento' : 'Aguardando cliente'
      const br = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`
      lines.push([id++, br, pickWeighted(r, teams), pickWeighted(r, channels), pr, status, hours.toFixed(1).replace('.', ','), 1 + Math.floor(r() * r() * 5) === 1 ? 5 : 3 + Math.floor(r() * 3)].join(';'))
    }
  })
  return { name: 'chamados_suporte.csv', text: lines.join('\n') }
}
