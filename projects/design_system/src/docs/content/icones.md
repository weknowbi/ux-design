# Ícones

O sistema usa **Material Symbols Outlined** nos eixos `wght 200`, `GRAD 0` e
`opsz 24`. É a mesma família dos nós do Figma, cujos nomes trazem os eixos no
próprio título, como em `home_24dp_6C757D_FILL0_wght200_GRAD0_opsz24`.

O tamanho padrão é 24px e a cor padrão é `--wk-nav-label`.

## Regras

1. **`FILL 1` significa ativo.** É assim que o item selecionado do menu se
   distingue, junto com o fundo e a cor. Não use o preenchido por gosto
   estético.
2. Não troque o eixo `wght`. O 200 é a espessura que combina com o traço da
   Inter nos tamanhos que usamos, e o 300 já parece outra biblioteca. **A única
   exceção fica dentro do botão**, que usa 400, porque em 200 o glifo de 20px
   sumia sobre um fundo preenchido. O componente aplica esse peso sozinho,
   então não repita à mão em outro lugar.
3. Os tamanhos em uso são 20 dentro de botão e de linha densa, 24 no padrão
   (menu, barra de topo, chip e campo) e 44 em miniatura vazia.
4. Ícone sozinho como botão precisa de `title` e de `aria-label`. Um ícone de
   casa não diz para onde ele leva.
5. Ícone decorativo recebe `aria-hidden`, e o componente `Icon` já cuida disso.
6. Ícone de marca ou de produto é um SVG próprio, como o `IconWeknowAsk`, e não
   um símbolo parecido tirado da biblioteca.
7. **Ícone repetido numa lista não identifica nada.** Quando todos os itens de
   um grupo têm o mesmo glifo, ele vira textura: ou cada item ganha um símbolo
   próprio, ou a lista fica só com texto, sem meio-termo. O menu deste
   documento dá um ícone por página exatamente por isso.

## Cuidado de alinhamento

Os glifos do Material Symbols têm cerca de 2px de recuo dentro da caixa de
24px, enquanto o logo preenche a dele inteira. Por isso o logo do menu recebe
`glyphInset: 2`, e sem esse recuo a coluna óptica do menu não bate. A medida
foi tirada na tela, não estimada.
