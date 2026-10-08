# Aviso

> **Rascunho.** Existe um padrão de aviso no produto, e é só um. Ele descreve o
> que está no código; ainda não houve decisão sobre um componente de alerta
> geral, e não há desenho para "atenção", "sucesso" ou "informação" em bloco.

O aviso do Weknow é texto pequeno e cinza, não uma faixa colorida.

| Parte | Espec. |
| --- | --- |
| Texto | Inter 12/16 em `--wk-text-muted`, centrado |
| Trecho clicável | mesma cor, sublinhado a 60% de opacidade, recuo 2 |
| Explicação | painel de menu (raio 8, `--wk-shadow-menu`), abre para cima |

## Por que não é uma faixa amarela

O aviso fica na tela o tempo todo, abaixo do campo de pergunta. Uma faixa
colorida permanente deixa de ser aviso em dois dias: a pessoa aprende a não
ler aquele retângulo, e o espaço continua ocupado.

Texto cinza com um trecho sublinhado resolve os dois lados. Quem já sabe passa
direto; quem quer saber tem onde clicar, e a explicação longa não precisa caber
na tela o tempo todo.

A explicação abre **para cima** porque o aviso mora na borda de baixo. E ela se
ancora na linha inteira, não no trecho sublinhado: o trecho fica fora do centro
do texto, e a caixa centrada nele poderia sair da tela.

## Regras

1. Aviso permanente é cinza e pequeno. Cor só entra quando algo falhou de
   verdade, e aí é erro, não aviso.
2. O trecho clicável é uma palavra ou duas, dentro da frase. Não é um botão
   "Saiba mais" no fim.
3. Nada que a pessoa precise fazer entra aqui. Aviso informa; o que pede ação
   vira erro no campo ou modal.
4. Um aviso por tela. Dois empilhados viram um parágrafo que ninguém lê.
5. Para confirmar que algo deu certo use o aviso temporário descrito em
   [Vazio, carregando e erro](#/estados), não este.

## Em aberto

- Se o sistema vai ter bloco de alerta com cor (erro de tela, aviso de cota).
  Hoje não tem, e inventar um significa escolher quatro cores de estado que a
  paleta não declara.
