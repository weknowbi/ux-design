import { useState } from 'react'
import { Chart, type ChartType } from './Chart'
import { DATA, FIELD_TREE, MEASURE, ROW_FIELD, type TreeNode } from './data'
import { Icon } from '@ds/icons'
import { FA, Fa, MDI, Mdi } from './icons'
import { ScalePicker, Strip } from './ScalePicker'
import {
  DEFAULT_SCALE, REGISTERED_SCALES, SYSTEM_SCALES, THEME_SCALES,
  colorsFor, type Scale,
} from './scales'

const GROUPS = [
  { key: 'tema' as const, scales: THEME_SCALES },
  { key: 'sistema' as const, scales: SYSTEM_SCALES },
  { key: 'cadastrada' as const, scales: REGISTERED_SCALES },
]
const ALL_SCALES = [DEFAULT_SCALE, ...THEME_SCALES, ...SYSTEM_SCALES, ...REGISTERED_SCALES]

const CHART_TYPES: { id: ChartType; label: string; d: string; flip?: boolean }[] = [
  { id: 'coluna', label: 'Coluna', d: MDI.chartBar },
  { id: 'barra', label: 'Barra', d: MDI.chartBar, flip: true },
  { id: 'linha', label: 'Linha', d: MDI.chartLine },
  { id: 'linhaCurva', label: 'Linha curva', d: MDI.chartBellCurve },
  { id: 'area', label: 'Área', d: MDI.chartArea },
  { id: 'areaCurva', label: 'Área curva', d: MDI.chartAreaCurve },
  { id: 'pizza', label: 'Pizza', d: MDI.chartPie },
  { id: 'rosca', label: 'Rosca', d: MDI.chartDonut },
  { id: 'dispersao', label: 'Dispersão', d: MDI.chartScatter },
  { id: 'bolhas', label: 'Bolhas', d: MDI.chartBubble },
]

/* ?escala=sistema:Metro&pontos&painel&tipo=pizza abre já num estado: serve
   para mandar o link de uma situação específica e para gerar a miniatura */
const params = new URLSearchParams(location.search)

