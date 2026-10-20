/* =========================================================================
   Build do Workspace de Prototipos para o GitHub Pages.

   O workspace "de verdade" (app/) precisa de um servidor rodando (descobre
   projetos, roda "npm run dev" sob demanda, faz proxy pra porta certa). O
   GitHub Pages so serve arquivos estaticos -- entao aqui a gente:
     1. builda cada projeto em projects/* (o "npm run build" normal dele);
     2. copia o resultado pra _site/p/<slug>/;
     3. gera uma pagina inicial estatica (_site/index.html) que lista os
        projetos, igual a grade do workspace, linkando pra cada um.

   Roda no GitHub Actions a cada push na main (ver .github/workflows/pages.yml),
   entao o site publicado se mantem atualizado sozinho.
   ========================================================================= */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PROJECTS_ROOT = path.join(ROOT, "projects");
const SITE_ROOT = path.join(ROOT, "_site");

// Hashes SHA-256 das senhas de acesso do site publicado -- nunca as senhas
// em texto puro (nem aqui, nem em nenhum outro arquivo). "edit" pode
// renomear projetos na pagina inicial; "view" so visualiza. Ver
// pages-gate.template.js pra entender o mecanismo e as limitacoes (site
// estatico, sem servidor: isso e uma cortina contra acesso casual, nao
// seguranca de verdade).
const GATE_EDIT_HASH = "2c2bebaf13e1ea040ba145dc49dd5e01cac66f95765d81849ac8890180efa3a9";
const GATE_VIEW_HASH = "015f027c6b45c15d936d8bc321ae08b7bedc9e81dcd349dfe05a3858ad96f60b";
// Senha dos participantes de teste de usabilidade: so abre os projetos com
// "access": "teste" no workspace.config.json (ver pages-gate.template.js).
// Para trocar, gere o hash da senha nova e cole aqui:
//   node -e "console.log(require('crypto').createHash('sha256').update('SENHA').digest('hex'))"
const GATE_TEST_HASH = "50e936c050c7ed9af475e3502bb45c13a1c5010b175b7a553101254868cacd79";

