# Explorador de dados - Cor

Protótipo da escolha de **cor** no gráfico do explorador de dados: a escala
e se cada ponto ganha a sua cor. Reproduz a tela real (mesmos ícones,
medidas, cores e a visão Vendas por UF do dashboard 156) e acrescenta só o
que falta: o botão **Cor** no quadro **Resultado**.

## O problema

Hoje todo gráfico que sai do explorador é azul (`#3E83B7`). A primeira
tentativa de resolver colocou cinco paletas fixas copiadas no código
("Padrão", "Cores frias", "Cores quentes", "Arco-íris", "Pastel"). Elas não
conversam com nada do produto: não seguem o tema, não incluem as escalas que
a empresa cadastrou, e qualquer escala nova exige mexer no código.

O Weknow já tem um cadastro de escalas, usado no editor de gráfico, com três
grupos: **do tema**, **do sistema** e **cadastradas**. O explorador deveria
listar essas, e é o que o protótipo mostra.

## Como funciona

- **Botão "Cor" no cabeçalho do Resultado** (ícone `palette` do Material
  Symbols, mais uma tira com as cores da escala em uso). Fica fora da grade de
  tipos de gráfico porque não é um tipo de gráfico. O painel se chama "Cor", e
  não "Escala de cores", porque cuida também de como a escala é aplicada.
- **Painel encaixado à direita do gráfico**, não flutuante: o gráfico encolhe
  e continua inteiro à vista. Em quadro estreito (janela até 1180px) o painel
  passa a flutuar.
- **Sem prévia.** O clique (ou Enter) aplica a escala e o gráfico redesenha
  na hora; passar o mouse ou as setas só destaca a linha. Escolher não fecha
  o painel, para dar para trocar de novo sem reabrir.
- **Busca** pelo nome, com os grupos mantidos no resultado.
- **Cor padrão no topo, marcada por padrão.** Visão salva antes da mudança
  continua igual até alguém escolher outra escala.
- **Colorir cada ponto**, um switch no topo do painel, com o mesmo nome e o
  mesmo efeito da opção do editor de gráfico (o `colorByPoint` do
  Highcharts). Vem desligado, que é o comportamento de hoje. A regra,
  conferida no editor de gráfico:

  | | Desligado | Ligado |
  | --- | --- | --- |
  | **Uma série** (uma medida) | a série inteira na 1ª cor | cada categoria com a sua cor |
  | **Várias séries** (várias medidas) | uma cor por série, repetida em cada categoria | uma cor por categoria, igual para todas as séries dela |

  O protótipo tem uma série só (Vendas por UF), então mostra a primeira
  linha. É o switch que resolve, por exemplo, a pizza de duas medidas que
  hoje sai toda azul. Nos tipos de linha e área, a linha leva a 1ª cor e
  cada ponto a da sua categoria.
- **Com menos cores que categorias, a escala recomeça** da primeira cor. Sem
  aviso na tela por enquanto, para manter a primeira versão simples.
- **Sem criar escala por aqui.** O "Confeccionar uma escala…" do seletor
  antigo fica fora desta primeira versão: o explorador só escolhe entre as
  escalas que já existem.

## Design system

A tela antiga é uma réplica e continua com a paleta e os ícones de hoje. A
parte nova segue o design system e usa a biblioteca `@ds` de verdade, a
mesma cópia do portal e do ASK:

| Peça | Vem de |
| --- | --- |
| Ícones | `Icon` (Material Symbols Outlined, 24 no peso 200) |
| Fechar do painel | `IconBtn` (32, raio 6, ícone de 24 em `--wk-nav-label`) |
| Colorir cada ponto | `Switch` (36 × 20) na linha de preferência, Inter 14 |
| Cores | só tokens `--wk-*` (`src/tokens.css`, copiado do portal) |

O resto foi montado com as medidas das páginas do design system:

- **Gatilho:** medidas do `Btn` fantasma pequeno, com o ícone no padrão do
  sistema (24, peso 200, `--wk-nav-label`), como os do `IconBtn`. O 20/400
  de dentro de botão ficava pesado ao lado dos ícones finos do painel. É
  escrito à mão porque o `Btn` ainda não repassa `aria-expanded`. Aberto, o
  fundo acende e o ícone vai para a primária, sem preencher.
- **Painel:** fio `--wk-border`, raio 8, sem sombra quando encaixado e
  `--wk-shadow-menu` quando flutua.
- **Busca:** a das listas, com 38 de altura, raio 8, borda de controle e
  texto 16.
- **Opções:** as do `Select`, com 36 de altura, raio 6, Inter 14, a escolhida
  em primária e com check.
- **Rótulo de grupo:** caixa alta 12/600 em `--wk-text-muted`, como o seletor
  agrupado do ASK.

**Contraste (de tokens do sistema, não desta tela):** `--wk-text-muted` e
`--wk-nav-label` (#8c98a8) dão 2,9:1 sobre branco, `--wk-placeholder-soft`
4,0:1 e `--wk-field-border` 1,5:1. O mínimo é 4,5:1 para texto e 3:1 para
ícone e contorno de campo. Valem para o produto todo; mudar é decisão do
design system.

## Para o desenvolvimento

- O `Btn` precisa aceitar `aria-expanded`/`aria-haspopup` para o gatilho
  usar o componente em vez de repetir as medidas dele.

- A lista vem da **API de escalas**, a mesma do seletor do editor de gráfico.
  Os nomes e a quantidade de cores do protótipo são os de produção; as cores
  são ilustrativas (`src/scales.ts`).
- Salvar a visão guarda a **referência** à escala (id), não as cores. Se a
  escala do tema mudar, o gráfico acompanha.
- **Dado a corrigir:** em produção, "Escalas cadastradas" mostra cinco cópias
  idênticas de "Padrão - Alternado", "Padrão - alto contraste" e "Padrão -
  Termômetro". O protótipo mostra cada uma uma vez. Vale deduplicar no
  cadastro antes de expor a lista em mais um lugar.
- Escalas de uso específico do tema (Cartão, Seleção) aparecem porque fazem
  parte do cadastro. Se a equipe preferir, dá para filtrar no explorador só as
  de gráfico e mapa; o protótipo mantém todas para não esconder nada.

## Rodar

```bash
npm install
npm run dev
```

Abre em `http://localhost:5183`.
