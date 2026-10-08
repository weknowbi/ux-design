# Dica

A caixinha que revela o que o texto cortou. Ela substitui o `title` do
navegador, que ignora o tema, a tipografia e o raio de tudo em volta.

| Parte | Espec. |
| --- | --- |
| Caixa | fundo `--wk-toast-bg`, texto `--wk-toast-text`, raio 6, `--wk-shadow-menu` |
| Texto | Inter 12/16, `px-10 py-6` |
| Largura | teto de 420, e nunca encosta a menos de 8 da borda da janela |
| Posição | 6 abaixo do elemento, alinhada à esquerda dele |
| Espera | 400ms |

A caixa vai para o `body` por portal e tem `pointer-events: none`, então ela
não recebe clique, não entra no caminho do ponteiro e não é recortada pelo
bloco que rola.

## Ela só aparece quando há o que revelar

A dica arma quando o texto foi de fato cortado, ou seja, quando o conteúdo
passa da caixa que o contém. Um nome que cabe inteiro não tem o que revelar, e
uma dica repetindo o que já está na tela é ruído que atrasa o ponteiro.

Os 400ms de espera existem pelo mesmo motivo: passar o mouse de raspão a
caminho de outro lugar não deve disparar nada.

## Regras

1. Dica revela, mas não explica. Para explicar existe o auxílio do campo, que
   fica sempre visível.
2. Nunca coloque numa dica a informação que a pessoa precisa para decidir, já
   que quem navega por teclado ou por toque não passa o mouse.
3. Botão só de ícone precisa de dica **e** de rótulo acessível. A dica serve a
   quem vê, e o `aria-label` a quem ouve.
4. Texto curto, sem ponto final, porque é um rótulo e não uma frase.
5. Não use dica para erro. O erro fica escrito, no lugar do auxílio.
