# Tema claro e escuro

O tema vive em `data-theme` no elemento raiz. Trocar esse atributo troca o
bloco de variáveis, e todo componente que usa `COLOR.*` acompanha sem saber que
existe tema.


## Três regras de comportamento

1. Sem escolha registrada, segue o sistema (`prefers-color-scheme`).
2. Escolha explícita manda e fica no `localStorage`, mesmo que o sistema mude
   depois. O ouvinte de `prefers-color-scheme` só age quando não há nada
   guardado.
3. `?theme=dark` na URL força e grava. Serve para link compartilhado e para
   ferramenta que abre a página fora do navegador (captura para o Figma, por
   exemplo) cair no tema certo já na primeira pintura.

`initTheme()` roda antes da montagem justamente para não haver o pisca de claro
antes do escuro.

## O que muda, e por quê

**Profundidade inverte.** Claro: folha branca sobre fundo `#f3f6fc`. Escuro:
folha `#131314` sobre fundo `#1a1b1c`. O que se aproxima do olho clareia no
claro e escurece no escuro.

**A primária muda de valor.** `#3366cc` não tem contraste suficiente sobre
`#131314`, então no escuro ela vira `#8ab4f8`. E, como azul claro não aguenta
texto branco em cima, o botão primário inverte: fundo `#8ab4f8`, texto
`#0d1b2a`.

**Estados viram véu.** No escuro, hover e item ativo deixam de ser cinza sólido
e passam a ser a primária translúcida: 8% ao passar o mouse, 10% quando
selecionado. O estado escolhido tem de pesar mais que o transitório, ou os dois
se confundem.

**A borda quase some.** No escuro `--wk-border` é `#1d1d20`, quase o tom da
superfície. Borda com contraste alto desenha demais; no escuro a separação se
faz por diferença mínima.

**A sombra fica preta e mais opaca**, e o fundo esmaecido do modal vai a preto
80%. Véu claro não separaria nada de um fundo já quase preto.

## Uma cor não acompanha o tema

O símbolo do logo permanece `#3366cc` nos dois temas: é marca, não interface.
Só o texto da marca (`logoInk`) acompanha.
