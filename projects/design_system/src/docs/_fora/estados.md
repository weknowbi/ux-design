# Vazio, carregando e erro

> **Pendente.** Esta página existe para marcar a lacuna, não para preenchê-la.
> Um agente que precise destes padrões deve perguntar, não deduzir.

Hoje cada tela resolve estado vazio e carregamento do seu jeito. Antes de virar
regra, é preciso decidir:

**Vazio.** Ícone, uma frase e a ação que resolve? Ou só a frase? Qual a
diferença entre "não há nada ainda" e "sua busca não achou nada" — são dois
padrões, e hoje parecem um.

**Carregando.** Esqueleto (skeleton) da forma do conteúdo, ou indicador
circular? Skeleton só a partir de qual tempo estimado? Resposta da IA chega em
streaming e não se encaixa em nenhum dos dois.

**Erro.** O que é erro de bloco (a tabela não carregou) e o que é erro de tela
inteira. Onde entra a ação de tentar de novo.

**Sucesso.** Não existe padrão de aviso temporário (toast) no sistema. Se for
criado, precisa de posição, duração e limite de empilhamento definidos aqui.
