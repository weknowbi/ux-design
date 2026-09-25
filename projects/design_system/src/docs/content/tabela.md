# Tabela

Um padrão só, o mesmo dentro da conversa e nas telas. A referência é a tabela
que a resposta da IA monta: compacta, sóbria, sem divisória vertical e sem
zebra.

| Parte | Espec. |
| --- | --- |
| Cabeçalho | 12px peso 600 em `--wk-text-secondary`, `px-20 py-12` |
| Corpo | 13px peso 400 em `--wk-text` |
| Primeira coluna | `--wk-text-secondary`, age como rótulo da linha |
| Divisória | só entre linhas; a última não fecha com risco |
| Hover de linha | `--wk-surface-subtle` |

A versão anterior desta espec. (linhas de 56, texto 14,4/1.6, raio 16) vinha do
componente `grafico tabela` do design system e ficava larga demais para listas
longas. Ao lado da tabela da conversa, parecia outro produto.

## Duas variantes, uma regra

> **Com moldura quando a tabela está dentro de outro conteúdo; solta quando ela
> é o conteúdo da tela.**

`boxed`: borda 1px e raio 12. Na conversa, é a caixa que separa a tabela do
parágrafo em volta.

`plain`: sem moldura. As células das pontas perdem a folga externa, de modo
que texto **e** divisórias comecem na mesma coluna do título. Sangrar a tabela
para fora alinharia o texto e desalinharia os riscos.

## Regras

1. O texto quebra por padrão. Cortar com reticências deixaria as linhas todas
   iguais e esconderia o dado. Numa resposta da IA é justamente o que a pessoa
   veio ler. Colunas que precisam ficar em uma linha pedem `nowrap`.
2. Sem zebra e sem divisória vertical. O alinhamento das colunas já separa.
3. Número alinha à direita, texto à esquerda. Cabeçalho segue a coluna.
4. Marcador dentro de célula é `TableChip`, sempre neutro.
5. Coluna ordenável mostra a direção no cabeçalho; sem indicador, a ordenação
   parece um bug.
6. Tabela larga rola dentro do próprio bloco. A página nunca rola na
   horizontal.
