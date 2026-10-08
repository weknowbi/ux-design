# Botão

Cinco variantes e três tamanhos, para ações em formulários, diálogos e barras.

No tema escuro o primário inverte: fundo claro, texto escuro. Texto branco
sobre azul claro não passa em contraste.

Há **um** botão no sistema. Até outubro de 2026 havia dois, o do Weknow ASK e o
do portal, feitos em momentos diferentes e cada um com altura, intervalo e
borda próprios. Nenhum dos dois estava errado, mas eram dois enquanto esta
página descrevia um só. A fusão ficou com a superfície do ASK (cinco
variantes, três tamanhos, desabilitado) e com as medidas do portal.

## Qual variante usar

| Variante | Use quando | Por tela |
| --- | --- | --- |
| Primária | É a ação que a tela existe para receber | **Uma só** |
| Secundária | Ação importante ao lado da primária | 0 a 2 |
| Contornada | Ação de igual peso num grupo de ações | à vontade |
| Fantasma | Ação de menor peso, em menu ou cabeçalho | à vontade |
| Destrutiva | Apagar, remover, revogar | 1 por diálogo |

> Duas primárias na mesma tela é o defeito mais comum. Se as duas parecem
> igualmente importantes, nenhuma é a primária: promova uma e rebaixe a outra.

## Tamanhos

A altura é **fixa**, em vez de sair do padding, e sobe 4 no toque, porque o
alvo de dedo pede 40 enquanto o olho, numa barra de ferramentas, pede 36.

| Tamanho | Mesa | Toque | Folga lateral | Raio | Texto |
| --- | --- | --- | --- | --- | --- |
| Pequeno | 32 | 36 | 12 | 6 | 13 |
| **Médio** | **36** | **40** | 16 | 8 | 14 |
| Grande | 44 | 48 | 20 | 10 | 16 |

O médio é o padrão, e os 36 não são número redondo por acaso: é a altura da
busca compacta e da pílula da barra de topo, então lado a lado eles formam uma
linha só. Antes a altura saía do padding e dava 37, que não alinhava com nada.

O pequeno serve barra densa e linha de tabela; o grande, a ação única de uma
tela vazia ou de um passo de fluxo.

A borda é de 1px e existe em **todas** as variantes, transparente onde não
aparece. Sem ela a caixa do fantasma ficaria 2px menor que a da contornada, e
as duas vivem lado a lado no rodapé do modal.

## Ícone dentro do botão

20px no eixo `wght 400`, com 6 de intervalo até o rótulo e herdando a cor do
texto. **É a única exceção ao `wght 200`** do resto do sistema, porque em 200 o
traço de 20px sumia dentro de um botão preenchido.

Basta passar o nome do símbolo e o botão aplica a espec. sozinho. Um nó pronto
continua sendo aceito, para o caso raro que a espec. não cobre, como o símbolo
do Weknow Ask.

## Regras

1. Rótulo com verbo e objeto: "Criar pasta". Não "OK", não "Criar".
2. Botão desabilitado não diz o que falta. Diga ao lado, ou deixe habilitado e
   mostre o erro na validação.
3. Ação destrutiva irreversível pede confirmação.
4. Ícone à esquerda reforça o rótulo; à direita indica direção. Os dois juntos,
   nunca.
5. Botão só de ícone precisa de dica ao passar o mouse e de rótulo acessível.
   Um ícone sozinho não diz o que faz.
6. O anel de foco não se remove, e ele aparece **só no teclado**. Quem clicou
   com o ponteiro já sabe onde está, e o anel ali virava ruído, que era o
   comportamento do componente até agora.

## Botão só de ícone

`IconBtn` é peça própria, não um `Btn` sem rótulo: caixa de 32 × 32, sem fundo
em repouso, fundo `--wk-icon-hover` sob o ponteiro, ícone de 24 em
`--wk-nav-label`. Ativo, o ícone vai para a primária.

É o que as barras de ação e as linhas de lista usam. Ele exige `title`, e esse
`title` vira também o rótulo acessível, de modo que a regra 5 acima está na
assinatura do componente e não apenas no texto.

Para a ação secundária de um item, prefira juntar as ações num
[menu suspenso](#/menu) a enfileirar três `IconBtn` na linha. Três ícones
lado a lado pedem que a pessoa decifre três glifos antes de escolher.
