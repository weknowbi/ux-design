import { useEffect, useMemo, useRef, useState } from 'react'
import { COLOR, FONT, LAYOUT } from '@/design/tokens'
import { DocsBrand } from '@docs/shell/DocsBrand'
import { DocsSidebar } from '@docs/shell/DocsSidebar'
import { DocsTopbar } from '@docs/shell/DocsTopbar'
import { GroupPages } from '@docs/shell/GroupPages'
import { Toc, TOC_WIDTH } from '@docs/shell/Toc'
import { NAV_DIVIDER, useSidebar } from '@docs/shell/layout'
import { Prose, bodyOf, headingsOf } from '@docs/blocks/Prose'
import { findPage, groupOf, HOME, type Page, type Status } from '@docs/docs/registry'

/**
 * A casca deste documento é a do produto.
 *
 * Portal e Ask dividem a mesma moldura: faixa de topo com marca e caminho,
 * menu lateral que recolhe em trilho, e a folha branca de cantos arredondados
 * sobre o canvas, com 48 de margem à direita. O design system mora dentro
 * dela, no mesmo lugar em que o portal mostra as pastas: documentar a
 * moldura numa moldura diferente era pedir para as duas divergirem.
 *
 *   faixa de topo   marca + botão do menu (255 / recolhido), caminho, busca
 *   menu            grupos do documento, 255 ou trilho de 56, no canvas
 *   coluna 2        páginas do grupo aberto, **também no canvas**
 *   folha           superfície branca, raio 16 no topo, margem 48 à direita
 *
 * As duas listas são o mesmo sistema de navegação e por isso têm o mesmo
 * fundo. A folha começa depois das duas, e é só ela que rola.
 */

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

function Article({ page }: { page: Page }) {
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

function PageView({ page }: { page: Page }) {
  const headings = useMemo(() => headingsOf(page.md), [page.md])

  return (
    /*
      Sem `items-start`: a coluna do sumário precisa esticar com a linha para o
      elemento preso (`sticky`) ter por onde correr. Com a altura do conteúdo,
      o preso não tem para onde ir e o `sticky` vira enfeite.

      O respiro interno da folha (`wk-sheet`, em `index.css`) encolhe junto
      com a coluna do grupo quando a janela aperta.
    */
    <div className="wk-sheet flex">
      <div className="flex-1 min-w-0 flex justify-center">
        <Article page={page} />
      </div>

      {/* O sumário repete o que o texto já mostra; a coluna do grupo, não. Por
          isso é ele que sai quando o espaço aperta (regra em `index.css`). */}
      <div className="wk-toc-col shrink-0" style={{ width: TOC_WIDTH, marginLeft: 40 }}>
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
  const group = groupOf(page.id)
  const main = useRef<HTMLElement>(null)
  const sidebar = useSidebar()

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

  const trail = [
    { label: 'Design System', onClick: () => navigate(HOME.id) },
    { label: group.label, onClick: () => navigate(group.pages[0].id) },
    { label: page.title },
  ]

  return (
    <div
      className="flex flex-col"
      style={{ width: '100vw', height: '100vh', background: COLOR.canvas, fontFamily: FONT }}
    >
      {/* Faixa de topo inteira com a marca; só o menu de baixo recolhe.
          `relative z-40`: o painel da busca desce por cima da folha. */}
      <div
        className="relative z-40 flex shrink-0"
        style={{ paddingRight: LAYOUT.sheetMarginRight }}
      >
        <DocsBrand
          collapsed={sidebar.collapsed}
          onToggle={sidebar.toggle}
          onLogoClick={() => navigate(HOME.id)}
        />
        {/* Vão da coluna do grupo. O caminho é o rótulo da folha, então
            começa onde a folha começa, e fica lá, recolhido ou não. Sem ele
            o caminho colava no logo quando o menu virava trilho, e a mesma
            informação mudava de lugar só porque o menu encolheu.

            O vão repete o fio da coluna de baixo para a linha subir até o
            topo da janela: a divisão é entre as duas colunas inteiras, e uma
            linha que começasse no meio seria um traço solto. */}
        <div
          className={`wk-group-col shrink-0${sidebar.collapsed ? '' : ` ${NAV_DIVIDER}`}`}
          aria-hidden
        />

        <div className="flex-1 min-w-0">
          <DocsTopbar trail={trail} onNavigate={navigate} />
        </div>
      </div>

      <div
        className="flex flex-1 overflow-hidden"
        style={{ minHeight: 0, paddingRight: LAYOUT.sheetMarginRight }}
      >
        <DocsSidebar current={page.id} onNavigate={navigate} collapsed={sidebar.collapsed} />
        <GroupPages
          group={group}
          current={page.id}
          onNavigate={navigate}
          divided={!sidebar.collapsed}
        />

        <main
          ref={main}
          className="flex-1 overflow-y-auto [scrollbar-gutter:stable] min-w-0"
          style={{
            background: COLOR.surface,
            borderTopLeftRadius: LAYOUT.sheetRadius,
            borderTopRightRadius: LAYOUT.sheetRadius,
          }}
        >
          <PageView page={page} />
        </main>
      </div>
    </div>
  )
}
