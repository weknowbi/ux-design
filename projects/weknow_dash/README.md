# Weknow Dash

Protótipo da funcionalidade que gera **dashboards interativos a partir de um
metadado** (ou de um arquivo CSV) e deixa **ajustar o visual por conversa**,
sem que a conversa consiga quebrar filtro, total ou tabela.

Nasceu do vídeo em que um dashboard é gerado por IA num artefato HTML. O
resultado é bonito, mas cada ajuste reescreve o arquivo inteiro: um filtro
pode parar de funcionar, um total pode deixar de bater, e publicar a versão
nova exige despublicar e gerar outro link. Aqui o caminho é outro.

## A ideia em uma frase

**A IA não escreve o dashboard; ela edita um documento que descreve o
dashboard.** Filtrar, agregar, cruzar e conferir é sempre o mesmo código, igual
para todo dashboard.

```text
metadado ─► rascunho (planner) ─► DashboardSpec (JSON) ─► motor (query) ─► tela
                                        ▲
pedido em português ─► IA ─► operações ─┘  cada operação passa pela validação
```

## As três faixas do que pode mudar

| Faixa | O quê | Como |
| --- | --- | --- |
| **Livre** | paleta, fundo claro/escuro, brilho nos indicadores, espaçamento, cantos, títulos, largura e ordem dos blocos | aplicado direto |
| **Conferido** | tipo de gráfico, medida, campo, agrupamento no tempo, top N, incluir/remover gráficos, filtros da barra | validado contra os campos do metadado antes de entrar |
| **Fixo** | filtro de período, filtro por clique, "Limpar filtros", "Outros" que fecha o total, tabela de detalhe, os números em si | não existe operação para mexer — o pedido é recusado com o motivo |

Exemplos que dá para testar no painel "Editar com IA":

- *Muda a paleta para tons mais vibrantes, mantendo o dark mode com destaques
  em verde neon e roxo. Adiciona um leve brilho nos KPIs* → aplicado.
- *Faz o gráfico de rosca ser clicável e coloca um botão de limpar filtro* →
  "isso já funciona em todo dashboard" (é o pedido do vídeo que, lá, precisou
  de uma rodada de edição).
- *Remova o filtro de período* / *tire a tabela* → recusado, com a razão.
- *Adicione um gráfico de lucro por vendedor* → conferido e aplicado.
- *Gráfico com dois eixos* → recusado, com alternativa.

## O que o motor garante

- **Um filtro para tudo.** Todo bloco lê o mesmo estado de filtro.
- **Filtro cruzado sem autoexclusão.** Clicar numa categoria filtra os outros
  gráficos; o gráfico clicado continua mostrando as demais, apagadas, para dar
  para trocar a escolha.
- **O total fecha.** O top N junta o resto em "Outros"; média de "Outros" é
  recalculada sobre as linhas, nunca média de médias.
- **Conferências ao vivo.** O botão "conferências" refaz, a cada filtro, a
  soma de cada gráfico contra o total da medida e a tabela contra o recorte.
- **Período anterior honesto.** O dashboard abre num recorte que tem período
  anterior inteiro na base (12 meses, 90 ou 30 dias, conforme o tamanho da
  base), para os indicadores terem comparação. Semanas/meses cortados pelo
  filtro aparecem tracejados no gráfico, em vez de parecerem uma queda.
- **Cor segue a categoria.** "Notebooks" tem a mesma cor filtrado ou não.

As três paletas (`engine/palettes.ts`) foram validadas nas duas superfícies do
Weknow (branco e `#131314`) para separação entre vizinhas, inclusive para
daltonismo.

## Versões e publicação

Toda mudança vira uma versão (desfazer, refazer, voltar a qualquer uma). A
versão publicada é uma marca nessa lista: **o link é um só, para sempre**, e
"Publicar alterações" só move a marca. Quem tem o link vê a versão publicada;
quem edita vê o rascunho.

## O que é simulado neste protótipo

- **A IA.** `engine/interpreter.ts` entende português por regras, para o
  protótipo rodar estático e sem chave de API. O contrato com um modelo de
  verdade está pronto em `engine/contract.ts`: prompt de sistema (com os
  **campos** do metadado, nunca as linhas) e o esquema da ferramenta
  `edit_dashboard`. Trocar um pelo outro não muda nada no resto do app — a
  validação continua do lado de cá.
- **Os metadados.** `34 - Vendas` (≈ 32 mil linhas) e `15 - Procedimentos` são
  gerados com semente fixa; `16 - MAPA` simula metadado com erro. Tudo
  fictício: o repositório é público.
- **Arquivo.** Lê CSV (vírgula ou ponto e vírgula, datas `AAAA-MM-DD` ou
  `DD/MM/AAAA`, números no formato brasileiro) e deduz os tipos. Excel ainda
  não; há um CSV de exemplo na tela de criação.
- **Publicação.** Os dashboards ficam no `localStorage`, então o link só abre
  neste navegador.

## Rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5178`.

## Estrutura

```text
src/
  engine/
    types.ts          o documento (DashboardSpec) e a origem dos dados
    sources.ts        metadados de exemplo e leitor de CSV
    planner.ts        rascunho determinístico a partir dos campos
    query.ts          o motor: filtro, agregação, séries, conferências
    patch.ts          as operações possíveis, validação e aplicação
    interpreter.ts    pedido em português → operações (substituto local da IA)
    contract.ts       prompt e ferramenta para a IA de verdade
    palettes.ts       paletas validadas e tema do dashboard
    format.ts         números e datas em pt-BR
  dash/               desenho: barra de filtros, indicadores, gráficos, tabela
  screens/            lista, novo dashboard, editor + painel da IA, link publicado
  lib/store.ts        dashboards, versões, publicação, conversa
```

A casca (menu, barra de topo, tokens, tema) vem do projeto `portal`. O item
"Weknow Dash" entra no menu ao lado do Weknow Ask.
