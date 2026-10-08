# Vazio, carregando e erro

> **Pendente.** Esta página existe para marcar a lacuna, não para preenchê-la.
> Um agente que precise destes padrões deve perguntar em vez de deduzir.

Hoje cada tela resolve estado vazio e carregamento do seu jeito. Antes que isso
vire regra, é preciso decidir alguns pontos.

**Vazio.** Ícone, uma frase e a ação que resolve, ou apenas a frase? E qual é a
diferença entre "não há nada ainda" e "sua busca não achou nada", que hoje
parecem o mesmo padrão e são dois?

A tabela já aceita um conteúdo de vazio (`empty`), centrado numa célula de 40
de respiro que atravessa todas as colunas. É a única peça do sistema com lugar
reservado para esse estado, e não há regra dizendo o que colocar lá.

**Carregando.** Esqueleto com a forma do conteúdo, ou indicador circular? E a
partir de qual tempo estimado cada um vale? A resposta da IA chega em streaming
e não se encaixa em nenhum dos dois. Hoje o código não tem nenhum deles.

**Erro.** Falta separar o que é erro de bloco, como uma tabela que não
carregou, do que é erro de tela inteira, e definir onde entra a ação de tentar
de novo. O que existe hoje é apenas o erro de campo, descrito em [Campo e
seletor](#/campo).

## Sucesso: existe, mas ainda não é regra

Ao contrário dos três acima, o aviso temporário já está no produto. O portal o
usa em "Alterações salvas" e em "Não consegui ler essa imagem".

| Parte | Espec. |
| --- | --- |
| Caixa | fundo `--wk-toast-bg`, texto `--wk-toast-text`, raio 8, `px-16 py-12` |
| Texto | Inter 14 |
| Posição | preso à janela, 32 acima da base, centrado na horizontal |
| Duração | 2,5s, e some sozinho |
| Acessibilidade | `role="status"` com `aria-live="polite"` |

Ele usa as mesmas duas variáveis da [dica](#/dica), e isso é de propósito: as
duas são caixas escuras sobre o conteúdo, então no tema escuro as duas invertem
juntas.

Antes que vire regra, falta decidir:

1. O limite de empilhamento. Hoje existe um estado só, e um aviso novo
   substitui o anterior sem transição.
2. Se cabe ação dentro dele, como um "Desfazer". Com 2,5s de duração, hoje não
   cabe.
3. O que vale confirmar. "Alterações salvas" é útil, mas um aviso a cada clique
   treina a pessoa a ignorar o canto de baixo da tela.
4. O que acontece com quem não está olhando durante esses 2,5s.
