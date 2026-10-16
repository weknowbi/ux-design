import { profile } from '@/engine/planner'
import type { DashboardSpec, Source } from '@/engine/types'

/**
 * O contrato com a IA de verdade — o que este protótipo NÃO chama, mas que a
 * integração usaria no lugar de `interpretLocal`.
 *
 * Três regras de desenho:
 *
 *   1. A IA recebe os CAMPOS, não as linhas. O metadado tem título e tipo de
 *      cada campo, e isso basta para montar e editar o dashboard. Os dados do
 *      cliente não saem do Weknow, e o custo não cresce com o tamanho da base
 *      (32 mil ou 32 milhões de linhas geram o mesmo prompt).
 *   2. A IA responde por ferramenta (tool use), com operações tipadas — nunca
 *      HTML nem código. A lista de operações é a de `patch.ts`.
 *   3. O que a IA devolve passa por `applyOps`, que valida cada operação. A
 *      IA pode errar; o dashboard não fica inválido por isso.
 */

export function systemPrompt(spec: DashboardSpec, source: Source): string {
  const fields = profile(source)
    .map((f) => `- ${f.name} | ${f.title} | ${f.type}${f.format ? ` (${f.format})` : ''}${f.key ? ' | identificador' : ''} | ${f.distinct} valores distintos`)
    .join('\n')

  return `Você edita dashboards do Weknow. Responda SEMPRE chamando a ferramenta edit_dashboard.

Você não escreve código. O dashboard é um documento JSON, e você só pode mudá-lo pelas operações da ferramenta.

Partes fixas, que nenhuma operação altera — se pedirem, recuse em "notes" explicando por quê e ofereça uma alternativa:
- filtro de período no topo, valendo para o dashboard inteiro;
- filtro por clique (clicar numa fatia, barra ou ponto filtra todos os gráficos);
- botão "Limpar filtros";
- agrupamento "Outros" no top N, para que as partes sempre somem o total;
- tabela de detalhe;
- os números em si (vêm do metadado; nunca os altere).

Livre: paleta (weknow | neon | classico), modo (auto | light | dark), brilho nos indicadores, indicadores tingidos, densidade, cantos, títulos, largura (3, 4, 6, 8, 12 de 12 colunas) e ordem dos blocos.

Validado pelo sistema: tipo de gráfico, medida, dimensão, agrupamento no tempo, top N, incluir e remover gráficos, filtros da barra.

Use só os campos abaixo, pelo nome técnico. Medidas (sum/avg) só em campos numéricos não identificadores; dimensões só em campos de texto ou booleanos.

Origem: ${source.code ? `${source.code} - ` : ''}${source.name} (${source.rows.length} linhas)
Campos (nome | título | tipo | observação):
${fields}

Dashboard atual:
${JSON.stringify(spec)}`
}

/** Esquema da ferramenta, no formato `input_schema` da API de mensagens. */
export const EDIT_TOOL = {
  name: 'edit_dashboard',
  description: 'Aplica operações ao dashboard. Cada operação é validada; as inválidas voltam recusadas com o motivo.',
  input_schema: {
    type: 'object',
    properties: {
      ops: {
        type: 'array',
        items: {
          oneOf: [
            {
              type: 'object',
              properties: {
                op: { const: 'theme' },
                set: {
                  type: 'object',
                  properties: {
                    mode: { enum: ['auto', 'light', 'dark'] },
                    palette: { enum: ['weknow', 'neon', 'classico'] },
                    glow: { type: 'boolean' },
                    kpiTint: { type: 'boolean' },
                    density: { enum: ['compact', 'comfortable'] },
                    corners: { enum: ['square', 'soft', 'round'] },
                  },
                  additionalProperties: false,
                },
              },
              required: ['op', 'set'],
            },
            { type: 'object', properties: { op: { const: 'title' }, title: { type: 'string', maxLength: 80 } }, required: ['op', 'title'] },
            {
              type: 'object',
              properties: {
                op: { const: 'update' },
                id: { type: 'string' },
                set: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    span: { enum: [3, 4, 6, 8, 12] },
                    style: { enum: ['line', 'area', 'column', 'bar', 'donut'] },
                    grain: { enum: ['day', 'week', 'month', 'quarter'] },
                    top: { type: 'integer', minimum: 2, maximum: 20 },
                    compare: { type: 'boolean' },
                    spark: { type: 'boolean' },
                    measure: { $ref: '#/$defs/measure' },
                    dimension: { type: 'string' },
                  },
                  additionalProperties: false,
                },
              },
              required: ['op', 'id', 'set'],
            },
            { type: 'object', properties: { op: { const: 'add' }, widget: { type: 'object' }, at: { type: 'integer' } }, required: ['op', 'widget'] },
            { type: 'object', properties: { op: { const: 'remove' }, id: { type: 'string' } }, required: ['op', 'id'] },
            { type: 'object', properties: { op: { const: 'move' }, id: { type: 'string' }, to: { type: 'integer' } }, required: ['op', 'id', 'to'] },
            {
              type: 'object',
              properties: { op: { const: 'filters' }, add: { type: 'array', items: { type: 'string' } }, remove: { type: 'array', items: { type: 'string' } } },
              required: ['op'],
            },
          ],
        },
      },
      notes: {
        type: 'array',
        description: 'Recusas e avisos em português, um por item.',
        items: { type: 'object', properties: { kind: { enum: ['refuse', 'info'] }, text: { type: 'string' } }, required: ['kind', 'text'] },
      },
    },
    required: ['ops'],
    $defs: {
      measure: {
        type: 'object',
        properties: {
          field: { type: ['string', 'null'] },
          agg: { enum: ['sum', 'avg', 'count', 'distinct'] },
          label: { type: 'string' },
          per: { type: 'string' },
        },
        required: ['field', 'agg'],
      },
    },
  },
} as const
