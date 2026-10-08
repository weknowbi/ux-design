# Espaçamento, raio e elevação

## Espaço

A grade é de **4**. Os passos que aparecem de verdade são 4, 8, 12, 16, 24, 32,
48 e 64. Qualquer valor fora da grade precisa de um comentário dizendo de onde
ele veio, e às vezes vem mesmo de algum lugar: a folga de 6px do chip é
consequência do ícone de 24 dentro de uma caixa de 36, e não uma escolha.

## Raio

São seis raios, e cada um tem um trabalho.

| Token | Valor | Onde |
| --- | --- | --- |
| `RADIUS.sm` | 6 | Campo, botão pequeno, hover de ícone |
| `RADIUS.md` | 8 | Botão médio, item de menu, busca em modal |
| `RADIUS.lg` | 12 | Tabela com moldura, bloco de código, miniatura |
| `RADIUS.xl` | 16 | Cartão, folha de conteúdo (só os cantos de cima) |
| `RADIUS.composer` | 20 | Caixa de pergunta do ASK |
| `RADIUS.pill` | 9999 | Chip, busca da barra de topo, alternador de tema |

O raio cresce junto com o tamanho do bloco. Um raio de 16 num botão de 32px de
altura faz o botão parecer uma pílula malfeita.

## Elevação

Nenhuma sombra é decorativa. Cada uma informa a que distância da folha o
elemento está.

| Token | Levanta |
| --- | --- |
| `--wk-shadow-composer` | A caixa de pergunta do ASK, acima da folha |
| `--wk-shadow-menu` | Painel flutuante, como menu suspenso, seletor aberto, modal e dica |
| `--wk-clean-shadow` | Cartão em repouso, no lugar do contorno |
| `--wk-clean-shadow-hover` | O mesmo cartão sob o ponteiro |

O painel flutuante usa desfoque curto e deslocamento pequeno porque ele já tem
borda de 1px, então a sombra só precisa separá-lo do fundo sem anunciá-lo.

Com o cartão acontece o contrário. Ele não tem contorno, e a sombra é a única
coisa que mostra onde a caixa começa. Por isso são duas sombras, e a de hover é
um degrau acima da outra em vez de uma cor diferente.

No tema escuro todas elas ficam pretas e mais opacas, porque um véu claro sobre
fundo quase preto simplesmente some.

## Métricas do produto

Estas medidas não são preferência. São o desenho do frame `home` (WP-832).

| Medida | Valor |
| --- | --- |
| Altura da barra de topo | 56 |
| Largura do menu lateral | 255 |
| Raio da folha de conteúdo | 16, só no topo |
| Margem direita da folha | 48 |
| Largura máxima da conversa | 896 |
| Item de menu | 40 de altura, raio 8, ícone 24, intervalo 8 |
