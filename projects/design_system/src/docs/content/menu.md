# Menu suspenso

O painel que abre ancorado num gatilho e some ao escolher. É onde moram as
ações secundárias de um item: renomear, duplicar, excluir.

| Parte | Espec. |
| --- | --- |
| Painel | fundo `--wk-surface`, borda 1px `--wk-border`, raio 8, `--wk-shadow-menu`, padding 4 |
| Largura | mínimo 160; 180 quando o menu é de uma linha de lista |
| Item | altura 36, raio 8, Inter 14, gap 8 |
| Ícone | em `--wk-nav-label`, à esquerda do rótulo |
| Hover | fundo `--wk-menu-hover` |
| Separador | fio de 1px em `--wk-border`, 4 de folga acima e abaixo |
| Respiro | 4 entre o gatilho e o painel, 8 entre o painel e a borda |

## Ele se vira sozinho

O painel abre para baixo. Quando não cabe, vira para cima, e só vira se virar
resolver: se o espaço de cima for igualmente apertado, ele fica onde está e
ganha rolagem, porque trocar o lado por onde o menu é cortado não é conserto.

A medida é feita contra o que **recorta** o menu, não contra a janela. O menu
mora dentro da folha de conteúdo, que rola; o que passa do topo dela some atrás
da faixa, e o que passa da esquerda some atrás do menu lateral, por mais janela
que ainda exista desse lado.

Quem usa o componente não precisa saber de nada disso. Quem desenha, precisa:
não há posição fixa a respeitar no Figma, porque a posição é calculada.

## Regras

1. O menu fecha ao escolher. Item que não fecha o menu não é item de menu, é
   controle, e controle mora no painel aberto.
2. Fecha por `Escape`, por clique fora e pelo próprio gatilho. Os três, sempre.
3. Menu com rascunho dentro — um campo de renomear, por exemplo — precisa
   desfazer o rascunho ao fechar. Clicar ao lado não vale como salvar.
4. Rótulo com verbo: "Renomear pasta", não "Renomear" quando houver mais de um
   objeto possível na tela.
5. Separador só entre grupos de significado diferente. Um separador por menu,
   normalmente antes do destrutivo.
6. O destrutivo é o último, sempre, e vem em `--wk-danger`. Veja a ressalva
   abaixo: um dos dois componentes ainda não faz a cor.
7. Sem submenu. Se a lista precisa de níveis, ela é um modal ou uma tela.
8. Máximo de sete itens. Acima disso a pessoa lê a lista inteira duas vezes e
   escolher fica mais lento do que procurar.

## Atenção, hoje há duas cópias

A espec. do painel está escrita em dois arquivos, `browser/Menu.tsx` e
`ChatRowMenu.tsx`, e elas já não dizem a mesma coisa:

| | `browser/Menu.tsx` | `ChatRowMenu.tsx` |
| --- | --- | --- |
| Largura mínima | 160 | 180 |
| Folga do item | 8 à esquerda, 16 à direita | 12 dos dois lados |
| Ícone | 20 | 24 |
| Item destrutivo | **não tem** | texto em `--wk-danger` |

O painel é idêntico; o item divergiu. Não é decisão, é duplicação que andou:
quando o design system virar pacote, é uma constante só. Até lá, quem for
mexer num dos dois precisa saber que o outro existe, e **a referência é a de
`browser/Menu.tsx`**, que é a mais nova.

A última linha é a que importa para quem desenha: o `MenuAction` de
`browser/Menu.tsx` não sabe ficar vermelho. A regra 1 diz que o destrutivo é
o último do menu e vem em `--wk-danger`, e hoje só um dos dois componentes
cumpre a segunda metade. Precisa da cor nos cards do portal? Fale com quem
mantém o componente antes de recriá-lo ao lado.
