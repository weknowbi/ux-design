# Dica

A caixinha que revela o que o texto cortou. Substitui o `title` do navegador,
que ignora o tema, a tipografia e o raio de tudo em volta.

| Parte | Espec. |
| --- | --- |
| Caixa | fundo `--wk-toast-bg`, texto `--wk-toast-text`, raio 6, `--wk-shadow-menu` |
| Texto | Inter 12/16, `px-10 py-6` |
| Largura | teto de 420, e nunca encosta a menos de 8 da borda da janela |
| Posição | 6 abaixo do elemento, alinhada à esquerda dele |
| Espera | 400ms |

A caixa vai para o `body` por portal e é `pointer-events: none`: ela não
recebe clique, não entra no caminho do ponteiro e não é recortada pelo bloco
que rola.

## Só aparece quando há o que revelar

A dica arma quando o texto **de fato** foi cortado — quando o conteúdo passa da
caixa que o contém. Nome que cabe inteiro não tem o que revelar, e dica
repetindo o que já está na tela é ruído que atrasa o ponteiro.

Os 400ms de espera existem pelo mesmo motivo: passar o mouse de raspão a
caminho de outro lugar não deve disparar nada.

## Regras

1. Dica revela, não explica. Para explicar existe o auxílio do campo, que fica
   visível.
2. Nunca ponha numa dica informação que a pessoa precisa para decidir. Quem
   navega por teclado ou toque não passa o mouse.
3. Botão só de ícone precisa de dica **e** de rótulo acessível. A dica é para
   quem vê; o `aria-label` é para quem ouve.
4. Texto curto, sem ponto final. É um rótulo, não uma frase.
5. Não use dica para erro. Erro fica escrito, no lugar do auxílio.
