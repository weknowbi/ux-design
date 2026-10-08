# Switch e checkbox

> **Rascunho.** O switch é peça fechada, da espec. do nó 5121:2948. O checkbox
> existe só dentro do modal de filtros e ainda não virou componente
> compartilhado, então o que está descrito aqui é o que o código faz, não uma
> decisão tomada.

São dois controles de escolha, e eles não se substituem.

| | Switch | Checkbox |
| --- | --- | --- |
| Responde | ligado ou desligado | marcado ou não |
| Quantidade | uma coisa só | vários itens de uma lista |
| Efeito | imediato | depende do "Aplicar" |
| Onde | linha de preferência | lista, árvore de filtros |

A pergunta que decide é o que acontece no clique. Se a tela muda na hora, use
switch. Se a escolha só vale depois que a pessoa confirma, use checkbox.

## Switch

| Parte | Espec. |
| --- | --- |
| Trilho | 36 × 20, raio total |
| Botão | 16 de diâmetro, com 2 de folga de cada lado |
| Desligado | trilho em `--wk-border-strong` |
| Ligado | trilho em `--wk-primary` |
| Botão | branco nos dois estados e nos dois temas |

O switch é um `role="switch"` com `aria-checked`, porque quem navega por
teclado precisa ouvir se está ligado ou desligado, e uma caixa decorativa não
fala. Como ele não tem texto dentro, o rótulo acessível é obrigatório.

### O alternador de tema é esse switch com dois ícones

A linha "Tema" do menu lateral coloca `light_mode` à esquerda e `dark_mode` à
direita, com 8 de intervalo, e acende o ícone do lado ativo no tom primário.

Os ícones existem porque o switch sozinho diz "ligado", mas não diz ligado para
quê, e "tema ligado" não quer dizer nada. Com sol e lua nas pontas, fica claro
para que lado é cada estado.

Esse par de ícones pertence ao tema e só a ele. Em qualquer outra linha de
preferência, use o switch limpo.

## Checkbox

16 × 16, raio 3, borda de 1,5px. Desmarcado, a borda fica em
`--wk-field-border` sobre `--wk-surface`. Marcado, o fundo e a borda vão para
`--wk-primary`, com o sinal de confirmação em `--wk-btn-on-primary`.

O risco do sinal é desenhado à mão, e não um glifo da fonte de ícones, porque
numa caixa de 16 o Material Symbols cai um pixel fora do centro.

## Regras

1. A linha inteira recebe o clique, e não só o quadradinho de 16. Um alvo de
   16px é pequeno demais para o ponteiro, e muito mais para o dedo.
2. Quando a linha carrega o controle na ponta, ela deixa de ser clicável
   inteira. Botão dentro de botão é HTML inválido, e é por isso que a linha
   "Tema" do menu não responde ao clique no rótulo.
3. O switch não tem estado intermediário. Lista parcialmente marcada é problema
   do checkbox, e o sistema ainda não tem o desenho desse estado, então
   pergunte antes de inventar um.
4. Nenhum dos dois leva um rótulo "Sim" ou "Não" ao lado. O rótulo diz o que a
   coisa é, e o controle diz em que estado ela está.
