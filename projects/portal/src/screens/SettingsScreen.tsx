import { useMemo, useState } from 'react'
import { COLOR, FONT } from '@/design/tokens'
import { useIsMobile } from '@/design/viewport'
import { AppShell } from '@/components/AppShell'
import { FolderHeader } from '@/components/FolderHeader'
import { SearchField } from '@/components/Hero'
import { Icon } from '@/components/icons'
import { APPEARANCE_COLORS } from '@/components/browser/appearance'
import { SETTINGS_GROUPS, SETTINGS_PAGES, type SettingsGroup, type SettingsPage } from '@/data/settings'
import { normalize } from '@/lib/format'
import { go } from '@/lib/router'
import type { Crumb } from '@/components/Header'
import type { PortalRoute } from '@/components/PortalSidebar'

/** Espec. do frame `home` (WP-832): a coluna de conteúdo mede 1159px. */
const CONTENT_WIDTH = 1159

/**
 * Grade dos destinos. 280 e não os 260 do portal: aqui o card carrega uma
 * linha de explicação além do nome, e a 260 ela quebrava em três linhas na
 * maioria dos casos — o card crescia de altura para caber texto que a coluna
 * mais larga resolve em duas.
 */
const CARD_COLUMNS = { gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }

/**
 * Título de grupo.
 *
 * Difere do título de seção do portal em duas coisas, e as duas vêm de haver
 * um título de TELA logo acima — o que não acontece na home, onde a saudação
 * fica longe e a seção é o primeiro texto do bloco:
 *
 *   sem ícone    o ícone colorido de 24px repetia, no título, a cor que já
 *                está nos ícones dos cards logo abaixo. Com quatro grupos,
 *                eram quatro pontos de cor disputando a leitura com os oito
 *                dos cards — a mesma informação dita duas vezes, e daí vinha
 *                boa parte do ruído da tela.
 *   tom recuado  o tamanho e o peso continuam os do portal (15/600), mas a
 *                cor desce para a fonte secundária. A escala fica legível de
 *                cima para baixo — 22 do nome da tela, 15 do grupo, 14 do
 *                nome do card — sem que o grupo, que é só uma etiqueta, pese
 *                como o título de quem o contém.
 */
function SectionTitle({ label }: { label: string }) {
  return (
    <h3
      className="text-[15px] font-semibold leading-[22px]"
      style={{ fontFamily: FONT, color: COLOR.textSecondary }}
    >
      {label}
    </h3>
  )
}

/**
 * Destino de configuração — o card limpo do portal com uma linha a mais.
 *
 * É o mesmo objeto: raio 12, a sombra curta de três camadas, o quadrado de
 * 26px com a cor diluída no fundo e cheia no glifo. Não inventa nada porque
 * não precisa: escolher para onde ir aqui é a mesma tarefa que escolher uma
 * pasta lá, e uma tela de administração que fala outro dialeto visual vira
 * um anexo do produto em vez de parte dele.
 *
 * O que muda é a descrição. No acervo o nome da pasta basta — é o cliente
 * que o escreveu. Aqui não: "Grupos de usuários" e "Grupos de contato" são
 * quase o mesmo nome para coisas diferentes, e sem a linha de baixo a
 * escolha vira tentativa e erro.
 */
function SettingsCard({ page, color, onOpen }: { page: SettingsPage; color: string; onOpen: () => void }) {
  const tone = `color-mix(in srgb, #fff var(--wk-icon-lift), ${color})`
  return (
    <div
      role="listitem"
      className="group relative flex items-start gap-3 h-full p-4 rounded-xl bg-[var(--wk-card-surface)] shadow-[var(--wk-clean-shadow)] hover:bg-[var(--wk-card-surface-hover)] hover:shadow-[var(--wk-clean-shadow-hover)] transition"
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={page.name}
        className="absolute inset-0 rounded-[inherit] outline-none cursor-pointer focus-visible:shadow-[0_0_0_2px_var(--wk-primary)]"
      />
      <span
        className="shrink-0 flex items-center justify-center rounded-lg pointer-events-none mt-0.5"
        style={{
          width: 26,
          height: 26,
          background: `color-mix(in srgb, ${tone} var(--wk-icon-tint), var(--wk-card-surface))`,
        }}
      >
        <Icon name={page.icon} size={20} weight={350} color={tone} />
      </span>
      <span className="pointer-events-none flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-[14px] leading-[20px] font-medium" style={{ fontFamily: FONT, color: COLOR.text }}>
          {page.name}
        </span>
        <span className="text-[12px] leading-[16px]" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
          {page.description}
        </span>
      </span>
    </div>
  )
}