export default function App() {
  const [chartType, setChartType] = useState<ChartType>((params.get('tipo') as ChartType) ?? 'coluna')
  const [scaleId, setScaleId] = useState(params.get('escala') ?? DEFAULT_SCALE.id)
  const [pickerOpen, setPickerOpen] = useState(params.has('painel'))
  /* Desligado é o comportamento de hoje: a série inteira numa cor só */
  const [byPoint, setByPoint] = useState(params.has('pontos'))

  const selected = ALL_SCALES.find((s) => s.id === scaleId) ?? DEFAULT_SCALE
  /* Colorir cada ponto (o `colorByPoint` do Highcharts), como no editor de
     gráfico. Esta visão tem uma série só:
       ligado     cada categoria pega a próxima cor da escala
       desligado  a série inteira leva a 1ª cor
     Com várias séries, desligado dá uma cor por série, repetida em cada
     categoria; ligado dá uma cor por categoria, igual para as séries dela. */
  const colors = byPoint ? colorsFor(selected, DATA.length) : DATA.map(() => selected.colors[0])

  function closePicker() {
    setPickerOpen(false)
  }

  /* Sem prévia: o clique aplica e o gráfico redesenha na hora. Escolher não
     fecha o painel, para dar para trocar de novo sem reabrir. */
  function choose(id: string) {
    setScaleId(id)
  }

  return (
    <div className="stage">
      <Backdrop />
      <div className="explorer">
        <Toolbar />
        <div className="explorer-body">
          <FieldsPanel />
          <ConfigColumn />
          <section className="panel result">
            <header className="panel-title result-title">
              <span className="title">Resultado</span>
              <ScaleButton
                scale={selected}
                open={pickerOpen}
                onToggle={() => (pickerOpen ? closePicker() : setPickerOpen(true))}
              />
            </header>
            <div className="result-body">
              <div className="result-main">
                <div className="chart-types" role="radiogroup" aria-label="Tipo do gráfico">
                  {CHART_TYPES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      role="radio"
                      aria-checked={chartType === t.id}
                      aria-label={t.label}
                      title={t.label}
                      className={'type-btn' + (chartType === t.id ? ' is-on' : '')}
                      onClick={() => setChartType(t.id)}
                    >
                      <Mdi d={t.d} style={t.flip ? { transform: 'rotate(90deg) scaleX(-1)' } : undefined} />
                    </button>
                  ))}
                </div>
                <Chart type={chartType} data={DATA} colors={colors} />
              </div>
              {/* Painel encaixado, não flutuante: o gráfico encolhe e continua
                  inteiro à vista enquanto se troca a escala. */}
              {pickerOpen && (
                <ScalePicker
                  groups={GROUPS}
                  selectedId={scaleId}
                  byPoint={byPoint}
                  onByPoint={setByPoint}
                  onSelect={choose}
                  onClose={closePicker}
                />
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */

/**
 * Gatilho do painel: o Btn fantasma pequeno do design system (32, raio 6,
 * folga 12), com a tira da escala no lugar do rótulo. O ícone fica no padrão
 * do sistema (24, peso 200, --wk-nav-label), como os do IconBtn: o 20/400 de
 * dentro de botão pesava demais ao lado dos ícones finos do painel. Escrito
 * aqui e não com o `Btn` porque o `Btn` ainda não repassa `aria-expanded`,
 * que um botão que abre painel precisa ter.
 *
 * Aberto, o fundo acende e o ícone vai para a primária: dois sinais, não só
 * a cor. Sem preencher o ícone, que em 24 ficava pesado como o 20/400. Sem
 * chevron: o ícone já está à esquerda, e a regra 4 do botão não deixa ter
 * os dois.
 */
function ScaleButton({ scale, open, onToggle }: { scale: Scale; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={'scale-btn' + (open ? ' is-open' : '')}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label={`Cor: ${scale.name}`}
      title={`Cor: ${scale.name}`}
      onClick={onToggle}
    >
      <Icon name="palette" size={24} />
      <Strip colors={scale.colors.slice(0, 6)} width={36} height={8} />
    </button>
  )
}

function Toolbar() {
  const b = (label: string, d: string, disabled = false) => (
    <button key={label} type="button" className="tb-btn" aria-label={label} title={label} disabled={disabled}>
      <Mdi d={d} />
    </button>
  )
  return (
    <div className="toolbar">
      <button type="button" className="tb-btn tb-back" aria-label="Voltar" title="Voltar">
        <Mdi d={MDI.back} />
      </button>
      <h2 className="tb-title">Explorador de dados: (visão sem nome) *</h2>
      <div className="tb-actions">
        {b('Exibir editor', MDI.pencil)}
        <span className="tb-sep" />
        {b('Nova visão', MDI.plusBox)}
        {b('Carregar visão padrão', MDI.openInApp)}
        {b('Abrir visão', MDI.folderSolid)}
        {b('Salvar visão', MDI.save)}
        {b('Salvar como nova visão', MDI.saveAll)}
        {b('Configurações da visão', MDI.cog)}
        {b('Excluir visão', MDI.deleteForever, true)}
        <span className="tb-sep" />
        {b('Plano de execução', MDI.codeTags)}
        {b('Expandir todos os nós', MDI.expandAll, true)}
        {b('Contrair todos os nós', MDI.collapseAll, true)}
        {b('Inverter linhas e colunas', MDI.shuffle)}
        {b('Mostrar grid', MDI.table)}
        {b('Executar automaticamente', MDI.sync)}
        {b('Baixar', MDI.download)}
        {b('Enviar por e-mail', MDI.send)}
      </div>
    </div>
  )
}

function FieldsPanel() {
  return (
    <section className="panel fields">
      <header className="panel-title">
        <span className="title">Todos os campos</span>
        <button type="button" className="icon-btn dark" aria-label="Opções" title="Opções">
          <Mdi d={MDI.dots} size={22} />
        </button>
      </header>
      <label className="fields-search">
        <input placeholder="Pesquisar" aria-label="Pesquisar campos" />
        <Mdi d={MDI.search} size={22} />
      </label>
      <div className="tree" role="tree">
        {FIELD_TREE.map((n) => <TreeItem key={n.label} node={n} depth={0} />)}
      </div>
    </section>
  )
}

function TreeItem({ node, depth }: { node: TreeNode; depth: number }) {
  const [open, setOpen] = useState(!!node.open)
  const isFolder = !!node.children
  return (
    <div role="treeitem" aria-expanded={isFolder ? open : undefined}>
      <div className="tree-row" style={{ paddingLeft: 8 + depth * 16 }}>
        {isFolder ? (
          <button type="button" className="tree-toggle" onClick={() => setOpen(!open)} aria-label={(open ? 'Contrair ' : 'Expandir ') + node.label}>
            <Mdi d={MDI.chevronDown} style={{ transform: open ? undefined : 'rotate(-90deg)' }} />
          </button>
        ) : (
          <span className="tree-toggle" />
        )}
        <Mdi d={isFolder ? MDI.folderOpen : MDI.file} size={isFolder ? 22 : 20} className="tree-icon" />
        <span className="tree-label">{node.label}</span>
      </div>
      {isFolder && open && node.children!.map((c) => <TreeItem key={c.label} node={c} depth={depth + 1} />)}
    </div>
  )
}

function ConfigColumn() {
  const head = (title: string, count?: number, collapsed = false) => (
    <header className="panel-title">
      <span className="title">{title}</span>
      {count ? <span className="badge">{count}</span> : null}
      <button type="button" className="chev" aria-label={collapsed ? 'Expandir quadro' : 'Colapsar quadro'}>
        <Mdi d={collapsed ? MDI.chevronDown : MDI.chevronUp} />
      </button>
    </header>
  )
  const act = (label: string, icon: keyof typeof FA) => (
    <button key={label} type="button" className="field-act" aria-label={label} title={label}>
      <Fa icon={FA[icon]} size={icon === 'remover' ? 11 : 12} />
    </button>
  )
  return (
    <div className="config">
      <section className="panel box">
        {head('Medidas', 1)}
        <div className="field-item">
          <Mdi d={MDI.file} size={20} className="tree-icon" />
          <span className="field-name">{MEASURE}</span>
          {act('Tipo da série', 'serie')}
          {act('Função de agregação', 'agregacao')}
          {act('Valor de exibição', 'percentual')}
          {act('Configurações', 'config')}
          {act('Remover', 'remover')}
        </div>
      </section>
      <section className="panel box">
        {head('Linhas', 1)}
        <div className="field-item">
          <Mdi d={MDI.file} size={20} className="tree-icon" />
          <span className="field-name">{ROW_FIELD}</span>
          {act('Formatação', 'formatacao')}
          {act('Filtrar', 'filtrar')}
          {act('Remover', 'remover')}
        </div>
      </section>
      <section className="panel box">{head('Colunas')}</section>
      <section className="panel collapsed">{head('Filtros', 0, true)}</section>
      <section className="panel collapsed">{head('Filtros agrupados', 0, true)}</section>
    </div>
  )
}

/**
 * O explorador abre por cima do dashboard, com um véu rgba(12,25,43,.76).
 * Este fundo é um esboço do dashboard 156: sob o véu ele só dá a textura.
 */
function Backdrop() {
  const bars = [22, 48, 46, 50, 55, 54, 58, 60, 62, 64, 66, 70, 74, 80, 82, 86, 90, 95]
  return (
    <div className="backdrop" aria-hidden>
      {/* só formas, sem texto: texto atrás do véu vaza pela barra do explorador */}
      <div className="bd-top">
        <span className="bd-logo" />
        <span className="bd-crumb" />
        <span className="bd-search" />
      </div>
      <div className="bd-grid">
        <div className="bd-card bd-wide">
          <div className="bd-bars">{bars.map((h, i) => <span key={i} style={{ height: h + '%' }} />)}</div>
        </div>
        <div className="bd-card"><div className="bd-map" /></div>
        <div className="bd-card"><div className="bd-pie" /></div>
        <div className="bd-card bd-kpis"><span /><span /></div>
        <div className="bd-card"><div className="bd-bars">{bars.slice(0, 10).map((h, i) => <span key={i} style={{ height: h * 0.6 + '%' }} />)}</div></div>
        <div className="bd-card bd-wide2"><div className="bd-bars">{bars.slice(0, 9).map((h, i) => <span key={i} style={{ height: 70 + (i % 2) * 6 + '%' }} />)}</div></div>
        <div className="bd-card bd-wide2 bd-table">{Array.from({ length: 8 }, (_, i) => <span key={i} />)}</div>
      </div>
    </div>
  )
}
