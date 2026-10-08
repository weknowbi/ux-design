import { useState } from 'react'
import { ItemCollection } from '@/components/browser/Items'
import type { Folder, Item } from '@/data/portal'
import { Example } from '@docs/blocks/Example'

/**
 * Os cartões são os do portal, importados de `components/browser/Items`. O
 * que a demonstração monta é só o conteúdo: quatro itens de mentira com os
 * mesmos campos que o portal recebe do servidor.
 *
 * O portal guarda uma cópia mais nova desse arquivo em `projects/portal`. Os
 * dois precisam convergir, e enquanto não convergem esta página documenta a
 * cópia que o alias `@` alcança, que é a do Ask.
 */

const base = (id: string, name: string, days: number) => ({
  id,
  name,
  updatedAt: new Date(Date.now() - days * 86_400_000).toISOString(),
  updatedBy: 'Mariana Souza',
})

/** Pasta sem filhos: a demonstração mostra o cartão, não a navegação. */
const pasta = (
  id: string,
  name: string,
  days: number,
  theme: { title: string; icon: string; tone: number },
  thumbnail?: string,
): Folder => ({ ...base(id, name, days), kind: 'folder', children: [], theme, thumbnail })

const ITENS: Item[] = [
  pasta(
    'f1',
    'Central de Material e Esterilização (CME)',
    1,
    { title: 'Esterilização', icon: 'biotech', tone: 1 },
    /* Foto do Unsplash, a mesma fonte que a maquete do portal usa. No produto
       a imagem é a que o cliente cadastra na pasta. */
    'https://images.unsplash.com/photo-1579684453423-f84349ef60b0?w=640&q=70&auto=format&fit=crop',
  ),
  pasta('f2', 'Faturamento e glosas', 4, { title: 'Faturamento', icon: 'payments', tone: 0 }),
  pasta('f3', 'Pronto atendimento', 9, { title: 'PA', icon: 'emergency', tone: 4 }),
  {
    ...base('d1', 'Ocupação de leitos por unidade', 0),
    kind: 'dashboard',
    theme: { title: 'Leitos', icon: 'bed', tone: 2 },
  },
]

const ENTRIES = ITENS.map((item) => ({ item }))

export function DemoCartao() {
  /* A estrela é de verdade: clicar favorita e o cartão reage, como no portal.
     Sem isso o exemplo mostraria o estado de repouso e mais nada. */
  const [favoritos, setFavoritos] = useState(new Set(['f2']))

  const favoritar = (id: string) =>
    setFavoritos((atual) => {
      const proximo = new Set(atual)
      if (!proximo.delete(id)) proximo.add(id)
      return proximo
    })

  const comum = {
    favorites: favoritos,
    onOpen: () => {},
    onToggleFavorite: favoritar,
  }

  return (
    <>
      <Example
        title="Expandido"
        note="A imagem cadastrada na pasta fica em cima e a faixa do nome embaixo. Sem imagem, o espaço de cima mostra o ícone do tema sobre a própria cor diluída."
      >
        <div className="w-full">
          <ItemCollection entries={ENTRIES.slice(0, 3)} view="thumbs" {...comum} />
        </div>
      </Example>

      <Example
        title="Compacto"
        note="O mesmo cartão sem a imagem, com 64px de altura em qualquer caso e o nome cortado na segunda linha."
      >
        <div className="w-full">
          <ItemCollection entries={ENTRIES} view="grid" {...comum} />
        </div>
      </Example>

      <Example
        title="Lista"
        note="A mesma coleção com uma linha por item. Passe o ponteiro para ver a estrela e o menu."
      >
        <div className="w-full">
          <ItemCollection
            entries={ENTRIES}
            view="list"
            columns={{ name: 'Nome', meta: 'Modificado' }}
            {...comum}
          />
        </div>
      </Example>
    </>
  )
}
