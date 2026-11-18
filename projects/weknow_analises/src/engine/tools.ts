import type { CatalogItem } from '@/engine/catalog'

/**
 * As chamadas às ferramentas do MCP do Weknow, como aparecem na conversa: o
 * nome, o que se pediu e o que voltou. É o que o Claude mostra quando usa um
 * MCP, e o que deixa a pessoa conferir de onde a resposta saiu.
 *
 * Os nomes são provisórios: valem os do MCP do Weknow.
 */

export type ToolCall = { label: string; tool: string; input: Record<string, string | number>; output: string[] }
/** Texto solto é das conversas antigas, de antes de as etapas guardarem a chamada. */
export type Step = string | ToolCall

export const stepLabel = (s: Step) => (typeof s === 'string' ? s : s.label)
export const call = (tool: string, label: string, input: ToolCall['input'], output: string[]): ToolCall => ({ tool, label, input, output })

export const label = (i: CatalogItem) => `${i.code} - ${i.name}`
export const usable = (i?: CatalogItem) => !!i && !!i.ind && !i.failed

export const readCall = (item: CatalogItem) =>
  call('ler_metadado', `Lendo os campos de ${label(item)}`, { codigo: item.code }, [
    item.fields.length ? `Campos: ${item.fields.map((f) => f.title).join(', ')}` : 'Sem campos publicados',
    item.failed ? 'Última execução: falhou' : item.ind ? 'Última execução: concluída' : 'Sem dados neste protótipo',
  ])
