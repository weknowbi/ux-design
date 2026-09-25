# Ícones

**Material Symbols Outlined**, nos eixos do design system: `wght 200`,
`GRAD 0`, `opsz 24`. É a mesma família dos nós do Figma, cujos nomes carregam
os eixos: `home_24dp_6C757D_FILL0_wght200_GRAD0_opsz24`.

Tamanho padrão 24px. Cor padrão `--wk-nav-label`.


## Regras

1. **`FILL 1` significa ativo.** É assim que o item selecionado do menu se
   distingue, junto com fundo e cor. Não use preenchido por gosto estético.
2. Não troque o eixo `wght`. 200 é a espessura que combina com o traço da
   Inter nos tamanhos que usamos; 300 já parece outra biblioteca.
3. Tamanhos em uso: 20 dentro de botão e linha densa, 24 no padrão (menu,
   barra de topo, chip, campo), 44 em miniatura vazia.
4. Ícone sozinho como botão precisa de `title` e `aria-label`. Um ícone de casa
   não diz para onde leva.
5. Ícone decorativo leva `aria-hidden`. O componente `Icon` já faz isso.
6. Ícone de marca ou de produto é SVG próprio (`IconWeknowAsk`), não um símbolo
   aproximado da biblioteca.
7. **Ícone repetido numa lista não identifica nada.** Se todos os itens de um
   grupo levam o mesmo glifo, ele virou textura: ou cada item ganha um símbolo
   próprio, ou a lista fica só com texto. Meio-termo não existe. O menu deste
   documento dá um ícone por página exatamente por isso.

## Cuidado de alinhamento

Os glifos do Material Symbols têm cerca de 2px de recuo dentro da caixa de
24px. O logo preenche a dele inteira. Por isso o logo do menu recebe
`glyphInset: 2`. Sem esse recuo a coluna óptica do menu não bate. Foi medido,
não estimado.
