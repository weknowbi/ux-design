# Campo e seletor

A espec. vem do nó `form-item` (`4454:8719`). A caixa é o `form-control` do
Bootstrap 5, e a conta fecha em `6 + 24 (16 × 1.5) + 6 + 2 de borda = 38`
exatos. As medidas de 13/7 que o Figma reporta já incluem a borda, e
descontá-la é o que faz a altura bater.

| Parte | Espec. |
| --- | --- |
| Bloco | coluna, com 16 de folga abaixo |
| Rótulo | Inter 16/1.5 em `--wk-text`, com 8 de folga abaixo |
| Caixa | altura 38, borda 1px `--wk-field-border`, raio 6, `px-12 py-6` |
| Valor | Inter 16/1.5 em `--wk-text` |
| Ícone | 24px à direita, com 8 de intervalo |

## Regras

1. **O rótulo fica sempre visível.** Placeholder não serve como rótulo, porque
   ele some quando a pessoa começa a digitar, justo quando ela mais precisa
   conferir o que o campo pede.
2. O placeholder mostra formato ou exemplo, e nunca instrução. A cor é
   `--wk-placeholder-soft`, que é a fonte secundária a 75%.
3. O auxílio (`hint`) e o erro ocupam o mesmo lugar, e o erro substitui o
   auxílio. Os dois nunca aparecem ao mesmo tempo.
4. O erro muda a borda para `--wk-danger` **e** escreve o motivo. Borda
   vermelha sozinha não diz o que fazer.
5. O raio aqui é **6**. Os campos de busca dos modais usam 8, por espec.
   própria, e como não são o mesmo componente, não unifique os dois por conta
   própria.
6. O seletor é uma lista `role="listbox"` de verdade, que fecha por `Escape` e
   por clique fora. Não troque pelo `<select>` nativo, que não aceita o desenho
   e cria uma segunda linguagem visual dentro do formulário.

## As três buscas

Elas não são o mesmo componente, e a diferença entre elas é de lugar, não de
gosto.

| Onde | Caixa |
| --- | --- |
| Barra de topo | pílula de raio total, fundo `--wk-search-pill`, ícone à esquerda; 240 de largura até 1536px de janela e 328 acima disso |
| Dentro de modal | 38 de altura, raio 8, borda de controle, ícone à direita |
| Formulário | é um campo normal, com rótulo |

A busca da barra de topo não tem rótulo porque o ícone de lupa e o lugar onde
ela fica já dizem o que ela é. Essa é a única exceção à regra 1, e vale só ali.

O tom da pílula depende da superfície embaixo dela. Sobre o fundo tingido da
faixa e do menu, vale `--wk-search-pill`; sobre a folha branca, vale
`--wk-search-pill-light`. Fixar um tom só faria a busca sumir numa das duas
superfícies.
