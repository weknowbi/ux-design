# Vazio, carregando e erro

> **Pendente.** Esta página existe para marcar a lacuna, não para preenchê-la.
> Um agente que precise destes padrões deve perguntar, não deduzir.

Hoje cada tela resolve estado vazio e carregamento do seu jeito. Antes de virar
regra, é preciso decidir:

**Vazio.** Ícone, uma frase e a ação que resolve? Ou só a frase? Qual a
diferença entre "não há nada ainda" e "sua busca não achou nada" — são dois
padrões, e hoje parecem um.

A tabela já aceita um conteúdo de vazio (`empty`), centrado numa célula de 40
de respiro que atravessa todas as colunas. É a única peça do sistema com lugar
reservado para o estado vazio, e não há regra dizendo o que pôr lá.

**Carregando.** Esqueleto (skeleton) da forma do conteúdo, ou indicador
circular? Skeleton só a partir de qual tempo estimado? Resposta da IA chega em
streaming e não se encaixa em nenhum dos dois. Hoje **não existe** nenhum dos
dois no código: nem esqueleto, nem indicador.

**Erro.** O que é erro de bloco (a tabela não carregou) e o que é erro de tela
inteira. Onde entra a ação de tentar de novo. O que existe hoje é só o erro de
campo, descrito em [Campo e seletor](#/campo).

## Sucesso: existe, mas não é regra

Ao contrário dos três acima, o aviso temporário já está no produto — o portal o
usa em "Alterações salvas" e em "Não consegui ler essa imagem":

| Parte | Espec. |
| --- | --- |
| Caixa | fundo `--wk-toast-bg`, texto `--wk-toast-text`, raio 8, `px-16 py-12` |
| Texto | Inter 14 |
| Posição | preso à janela, 32 acima da base, centrado na horizontal |
| Duração | 2,5s, some sozinho |
| Acessibilidade | `role="status"` com `aria-live="polite"` |

Repare que ele usa as mesmas duas variáveis da [dica](#/dica). É de propósito:
as duas são caixas escuras sobre o conteúdo, e no tema escuro as duas invertem
juntas.

O que **falta decidir** antes de isto virar regra:

1. Limite de empilhamento. Hoje há um estado só, e um aviso novo substitui o
   anterior sem transição.
2. Se cabe ação dentro dele ("Desfazer"). Com 2,5s de duração, hoje não cabe.
3. O que vale confirmar. "Alterações salvas" é útil; um aviso a cada clique
   treina a pessoa a ignorar o canto de baixo da tela.
4. O que acontece com quem não vê a tela nesses 2,5s.
