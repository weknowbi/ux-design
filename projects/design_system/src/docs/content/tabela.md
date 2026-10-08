# Tabela

Existe um padrão só, o mesmo dentro da conversa e nas telas. A referência é a
tabela que a resposta da IA monta: compacta, sóbria, sem divisória vertical e
sem zebra.

| Parte | Espec. |
| --- | --- |
| Cabeçalho | 12px peso 600 em `--wk-text-secondary`, `px-20 py-12` |
| Corpo | 13px peso 400 em `--wk-text` |
| Primeira coluna | `--wk-text-secondary`, porque ela age como rótulo da linha |
| Divisória | só entre linhas, e a última não fecha com risco |
| Hover de linha | `--wk-surface-subtle` |

A versão anterior desta espec., com linhas de 56, texto 14,4/1.6 e raio 16,
vinha do componente `grafico tabela` do design system e ficava larga demais
para listas longas. Ao lado da tabela da conversa, ela parecia outro produto.

## Duas variantes, uma regra

> **Com moldura quando a tabela está dentro de outro conteúdo, e solta quando
> ela é o conteúdo da tela.**

A `boxed` tem borda de 1px e raio 12. Dentro da conversa, é essa caixa que
separa a tabela do parágrafo em volta.

A `plain` não tem moldura, e as células das pontas perdem a folga externa para
que o texto **e** as divisórias comecem na mesma coluna do título. Sangrar a
tabela para fora alinharia o texto e desalinharia os riscos.

## Regras

1. O texto quebra por padrão. Cortar com reticências deixaria todas as linhas
   iguais, mas esconderia o dado, que numa resposta da IA é justamente o que a
   pessoa veio ler. As colunas que precisam ficar em uma linha pedem `nowrap`.
2. Sem zebra e sem divisória vertical, porque o alinhamento das colunas já
   separa o suficiente.
3. Número alinha à direita e texto alinha à esquerda, com o cabeçalho seguindo
   a coluna.
4. Marcador dentro de célula é `TableChip`, sempre neutro.
5. Coluna ordenável mostra a direção no cabeçalho. Sem esse indicador, a
   ordenação parece um defeito.
6. Tabela larga rola dentro do próprio bloco, e a página nunca rola na
   horizontal.
