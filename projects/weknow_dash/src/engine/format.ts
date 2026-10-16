import type { Field, Grain, Measure, NumberFormat, Source } from '@/engine/types'

/** Formato de uma medida: contagem é sempre inteira; o resto herda do campo. */
export function measureFormat(m: Measure, source: Source): NumberFormat {
  if (m.agg === 'count' || m.agg === 'distinct' || !m.field) return 'integer'
  const f = source.fields.find((x) => x.name === m.field)
  if (m.agg === 'avg' && f?.format === 'integer') return 'decimal'
  return f?.format ?? 'decimal'
}

const cache = new Map<string, Intl.NumberFormat>()
function nf(key: string, opts: Intl.NumberFormatOptions) {
  let f = cache.get(key)
  if (!f) cache.set(key, (f = new Intl.NumberFormat('pt-BR', opts)))
  return f
}

/** Valor por extenso, para tabela e dica: R$ 12.345,67 · 1.234 · 12,5%. */
export function formatFull(v: number, fmt: NumberFormat): string {
  switch (fmt) {
    case 'currency':
      return nf('cf', { style: 'currency', currency: 'BRL' }).format(v)
    case 'integer':
      return nf('if', { maximumFractionDigits: 0 }).format(v)
    case 'percent':
      return nf('pf', { style: 'percent', maximumFractionDigits: 1 }).format(v)
    case 'decimal':
      return nf('df', { maximumFractionDigits: 2 }).format(v)
  }
}

/** Valor compacto, para indicador e eixo: R$ 4,2 mi · 12,9 mil. */
export function formatCompact(v: number, fmt: NumberFormat): string {
  if (fmt === 'percent') return formatFull(v, fmt)
  if (Math.abs(v) < 10000) {
    if (fmt === 'currency') return nf('cc0', { style: 'currency', currency: 'BRL', maximumFractionDigits: Math.abs(v) < 100 ? 2 : 0 }).format(v)
    return formatFull(v, fmt === 'integer' ? 'integer' : 'decimal')
  }
  if (fmt === 'currency') return nf('ccc', { style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1 }).format(v)
  return nf('nc', { notation: 'compact', maximumFractionDigits: 1 }).format(v)
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Rótulo de balde no eixo: "mar/26", "T2/26", "12/03". */
export function bucketLabel(key: string, grain: Grain, long = false): string {
  if (grain === 'month') {
    const [y, m] = key.split('-')
    return long ? `${MONTHS[Number(m) - 1]} de ${y}` : `${MONTHS[Number(m) - 1]}/${y.slice(2)}`
  }
  if (grain === 'quarter') return long ? `${key.slice(-2)} de ${key.slice(0, 4)}` : `${key.slice(-2)}/${key.slice(2, 4)}`
  const [y, m, d] = key.split('-')
  if (grain === 'week') return long ? `Semana de ${d}/${m}/${y}` : `${d}/${m}`
  return long ? `${d}/${m}/${y}` : `${d}/${m}`
}

export const formatDate = (iso: string) => {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

export function formatCell(v: unknown, f: Field | undefined): string {
  if (v === null || v === undefined || v === '') return '—'
  if (!f) return String(v)
  if (f.type === 'date' && typeof v === 'string') return formatDate(v)
  if (f.type === 'boolean') return v ? 'Sim' : 'Não'
  if (f.type === 'number' && typeof v === 'number') return f.key ? String(v) : formatFull(v, f.format ?? 'decimal')
  return String(v)
}

/** "Receita", "Ticket médio", "Pedidos" — o nome que a medida mostra. */
export function measureLabel(m: Measure, source: Source): string {
  if (m.label) return m.label
  if (m.agg === 'count' || !m.field) return 'Registros'
  const f = source.fields.find((x) => x.name === m.field)
  const t = f?.title ?? m.field
  if (m.agg === 'avg') return `${t} (média)`
  if (m.agg === 'distinct') return `${t} (distintos)`
  return t
}

export const plural = (n: number, one: string, many: string) => `${n.toLocaleString('pt-BR')} ${n === 1 ? one : many}`
