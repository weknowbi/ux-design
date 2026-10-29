import { Fragment, useContext, useMemo, type ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { PRESENTATIONS, TASKS, flatten, stats, type Entry, type Folder, type Item } from '@/data/portal'
import { describeCounts, normalize } from '@/lib/format'
import { go } from '@/lib/router'
import { sortItems, type BrowserPrefs, type ViewMode } from '@/components/browser/prefs'
import { FADE, HIDDEN } from '@/components/Hero'
import { Icon } from '@/components/icons'
import { CardStyleContext, ItemCollection, type Columns, type Listed } from '@/components/browser/Items'
import type { SectionId } from '@/components/Hero'

/**
 * Cada área de conteúdo chama as colunas do seu jeito, como no Weknow: Pastas
 * lista nome e o que tem dentro; Tarefas e Apresentações são listas planas,
 * com um código curto que o cliente usa para se referir ao item.
 */
const SECTION_COLUMNS: Record<SectionId, Columns> = {
  pastas: { name: 'Nome', meta: 'Detalhes' },
  tarefas: { name: 'Descrição', meta: 'Código' },
  apresentacoes: { name: 'Nome da apresentação', meta: 'Código' },
}

/** Busca sem resultado, dita no nome do que a aba guarda. */
const SECTION_EMPTY: Record<SectionId, string> = {
  pastas: 'Nenhuma pasta ou dashboard com esse nome.',
  tarefas: 'Nenhuma tarefa com esse nome.',
  apresentacoes: 'Nenhuma apresentação com esse nome.',
}

/** Contexto de um item fora do lugar dele: só a pasta onde ele mora. */
const parentLabel = (path: Folder[]) => (path.length ? path[path.length - 1].name : 'Pastas')

/**
 * Seção: o título fica colado aos próprios itens (8px) e longe da seção
 * anterior (40px) — o espaço é que agrupa, sem caixa nem cartão em volta. O
 * ícone identifica o tipo, como no Weknow, e o título vem no tom de texto
 * cheio para mandar mais que os rótulos de coluna da lista, que são 11px
 * apagados.
 */
function Section({
  label,
  icon,
  iconColor,
  aside,
  children,
}: {
  label: string
  icon: string
  iconColor: string
  aside?: ReactNode
  children: ReactNode
}) {
  // Só a Referência Márcio traz o título de seção do modelo; no Padrão e no tingido
  // ele é o mesmo do resto do portal — ali o card mudou, a seção não.
  const clean = useContext(CardStyleContext) === 'referencia'
  return (
    <section className={`flex flex-col ${clean ? 'gap-3' : 'gap-2'}`}>
      <div className="flex items-center gap-4 min-h-[28px]">
        {clean ? (
          // Referência Márcio: o título de seção fala a língua do card — negrito e
          // o mesmo grafite do título dele, sem caixa alta; ícone em traço, como o
          // da pasta no cabeçalho do modelo. A estrela segue cheia e amarela:
          // é ela que diz "favorito" em todo o resto da interface.
          <div className="flex flex-1 items-center gap-2 min-w-0">
            <Icon
              name={icon}
              size={20}
              weight={400}
              filled={icon === 'star'}
              color={icon === 'star' ? iconColor : 'var(--wk-card-title)'}
              className="shrink-0"
            />
            <h3
              className="text-[15px] font-bold leading-[22px]"
              style={{ fontFamily: FONT, color: 'var(--wk-card-title)' }}
            >
              {label}
            </h3>
          </div>
        ) : (
          <div className="flex flex-1 items-center gap-1.5 min-w-0">
            <Icon name={icon} size={24} filled color={iconColor} className="shrink-0" />
            <h3 className="text-[15px] font-semibold leading-[22px]" style={{ fontFamily: FONT, color: COLOR.text }}>
              {label}
            </h3>
          </div>
        )}
        {aside}
      </div>
      {children}
    </section>
  )
}

/**
 * Metadado da coluna da Lista:
 * - pasta: o que ela contém;
 * - dashboard fora do lugar dele (favoritos, busca): a pasta onde mora.
 */
function metaFor(entry: Entry, view: ViewMode, withContext: boolean): string | undefined {
  if (view !== 'list') return undefined
  const { item, path } = entry
  if (item.kind === 'folder') return describeCounts(stats(item))
  return withContext ? parentLabel(path) : undefined
}

export function ContentBrowser({
  root,
  path,
  query,
  favorites,
  prefs,
  section,
  globalSearch,
  controls,
  controlsHidden,
  mobile = false,
  revision,
  onNavigate,
  onToggleFavorite,
}: {
  root: Folder
  /** Muda quando o acervo ganha uma pasta: a raiz é a mesma, o conteúdo não. */
  revision?: number
  path: Folder[]
  query: string
  favorites: Set<string>
  prefs: BrowserPrefs
  /** Área de conteúdo aberta: Pastas, Tarefas ou Apresentações. */
  section: SectionId
  /** A busca veio da barra de topo: varre o acervo sem olhar a aba, e a tela põe o título em volta. */
  globalSearch?: boolean
  /** Ordenação e visualização, quando é o browser que os mostra. */
  controls?: ReactNode
  /** Os controles subiram para a barra do topo; aqui eles só esmaecem. */
  controlsHidden?: boolean
  /** Celular: uma só visualização, o Compacto (ver `view` abaixo). */
  mobile?: boolean
  onNavigate: (id: string | null) => void
  onToggleFavorite: (id: string) => void
}) {
  // `revision` entra na lista porque a pasta nova muda o que há dentro da raiz, não a raiz.
  const all = useMemo(() => flatten(root), [root, revision])
  const q = normalize(query.trim())
  const current = path.length ? path[path.length - 1] : root
  /* No celular a visualização não é escolha: Expandido põe um card de 260px
     de altura por linha e transforma dez pastas em cinco telas de rolagem.
     Compacto é o mesmo card sem a imagem — mantém o ícone e a cor da pasta,
     que é o que identifica cada uma de relance, e cabe onze por tela. A
     escolha de mesa continua guardada e volta a valer quando a janela
     cresce. */
  const view: ViewMode = mobile ? 'grid' : prefs.view

  const open = (item: Item) => {
    if (item.kind === 'folder') onNavigate(item.id)
    // Todo dashboard abre o mesmo painel de exemplo (ver `data/dashboard.ts`).
    else if (item.kind === 'dashboard') go(`/dashboard/${encodeURIComponent(item.id)}`)
  }

  const asideControls = controls ? (
    <div className={`${FADE} ${controlsHidden ? HIDDEN : ''}`}>{controls}</div>
  ) : undefined

  /* Busca da folha: presa à aba aberta, como o texto do campo diz ("Pesquise
     por tarefas"). Enquanto há texto, a lista dá lugar ao resultado, com o
     título no lugar de onde estaria a primeira seção; apagar devolve a aba
     como estava.

     A busca da barra de topo não tem aba: ela varre o acervo e ocupa a folha
     inteira (ver o ramo de `globalSearch` mais abaixo). */
  if (!globalSearch && section !== 'pastas') {
    const source: Item[] = section === 'tarefas' ? TASKS : PRESENTATIONS
    const matches = q
      ? source.filter((item) => normalize(item.name).includes(q) || ('code' in item && item.code.includes(q)))
      : source
    // Sem controles de ordem aqui: a lista vem na ordem do código, como no Weknow.
    const entries: Listed[] = [...matches]
      .sort((a, b) => ('code' in a && 'code' in b ? a.code.localeCompare(b.code, 'pt-BR', { numeric: true }) : 0))
      .map((item) => ({
        item,
        meta: 'code' in item ? item.code : undefined,
      }))
    const list = entries.length ? (
      <ItemCollection
        entries={entries}
        view="list"
        favorites={favorites}
        columns={SECTION_COLUMNS[section]}
        headerAside={asideControls}
        onOpen={open}
        onToggleFavorite={onToggleFavorite}
      />
    ) : (
      <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
        {q ? SECTION_EMPTY[section] : 'Nada cadastrado ainda.'}
      </p>
    )
    return (
      <div className="flex flex-col gap-8">
        {q ? (
          <Section label="Resultado da busca" icon="search" iconColor={COLOR.navLabel}>
            {list}
          </Section>
        ) : (
          list
        )}
      </div>
    )
  }

  const toListed = (entries: Entry[], withContext: boolean, view: ViewMode, withTrail = false): Listed[] => {
    const byItem = new Map(entries.map((e) => [e.item, e]))
    return sortItems(
      entries.map((e) => e.item),
      prefs.sort,
      prefs.dir,
    ).map((item) => {
      const entry = byItem.get(item)!
      const trail = withTrail && view !== 'list' ? entry.path.map((p) => p.name) : undefined
      return {
        item,
        meta: metaFor(entry, view, withContext),
        // Fora da Lista, a origem vai para o tooltip do card (Favoritos, busca)
        // — menos onde o card já mostra o caminho, que aí seria dito duas vezes.
        context: withContext && view !== 'list' && !trail ? parentLabel(entry.path) : undefined,
        // Caminho vazio é a home, e ali o card diz "Pastas" em vez de deixar a
        // linha em branco — a grade tem de manter o mesmo desenho.
        trail,
      }
    })
  }

  const collection = { favorites, onOpen: open, onToggleFavorite }

  /* Busca em Pastas — a da folha, na home, e a da barra de topo, de qualquer
     lugar: as duas varrem o acervo inteiro, pastas e dashboards juntos, e o
     card diz de onde cada resultado veio, porque ali nada está no lugar dele.

     A diferença é o que ela substitui. A da folha entra no lugar das seções,
     com o título "Resultado da busca" onde estaria Favoritos, e a busca e os
     chips continuam em cima. A da barra de topo toma a folha toda, e o
     título "Resultado da pesquisa" fica por conta da tela (`PortalScreen`). */
  if (q) {
    const hits = toListed(
      all.filter(
        (e) => (e.item.kind === 'folder' || e.item.kind === 'dashboard') && normalize(e.item.name).includes(q),
      ),
      true,
      view,
      true,
    )
    const results = hits.length ? (
      <ItemCollection entries={hits} view={view} {...collection} />
    ) : (
      <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
        {SECTION_EMPTY.pastas}
      </p>
    )
    if (globalSearch) return results
    return (
      <Section label="Resultado da busca" icon="search" iconColor={COLOR.navLabel} aside={asideControls}>
        {results}
      </Section>
    )
  }

  const entries: Entry[] = current.children.map((item) => ({ item, path }))
  /* Dentro de pasta o conteúdo vai todo junto, sem separar pasta de dashboard
     — é o que o Weknow faz, e dois blocos só afastavam o usuário do que ele
     procura. Na raiz as seções ficam, porque ali elas fazem o papel de
     sumário. */
  const flat = path.length > 0
  const folders = toListed(entries.filter((e) => e.item.kind === 'folder'), false, view)
  const dashboards = toListed(entries.filter((e) => e.item.kind === 'dashboard'), false, view)
  /* Favoritos segue a visualização escolhida, como o resto da tela: em
     Expandido a pasta favorita aparece com a imagem que o cliente cadastrou,
     que é justamente o que ele escolheu ver. Uma seção em outra densidade
     seria uma exceção que só o código conhece. */
  const favs = !flat ? toListed(all.filter((e) => favorites.has(e.item.id)), true, view) : []

  type Group = { id?: string; label?: string; icon?: string; iconColor?: string; entries: Listed[]; view: ViewMode }

  /* Com Favoritos na frente, o bloco de baixo não é "Pastas" em oposição a
     nada — na raiz não há dashboard solto, então ele é o acervo inteiro, a
     favorita inclusive. O rótulo passa a dizer isso, em vez de repetir o chip
     ativo do topo: assim a pasta que aparece duas vezes na tela se explica,
     em vez de parecer engano. */
  const allRest = favs.length > 0

  const sections: Group[] = flat
    ? [{ entries: toListed(entries, false, view), view }]
    : (
        [
          {
            id: 'favoritos',
            label: 'Favoritos',
            icon: 'star',
            iconColor: 'var(--wk-star)',
            entries: favs,
            view,
          },
          {
            id: 'pastas',
            label: allRest ? 'Todas as pastas' : 'Pastas',
            icon: 'folder',
            iconColor: COLOR.navLabel,
            entries: folders,
            view,
          },
          {
            id: 'dashboards',
            label: allRest ? 'Todos os dashboards' : 'Dashboards',
            icon: 'dashboard',
            iconColor: 'var(--wk-dashboard-icon)',
            entries: dashboards,
            view,
          },
        ] as Group[]
      ).filter((s) => s.entries.length > 0)

  const empty = folders.length + dashboards.length === 0

  return (
    <div className="flex flex-col gap-10">
      {/* Os controles moram na primeira linha de seção, sem gastar uma faixa
          de altura própria. Dentro de pasta não há seção nenhuma — e nem
          controles: ali eles ficam na linha do nome da pasta. */}
      {sections.map((s, i) => {
        const items = (
          <ItemCollection
            entries={s.entries}
            view={s.view}
            quietFavorites={favs.length > 0 && s.id !== 'favoritos'}
            {...collection}
          />
        )
        if (!s.label) return <Fragment key="tudo">{items}</Fragment>
        return (
          <Section
            key={s.id}
            label={s.label}
            icon={s.icon!}
            iconColor={s.iconColor!}
            aside={i === 0 ? asideControls : undefined}
          >
            {items}
          </Section>
        )
      })}
      {empty && (
        <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
          Esta pasta está vazia.
        </p>
      )}
    </div>
  )
}
