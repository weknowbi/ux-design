# Cartão

> **Rascunho.** As medidas abaixo são as do portal em desenvolvimento. O
> desenho do cartão ainda está em teste lado a lado (veja *Em aberto*), então
> trate o que está aqui como o estado atual, e não como decisão fechada.

Pasta, dashboard, tarefa e apresentação aparecem no portal com o mesmo cartão.
O que muda entre eles é o ícone e a cor, nunca a caixa.

São três visualizações da mesma coleção, e a pessoa escolhe qual usar na barra
do conteúdo.

| Visualização | O que mostra | Quando serve |
| --- | --- | --- |
| Compacto | ícone, nome e ações, com 64px de altura | varrer muitos itens |
| Expandido | o Compacto com a imagem da pasta em cima | poucas pastas, com capa cadastrada |
| Lista | uma linha por item, com colunas | comparar datas e autores |

## A caixa

Raio 12, fundo `--wk-card-surface` e nenhum contorno. Quem recorta o cartão é a
sombra (`--wk-clean-shadow`), que cresce um pouco no hover junto com o fundo.

Contorno e sombra ao mesmo tempo davam duas bordas para a mesma caixa. Numa
grade de vinte pastas isso vira ruído, então ficou só a sombra, que separa o
cartão do canvas sem desenhar uma linha.

A grade é `repeat(auto-fill, minmax(260px, 1fr))` com 16 de vão, ou 12 no
celular. O número de colunas é consequência da largura disponível, e não uma
contagem fixa.

## Ícone e cor

O ícone fica num quadrado de 26 com raio 8. O glifo tem 20 e sai na cor do
item, enquanto o quadrado leva a mesma cor diluída a 14% no claro e a 24% no
escuro (`--wk-icon-tint`).

A cor vem, nesta ordem, do que a pessoa personalizou, do tema cadastrado na
pasta ou do padrão do tipo. Pasta nasce azul com `folder`, e dashboard nasce
vermelho com `bar_chart`.

Cor cheia no quadrado **e** no cartão colorido deixava a grade pesada. Com a
caixa neutra, a cor aparece uma vez só, diluída atrás do glifo.

## Altura fixa

> **O cartão nunca muda de altura por causa do conteúdo.**

Nome comprido é o caso normal nos clientes, e não a exceção. Ele corta na
segunda linha (`line-clamp-2`, 14/18) e aparece inteiro na dica.

Se o cartão crescesse, a grade perderia o ritmo e cada linha terminaria numa
altura diferente. Quem decide a altura é a coleção, e não o item: quando a
seção mostra o caminho da pasta, os 12px da linha de caminho entram em todos os
cartões dela, inclusive nos que estão na raiz.

## Expandido

A área da imagem tem proporção 2:1 e sangra até as bordas do cartão, com o raio
de cima acompanhando a caixa. A imagem é a que a pessoa cadastrou na pasta, em
`object-cover`.

Sem imagem, essa área mostra o ícone do tema em tamanho grande sobre a mesma
cor diluída a 9%. Não existe prévia inventada, e o portal nunca monta uma
miniatura a partir do conteúdo da pasta.

Não há linha entre a imagem e a faixa do nome. O que separa os dois é a
diferença de tom, assim como no cartão compacto quem separa do fundo é a
sombra.

## Lista

Linha de 56px, divisória apenas entre linhas e hover em
`--wk-portal-list-hover`. As colunas são nome, detalhes, autor e data, e abaixo
de 1024px sobram apenas nome e ações.

A lista sangra 12px para fora do conteúdo, de modo que o ícone da linha caia na
mesma coluna do título da seção acima dela.

## Regras

1. O clique em qualquer lugar do cartão abre o item. O alvo é o botão invisível
   que cobre a caixa, e o conteúdo não recebe ponteiro.
2. A estrela fica na ponta direita e marca o favorito. Dentro da seção
   Favoritos ela só aparece no hover, porque ali ela seria igual em todos.
3. O menu de três pontos aparece no hover e tem abrir, favoritar e
   personalizar. Nada que esteja só nele pode ser essencial.
4. A pasta de origem, que aparece em busca e em favoritos, vai para a dica e
   não para dentro do cartão, onde mudaria a altura.
5. Trocar Compacto por Expandido só acrescenta a imagem. A faixa do nome é a
   mesma nos dois, e trocar de visualização não pode trocar o desenho do
   cartão.

## Em aberto

O portal mantém quatro estilos de cartão no menu de reticências para
comparação: o `padrao`, que é o descrito aqui; o `atual`, que é o de produção,
com contorno e fundo cinza; o `referencia`, mais alto, com círculo cheio e
título curto; e o `tingido`, de caixa azulada e quadrado em cor cheia.

Enquanto o teste não fecha, o design system documenta o `padrao`, que é o que o
portal abre. Quando a escolha for feita, os outros três saem do código e esta
seção sai da página.
