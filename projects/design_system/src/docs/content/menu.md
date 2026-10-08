# Menu suspenso

O painel que abre ancorado num gatilho e some quando a pessoa escolhe. É onde
ficam as ações secundárias de um item: renomear, duplicar, excluir.

| Parte | Espec. |
| --- | --- |
| Painel | fundo `--wk-surface`, borda 1px `--wk-border`, raio 8, `--wk-shadow-menu`, padding 4 |
| Largura | mínimo de 160; 180 quando o menu é de uma linha de lista |
| Item | altura 36, raio 8, Inter 14, intervalo 8 |
| Ícone | em `--wk-nav-label`, à esquerda do rótulo |
| Hover | fundo `--wk-menu-hover` |
| Separador | fio de 1px em `--wk-border`, com 4 de folga acima e abaixo |
| Respiro | 4 entre o gatilho e o painel, 8 entre o painel e a borda |

## Ele se vira sozinho

O painel abre para baixo. Quando não cabe, vira para cima, e só vira se isso
resolver: se o espaço de cima também estiver apertado, ele fica onde está e
ganha rolagem, porque trocar o lado por onde o menu é cortado não conserta
nada.

A medida é feita contra o que recorta o menu, e não contra a janela. O menu
mora dentro da folha de conteúdo, que rola; o que passa do topo dela some atrás
da faixa, e o que passa da esquerda some atrás do menu lateral, por mais janela
que ainda exista desse lado.

Quem usa o componente não precisa saber disso. Quem desenha, precisa: não há
posição fixa a respeitar no Figma, porque a posição é calculada.

## Regras

1. O menu fecha quando a pessoa escolhe. Um item que não fecha o menu não é
   item de menu, e sim um controle, que pertence a um painel aberto.
2. Ele fecha também por `Escape` e por clique fora, além do próprio gatilho.
   Os três caminhos, sempre.
3. Menu com rascunho dentro, como um campo de renomear, precisa desfazer esse
   rascunho ao fechar, porque clicar ao lado não pode valer como salvar.
4. O rótulo leva verbo: "Renomear pasta", e não "Renomear" quando houver mais
   de um objeto possível na tela.
5. Separador só entre grupos de significado diferente. Em geral é um por menu,
   logo antes do destrutivo.
6. O item destrutivo é o último, sempre, e vem em `--wk-danger`. Veja a
   ressalva abaixo, porque um dos dois componentes ainda não faz essa cor.
7. Sem submenu. Se a lista precisa de níveis, ela virou um modal ou uma tela.
8. No máximo sete itens. Acima disso a pessoa lê a lista inteira duas vezes, e
   escolher fica mais lento do que procurar.

## Atenção, hoje há duas cópias

A espec. do painel está escrita em dois arquivos, `browser/Menu.tsx` e
`ChatRowMenu.tsx`, e eles já não dizem a mesma coisa:

| | `browser/Menu.tsx` | `ChatRowMenu.tsx` |
| --- | --- | --- |
| Largura mínima | 160 | 180 |
| Folga do item | 8 à esquerda, 16 à direita | 12 dos dois lados |
| Ícone | 20 | 24 |
| Item destrutivo | **não tem** | texto em `--wk-danger` |

O painel é idêntico nos dois, mas o item divergiu. Isso não foi decidido: é
duplicação que andou. Quando o design system virar pacote será uma constante
só, e até lá quem for mexer num deles precisa saber que o outro existe. **A
referência é a de `browser/Menu.tsx`**, que é a mais nova.

A última linha da tabela é a que importa para quem desenha. O `MenuAction` de
`browser/Menu.tsx` não sabe ficar vermelho, então hoje só um dos dois
componentes cumpre a segunda metade da regra 6. Se você precisa da cor nos
cartões do portal, fale com quem mantém o componente antes de recriá-lo ao
lado.
