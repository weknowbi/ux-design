/**
 * Lê a assinatura dos componentes direto do TypeScript de produção.
 *
 * Usa o compilador, não expressão regular: o que interessa aqui é a lista de
 * propriedades com tipo e opcionalidade, e isso é árvore, não texto. O
 * `typescript` já está no projeto para o `tsc --noEmit`, então não entra
 * dependência nova.
 *
 * O extrator não adivinha. Quando não consegue ler as propriedades de um
 * componente — tipo importado de outro arquivo, genérico complicado — ele
 * devolve `props: null` em vez de uma lista incompleta. Lista pela metade é
 * pior do que ausência: a ausência manda perguntar, a lista pela metade manda
 * usar.
 */

import ts from 'typescript'
import { readFile } from 'node:fs/promises'

/** Nome em PascalCase: é assim que um componente se distingue de um utilitário. */
const isComponent = (name) => /^[A-Z]/.test(name)

/** `{ a: string; b?: number }` escrito à mão na assinatura — o caso comum aqui. */
function readTypeLiteral(node, text) {
  if (!node || !ts.isTypeLiteralNode(node)) return null
  const props = []
  for (const m of node.members) {
    if (!ts.isPropertySignature(m) || !m.name) return null
    props.push({
      name: m.name.getText(text),
      optional: Boolean(m.questionToken),
      type: m.type ? m.type.getText(text).replace(/\s+/g, ' ') : 'unknown',
      doc: jsdocOf(m, text),
    })
  }
  return props
}

/** Só a primeira linha do comentário: o resto é para quem abre o arquivo. */
function jsdocOf(node, text) {
  const ranges = ts.getLeadingCommentRanges(text.getFullText(), node.getFullStart()) ?? []
  const last = ranges.filter((r) => text.getFullText().slice(r.pos, r.pos + 3) === '/**').pop()
  if (!last) return undefined
  const raw = text.getFullText().slice(last.pos, last.end)
  const line = raw
    .replace(/^\/\*\*|\*\/$/g, '')
    .split('\n')
    .map((l) => l.replace(/^\s*\*?\s?/, '').trim())
    .filter(Boolean)[0]
  return line || undefined
}

/**
 * As propriedades de um componente: ou do tipo escrito na assinatura, ou do
 * alias declarado no mesmo arquivo (`type BtnProps = { ... }`), que é como o
 * `Btn` faz.
 */
function propsOf(fn, source, aliases) {
  const param = fn.parameters?.[0]
  if (!param) return []
  const t = param.type
  if (!t) return null
  if (ts.isTypeLiteralNode(t)) return readTypeLiteral(t, source)
  if (ts.isTypeReferenceNode(t)) {
    const alias = aliases.get(t.typeName.getText(source))
    return alias ? readTypeLiteral(alias, source) : null
  }
  return null
}

/** O arquivo inteiro, como um agente precisa dele: o que exporta e com o quê. */
export async function readApi(file) {
  const text = await readFile(file, 'utf8')
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)

  const aliases = new Map()
  for (const st of source.statements) {
    if (ts.isTypeAliasDeclaration(st)) aliases.set(st.name.getText(source), st.type)
  }

  const exported = (st) =>
    st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)

  const out = { components: [], types: [], constants: [] }

  for (const st of source.statements) {
    if (!exported(st)) continue

    if (ts.isTypeAliasDeclaration(st)) {
      out.types.push({
        name: st.name.getText(source),
        type: st.type.getText(source).replace(/\s+/g, ' '),
      })
      continue
    }

    if (ts.isFunctionDeclaration(st) && st.name) {
      const name = st.name.getText(source)
      const entry = { name, doc: jsdocOf(st, source) }
      if (isComponent(name)) {
        entry.props = propsOf(st, source, aliases)
        out.components.push(entry)
      } else {
        /* Hook ou utilitário: a assinatura inteira, sem corpo. */
        entry.signature = text
          .slice(st.getStart(source), st.body ? st.body.getStart(source) : st.getEnd())
          .replace(/\s+/g, ' ')
          .trim()
        out.constants.push(entry)
      }
      continue
    }

    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        if (!d.name || !ts.isIdentifier(d.name)) continue
        const name = d.name.getText(source)
        /* Constante de espec. (`CHIP`, `FIELD`, `TABLE`): o valor é o que
           interessa, e ele é curto. */
        const value = d.initializer?.getText(source).replace(/\s+/g, ' ')
        out.constants.push({
          name,
          doc: jsdocOf(st, source),
          value: value && value.length <= 600 ? value : undefined,
        })
      }
    }
  }

  return out
}
