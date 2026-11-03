# Criar dashboard

Protótipo da criação de dashboards nova, dentro do portal. "Criar dashboard",
na home, parte de **um metadado** ou de **um dashboard que já existe** (os
mesmos dados e filtros dele) e abre o editor com o dashboard vazio. O que
mostrar se descreve no **Criar com IA**, e a IA monta seguindo a **configuração do
metadado**, que se pode sobrescrever só para aquele dashboard. Publicado, ele
entra numa pasta do portal; o dashboard de origem não muda.

## O fluxo

1. **Portal.** A home e as pastas são as do projeto `portal`, copiadas para
   cá. "Criar dashboard" fica na linha dos controles. Os dashboards criados
   entram na árvore: o publicado na pasta escolhida, o rascunho em "Meus
   rascunhos".
2. **Selecione a fonte dos dados.** A lista do portal em árvore, com os chips
   Dashboards e Metadados. "Criar dashboard" (ou dois cliques) carrega a
   fonte e abre o editor. Não há segundo passo.
3. **Editor.** O menu lateral recolhe ao abrir (e volta ao sair, se a pessoa
   não mexeu). O painel começa vazio, com o Criar com IA fechado e a caixa de
   pedido no pé. O exemplo "Usar o modelo de raio-x" põe na caixa o modelo de
   pedido que serviu de referência, já adaptado ao metadado. O primeiro
   pedido monta o painel e abre o Criar com IA ao lado com o que foi feito.
   Daí em diante a caixa do pé some, para não tapar o dashboard: pedir é
   pelo Criar com IA, que se fecha e se abre pelo botão da barra.
   - **Criar com IA** é uma ferramenta de construção, não um chat sobre os
     dados: cada resposta lista primeiro o que mudou no painel (o item leva
     ao bloco), as sugestões são as "Próximas edições", com o ícone do tipo
     de mudança (filtro, período, cores…), e "Editar com IA", no bloco, faz
     a instrução seguinte valer só para ele.
   - **Pedido de painel inteiro** ("raio-x", "completo", o modelo): monta o
     **painel executivo**, no desenho do modelo de referência
     (`public/modelos/painel-executivo.html`) e com os números do metadado
     (`engine/painel.ts`): as três medidas e um número de participação no
     topo, a razão mês a mês contra o ano anterior, insights calculados
     (inclusive composição × taxa), volume por mês, a razão por parte do corte
     principal, a composição e a tabela. Abre no tema do Weknow de quem cria
     (a diretriz pode pedir outro), com o botão para trocar o tema no topo;
     as cores ficam todas nos tokens do topo da página, para um
     cliente trocar. Pelo Criar com IA se mudam período (6/12 meses, completo),
     filtro, destaque e tema, e "trocar pelos blocos" volta para os blocos. O
     que se clica dentro dele volta para o documento e entra no desfazer.
     Com ele, o cabeçalho do editor cabe numa linha.
   - **Visual pelo Criar com IA** (fica no documento e entra no desfazer):
     - cores: paleta azul (padrão do Weknow), verde ou roxa, que reordenam os
       mesmos quatro tons validados para daltonismo; ou uma cor própria em
       hexadecimal para a principal ("cor principal #0F766E"), com aviso
       quando o contraste contra o cartão fica abaixo de 3:1. Vermelho,
       laranja e amarelo não viram paleta: são de piora e alerta;
     - densidade compacta ou confortável;
     - cantos arredondados, suaves ou retos (só os cartões);
     - linhas dos gráficos curvas ou retas;
     - esconder e voltar seções: insights, volume por mês, razão por parte,
       composição, tabela, notas de método e minilinhas dos números ("sem a
       tabela e com os insights"; "mostra tudo"). A vizinha de linha fica
       com a largura toda;
     - "volta ao padrão" desfaz todo o visual.
   - **Modo expandido** (o ícone ao lado de desfazer/refazer, ou a tecla F,
     fora de campo de texto; F de novo ou Esc sai, também com o foco
     dentro do painel): some
     a barra de cima e o menu lateral, e o Criar com IA e o painel ficam com
     a janela inteira. O Criar com IA abre sempre pela direita, embaixo do
     botão que o abre (na barra de ações, com o ícone de conversa na cor
     primária, o único colorido entre os cinzas); abrir e fechar não tira o
     dashboard do lugar. A borda da esquerda dele se arrasta para alargar (de 320 até metade da janela, no máximo 720; as
     setas do teclado também mexem); a largura fica guardada e dois cliques
     na borda voltam ao padrão.
   - **Blocos** ("trocar pelos blocos", ou dashboards antigos): os blocos do
     metadado numa área própria embaixo do cabeçalho, com o botão de tema na
     barra de filtros, como o painel executivo. Sem tema escolhido, a área
     fica no tema do Weknow; o botão troca só ela e entra no desfazer.
4. **Dados.** O botão do topo mostra uma amostra das linhas do metadado e a
   configuração padrão dele, com o switch para sobrescrever neste dashboard.
   Embaixo da configuração, o atalho para a **diretriz visual** (o padrão
   Weknow, ou uma própria escrita ali ou enviada em .md/.txt).
5. **Publicar.** Nome, pasta, capa (imagem do disco ou o croqui dos blocos,
   como no card do portal) e segurança: quem pode ver (quem acessa a pasta,
   alguns grupos ou só eu), as regras de acesso do metadado e se pode baixar
   os dados. "Ver no portal" abre a pasta onde ele entrou.
6. O nome se troca no título, pelo lápis.
7. **Sair.** O logo do Weknow volta ao portal. Sair do editor (logo, caminho,
   menu ou voltar do navegador) com o rascunho nunca publicado ou com
   alterações depois de publicar pergunta antes: continuar editando, sair
   sem publicar (nada se perde: o rascunho fica em "Meus rascunhos", as
   alterações ficam no editor) ou publicar, que publica e depois sai.
   Dashboard vazio ou publicado sem alterações sai direto.

O resto deste texto vem da fase "Análise avançada" e continua valendo para o
editor.

Por baixo continua a ideia do Dash: a IA não desenha o painel, ela muda um
documento que o descreve (`engine/board.ts`). Filtro, total e clique seguem
funcionando depois de qualquer pedido porque ninguém reescreve o gráfico.

## Como se usa

1. **Lista de análises.** Busca, recortes (todas, publicadas, rascunhos) e os
   cartões com o esboço dos blocos de cada uma.
2. **Nova análise, em dois passos.**
   - **Selecione a fonte dos dados.** O topo é o da home do portal (busca e
     os chips Dashboards e Metadados). Embaixo, a lista do portal em árvore:
     pasta → dashboard, com o metadado e os filtros de cada um; área →
     metadado, que abre nos dashboards que alimenta. Clique escolhe, dois
     cliques ou Enter seguem; a barra de baixo diz o que foi escolhido.
   - **Contexto adicional.** A prévia da fonte com os números reais (o
     indicador do mês, a variação e a minilinha do ano), os filtros que vêm
     junto e os campos, com "Trocar"; e a pergunta opcional com sugestões que a
     análise sabe responder. Só uma pergunta vira o nome da análise; um
     ajuste como "Só Bradesco Saúde" deixa o nome da fonte.

   `#/nova/dashboard/<id>` abre direto no passo 2 com o dashboard escolhido,
   que é o que o botão de análise de dentro do dashboard faria.
3. **A análise** ocupa a folha inteira: a linha da fonte, o nome, uma frase
   com o resumo do mês (que muda com filtro e mês, e o "Por quê?" leva a
   pergunta para a conversa), os filtros e os blocos; os números de destaque
   têm a minilinha do ano. A conversa fica numa folha própria à direita, que
   se fecha; em tela estreita ela vira gaveta. Com a conversa fechada, a caixa
   de pedido fica presa ao pé do painel, e pedir por ali abre a conversa com a
   resposta.
4. **O painel responde a três jeitos de mexer:**
   - **conversa**: "por convênio em colunas", "só SUS", "setembro", "por que
     a Clínica médica subiu?", "tira a tendência";
   - **clique**: a barra abre filtrar, explicar e abrir mais um nível; o ponto
     do mês abre analisar e explicar aquele mês; o indicador abre explicar e
     mês a mês;
   - **direto**: tipo de gráfico, medida, largura, remover e arrastar para
     mudar de lugar; o nome do painel se edita no clique.
5. **"Editar com IA"** leva o bloco para a caixa do Criar com IA, e o
   pedido seguinte vale para ele.
6. **Explicação da IA.** "Por que mudou?" vira um bloco com a decomposição
   mix × taxa, texto com números rastreáveis (clique no número para ver a
   conta) e o recorte congelado no momento da pergunta.
7. **Desfazer e refazer** valem para tudo, também pelo Ctrl+Z.
8. **Publicar análise** pede nome e pasta do portal. Depois disso, qualquer
   mudança vira "Publicar alterações", e o link continua o mesmo.
9. **Hover em tudo que responde ao clique**: o bloco sobe a sombra e mostra
   as ações, a barra sob o ponteiro fica cheia e as outras recuam, o marcador
   do mês cresce, as linhas da lista e da árvore acendem, o cartão da lista de
   análises aproxima a miniatura.

## O que é simulado

- **A IA.** `engine/assistant.ts` entende pedidos por regras e devolve
  operações no painel, para rodar sem chave de API. Num produto, um modelo
  recebe o catálogo e o documento do painel e responde com as mesmas
  operações; só vê agregados, nunca linhas de paciente.
- **O catálogo e os dados.** A lista tem metadados e dashboards com nomes do
  portal, mas só `21 - Internações` e `32 - Faturamento e glosas` têm dados,
  gerados com semente fixa em `engine/data.ts`, com uma história plantada em
  outubro de 2026. Tudo fictício: o repositório é público.
- **Publicar.** As análises ficam no `localStorage`; nada chega ao portal.

## Rodar

```bash
npm install
npm run dev
```

Abra `http://localhost:5183`.

## Estrutura

```text
src/
  engine/
    semantic.ts     indicadores, cortes e o que cada metadado não tem
    catalog.ts      metadados, medidas e os dashboards que eles alimentam
    data.ts         os dois metadados de exemplo
    decompose.ts    o motor: razão, série, mix × taxa
    board.ts        o documento do painel e as operações sobre ele
    explain.ts      o bloco "por que mudou?" e os fatos rastreáveis
    assistant.ts    pedidos em português → operações (substituto local da IA)
  blocks/           gráficos, blocos do painel, texto com fatos
  screens/          lista, nova análise e tela de trabalho (conversa + painel)
  lib/store.ts      análises, desfazer e refazer, publicar
```

A casca (menu, barra de topo, tema) vem do `portal`, e os componentes vêm do
design system (`@ds`).
