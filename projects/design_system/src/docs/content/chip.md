# Chip

Pílula de contexto. Espec. do nó `4454:7159`: altura 36, `px-16`, gap 8, raio
total, fundo `--wk-chip-bg`, ícone de 24 e rótulo Inter 14/20 na primária.

A altura entra fixa, e não como padding: o nó mede 113 × 36 com o rótulo
"Tarefas", ou seja, o ícone de 24 manda no eixo vertical e sobram 6 de respiro
e não os 8 que o padding nominal sugeriria.


## Quando usar

- Contexto ativo de uma consulta: pastas, fontes e filtros que o ASK está
  levando em conta.
- Filtro escolhido, com ação de remover.
- Contagem ou tipo dentro de tabela. Aí é o `TableChip`, não este.

## Quando não usar

- Como botão. Chip não recebe ação primária; se a coisa é uma ação, é um
  `Btn`.
- Como etiqueta de estado colorida. Este sistema não tem chip verde/amarelo/
  vermelho, de propósito.
- Como navegação por abas.

## Duas caixas, um conceito

| | Chip | `TableChip` |
| --- | --- | --- |
| Altura | 36 | 22 |
| Fundo | `--wk-chip-bg` | `--wk-hover-strong` |
| Cor | primária | `--wk-text-secondary` |
| Onde | contexto e filtro da tela | dentro de célula |

O chip de tabela é **neutro para todos os tipos de dado**. Antes cada tipo
tinha sua cor (azul, violeta, verde); numa tabela monocromática isso vira
ruído, porque a cor promete um significado que o texto do chip já entrega.

## Regras

1. Sem ação, o chip é `<span>`; com ação, vira `<button>` com o mesmo desenho e
   realce no hover.
2. Rótulo curto, uma ou duas palavras. Chip que quebra linha virou outra coisa.
3. Chip acionável precisa dizer o que a ação faz, normalmente remover o
   filtro. Use `title`.
