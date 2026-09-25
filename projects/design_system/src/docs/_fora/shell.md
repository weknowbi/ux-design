# Layout de tela

A moldura de toda tela do produto, do frame `home` (WP-832). Três peças:

**Menu lateral** — 255px, fundo `canvas`, `px-16`. Logo alinhado ao topo na
altura da barra, itens de 40px com raio 8, e o rodapé (configurações, tema,
ajuda, sair) colado na base.

**Barra de topo** — 56px, `px-16 py-8`, gap 12. Caminho à esquerda, busca de
328 × 36 em pílula, ícones de 24 e avatar de 36 à direita.

**Folha de conteúdo** — fundo `surface`, cantos **de cima** arredondados em 16,
margem de 48 à direita. Ela é o que rola; menu e barra ficam parados.

```
┌─────────┬──────────────────────────────────────┐
│  logo   │  caminho          busca      avatar  │  56
│─────────┼──────────────────────────────────────│
│  MENU   │ ╭──────────────────────────────────╮ │
│  item   │ │                                  │ │
│  item   │ │        folha (rola)              │ │
│         │ │                                  │ │
│  rodapé │ │                                  │ │
└─────────┴──────────────────────────────────────┘
   255                                        48 →
```

## Regras

1. O menu e a barra de topo não rolam. Só a folha rola, e o cabeçalho da tela
   vive **dentro** dela.
2. A folha tem raio só em cima. O rodapé encosta na base da janela de
   propósito: a tela continua para baixo.
3. Conteúdo de leitura fica numa coluna centrada — 896 na conversa, 1159 no
   portal. A folha se estica, o conteúdo não.
4. O caminho responde "onde eu estou" e o item atual se distingue **só pelo
   peso 600**. Escurecer a cor além disso cria uma segunda hierarquia que a
   espec. não tem.
5. **Um só nível de navegação lateral.** Menu dentro de menu vira o problema
   que o caminho deveria resolver. Quando a árvore tem dois níveis, o de cima
   fica na barra e o de baixo entra na tela, como lista do próprio conteúdo —
   é o que esta documentação faz: seções na barra, páginas da seção ao lado do
   texto.
6. O alternador de tema mora no rodapé do menu, não na barra de topo.
