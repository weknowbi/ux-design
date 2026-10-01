import { Fragment, useContext, useMemo, type ReactNode } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { PRESENTATIONS, TASKS, flatten, stats, type Entry, type Folder, type Item } from '@/data/portal'
import { describeCounts, normalize } from '@/lib/format'
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
  controls,
  controlsHidden,
  mobile = false,
  onNavigate,
  onToggleFavorite,
}: {
  root: Folder
  path: Folder[]
  query: string
  favorites: Set<string>
  prefs: BrowserPrefs
  /** Área de conteúdo aberta: Pastas, Tarefas ou Apresentações. */
  section: SectionId
  /** Ordenação e visualização, quando é o browser que os mostra. */
  controls?: ReactNode
  /** Os controles subiram para a barra do topo; aqui eles só esmaecem. */
  controlsHidden?: boolean
  /** Celular: uma só visualização, o Compacto (ver `view` abaixo). */
  mobile?: boolean
  onNavigate: (id: string | null) => void
  onToggleFavorite: (id: string) => void
}) {
  const all = useMemo(() => flatten(root), [root])
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
  }

  const asideControls = controls ? (
    <div className={`${FADE} ${controlsHidden ? HIDDEN : ''}`}>{controls}</div>
  ) : undefined

  /* Tarefas e Apresentações são listas planas: nada de pasta, favorito ou
     seção — só a mesma anatomia de lista com outros rótulos de coluna. */
  if (section !== 'pastas') {
    const source = section === 'tarefas' ? TASKS : PRESENTATIONS
    const found = source.filter((item) => !q || normalize(item.name).includes(q))
    const entries: Listed[] = sortItems(found, prefs.sort, prefs.dir).map((item) => ({ item, meta: item.code }))
    return (
      <div className="flex flex-col gap-8">
        {entries.length ? (
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
            {q ? 'Nada com esse nome por aqui.' : 'Nada cadastrado ainda.'}
          </p>
        )}
      </div>
    )
  }

  const toListed = (entries: Entry[], withContext: boolean, view: ViewMode): Listed[] => {
    const byItem = new Map(entries.map((e) => [e.item, e]))
    return sortItems(
      entries.map((e) => e.item),
      prefs.sort,
      prefs.dir,
    ).map((item) => {
      const entry = byItem.get(item)!
      return {
        item,
        meta: metaFor(entry, view, withContext),
        // Fora da Lista, a origem vai para o tooltip do card (Favoritos, busca).
        context: withContext && view !== 'list' ? parentLabel(entry.path) : undefined,
      }
    })
  }

  /* Na raiz a busca varre o acervo todo; dentro de pasta, só o que está nela
     e nas subpastas — é o que o campo promete ("Pesquise nesta pasta"). */
  const entries: Entry[] = q
    ? all.filter(
        (e) => (path.length === 0 || e.path.includes(current)) && normalize(e.item.name).includes(q),
      )
    : current.children.map((item) => ({ item, path }))
  const withContext = Boolean(q)
  /* Dentro de pasta o conteúdo vai todo junto, sem separar pasta de dashboard
     — é o que o Weknow faz, e dois blocos só afastavam o usuário do que ele
     procura. Na raiz as seções ficam, porque ali elas fazem o papel de
     sumário; na busca também, porque o resultado vem de pastas diferentes. */
  const flat = !q && path.length > 0
  const folders = toListed(entries.filter((e) => e.item.kind === 'folder'), withContext, view)
  const dashboards = toListed(entries.filter((e) => e.item.kind === 'dashboard'), withContext, view)
  /* Favoritos segue a visualização escolhida, como o resto da tela: em
     Expandido a pasta favorita aparece com a imagem que o cliente cadastrou,
     que é justamente o que ele escolheu ver. Uma seção em outra densidade
     seria uma exceção que só o código conhece. */
  const favs =
    !q && path.length === 0 && !flat
      ? toListed(all.filter((e) => favorites.has(e.item.id)), true, view)
      : []

  const collection = { favorites, onOpen: open, onToggleFavorite }

  type Group = { id?: string; label?: string; icon?: string; iconColor?: string; entries: Listed[]; view: ViewMode }

  /* Com Favoritos na frente, o bloco de baixo não é "Pastas" em oposição a
     nada — na raiz não há dashboard solto, então ele é o acervo inteiro, a
     favorita inclusive. O rótulo passa a dizer isso, em vez de repetir o chip
     ativo do topo e o texto da busca ("Pesquise em Pastas"): assim a pasta que
     aparece duas vezes na tela se explica, em vez de parecer engano. */
  const allRest = favs.length > 0

  const sections: Group[] = flat
    ? [{ entries: toListed(entries, withContext, view), view }]
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
    <div className="flex flex-col gap-8">
{q && (
        <h2
          className="text-[15px] font-semibold leading-[24px] min-h-[28px] -mb-4"
          style={{ fontFamily: FONT, color: COLOR.text }}
        >
          Resultados para “{query.trim()}”
        </h2>
      )}

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
            {q ? 'Nenhuma pasta ou dashboard com esse nome.' : 'Esta pasta está vazia.'}
          </p>
        )}
      </div>
    </div>
  )
}
