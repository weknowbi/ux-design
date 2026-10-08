# Chip

A pílula que mostra o contexto. A espec. vem do nó `4454:7159`: altura 36,
`px-16`, intervalo 8, raio total, fundo `--wk-chip-bg`, ícone de 24 e rótulo
Inter 14/20 na cor primária.

A altura é fixa em vez de vir do padding. O nó mede 113 × 36 com o rótulo
"Tarefas", ou seja, quem define a altura é o ícone de 24, e por isso sobram 6
de folga em vez dos 8 que o padding nominal sugeriria.

## Quando usar

- No contexto ativo de uma consulta, para mostrar as pastas, fontes e filtros
  que o ASK está levando em conta.
- No filtro já escolhido, com a ação de remover.
- Em contagem ou tipo dentro de tabela. Esse caso usa o `TableChip`, e não este
  componente.

## Quando não usar

- Como botão. O chip não recebe ação primária, e se aquilo é uma ação, então é
  um `Btn`.
- Como etiqueta de estado colorida. Este sistema não tem chip verde, amarelo ou
  vermelho, e isso é de propósito.
- Como navegação por abas.

## Duas caixas para o mesmo conceito

| | Chip | `TableChip` |
| --- | --- | --- |
| Altura | 36 | 22 |
| Fundo | `--wk-chip-bg` | `--wk-hover-strong` |
| Cor | primária | `--wk-text-secondary` |
| Onde | contexto e filtro da tela | dentro de célula |

O chip de tabela é **neutro para todos os tipos de dado**. Antes cada tipo
tinha a sua cor, entre azul, violeta e verde, mas numa tabela monocromática
isso vira ruído, porque a cor promete um significado que o texto do chip já
entrega.

## Regras

1. Sem ação, o chip é um `<span>`. Com ação, ele vira um `<button>` com o mesmo
   desenho e com realce no hover.
2. O rótulo é curto, de uma ou duas palavras. Um chip que quebra linha virou
   outra coisa.
3. O chip acionável precisa dizer o que a ação faz, que em geral é remover o
   filtro. Use o `title` para isso.
