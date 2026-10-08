import { useState } from 'react'
import { COLOR, FONT, LAYOUT, RADIUS } from '@/design/tokens'
import { Header } from '@/components/Header'
import { Icon, IconWeknowAsk } from '@/components/icons'
import { NavRow, PortalSidebar, type PortalRoute } from '@/components/PortalSidebar'
import { SidebarBrand } from '@/components/SidebarBrand'
import { ThemeSwitch } from '@/components/ThemeSwitch'
import { Example, Specimen } from '@docs/blocks/Example'

/**
 * A casca do portal montada aqui dentro, com as peças de produção.
 *
 * Nada é desenho: a barra, a marca, a faixa de topo e a linha de menu são os
 * componentes que o portal usa. Clicar, recolher e passar o ponteiro
 * respondem como respondem lá.
 *
 * A barra é `h-full` e o rodapé dela se apoia na base. Solta numa página que
 * rola, ela não teria base nenhuma, então cada palco empresta uma altura
 * fixa.
 */

/** Altura dos palcos que mostram a barra inteira. */
const PALCO = 400

/** Fundo de canvas: a barra não tem fundo próprio, ela se apoia no canvas. */
function Canvas({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="flex overflow-hidden"
      style={{ background: COLOR.canvas, borderRadius: RADIUS.md, ...style }}
    >
      {children}
    </div>
  )
}

/**
 * A casca inteira é mais larga que a coluna de texto deste documento. Em vez
 * de encolher a peça, que mostraria medidas que não existem, o palco rola na
 * horizontal e a peça fica no tamanho real.
 *
 * O mínimo não é chutado, é a soma das partes que não encolhem. Na faixa de
 * topo: 16 de folga + caminho (o Figma dá 220 de teto ao último item) + 12 +
 * busca de 328 + 12 + reticências de 24 + 12 + avatar de 36 + 16 = 660. Com o
 * menu de 255 ao lado, a casca inteira pede 915, e 960 deixa o caminho
 * respirar em vez de encostar na busca.
 *
 * Com 760, que era o valor anterior, sobravam 505 para uma faixa que precisa
 * de 660: o caminho era espremido até virar "Pas", a busca passava por cima
 * dele e o avatar ficava fora do palco.
 */
function Larga({ min = 960, children }: { min?: number; children: React.ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: min }}>{children}</div>
    </div>
  )
}

/** A folha branca ao lado da barra, que é o que recorta a barra. */
function Folha({ label = 'folha do conteúdo' }: { label?: string }) {
  return (
    <div
      className="flex-1 min-w-0 flex items-center justify-center"
      style={{
        background: 'var(--wk-surface)',
        borderTopLeftRadius: LAYOUT.sheetRadius,
        fontFamily: FONT,
        color: COLOR.textMuted,
        fontSize: 13,
      }}
    >
      {label}
    </div>
  )
}

export function DemoNavegacao() {
  const [rota, setRota] = useState<PortalRoute>('portal')
  const [recolhida, setRecolhida] = useState(false)
  const [itemAtivo, setItemAtivo] = useState('ativo')

  return (
    <>
      <Example
        title="A casca"
        note="As três partes montadas: faixa de topo de 56 com a marca e o caminho, menu de 255 abaixo dela e folha do conteúdo à direita. Use o botão de menu para recolher."
      >
        <Larga>
          <Canvas style={{ height: PALCO, flexDirection: 'column' }}>
            <div className="flex shrink-0">
              <SidebarBrand collapsed={recolhida} onToggle={() => setRecolhida((v) => !v)} />
              <div className="flex-1 min-w-0">
                <Header trail={[{ label: 'Pastas' }, { label: 'Faturamento e glosas' }]} />
              </div>
            </div>

            <div className="flex flex-1 min-h-0">
              <PortalSidebar active={rota} onNavigate={setRota} collapsed={recolhida} />
              <Folha />
            </div>
          </Canvas>
        </Larga>
      </Example>

      <Example
        title="Item do menu"
        note="Altura 40, raio 8, ícone de 24 e texto 14/1.5. Clique para trocar o item ativo e passe o ponteiro para ver o hover. A última linha tem um controle na ponta, e por isso não é um botão."
      >
        {/* A coluna tem a largura e a margem do menu real, senão o item
            apareceria num comprimento que não existe em lugar nenhum. */}
        <div
          className="flex flex-col gap-1"
          style={{
            width: LAYOUT.sidebarWidth,
            paddingInline: 8,
            paddingBlock: 8,
            background: COLOR.canvas,
            borderRadius: RADIUS.md,
          }}
        >
          <NavRow
            icon={<Icon name="home" size={24} />}
            label="Repouso"
            active={itemAtivo === 'repouso'}
            onClick={() => setItemAtivo('repouso')}
          />
          <NavRow
            icon={<IconWeknowAsk size={24} />}
            label="Ativo, de ícone preenchido"
            active={itemAtivo === 'ativo'}
            onClick={() => setItemAtivo('ativo')}
          />
          <NavRow
            icon={<Icon name="database" size={24} />}
            label="Rótulo comprido que não cabe e esmaece no fim"
            active={itemAtivo === 'longo'}
            onClick={() => setItemAtivo('longo')}
          />
          <NavRow
            icon={<Icon name="palette" size={24} />}
            label="Tema"
            trailing={<ThemeSwitch />}
          />
        </div>
      </Example>

      <Example title="Marca" note="Ela fica na faixa de topo, e não no menu. Aberta, tem a largura da barra; no trilho, tem a largura do próprio conteúdo." align="center">
        <Specimen label="aberta">
          <div style={{ background: COLOR.canvas, borderRadius: RADIUS.md }}>
            <SidebarBrand collapsed={false} onToggle={() => {}} />
          </div>
        </Specimen>
        <Specimen label="recolhida">
          <div style={{ background: COLOR.canvas, borderRadius: RADIUS.md }}>
            <SidebarBrand collapsed onToggle={() => {}} />
          </div>
        </Specimen>
      </Example>

      <Example
        title="Barra de topo"
        note="Caminho à esquerda, busca à direita, avatar de 36 e o menu de reticências. A busca mede 240 até 1536px de janela e 328 acima disso, porque quem cede espaço é ela: o nome da pasta cresce e o caminho não pode encolher."
      >
        {/* 880, e não 700: com três itens o caminho pede 404 e só para de
            apertar a partir de 840. Abaixo disso ele transborda por baixo da
            busca, porque os itens já estão no mínimo e o caminho não recorta. */}
        <Larga min={880}>
          <div className="flex flex-col gap-3">
          <div style={{ background: COLOR.canvas, borderRadius: RADIUS.md }}>
            <Header trail={[{ label: 'Pastas' }]} />
          </div>
          <div style={{ background: COLOR.canvas, borderRadius: RADIUS.md }}>
            <Header
              trail={[
                { label: 'Pastas', icon: <Icon name="home" size={24} />, iconOnly: true },
                { label: 'Faturamento e glosas' },
                { label: 'Glosas por convênio' },
              ]}
            />
          </div>
          </div>
        </Larga>
      </Example>
    </>
  )
}
