# Menu lateral e barra de topo

Portal, Ask e este documento usam a mesma casca. O que está acima são as
peças de produção, não um desenho delas: clicar, recolher e passar o ponteiro
respondem aqui como respondem no produto.

São três partes, sempre nesta ordem: a faixa de topo atravessa a tela inteira
e leva a marca, o caminho e a busca; o menu fica embaixo dela, sobre o canvas;
a folha branca recebe o conteúdo e é a única parte que rola.

A marca e o botão de recolher moram na faixa, não no menu. O menu encolhe por
baixo deles, então o logo fica sempre inteiro e o botão nunca muda de lugar.

## Regras

1. Um nível por barra. O menu lista destinos. O segundo nível, quando existe,
   vai para uma coluna ao lado, como as páginas deste documento.
2. Cada item tem o ícone dele. Cinco itens com o mesmo glifo não distinguem
   nada, só ocupam a coluna.
3. O item ativo é um só, e é o da tela aberta. Ativo por hover não existe.
4. Rótulo longo esmaece, não vira reticências. Reticências pedem um corte
   exato no caractere e inventam pontuação dentro do nome.
5. Quando a linha carrega um controle na ponta, como a chave de tema, ela
   deixa de ser botão. Botão dentro de botão é HTML inválido.
6. As ações da conta ficam no pé do menu, separadas dos destinos. Elas não são
   lugar para ir, são apoio.
7. A busca mora na faixa de topo. Um segundo campo de busca em outro canto da
   tela seria um segundo padrão para a mesma tarefa.
8. O caminho começa onde a folha começa, com o menu aberto ou recolhido. Ele é
   o rótulo da folha, então pertence à coluna dela.

## Recolher é escolha de quem usa

> **Aberto é o padrão. O produto nunca recolhe o menu sozinho.**

A escolha fica em `localStorage`, na chave `wk-sidebar`, e vale para o portal
e para o Ask, que dividem a mesma casca. Quem recolheu num não espera
encontrar o outro aberto.

No trilho não cabe a chave de tema, então o próprio item passa a alternar o
tema no clique. A transição entre os dois estados usa a curva `emphasized` do
Material 3, que sai rápido e assenta devagar.

## Em aberto

- Critério para um destino novo entrar no menu principal em vez do rodapé.
- Comportamento do menu abaixo de 1024px de largura.
- Se a busca da faixa é sempre global ou se muda de escopo dentro de uma
  pasta.
