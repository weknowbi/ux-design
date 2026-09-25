# Menu lateral e barra de topo

> **Rascunho.** As medidas abaixo estão certas e vêm dos nós do Figma. O que
> ainda falta é a regra de uso: o que entra no menu, o que vira ação da barra
> de topo e o que fica escondido no menu de reticências.

## Item de menu

Espec. do nó `sidebar white` (WP-832): altura 40, raio 8, `px-8`, gap 8, ícone
de 24, texto 14/1.5.

| Estado | Fundo | Texto | Ícone |
| --- | --- | --- | --- |
| Repouso | transparente | `--wk-nav-text` | `--wk-nav-label` |
| Hover | `--wk-nav-hover` | `--wk-nav-hover-text` | `--wk-nav-label` |
| Ativo | `--wk-nav-active` | `--wk-nav-active-text` | primária, `FILL 1` |

O rótulo longo é cortado por **esmaecimento** (`wk-fade-r`), não por
reticências.

## Barra de topo

56px de altura, `px-16 py-8`, gap 12. Busca de 328 × 36, raio 200, `pl-16
pr-12`, ícone de 24 e texto 16/20. Avatar de 36.

O suporte saiu da barra e virou item do menu de reticências: é ação ocasional,
não merece lugar fixo ao lado do avatar.

## Em aberto

- Critério para um item novo entrar no menu principal.
- Comportamento do menu abaixo de 1024px de largura.
- Se a busca da barra é global ou muda de escopo por tela.
