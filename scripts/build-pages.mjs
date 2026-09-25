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

// Hash SHA-256 da senha de acesso do site publicado -- nunca a senha em
// texto puro (nem aqui, nem em nenhum outro arquivo). Ver pages-gate.template.js
// pra entender o mecanismo e as limitacoes (site estatico, sem servidor:
// isso e uma cortina contra acesso casual, nao seguranca de verdade).
const GATE_PASSWORD_HASH = "2c2bebaf13e1ea040ba145dc49dd5e01cac66f95765d81849ac8890180efa3a9";

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
// cada /p/<slug>/): desativa os scripts do index.html dele, injeta o CSS
// que esconde a pagina ate a liberacao, e copia o gate.js que faz a
// verificacao da senha e reativa os scripts quando ela bate.
function applyGate(dir) {
  const indexPath = path.join(dir, "index.html");
  if (!fs.existsSync(indexPath)) return;

  let html = fs.readFileSync(indexPath, "utf-8");
  html = disableScripts(html);
  html = html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n<style id="wsg-style">html{visibility:hidden}</style>`);
  html = html.replace(/<\/body>/i, `<script src="./gate.js"></script>\n</body>`);
  fs.writeFileSync(indexPath, html);

  const gateJs = fs
    .readFileSync(path.join(ROOT, "scripts", "pages-gate.template.js"), "utf-8")
    .replace("__PASSWORD_HASH__", GATE_PASSWORD_HASH);
  fs.writeFileSync(path.join(dir, "gate.js"), gateJs);
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
  const slug = slugify(name);
  const outDir = path.join(SITE_ROOT, "p", slug);

  console.log(`\n== ${name} (${entryName} -> /p/${slug}/) ==`);

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

  applyGate(outDir);

  let thumbUrl = null;
  const thumbAbs = findThumbnail(projectPath, config);
  if (thumbAbs) {
    const thumbName = "_thumb" + path.extname(thumbAbs);
    fs.copyFileSync(thumbAbs, path.join(outDir, thumbName));
    thumbUrl = `p/${slug}/${thumbName}`;
  }

  return {
    slug,
    name,
    description: config.description || pkg.description || "",
    href: `p/${slug}/`,
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
