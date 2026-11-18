import { Fragment, type ReactNode } from 'react'

/**
 * As respostas do Weknow IA em markdown: títulos, parágrafos, listas, tabelas,
 * citação e código, com negrito, itálico e código no meio do texto. É o
 * subconjunto que um modelo usa para responder; o resto passa como texto.
 *
 * Feito à mão, sem biblioteca: são poucas regras, e assim o texto nunca vira
 * HTML (nada do que chega é injetado na página).
 *
 * O ritmo segue o de leitura dos chats de IA: texto de 15 com entrelinha
 * folgada, títulos curtos que separam as partes, tabela numa moldura que rola
 * sozinha na largura, números alinhados à direita e em algarismos de mesma
 * largura para a coluna se ler de cima a baixo.
 */

type Block =
  | { kind: 'h'; level: number; text: string }
  | { kind: 'p'; text: string }
  | { kind: 'ul' | 'ol'; items: string[] }
  | { kind: 'quote'; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'table'; head: string[]; rows: string[][]; right: boolean[] }

const UL = /^\s*[-*•] +/
const OL = /^\s*\d+[.)] +/
const cellsOf = (line: string) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim())

function parse(text: string): Block[] {
  const lines = text.replace(/\r/g, '').split('\n')
  const blocks: Block[] = []
  /* A próxima linha com texto, para uma lista seguir mesmo com linha em branco entre os itens. */
  const nextFilled = (from: number) => {
    let j = from
    while (j < lines.length && !lines[j].trim()) j++
    return j
  }
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const h = line.match(/^(#{1,4}) +(.*)$/)
    if (h) {
      blocks.push({ kind: 'h', level: h[1].length, text: h[2].trim() })
      i++
      continue
    }
    if (line.trim().startsWith('```')) {
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++])
      blocks.push({ kind: 'code', text: body.join('\n') })
      i++
      continue
    }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = []
      let align: string[] | null = null
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const c = cellsOf(lines[i])
        if (c.every((x) => /^:?-{3,}:?$/.test(x))) align = c
        else rows.push(c)
        i++
      }
      const [head, ...body] = rows
      blocks.push({ kind: 'table', head, rows: body, right: head.map((_, k) => !!align?.[k]?.endsWith(':')) })
      continue
    }
    const list = UL.test(line) ? UL : OL.test(line) ? OL : null
    if (list) {
      const items: string[] = []
      while (i < lines.length) {
        if (list.test(lines[i])) {
          items.push(lines[i].replace(list, ''))
          i++
        } else if (!lines[i].trim() && nextFilled(i) < lines.length && list.test(lines[nextFilled(i)])) {
          i = nextFilled(i)
        } else if (lines[i].trim() && /^\s{2,}/.test(lines[i]) && items.length) {
          /* Continuação do item, recuada. */
          items[items.length - 1] += ` ${lines[i].trim()}`
          i++
        } else break
      }
      blocks.push({ kind: list === UL ? 'ul' : 'ol', items })
      continue
    }
    if (/^> ?/.test(line)) {
      const body: string[] = []
      while (i < lines.length && /^> ?/.test(lines[i])) body.push(lines[i++].replace(/^> ?/, ''))
      blocks.push({ kind: 'quote', text: body.join(' ') })
      continue
    }
    const body: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4} |```|\||> ?)/.test(lines[i]) && !UL.test(lines[i]) && !OL.test(lines[i])) body.push(lines[i++].trim())
    blocks.push({ kind: 'p', text: body.join(' ') })
  }
  return blocks
}

/** Negrito, itálico e código dentro de uma linha. */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g)
  return parts.map((p, k) => {
    if (p.startsWith('**') && p.endsWith('**') && p.length > 4) return <strong key={k} style={{ fontWeight: 600 }}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`') && p.length > 2) return <code key={k} className="wk-md-code">{p.slice(1, -1)}</code>
    if (p.startsWith('*') && p.endsWith('*') && p.length > 2) return <em key={k}>{p.slice(1, -1)}</em>
    return <Fragment key={k}>{p}</Fragment>
  })
}

/** O texto sem as marcas, para onde ele aparece numa linha só (a lista de conversas). */
export function plainText(text: string) {
  return text
    .replace(/^#{1,4} +/gm, '')
    .replace(/^\s*([-*•]|\d+[.)]) +/gm, '')
    .replace(/^> ?/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()
}

export function Markdown({ text }: { text: string }) {
  const blocks = parse(text)
  return (
    <div className="wk-md">
      {blocks.map((b, k) => {
        switch (b.kind) {
          case 'h':
            return b.level <= 2 ? <h3 key={k}>{inline(b.text)}</h3> : <h4 key={k}>{inline(b.text)}</h4>
          case 'p':
            return <p key={k}>{inline(b.text)}</p>
          case 'ul':
            return (
              <ul key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={k}>
                {b.items.map((it, j) => (
                  <li key={j}>{inline(it)}</li>
                ))}
              </ol>
            )
          case 'quote':
            return <blockquote key={k}>{inline(b.text)}</blockquote>
          case 'code':
            return (
              <pre key={k}>
                <code>{b.text}</code>
              </pre>
            )
          case 'table':
            return (
              <div key={k} className="wk-md-table" role="region" aria-label="Tabela" tabIndex={0}>
                <table>
                  <thead>
                    <tr>
                      {b.head.map((c, j) => (
                        <th key={j} style={{ textAlign: b.right[j] ? 'right' : 'left' }}>
                          {inline(c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri}>
                        {b.head.map((_, j) => (
                          <td key={j} style={{ textAlign: b.right[j] ? 'right' : 'left' }}>
                            {inline(r[j] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      })}
    </div>
  )
}
