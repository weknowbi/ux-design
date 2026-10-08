# Modal

A caixa que para a tela até a pessoa decidir. Existem três no produto hoje, e
os três usam a mesma moldura.

| Parte | Espec. |
| --- | --- |
| Véu | `--wk-backdrop`; no escuro ele vai a preto 80% |
| Caixa | fundo `--wk-surface`, raio 8, borda 1px `--wk-border`, `--wk-shadow-menu` |
| Largura | 420 para um campo só; 610 para escolha em lista |
| Cabeçalho | altura 64, `px-24 py-16`, título Inter **Medium** 20/1.5 |
| Fechar | ícone `close` de 24 em `--wk-nav-label`, no canto do cabeçalho |
| Corpo | `px-24`, com o respiro do próprio conteúdo |
| Rodapé | `px-24 pb-16`, ações à direita, com 8 de intervalo |
| Ações | fantasma "Cancelar", seguido do primário |

O título usa peso 500, e não 600. É a única peça do sistema em Medium, porque
um 20 em Semi Bold ao lado de um corpo de 16 abriria um degrau de hierarquia
maior do que a caixa precisa.

## Comportamento

Ao abrir, o foco vai para o primeiro campo e o texto que já estava lá entra
selecionado. Num "renomear", o gesto seguinte quase sempre é substituir o nome
inteiro.

A caixa fecha por `Escape` e por clique no véu. Ela é um `role="dialog"` com
`aria-modal="true"` e um rótulo acessível igual ao título.

Confirmar com o campo vazio não faz nada, e o botão fica desabilitado em vez de
aceitar. Essa é a exceção à regra de que botão desabilitado não explica o que
falta, porque aqui o campo vazio ao lado já explica.

## Regras

1. Modal interrompe, então use um quando a pessoa **não puder** seguir sem
   decidir. Para todo o resto existem menu suspenso, painel ou uma tela nova.
2. Uma decisão por modal. Dois assuntos na mesma caixa viram duas caixas.
3. O botão primário repete o verbo do título: se o título é "Criar pasta", o
   botão também é "Criar pasta". "OK" não diz o que vai acontecer.
4. Ação destrutiva usa o botão destrutivo e nomeia o objeto: "Excluir
   Faturamento e glosas", em vez de "Tem certeza?".
5. Sem modal em cima de modal. Quando o fluxo pede dois passos, eles acontecem
   na mesma caixa.
6. Sem modal na abertura da tela. Um aviso que a pessoa não pediu pertence à
   tela, não à frente dela.
7. A largura é 420 ou 610. Uma terceira largura precisa de um nó do Figma que a
   justifique.