// Desativa (sem remover) os <script> de uma pagina, pra nenhum deles rodar
// antes da senha ser confirmada -- ver reactivateScripts() no gate.
function disableScripts(html) {
  return html.replace(/<script\b([^>]*)>/gi, (full, attrs) => {
    if (/\btype\s*=\s*["']module["']/i.test(attrs)) {
      return full.replace(/type\s*=\s*["']module["']/i, 'type="disabled-module"');
    }
    if (/\btype\s*=/i.test(attrs)) return full; // outro type explicito -- nao mexe
    return `<script type="disabled-classic"${attrs}>`;
  });
}

// Aplica a cortina de acesso num diretorio publicado (a raiz do site ou
// cada /p/<slug>/): em cada pagina .html do primeiro nivel dele (nao so o
// index.html -- ha projetos com mais de uma pagina, e as outras ficariam
// abertas), desativa os scripts, injeta o CSS que esconde a pagina ate a
// liberacao, e copia o gate.js que faz a verificacao da senha e reativa os
// scripts quando ela bate.
function applyGate(dir, { test = false } = {}) {
  const pages = fs.readdirSync(dir).filter((name) => name.toLowerCase().endsWith(".html"));
  if (pages.length === 0) return;

  for (const page of pages) {
    const pagePath = path.join(dir, page);
    let html = fs.readFileSync(pagePath, "utf-8");
    html = disableScripts(html);
    // noindex: nem o workspace nem os testes devem aparecer em buscador.
    html = html.replace(
      /<head(\s[^>]*)?>/i,
      (m) => `${m}\n<meta name="robots" content="noindex, nofollow" />\n<style id="wsg-style">html{visibility:hidden}</style>`,
    );
    html = html.replace(/<\/body>/i, `<script src="./gate.js"></script>\n</body>`);
    fs.writeFileSync(pagePath, html);
  }

  // Cada pagina leva so os hashes das senhas que ela aceita: a de teste so
  // vai para os projetos de teste, e eles nao levam os de view/edit (quem e
  // do time e ja entrou neste navegador passa pelo papel guardado).
  const gateJs = stripComments(
    fs
      .readFileSync(path.join(ROOT, "scripts", "pages-gate.template.js"), "utf-8")
      .replace("__EDIT_HASH__", test ? "" : GATE_EDIT_HASH)
      .replace("__VIEW_HASH__", test ? "" : GATE_VIEW_HASH)
      .replace("__TEST_HASH__", test ? GATE_TEST_HASH : "")
      .replace(
        "__PROMPT_TEXT__",
        test
          ? "Digite a senha que você recebeu para continuar."
          : "Este workspace de protótipos é privado. Digite a senha para continuar.",
      ),
  );
  fs.writeFileSync(path.join(dir, "gate.js"), gateJs);
}

// O gate.js publicado vai sem os comentarios do template: eles explicam o
// workspace, as senhas e o build, e qualquer um le o arquivo no navegador.
// So tira bloco /* */ e linha que comeca com // ou termina com " // texto"
// -- as URLs das strings ("https://...") nao tem espaco antes das barras.
function stripComments(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^[ \t]*\/\/.*$/gm, "")
    .replace(/[ \t]+\/\/ .*$/gm, "")
    .replace(/\n\s*\n+/g, "\n");
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return null;
  }
}

function titleCase(slug) {
  return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Slug seguro pra URL, a partir do nome de exibicao (nao da pasta crua --
// "editor _de_ formula" viraria algo feio tipo "editor-_de_-formula").
function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

// Data do ultimo commit que tocou o projeto -- em CI o checkout normaliza o
// mtime de todo arquivo pro momento do clone, entao olhar o filesystem nao
// serve; o historico do git e a unica fonte confiavel aqui.
function lastCommitDate(projectPath) {
  try {
    const iso = execSync(`git log -1 --format=%cI -- "${projectPath}"`, { cwd: ROOT, encoding: "utf-8" }).trim();
    return iso || null;
  } catch {
    return null;
  }
}

function run(cmd, cwd, extraEnv = {}) {
  console.log(`  $ ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit", env: { ...process.env, CI: "true", ...extraEnv } });
}

const THUMB_BASENAMES = ["thumbnail", "screenshot", "preview", "cover"];
const THUMB_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

function findThumbnail(projectPath, config) {
  if (config?.thumbnail) {
    const abs = path.join(projectPath, config.thumbnail);
    if (fs.existsSync(abs)) return abs;
  }
  for (const base of THUMB_BASENAMES) {
    for (const ext of THUMB_EXTENSIONS) {
      const abs = path.join(projectPath, `${base}.${ext}`);
      if (fs.existsSync(abs)) return abs;
    }
  }
  return null;
}

function buildProject(entryName) {
  const projectPath = path.join(PROJECTS_ROOT, entryName);
  const pkgPath = path.join(projectPath, "package.json");
  if (!fs.statSync(projectPath).isDirectory() || !fs.existsSync(pkgPath)) return null;

  const pkg = readJsonSafe(pkgPath) || {};
  const config = readJsonSafe(path.join(projectPath, "workspace.config.json")) || {};
  const name = config.name || titleCase(pkg.name || entryName);
  // "slug" fixo no config (gravado na primeira vez que o projeto e
  // renomeado pelo site) mantem o link /p/<slug>/ estavel mesmo com o nome
  // mudando -- sem ele, cada renomeacao quebraria os links ja compartilhados.
  const slug = config.slug || slugify(name);
  // Projeto que vai para participantes de teste: abre tambem com a senha de
  // teste, e so ele -- o resto do workspace continua pedindo view/edit.
  const isTest = config.access === "teste";
  // Teste sai em /s/<slug>/, longe do /p/ dos outros projetos: quem recebe
  // o link nao chega no vizinho trocando o fim do endereco. O slug de um
  // teste e um codigo aleatorio, com cara de link de compartilhamento.
  const area = isTest ? "s" : "p";
  const outDir = path.join(SITE_ROOT, area, slug);

  console.log(`\n== ${name} (${entryName} -> /${area}/${slug}/) ==`);

  fs.mkdirSync(outDir, { recursive: true });

  // Caso especial: o Gerenciador de Licencas nao usa bundler, o "build" dele
  // (build.js) so gera um HTML unico com CSS/JS embutidos -- perfeito pra
  // hospedagem estatica, so precisa virar o index.html da pasta de saida.
  if (pkg.scripts?.build && fs.existsSync(path.join(projectPath, "build.js"))) {
    run("npm install", projectPath);
    run("npm run build", projectPath);
    const generated = path.join(projectPath, "gerenciador-licencas.html");
    if (fs.existsSync(generated)) {
      fs.copyFileSync(generated, path.join(outDir, "index.html"));
    } else {
      fs.copyFileSync(path.join(projectPath, "index.html"), path.join(outDir, "index.html"));
    }
  } else if (pkg.scripts?.build) {
    // Projetos Vite: builda com base relativa, pra funcionar em qualquer
    // subcaminho (nao sabemos de antemao onde o Pages vai publicar). O CLI
    // "--base" cobre a maioria; "editor _de_ formula" tem o proprio
    // vite.config.ts lendo FIGMA_PUBLIC_URL direto, entao cobrimos os dois.
    run("npm install", projectPath);
    run(`npm run build -- --base=./`, projectPath, { FIGMA_PUBLIC_URL: "." });
    const dist = path.join(projectPath, "dist");
    if (fs.existsSync(dist)) copyDir(dist, outDir);
    else console.warn(`  aviso: "${entryName}" tem script de build mas nao gerou dist/`);
  } else {
    // Sem build (estatico puro): copia os arquivos da raiz do projeto,
    // exceto o que nao faz sentido publicar.
    const skip = new Set(["node_modules", ".git", ".claude", ".figma", "dist"]);
    for (const entry of fs.readdirSync(projectPath, { withFileTypes: true })) {
      if (skip.has(entry.name)) continue;
      const s = path.join(projectPath, entry.name);
      const d = path.join(outDir, entry.name);
      if (entry.isDirectory()) copyDir(s, d);
      else fs.copyFileSync(s, d);
    }
  }

  applyGate(outDir, { test: isTest });

  let thumbUrl = null;
  const thumbAbs = findThumbnail(projectPath, config);
  if (thumbAbs) {
    const thumbName = "_thumb" + path.extname(thumbAbs);
    fs.copyFileSync(thumbAbs, path.join(outDir, thumbName));
    thumbUrl = `${area}/${slug}/${thumbName}`;
  }

  return {
    slug,
    dir: entryName, // pasta em projects/ -- a pagina inicial usa pra saber qual config editar
    name,
    description: config.description || pkg.description || "",
    href: `${area}/${slug}/`,
    group: isTest ? "teste" : "projetos",
    thumbnail: thumbUrl,
    updatedAt: lastCommitDate(projectPath),
  };
}

function buildStaticIndex(projects) {
  fs.writeFileSync(path.join(SITE_ROOT, "manifest.json"), JSON.stringify(projects, null, 2));

  const html = fs.readFileSync(path.join(ROOT, "scripts", "pages-index.template.html"), "utf-8");
  fs.writeFileSync(path.join(SITE_ROOT, "index.html"), html);
  fs.copyFileSync(path.join(ROOT, "scripts", "pages-index.css"), path.join(SITE_ROOT, "styles.css"));
  fs.copyFileSync(path.join(ROOT, "scripts", "pages-index.js"), path.join(SITE_ROOT, "app.js"));
  fs.copyFileSync(path.join(ROOT, "app", "public", "logo.svg"), path.join(SITE_ROOT, "logo.svg"));

  applyGate(SITE_ROOT);

  // GitHub Pages: garante que rotas desconhecidas caiam de volta no index
  // (nenhum destes projetos usa roteamento por historico, mas e barato ter).
  fs.copyFileSync(path.join(SITE_ROOT, "index.html"), path.join(SITE_ROOT, "404.html"));
}

console.log("Construindo site estatico do Workspace de Prototipos...");
fs.rmSync(SITE_ROOT, { recursive: true, force: true });
fs.mkdirSync(SITE_ROOT, { recursive: true });

// "design_system" faz typecheck (tsc) e importa componentes direto do
// codigo-fonte de "weknow_ask" (alias "@" no vite.config.ts). Isso so
// funciona se weknow_ask ja tiver as proprias dependencias instaladas --
// num checkout limpo de CI, sem essa garantia, o tsc falha com "Cannot find
// module 'react'" ao tentar resolver os arquivos importados de la.
const askDeps = path.join(PROJECTS_ROOT, "weknow_ask");
if (fs.existsSync(path.join(askDeps, "package.json")) && !fs.existsSync(path.join(askDeps, "node_modules"))) {
  console.log("\n== instalando dependencias de weknow_ask (usadas pelo design_system via alias) ==");
  run("npm install", askDeps);
}

const entries = fs.readdirSync(PROJECTS_ROOT, { withFileTypes: true }).filter((e) => e.isDirectory() && !e.name.startsWith("."));
const projects = [];
for (const entry of entries) {
  try {
    const info = buildProject(entry.name);
    if (info) projects.push(info);
  } catch (err) {
    console.error(`Falha ao buildar "${entry.name}":`, err.message);
    process.exitCode = 1;
  }
}
projects.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

buildStaticIndex(projects);
console.log(`\nPronto: ${projects.length} projeto(s) publicado(s) em _site/.`);
