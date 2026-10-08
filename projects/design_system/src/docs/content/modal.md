# Modal

A caixa que para a tela até a pessoa decidir. Três no produto hoje, e todos os
três usam a mesma moldura.

| Parte | Espec. |
| --- | --- |
| Véu | `--wk-backdrop`; no escuro vai a preto 80% |
| Caixa | fundo `--wk-surface`, raio 8, borda 1px `--wk-border`, `--wk-shadow-menu` |
| Largura | 420 para um campo só; 610 para escolha em lista |
| Cabeçalho | altura 64, `px-24 py-16`, título Inter **Medium** 20/1.5 |
| Fechar | ícone `close` de 24 em `--wk-nav-label`, no canto do cabeçalho |
| Corpo | `px-24`, com o respiro do próprio conteúdo |
| Rodapé | `px-24 pb-16`, ações à direita, gap 8 |
| Ações | fantasma "Cancelar" + primário à direita dele |

Repare que o título é **peso 500**, não 600. É a única peça do sistema em
Medium: 20 em Semi Bold ao lado de um corpo de 16 abriria um degrau de
hierarquia maior do que a caixa precisa.

## Comportamento

Ao abrir, o foco vai para o primeiro campo, e o texto que já estava lá entra
selecionado: em um "renomear", o gesto seguinte quase sempre é substituir o
nome inteiro.

Fecha por `Escape` e por clique no véu. A caixa é `role="dialog"` com
`aria-modal="true"` e um rótulo acessível igual ao título.

Confirmar com o campo vazio não faz nada, e o botão fica desabilitado em vez de
aceitar. É a exceção à regra de que botão desabilitado não explica o que falta:
aqui o campo vazio ao lado já explica.

## Regras

1. Modal interrompe. Use quando a pessoa **não pode** seguir sem decidir. Para
   tudo mais existe menu suspenso, painel ou uma tela.
2. Uma decisão por modal. Dois assuntos na mesma caixa viram duas caixas.
3. O botão primário repete o verbo do título: título "Criar pasta", botão
   "Criar pasta". "OK" não diz o que vai acontecer.
4. Ação destrutiva usa o botão destrutivo e nomeia o objeto: "Excluir
   Faturamento e glosas", não "Tem certeza?".
5. Sem modal em cima de modal. Se o fluxo pede dois passos, são dois passos na
   mesma caixa.
6. Sem modal na abertura da tela. Aviso que a pessoa não pediu pertence à tela,
   não à frente dela.
7. A largura é 420 ou 610. Uma terceira largura precisa de um nó do Figma que a
   justifique.
