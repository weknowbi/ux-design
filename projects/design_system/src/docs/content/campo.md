# Campo e seletor

Espec. do nó `form-item` (`4454:8719`). A caixa é o `form-control` do
Bootstrap 5: `6 + 24 (16 × 1.5) + 6 + 2 de borda = 38` exatos. As medidas de
13/7 que o Figma reporta incluem a borda; descontá-la é o que fecha a conta.

| Parte | Espec. |
| --- | --- |
| Bloco | coluna, 16 de respiro abaixo |
| Rótulo | Inter 16/1.5 em `--wk-text`, 8 de respiro abaixo |
| Caixa | altura 38, borda 1px `--wk-field-border`, raio 6, `px-12 py-6` |
| Valor | Inter 16/1.5 em `--wk-text` |
| Ícone | 24px à direita, com 8 de intervalo |


## Regras

1. **Rótulo sempre visível.** Placeholder não é rótulo: ele some quando a
   pessoa começa a digitar, justo quando ela mais precisa conferir o que o
   campo pede.
2. Placeholder mostra formato ou exemplo, nunca instrução. Cor:
   `--wk-placeholder-soft`, que é a fonte secundária a 75%.
3. Auxílio (`hint`) e erro ocupam o mesmo lugar, e o erro substitui o auxílio.
   Nunca os dois ao mesmo tempo.
4. Erro muda a borda para `--wk-danger` **e** escreve o motivo. Borda vermelha
   sozinha não diz o que fazer.
5. O raio aqui é **6**. Os campos de busca dos modais usam 8, por espec.
   própria. Não são o mesmo componente, então não unifique por conta própria.
6. O seletor é uma lista `role="listbox"` de verdade, com fecho por `Escape` e
   por clique fora. Não troque por `<select>` nativo: ele não aceita o desenho
   e cria uma segunda linguagem visual dentro do formulário.
