# Aviso

> **Rascunho.** Existe um padrão de aviso no produto, e é só um. O que está
> descrito aqui é o que o código faz. Ainda não houve decisão sobre um
> componente de alerta geral, e não há desenho para "atenção", "sucesso" ou
> "informação" em bloco.

O aviso do Weknow é texto pequeno e cinza, não uma faixa colorida.

| Parte | Espec. |
| --- | --- |
| Texto | Inter 12/16 em `--wk-text-muted`, centrado |
| Trecho clicável | mesma cor, sublinhado a 60% de opacidade, com recuo 2 |
| Explicação | painel de menu, raio 8 e `--wk-shadow-menu`, abrindo para cima |

## Por que não é uma faixa amarela

O aviso fica na tela o tempo todo, abaixo do campo de pergunta. Uma faixa
colorida permanente deixa de ser aviso em dois dias, porque a pessoa aprende a
não ler aquele retângulo e o espaço continua ocupado.

Texto cinza com um trecho sublinhado resolve os dois lados: quem já sabe passa
direto, quem quer saber tem onde clicar, e a explicação longa não precisa caber
na tela o tempo todo.

A explicação abre para cima porque o aviso fica na borda de baixo da tela. Ela
se ancora na linha inteira, e não no trecho sublinhado, já que o trecho fica
fora do centro do texto e uma caixa centrada nele poderia sair da tela.

## Regras

1. Aviso permanente é cinza e pequeno. A cor entra apenas quando algo falhou de
   verdade, e aí o caso é de erro, não de aviso.
2. O trecho clicável tem uma ou duas palavras, dentro da frase. Ele não é um
   botão "Saiba mais" no fim.
3. Nada que a pessoa precise fazer entra aqui. O aviso informa; o que pede ação
   vira erro no campo ou modal.
4. Um aviso por tela. Dois empilhados viram um parágrafo que ninguém lê.
5. Para confirmar que algo deu certo, use o aviso temporário descrito em
   [Vazio, carregando e erro](#/estados).

## Em aberto

Falta decidir se o sistema vai ter bloco de alerta com cor, para erro de tela
ou aviso de cota. Hoje ele não existe, e inventar um significa escolher quatro
cores de estado que a paleta não declara.
