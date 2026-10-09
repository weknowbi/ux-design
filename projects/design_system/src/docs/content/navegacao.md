# Menu lateral e barra de topo

O portal, o Ask e este documento usam a mesma casca. O que está acima são os
componentes de produção, e não um desenho deles: clicar, recolher e passar o
ponteiro respondem aqui do mesmo jeito que respondem no produto.

São três partes, sempre nesta ordem. A faixa de topo atravessa a tela inteira e
traz a marca, o caminho e a busca. O menu fica abaixo dela, sobre o canvas. E a
folha branca recebe o conteúdo, sendo a única parte que rola.

A marca e o botão de recolher ficam na faixa, não no menu. O menu encolhe por
baixo dos dois, de modo que o logo permanece inteiro e o botão nunca muda de
lugar.

## Regras

1. Um nível por barra. O menu lista destinos, e o segundo nível, quando existe,
   vai para uma coluna ao lado, como acontece com as páginas deste documento.
2. Cada item tem o seu próprio ícone. Cinco itens com o mesmo glifo não
   distinguem nada e só ocupam a coluna.
3. O item ativo é um só, e é o da tela aberta. Não existe item ativo por hover.
4. O rótulo longo esmaece em vez de virar reticências. As reticências exigem um
   corte exato no caractere e inventam pontuação dentro do nome.
5. Quando a linha tem um controle na ponta, como o switch de tema, ela deixa de
   ser clicável inteira. Botão dentro de botão é HTML inválido.
6. As ações da conta ficam no pé do menu, separadas dos destinos, porque elas
   não são um lugar para onde ir, e sim apoio.
7. A busca fica na faixa de topo. Um segundo campo de busca em outro canto da
   tela criaria um segundo padrão para a mesma tarefa.
8. O caminho começa onde a folha começa, com o menu aberto ou recolhido. Ele é
   o rótulo da folha, então pertence à coluna dela.
9. A foto da barra é a porta da conta, e é a mesma nos dois tamanhos de tela.
   Ela abre o nome, o e-mail e a troca de foto, e nada além: o que o menu
   lateral já oferece não se repete lá dentro.

## Recolher é escolha de quem usa

> **Aberto é o padrão. O produto nunca recolhe o menu sozinho.**

A escolha fica no `localStorage`, na chave `wk-sidebar`, e vale tanto para o
portal quanto para o Ask, que dividem a mesma casca. Quem recolheu num deles
não espera encontrar o outro aberto.

No trilho não cabe o switch de tema, então o próprio item passa a alternar o
tema quando recebe o clique. A transição entre os dois estados usa a curva
`emphasized` do Material 3, que sai rápido e assenta devagar.

## A conta mora na foto, não na gaveta

O celular tem uma gaveta e a mesa não tem. Resolver perfil dentro da gaveta
resolveria para metade das pessoas e deixaria a outra metade sem onde ler o
próprio nome. Foi exatamente o que aconteceu enquanto a foto era um botão sem
função.

A foto, ao contrário da gaveta, está no mesmo canto nos dois modos. O menu que
sai dela é um componente só, e por isso a conta responde igual no celular e na
mesa. A foto escolhida fica no `localStorage`, na chave `wk-account-photo`,
recortada quadrada antes de guardar.

Sem foto, a cara da conta é a inicial do nome sobre o tingido de marca, com a
letra na cor de marca: o mesmo par do item aberto no menu lateral, que está
na coluna ao lado. Assim o círculo entra como parte da interface, e não como
um selo colorido competindo com a foto de quem tem uma.

Remover a foto leva a esse estado, e não de volta à que veio com a conta. A
foto de origem também é foto, e devolvê-la seria devolver justamente o que a
pessoa acabou de dispensar. Por isso "sem foto" é um estado guardado, e não a
ausência de um valor.

Dentro do menu não entram Tema, Ajuda nem Sair. Os três já estão no pé do menu
lateral, nos dois modos, e duas portas para o mesmo lugar custam mais do que
economizam, ainda mais quando uma delas é "Sair".

## Em aberto

- O critério para um destino novo entrar no menu principal em vez do rodapé.
- O comportamento do menu abaixo de 1024px de largura.
- Se a busca da faixa é sempre global ou se ela muda de escopo dentro de uma
  pasta.
