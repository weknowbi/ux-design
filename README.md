# Workspace de Protótipos — Weknow

Um "Figma" para os protótipos web da equipe. Em vez de cada protótipo virar um link
avulso que alguém manda por chat, todos ficam num só lugar: você abre o link do
workspace, vê a lista de projetos como se fossem arquivos, clica no que quer ver, e
o protótipo abre ali mesmo, rodando de verdade — não é uma imagem nem uma gravação.

**Link público:** https://weknowbi.github.io/ux-design/ — abre em qualquer navegador,
sem login, sempre disponível. É a versão publicada automaticamente pelo GitHub Pages.

## Como usar

1. Abra o link acima.
2. Você cai em **Todos os projetos** — a grade com todos os protótipos disponíveis,
   com miniatura, nome e quando cada um foi atualizado pela última vez.
3. Clique num projeto para abrir. Ele já vem pronto, sem espera.
4. Use o logo/**Weknow** no canto superior para voltar à lista de projetos.

Isso substitui mandar um link de protótipo do Figma: quem recebe já cai direto na
aplicação web funcionando, sem precisar rodar nada na própria máquina.

### Sobre o acesso

Este repositório é **público** — qualquer pessoa com o link consegue abrir o
workspace e os protótipos, sem precisar de conta, login ou instalar nada. Isso foi
uma escolha deliberada para ter um link simples e sempre ativo; a contrapartida é
que o código-fonte e os protótipos também ficam visíveis a qualquer pessoa da
internet, não só à Weknow (ver [Próximos passos](#próximos-passos-e-decisões-em-aberto)).

**Nunca coloque dados reais de clientes em nenhum protótipo** (nomes, e-mails,
CNPJs, telefones etc.) — use sempre dados fictícios, porque tudo aqui é público.

## Para quem mantém o workspace

Existem duas versões deste projeto:

- **Publicada (GitHub Pages)** — estática: cada protótipo é pré-compilado
  (`npm run build`) e publicado como arquivo pronto. É o que todo mundo acessa
  pelo link público. Atualiza sozinha a cada push na `main` (ver
  [Como o site publicado é gerado](#como-o-site-publicado-é-gerado)).
- **Local (`app/`)** — o workspace "de verdade", com servidor: descobre os
  projetos, roda `npm run dev` de cada um sob demanda, e reflete qualquer
  alteração instantaneamente. Serve para desenvolver e testar antes de publicar.

### Rodar a versão local

```bash
cd app
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Aqui sim, ao clicar num projeto
que não está rodando, o workspace inicia o servidor de dev dele na hora.

Navegação da versão local: **Todos os projetos**, **Recentes** (últimos abertos),
**Rodando** (processos ativos agora), **Pastas** (organização por assunto/time),
busca (`/` ou `Ctrl+K`), setas do teclado entre os cards, `Enter` abre, `Shift+F10`
abre o menu `•••` (reiniciar, parar, mover de pasta, editar informações...).

### Adicionar um novo protótipo

1. Coloque a pasta do projeto dentro de `projects/` (ex: `projects/meu-prototipo`).
2. Garanta que ela tenha um `package.json` com um script `dev` (pra rodar local) e
   `build` (pra publicar no Pages).
3. Rodando local, o workspace já mostra o projeto sozinho, sem reiniciar nada.
4. Para ele aparecer no **link público**, é só dar commit e push na `main` — a
   publicação é automática (ver abaixo).

### Metadata opcional do projeto

Crie um `workspace.config.json` na raiz do projeto para controlar como ele aparece e roda:

```json
{
  "name": "Recuperaí",
  "description": "Fluxo de recuperação de carrinho abandonado",
  "category": "vendas",
  "thumbnail": "thumbnail.png",
  "devCommand": "npm run dev",
  "port": 5173
}
```

Todos os campos são opcionais. Sem eles, o workspace infere o nome pela pasta, a
descrição/comando pelo `package.json`, e detecta a porta automaticamente lendo a
saída do processo (a maioria das ferramentas — Vite, Next, CRA — imprime a URL local
ao iniciar).

**Thumbnails** seguem esta ordem de prioridade:

1. `thumbnail` definido no `workspace.config.json`;
2. imagem na raiz do projeto: `thumbnail`, `screenshot`, `preview` ou `cover`
   (`.png`, `.jpg`, `.webp`, `.gif`, `.svg`);
3. captura automática em `app/server/data/thumbnails/<id-do-projeto>.png` (versão
   local) — a leitura já está ligada; um futuro job de screenshot só precisa gravar
   o arquivo ali;
4. placeholder neutro.

Pastas e histórico de acesso (quem abriu o quê, na versão local) ficam em
`app/server/data/workspace-state.json` — local na máquina, fora do git.

### Como o site publicado é gerado

`.github/workflows/pages.yml` roda `scripts/build-pages.mjs` a cada push na `main`:

1. Builda cada projeto em `projects/*` (`npm install && npm run build`) — os
   projetos em Vite usam base relativa (`--base=./`) pra funcionar em qualquer
   subcaminho; o Gerenciador de Licenças usa o próprio `build.js` dele, que gera
   um HTML único com CSS/JS embutidos.
2. Copia o resultado de cada um pra `_site/p/<slug>/`.
3. Gera `_site/index.html` — a página inicial estática com a grade de projetos —
   e `_site/manifest.json` com nome, descrição, miniatura e data de atualização
   (tirada do histórico do git, já que o checkout não preserva a data real dos
   arquivos).
4. Publica `_site/` no GitHub Pages.

Pra testar essa build localmente antes de dar push: `node scripts/build-pages.mjs`
(gera `_site/` na raiz) e sirva com qualquer servidor estático — **sem** modo SPA
(a flag `-s` de `npx serve`, por exemplo, quebra os subcaminhos `/p/<slug>/`).

### Como funciona a versão local por baixo

- **Descoberta**: a cada consulta, o backend varre `projects/*` procurando pastas com
  `package.json`. Não há registro manual no código.
- **Execução**: ao abrir um projeto, o backend roda `npm install` (se necessário) e depois
  o comando de dev configurado, num processo filho isolado (`cwd` = pasta do projeto).
- **Detecção de porta**: em vez de forçar uma porta, o backend lê o `stdout`/`stderr` do
  processo procurando o padrão `http://localhost:PORTA`. Isso evita acoplar a arquitetura
  a um framework específico.
- **Isolamento**: cada projeto roda no seu próprio processo Node e é exibido num `iframe`
  apontando para `http://localhost:PORTA` — origem de navegador separada, sem
  compartilhar CSS, JS, dependências ou estado com outros projetos.
- **Encerramento**: os processos ficam em memória enquanto o workspace estiver aberto;
  fechar o servidor do workspace (`Ctrl+C`) encerra todos os processos filhos.
- **Persistência**: a lista de projetos vem sempre do filesystem (fonte da verdade); o
  status de execução vive em memória no servidor do workspace.

## Próximos passos e decisões em aberto

- **Repositório público**: decisão consciente da equipe para ter um link simples e
  sempre ativo. Se um dia isso precisar mudar para privado com controle de acesso
  (GitHub Enterprise, ou hospedar a versão local num servidor próprio na nuvem com
  senha), é uma migração possível, mas não trivial — bom rever com alguém de
  desenvolvimento antes.
- Banco de dados leve (SQLite) para metadata e histórico, na versão local.
- Geração automática de thumbnail a partir do projeto em execução.
- Autenticação por usuário (hoje quem tem o link do repositório e da versão local
  tem acesso completo).
- Integração com Git/Jira, comentários, versionamento.

A API HTTP da versão local (`/api/projects`, `/api/projects/:id/start`, etc.) já foi
desenhada para não depender de acesso direto ao filesystem do cliente, o que
facilita uma evolução futura para um servidor compartilhado de verdade (com
processos ao vivo, não só arquivos estáticos).
