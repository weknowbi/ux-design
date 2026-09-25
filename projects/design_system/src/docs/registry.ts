import type { ComponentType } from 'react'
import index from './pages.json'

/*
 * Três coisas se juntam aqui, e nenhuma delas se repete:
 *
 *   pages.json    o índice, títulos, resumos, estado, origem no Figma
 *   content/*.md  o texto, um arquivo por página
 *   demos/*.tsx   a demonstração ao vivo, montada com o componente REAL
 *
 * O `scripts/build-agent-docs.mjs` lê o mesmo `pages.json` e os mesmos `.md`
 * para gerar `/llms.txt`. É por isso que a versão para agente nunca fica
 * atrasada em relação à página: as duas leem os mesmos arquivos.
 */

/* `eager` porque o menu precisa saber, na primeira pintura, quais páginas
   têm texto. Carregamento sob demanda pouparia bytes e criaria um piscar de
   menu, troca ruim num documento deste tamanho. */
const MD = import.meta.glob('./content/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const DEMOS = import.meta.glob('./demos/*.tsx', { eager: true }) as Record<
  string,
  Record<string, ComponentType>
>

/**
 * Estado da página, aparece no menu e no `/llms.txt`.
 *
 * Um agente precisa distinguir "esta é a regra" de "ainda não decidimos".
 * Rascunho citado como regra é pior do que página ausente, porque inventa
 * uma autoridade que ninguém deu.
 */
export type Status = 'pronto' | 'rascunho' | 'pendente'

export type Page = {
  /** Rota (`#/cor`) e nome do arquivo em `content/` e em `/docs/`. */
  id: string
  title: string
  /**
   * Símbolo do menu, um por página, nunca um por grupo.
   *
   * Cinco itens de "Componentes" com o mesmo ícone não distinguem nada: o
   * glifo repetido só ocupa a coluna. Ou o ícone identifica a página, ou não
   * deveria estar lá.
   */
  icon: string
  /** Uma frase. É o que entra no índice do `/llms.txt`. */
  summary: string
  status: Status
  /** Markdown, a fonte de verdade do texto. */
  md: string
  /** Demonstração ao vivo, quando faz sentido ver funcionando. */
  demo?: ComponentType
  /** Onde o componente mora no código. */
  source?: string
  /** Nó do Figma de origem, para cruzar com o MCP. */
  figma?: string
}

export type Group = {
  id: string
  label: string
  /** Símbolo do grupo, o que a barra lateral mostra. */
  icon: string
  pages: Page[]
}

/** `cor` → `DemoCor`; `menu-lateral` → `DemoMenuLateral`. */
function demoName(id: string) {
  return 'Demo' + id.split('-').map((p) => p[0].toUpperCase() + p.slice(1)).join('')
}

function pick<T>(map: Record<string, T>, suffix: string): T | undefined {
  const key = Object.keys(map).find((k) => k.endsWith(suffix))
  return key ? map[key] : undefined
}

function build(raw: (typeof index)['groups'][number]['pages'][number]): Page {
  const md = pick(MD, `/content/${raw.id}.md`)
  const mod = pick(DEMOS, `/demos/${demoName(raw.id)}.tsx`)
  return {
    ...raw,
    status: raw.status as Status,
    md: md ?? `# ${raw.title}\n\n_Sem conteúdo: falta \`content/${raw.id}.md\`._\n`,
    demo: mod?.[demoName(raw.id)],
  }
}

export const GROUPS: Group[] = index.groups.map((g) => ({
  id: g.id,
  label: g.label,
  icon: g.icon,
  pages: g.pages.map(build),
}))

export const PAGES: Page[] = GROUPS.flatMap((g) => g.pages)

export function findPage(id: string): Page | undefined {
  return PAGES.find((p) => p.id === id)
}

/** O grupo a que uma página pertence, a barra lateral marca este item. */
export function groupOf(pageId: string): Group {
  return GROUPS.find((g) => g.pages.some((p) => p.id === pageId)) ?? GROUPS[0]
}

export const HOME = PAGES[0]