/** Uma entrada casa com a busca pelo nome, pela explicação, pelo grupo ou pelos sinônimos. */
function matches(page: SettingsPage & { group: SettingsGroup }, q: string) {
  if (!q) return true
  const haystack = [page.name, page.description, page.group.label, ...(page.keywords ?? [])]
  return haystack.some((s) => normalize(s).includes(q))
}

/**
 * Índice das configurações.
 *
 * No sistema em produção esta tela é a primeira de três: ela leva a
 * "Gerenciar usuários", que leva a "Cadastro de usuários". Os dois primeiros
 * níveis não mostram informação nenhuma — só dizem o que existe. Aqui o
 * catálogo é plano: os grupos viraram títulos de seção e todos os destinos
 * aparecem juntos, a um clique. É o mesmo desenho que o portal usa para as
 * pastas, e pela mesma razão.
 */
export function SettingsScreen({ onRoute }: { onRoute: (route: PortalRoute) => void }) {
  const isMobile = useIsMobile()
  const [query, setQuery] = useState('')
  const q = normalize(query.trim())

  const groups = useMemo(
    () =>
      SETTINGS_GROUPS.map((group) => ({
        group,
        pages: SETTINGS_PAGES.filter((p) => p.group.id === group.id && matches(p, q)),
      })).filter((g) => g.pages.length > 0),
    [q],
  )

  const trail: Crumb[] = [
    { label: 'Portal', icon: <Icon name="home" size={24} />, iconOnly: true, onClick: () => onRoute('portal') },
    { label: 'Configurações' },
  ]

  /**
   * A busca mora na barra de topo, como a de uma pasta aberta.
   *
   * Ela já esteve na linha do título, e ali eram duas pílulas iguais — mesmo
   * tom, mesma altura de 36, mesma borda redonda — a sessenta pixels uma da
   * outra e sem alinhar por lado nenhum. O olho lia duas buscas e tinha de
   * decidir qual servia para quê. O portal já resolveu isso dentro de pasta:
   * quando a tela tem busca própria, ela ASSUME a barra de topo e diz onde
   * procura, em vez de abrir uma segunda.
   *
   * No celular não há busca na barra — lá ela fica no corpo da tela, logo
   * abaixo do título, como no `MobileHero` da home.
   */
  const search = { value: query, onChange: setQuery, placeholder: 'Pesquise nas configurações' }

  const content = (
    <>
      {/* Sem seta e sem ícone: não se "entra" em Configurações vindo de outra
          tela — chega-se pelo menu lateral, que marca onde você está, e o
          caminho na barra de topo tem a casa para voltar. Sem os dois, o nome
          da tela alinha com os grupos e com os cards: um eixo vertical só, em
          vez de três. */}
      <FolderHeader name="Configurações" icon={null} compact={isMobile} />
      {isMobile && (
        <div className="mb-6">
          <SearchField query={query} onQuery={setQuery} placeholder="Pesquise nas configurações" />
        </div>
      )}

      {/* 48px do nome da tela até o primeiro grupo (mb-4 do cabeçalho + mt-8),
          contra os 40 que separam um grupo do outro. A ordem importa: com o
          título a 33 e os grupos a 40, o primeiro grupo colava no nome da tela
          e os dois liam como um par de títulos empilhados — o nível de cima
          tem de respirar mais que o de baixo, nunca menos. */}
      <div className={`flex flex-col gap-10 ${isMobile ? '' : 'mt-8'}`}>
        {groups.map(({ group, pages }) => (
          <section key={group.id} className="flex flex-col gap-3">
            <SectionTitle label={group.label} />
            <div role="list" className="grid gap-3 md:gap-4" style={CARD_COLUMNS}>
              {pages.map((page) => (
                <SettingsCard
                  key={page.id}
                  page={page}
                  color={APPEARANCE_COLORS[group.tone % APPEARANCE_COLORS.length]}
                  onOpen={() => go(`/configuracoes/${page.id}`)}
                />
              ))}
            </div>
          </section>
        ))}
        {groups.length === 0 && (
          <p className="text-[14px] py-2" style={{ fontFamily: FONT, color: COLOR.textMuted }}>
            Nenhuma configuração com esse nome.
          </p>
        )}
      </div>
    </>
  )

  return (
    <AppShell route="configuracoes" onNavigate={onRoute} trail={trail} search={isMobile ? undefined : search}>
      {isMobile ? (
        <div className="flex flex-col px-4 pt-4 pb-16">{content}</div>
      ) : (
        <div className="mx-auto flex flex-col px-8 pt-8 pb-24" style={{ maxWidth: CONTENT_WIDTH }}>
          {content}
        </div>
      )}
    </AppShell>
  )
}
