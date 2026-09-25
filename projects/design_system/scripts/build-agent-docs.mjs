#!/usr/bin/env node
/**
 * Gera a camada legível por máquina, em `public/`:
 *
 *   llms.txt        o documento inteiro em texto, com índice, ponto de entrada
 *   docs/<id>.md    uma página isolada, para quem só precisa de uma
 *   tokens.json     as variáveis --wk-* nos dois temas
 *
 * Tudo é derivado. Nenhum valor é digitado neste arquivo: o texto vem dos
 * mesmos `.md` que a página renderiza e os tokens vêm do CSS de produção do
 * ASK. É essa derivação que impede a versão para agentes de divergir da
 * versão para gente, o modo de falha clássico de doc de design system.
 */

import { mkdir, readFile, readdir, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const ASK = path.resolve(ROOT, '../weknow_ask')
const CONTENT = path.join(ROOT, 'src/docs/content')
const OUT = path.join(ROOT, 'public')

const BASE_URL = process.env.DS_BASE_URL ?? 'http://localhost:5176'

/* --------------------------------------------------------------- tokens --- */

/**
 * Lê as variáveis direto do CSS. Um parser de CSS de verdade seria mais
 * correto e traria uma dependência para ler quatro dúzias de linhas de
 * declaração, a regex basta enquanto o arquivo for escrito à mão, e ele é.
 */
async function readTokens() {
  const css = await readFile(path.join(ASK, 'src/index.css'), 'utf8')

  const block = (selector) => {
    const start = css.indexOf(selector)
    if (start === -1) return {}
    const open = css.indexOf('{', start)
    const close = css.indexOf('\n}', open)
    const body = css.slice(open + 1, close)
    return Object.fromEntries(
      [...body.matchAll(/^\s*(--wk-[\w-]+)\s*:\s*([^;]+);/gm)].map((m) => [m[1], m[2].trim()]),
    )
  }

  const light = block(':root {')
  const dark = block(":root[data-theme='dark']")

  return {
    $comment:
      'Gerado por scripts/build-agent-docs.mjs a partir de weknow_ask/src/index.css. Não editar à mão.',
    generatedAt: new Date().toISOString().slice(0, 10),
    source: 'weknow_ask/src/index.css',
    themes: { light, dark },
    /* Tokens que existem no claro e somem no escuro são erro de tema, não
       escolha. A lista sai no arquivo para quem consome poder checar. */
    missingInDark: Object.keys(light).filter((k) => !(k in dark)),
  }
}

/* ------------------------------------------------------------------ docs --- */

async function readPages() {
  const index = JSON.parse(await readFile(path.join(ROOT, 'src/docs/pages.json'), 'utf8'))
  const files = new Set(await readdir(CONTENT))

  const groups = []
  for (const group of index.groups) {
    const pages = []
    for (const page of group.pages) {
      const file = `${page.id}.md`
      if (!files.has(file)) {
        console.warn(`  ! ${page.id}: sem content/${file}`)
        continue
      }
      pages.push({ ...page, md: await readFile(path.join(CONTENT, file), 'utf8') })
    }
    groups.push({ ...group, pages })
  }
  return groups
}

/** Uma linha do índice, com o estado explícito quando não é `pronto`. */
function indexLine(page) {
  const mark = page.status === 'pronto' ? '' : ` [${page.status}]`
  return `- [${page.title}](${BASE_URL}/docs/${page.id}.md)${mark}: ${page.summary}`
}

function buildLlmsTxt(groups, tokens) {
  const out = []

  out.push('# Design System Weknow')
  out.push('')
  out.push(
    '> Princípios, tokens, componentes e regras de uso do produto Weknow. Este arquivo é o documento inteiro em texto, na mesma ordem do site. Ele responde POR QUE e QUANDO; para a estrutura viva de uma tela específica (nós, variantes, auto layout), consulte o MCP do Figma.',
  )
  out.push('')
  out.push(`Gerado em ${new Date().toISOString().slice(0, 10)} a partir de src/docs/content/.`)
  out.push('Tokens em ' + BASE_URL + '/tokens.json, ' +
    Object.keys(tokens.themes.light).length + ' variáveis, temas claro e escuro.')
  out.push('')
  out.push('Estado das páginas: sem marca = regra vigente; [rascunho] = descreve o que existe,')
  out.push('mas não foi fechado; [pendente] = lacuna declarada, não deduza a resposta.')
  out.push('')

  out.push('## Índice')
  out.push('')
  for (const group of groups) {
    out.push(`### ${group.label}`)
    out.push('')
    for (const page of group.pages) out.push(indexLine(page))
    out.push('')
  }

  out.push('---')
  out.push('')

  for (const group of groups) {
    for (const page of group.pages) {
      out.push(`<!-- ${group.label} / ${page.id} · estado: ${page.status} -->`)
      /* Os títulos do Markdown descem um nível: o `#` de cada página vira `##`
         dentro do arquivo único, senão o documento teria dezesseis títulos de
         primeiro nível e nenhuma hierarquia legível. */
      out.push(page.md.replace(/^(#{1,5}) /gm, '#$1 ').trim())
      /* Só o nó do Figma. O caminho no código aponta para o PROTÓTIPO, e a
         assinatura dele não é a do produto, mandar um agente até lá é
         convidá-lo a copiar a chamada errada. O campo continua no
         `pages.json` para quem mantém o protótipo. */
      if (page.figma) {
        out.push('')
        out.push(`_(Figma: ${page.figma})_`)
      }
      out.push('')
      out.push('---')
      out.push('')
    }
  }

  return out.join('\n')
}

/* ------------------------------------------------------------------ main --- */

const groups = await readPages()
const tokens = await readTokens()

await rm(path.join(OUT, 'docs'), { recursive: true, force: true })
await mkdir(path.join(OUT, 'docs'), { recursive: true })

for (const group of groups) {
  for (const page of group.pages) {
    await writeFile(path.join(OUT, 'docs', `${page.id}.md`), page.md)
  }
}

await writeFile(path.join(OUT, 'llms.txt'), buildLlmsTxt(groups, tokens))
await writeFile(path.join(OUT, 'tokens.json'), JSON.stringify(tokens, null, 2) + '\n')

const count = groups.reduce((n, g) => n + g.pages.length, 0)
console.log(`agent-docs: ${count} páginas, ${Object.keys(tokens.themes.light).length} tokens`)
if (tokens.missingInDark.length) {
  console.warn(`agent-docs: sem valor no tema escuro, ${tokens.missingInDark.join(', ')}`)
}
