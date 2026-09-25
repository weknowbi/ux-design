import { useMemo } from 'react'
import { marked } from 'marked'

/**
 * Markdown → HTML, com âncora em cada `##` e `###`.
 *
 * Os ids saem do texto do próprio título, então o sumário da direita, o
 * `href` do link e o `id` do elemento nunca saem de sincronia, não há uma
 * segunda lista de seções para manter.
 *
 * Pós-processar a string em vez de estender o renderizador do `marked` é
 * proposital: a API de renderer muda entre versões maiores da biblioteca, e
 * esta regex não muda.
 */

export function slug(text: string) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '')

export type Heading = { level: 2 | 3; text: string; id: string }

/** Sumário lido do Markdown cru, a mesma fonte que vira HTML. */
export function headingsOf(md: string): Heading[] {
  return [...md.matchAll(/^(##|###)\s+(.+)$/gm)].map((m) => {
    const text = m[2].replace(/`/g, '').replace(/\*\*/g, '').trim()
    return { level: m[1].length as 2 | 3, text, id: slug(text) }
  })
}

/**
 * Tira o `# Título` de abertura.
 *
 * Na página ele repetiria o cabeçalho, a 40px de distância. No arquivo ele
 * precisa ficar: `/docs/<id>.md` e o `/llms.txt` são lidos soltos, sem
 * cabeçalho nenhum em volta.
 */
export function bodyOf(md: string) {
  return md.replace(/^#\s+.*\n+/, '')
}

export function Prose({ md }: { md: string }) {
  const html = useMemo(() => {
    const raw = marked.parse(md, { async: false }) as string
    return raw.replace(
      /<h([23])>([\s\S]*?)<\/h\1>/g,
      (_all, level: string, inner: string) =>
        `<h${level} id="${slug(stripTags(inner))}">${inner}</h${level}>`,
    )
  }, [md])

  return <div className="wk-prose" dangerouslySetInnerHTML={{ __html: html }} />
}
