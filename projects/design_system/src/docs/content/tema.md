# Tema claro e escuro

O tema fica no atributo `data-theme` do elemento raiz. Trocar esse atributo
troca o bloco de variáveis, e todo componente que usa `COLOR.*` acompanha sem
precisar saber que existe tema.

## Três regras de comportamento

1. Quando não há escolha registrada, o produto segue o sistema operacional
   (`prefers-color-scheme`).
2. A escolha explícita da pessoa tem prioridade e fica guardada no
   `localStorage`, mesmo que o sistema mude depois. O ouvinte de
   `prefers-color-scheme` só age quando não há nada guardado.
3. `?theme=dark` na URL força o tema e grava a escolha. Isso serve para link
   compartilhado e para ferramenta que abre a página fora do navegador, como
   uma captura para o Figma, que precisa cair no tema certo já na primeira
   pintura.

O `initTheme()` roda antes da montagem justamente para evitar o pisca de claro
antes do escuro.

## O que muda, e por quê

**A profundidade se inverte.** No tema claro, a folha branca fica sobre o fundo
`#f3f6fc`; no escuro, a folha `#131314` fica sobre o fundo `#1a1b1c`. O plano
mais próximo do olho clareia no tema claro e escurece no tema escuro.

**A primária muda de valor.** O `#3366cc` não tem contraste suficiente sobre
`#131314`, então no escuro ela vira `#8ab4f8`. E como azul claro não aguenta
texto branco em cima, o botão primário também se inverte, com fundo `#8ab4f8` e
texto `#0d1b2a`.

**Os estados passam a ser véu.** No escuro, o hover e o item ativo deixam de
ser cinza sólido e viram a primária translúcida, com 8% ao passar o mouse e 10%
quando selecionado. O estado escolhido precisa pesar mais que o transitório, ou
os dois se confundem.

**A borda quase some.** No escuro, `--wk-border` é `#1d1d20`, quase o tom da
superfície. Uma borda de contraste alto desenha demais, e no escuro a separação
se faz por diferença mínima.

**A sombra fica preta e mais opaca**, e o fundo esmaecido do modal vai a preto
80%. Um véu claro não separaria nada de um fundo que já é quase preto.

## Uma cor não acompanha o tema

O símbolo do logo continua `#3366cc` nos dois temas, porque ele é marca e não
interface. Só o texto da marca (`logoInk`) acompanha a troca.
