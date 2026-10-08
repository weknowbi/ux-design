# Chave e caixa de seleção

> **Rascunho.** A chave é peça fechada, da espec. do nó 5121:2948. A caixa de
> seleção existe só dentro do modal de filtros e ainda não é componente
> compartilhado — o desenho abaixo descreve o que está no código, não uma
> decisão tomada.

Dois controles de escolha, e eles não se substituem.

| | Chave | Caixa de seleção |
| --- | --- | --- |
| Responde | ligado ou desligado | marcado ou não |
| Quantidade | uma coisa só | vários numa lista |
| Efeito | imediato | depende do "Aplicar" |
| Onde | linha de preferência | lista, árvore de filtros |

A diferença que decide: **a chave age na hora, a caixa espera.** Se ao clicar a
tela muda, é chave. Se a escolha só vale depois de confirmar, é caixa.

## Chave

| Parte | Espec. |
| --- | --- |
| Trilho | 36 × 20, raio total |
| Botão | 16 de diâmetro, 2 de folga de cada lado |
| Desligada | trilho em `--wk-border-strong` |
| Ligada | trilho em `--wk-primary` |
| Botão | branco nos dois estados, nos dois temas |

A chave do tema vem acompanhada de um ícone de cada lado — `light_mode` à
esquerda, `dark_mode` à direita, gap 8 — e o do lado ativo acende no tom
primário com `FILL 1`. Os ícones não são enfeite: a chave sozinha diz "ligado",
mas não diz ligado para quê.

É um `role="switch"` com `aria-checked` de verdade. Quem navega por teclado
precisa ouvir "ligado" ou "desligado", e uma caixa decorativa não fala.

## Caixa de seleção

16 × 16, raio 3, borda 1.5px. Desmarcada: borda `--wk-field-border` sobre
`--wk-surface`. Marcada: fundo e borda em `--wk-primary`, com o sinal de
confirmação em `--wk-btn-on-primary`.

O risco do sinal é desenhado, não é glifo de fonte: numa caixa de 16 o
Material Symbols cai um pixel fora do centro.

## Regras

1. A linha inteira é o alvo do clique, não só o quadradinho de 16. Alvo de 16px
   é pequeno demais para o ponteiro e muito mais para o dedo.
2. Quando a linha carrega o controle na ponta, ela deixa de ser botão. Botão
   dentro de botão é HTML inválido, e é por isso que a linha "Tema" do menu não
   é clicável inteira.
3. Chave não tem estado intermediário. Lista parcialmente marcada é problema da
   caixa de seleção, e hoje o sistema não tem o desenho desse estado — pergunte.
4. Nenhum dos dois leva rótulo à direita escrito "Sim"/"Não". O rótulo diz o
   que a coisa é; o controle diz em que estado ela está.
