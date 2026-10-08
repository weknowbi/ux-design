# Botão

São cinco variantes e três tamanhos, para ações em formulários, diálogos e
barras.

No tema escuro o primário se inverte, com fundo claro e texto escuro, porque
texto branco sobre azul claro não passa em contraste.

Existe **um** botão no sistema. Até outubro de 2026 existiam dois, o do Weknow
ASK e o do portal, feitos em momentos diferentes e cada um com altura,
intervalo e borda próprios. Nenhum dos dois estava errado, mas eram dois
enquanto esta página descrevia um só. A fusão ficou com a superfície do ASK,
que traz cinco variantes, três tamanhos e o estado desabilitado, e com as
medidas do portal.

## Qual variante usar

| Variante | Use quando | Por tela |
| --- | --- | --- |
| Primária | É a ação que a tela existe para receber | **Uma só** |
| Secundária | Ação importante ao lado da primária | 0 a 2 |
| Contornada | Ação de igual peso num grupo de ações | à vontade |
| Fantasma | Ação de menor peso, em menu ou cabeçalho | à vontade |
| Destrutiva | Apagar, remover, revogar | 1 por diálogo |

> Duas primárias na mesma tela é o defeito mais comum. Se as duas parecem
> igualmente importantes, então nenhuma delas é a primária: promova uma e
> rebaixe a outra.

## Tamanhos

A altura é **fixa** em vez de vir do padding, e ela sobe 4 no toque, porque o
alvo de dedo pede 40 enquanto o olho, numa barra de ferramentas, pede 36.

| Tamanho | Mesa | Toque | Folga lateral | Raio | Texto |
| --- | --- | --- | --- | --- | --- |
| Pequeno | 32 | 36 | 12 | 6 | 13 |
| **Médio** | **36** | **40** | 16 | 8 | 14 |
| Grande | 44 | 48 | 20 | 10 | 16 |

O médio é o padrão, e os 36 não são um número redondo por acaso: é a altura da
busca compacta e da pílula da barra de topo, então lado a lado eles formam uma
linha só. Antes a altura vinha do padding e dava 37, que não alinhava com nada.

O pequeno serve às barras densas e às linhas de tabela. O grande serve à ação
única de uma tela vazia ou de um passo de fluxo.

A borda é de 1px e existe em **todas** as variantes, transparente onde não
aparece. Sem ela, a caixa do fantasma ficaria 2px menor que a da contornada, e
as duas aparecem lado a lado no rodapé do modal.

## Ícone dentro do botão

O ícone tem 20px no eixo `wght 400`, com 6 de intervalo até o rótulo, e herda a
cor do texto. **É a única exceção ao `wght 200`** do resto do sistema, porque
em 200 o traço de 20px sumia dentro de um botão preenchido.

Basta passar o nome do símbolo, e o botão aplica a espec. sozinho. Um nó pronto
também é aceito, para o caso raro que a espec. não cobre, como o símbolo do
Weknow Ask.

## Regras

1. O rótulo leva verbo e objeto, como em "Criar pasta". Não use "OK", e não use
   "Criar" sozinho.
2. Botão desabilitado não diz o que falta. Escreva ao lado, ou deixe o botão
   habilitado e mostre o erro na validação.
3. Ação destrutiva irreversível pede confirmação.
4. O ícone à esquerda reforça o rótulo, e à direita indica direção. Os dois ao
   mesmo tempo, nunca.
5. Botão só de ícone precisa de dica ao passar o mouse e de rótulo acessível.
   Um ícone sozinho não diz o que faz.
6. O anel de foco não se remove, e ele aparece **só no teclado**. Quem clicou
   com o ponteiro já sabe onde está, e o anel ali virava ruído, que era o
   comportamento do componente até agora.

## Botão só de ícone

O `IconBtn` é um componente próprio, e não um `Btn` sem rótulo. Ele tem caixa
de 32 × 32, nenhum fundo em repouso, fundo `--wk-icon-hover` sob o ponteiro e
ícone de 24 em `--wk-nav-label`. No estado ativo, o ícone vai para a primária.

Ele é o que as barras de ação e as linhas de lista usam, e exige `title`. Esse
`title` vira também o rótulo acessível, de modo que a regra 5 acima está na
assinatura do componente, e não apenas neste texto.

Para a ação secundária de um item, prefira juntar as ações num [menu
suspenso](#/menu) a enfileirar três `IconBtn` na linha. Três ícones lado a lado
obrigam a pessoa a decifrar três glifos antes de escolher.
