import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { DocsSidebar } from '@docs/shell/DocsSidebar'
import { GroupPages, GROUP_LIST_WIDTH } from '@docs/shell/GroupPages'
import { Toc, TOC_WIDTH } from '@docs/shell/Toc'
import { Prose, bodyOf, headingsOf } from '@docs/blocks/Prose'
import { findPage, groupOf, HOME, type Page, type Status } from '@docs/docs/registry'

/**
 * A casca deste documento **não** é a do produto, e isso é decisão, não
 * descuido.
 *
 * A primeira versão copiava o frame `home`: folha de conteúdo com cantos
 * arredondados sobre o canvas, 48 de margem à direita, barra de topo de 56. No
 * portal aquilo resolve um problema real, o conteúdo é um cartão que rola sob
 * uma barra fixa, e a folha o separa do fundo. Aqui não havia esse problema:
 * sobravam um canto arredondado sem função, uma faixa morta à direita e um
 * vazio no alto que nenhum ajuste de espaçamento consertava, porque a origem
 * dele era a moldura.
 *
 * O que o design system pede é que tokens, componentes, ícones e tema sejam os
 * mesmos, e são. Estrutura de tela é outra camada: um documento tem colunas
 * de referência e uma coluna de leitura, e é isso que está montado aqui.
 *
 *   menu          255, no canvas, com marca, busca, seções e rodapé
 *   conteúdo      superfície inteira, sem raio e sem margem, separada por 1px
 *   três trilhos  lista do grupo à esquerda, sumário à direita, texto no meio
 *
 * As duas laterais são **ancoradas nas bordas** e o texto se centra entre
 * elas. Centrar o bloco inteiro, como estava antes, deixava a lista a 170px da
 * borda numa tela de 1920, parecia solta porque estava.
 */

/** Distância das colunas de referência até a borda da janela. */
const RAIL_PAD = 40
/** Respiro entre uma coluna de referência e o texto. */
const GUTTER = 40
const CONTENT_WIDTH = 760

const STATUS_LABEL: Record<Status, string> = {
  pronto: 'Pronto',
  rascunho: 'Rascunho',
  pendente: 'Pendente',
}

/** Marca de estado. `pronto` não recebe marca: o normal não se anuncia. */
function StatusTag({ status }: { status: Status }) {
  if (status === 'pronto') return null
  const rascunho = status === 'rascunho'
  return (
    <span
      className="inline-flex items-center rounded-full text-[12px] font-medium"
      style={{
        height: 22,
        paddingInline: 8,
        fontFamily: FONT,
        background: rascunho ? 'rgba(245, 158, 11, 0.12)' : 'var(--wk-hover-strong)',
        color: rascunho ? '#b45309' : COLOR.textSecondary,
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

function Article({ page, onNavigate }: { page: Page; onNavigate: (id: string) => void }) {
  const Demo = page.demo

  return (
    <article className="w-full" style={{ maxWidth: CONTENT_WIDTH }}>
      <div className="flex items-center gap-3">
        <h1
          className="text-[28px] font-semibold"
          style={{ fontFamily: FONT, color: COLOR.text, lineHeight: 1.2 }}
        >
          {page.title}
        </h1>
        <StatusTag status={page.status} />
      </div>

      <p
        className="text-[16px]"
        style={{ fontFamily: FONT, color: COLOR.textSecondary, marginTop: 8, maxWidth: '68ch' }}
      >
        {page.summary}
      </p>

      {/* A demonstração vem antes do texto: quem chega quer ver a peça e só
          depois ler por que ela é assim. */}
      {Demo && (
        <div style={{ marginTop: 32 }}>
          <Demo />
        </div>
      )}

      <div style={{ marginTop: 40 }}>
        <Prose md={bodyOf(page.md)} />
      </div>
    </article>
  )
}

function PageView({ page, onNavigate }: { page: Page; onNavigate: (id: string) => void }) {
  const headings = useMemo(() => headingsOf(page.md), [page.md])

  return (
    /*
      Sem `items-start`: as colunas precisam esticar com a linha para os
      elementos presos (`sticky`) terem por onde correr. Com a altura do
      conteúdo, o preso não tem para onde ir e o `sticky` vira enfeite.
    */
    <div className="flex" style={{ paddingBlock: 48 }}>
      <div
        className="shrink-0"
        style={{ width: GROUP_LIST_WIDTH, marginLeft: RAIL_PAD, marginRight: GUTTER }}
      >
        <GroupPages group={groupOf(page.id)} current={page.id} onNavigate={onNavigate} />
      </div>

      <div className="wk-reading flex-1 min-w-0 flex justify-center">
        <Article page={page} onNavigate={onNavigate} />
      </div>

      {/* O sumário repete o que o texto já mostra; a lista do grupo, não. Por
          isso é ele que sai quando o espaço aperta (regra em `index.css`). */}
      <div
        className="wk-toc-col shrink-0"
        style={{ width: TOC_WIDTH, marginLeft: GUTTER, marginRight: RAIL_PAD }}
      >
        <Toc headings={headings} />
      </div>
    </div>
  )
}

/**
 * Rota por hash: `#/cor`. Sem biblioteca, são dezesseis páginas estáticas, e
 * um roteador traria um mapa de rotas para manter em dia ao lado do
 * `pages.json`.
 *
 * O segundo `#` é descartado porque o sumário usa âncora comum (`#regras`), e
 * o navegador cola as duas: `#/cor#regras`.
 */
function readHash() {
  return window.location.hash.replace(/^#\/?/, '').split('#')[0] || HOME.id
}

export function DocsShell() {
  const [pageId, setPageId] = useState(readHash)
  const page = findPage(pageId) ?? HOME
  const main = useRef<HTMLElement>(null)

  useEffect(() => {
    const onHash = () => setPageId(readHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    document.title = `${page.title} · Design System Weknow`
  }, [page.title])

  /* Trocar de página volta ao topo. Sem isso, uma página curta aberta a partir
     do rodapé de uma longa aparece já rolada, e parece cortada. */
  useEffect(() => {
    main.current?.scrollTo({ top: 0 })
  }, [page.id])

  const navigate = (id: string) => {
    window.location.hash = `#/${id}`
    setPageId(id)
  }

  return (
    <div
      className="flex"
      style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}
    >
      <DocsSidebar current={page.id} onNavigate={navigate} />

      {/* Superfície inteira, sem raio e sem margem. A separação do menu é uma
          linha de 1px, no escuro ela quase some, que é a convenção do tema. */}
      <main
        ref={main}
        className="flex-1 min-w-0 overflow-y-auto"
        style={{ background: 'var(--wk-surface)', borderLeft: `1px solid ${COLOR.border}` }}
      >
        <PageView page={page} onNavigate={navigate} />
      </main>
    </div>
  )
}
