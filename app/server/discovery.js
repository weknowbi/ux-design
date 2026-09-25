import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));

// Pasta reservada para capturas automaticas futuras (ex: um job que tira um
// screenshot do projeto rodando e salva em data/thumbnails/<id>.png). Nada
// escreve aqui ainda -- a leitura ja esta ligada para que essa evolucao nao
// precise mexer na interface nem na API.
export const CAPTURED_THUMBS_DIR = path.join(SERVER_DIR, "data", "thumbnails");

function readJsonSafe(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function pickDevCommand(pkg) {
  if (!pkg?.scripts) return null;
  const preferred = ["dev", "start", "develop", "serve"];
  for (const name of preferred) {
    if (pkg.scripts[name]) return `npm run ${name}`;
  }
  return null;
}

function titleCase(slug) {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const THUMB_BASENAMES = ["thumbnail", "screenshot", "preview", "cover"];
const THUMB_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "svg"];

function fileVersion(filePath) {
  try {
    return Math.round(fs.statSync(filePath).mtimeMs);
  } catch {
    return null;
  }
}

// Resolve a thumbnail do projeto em ordem de prioridade:
//   1. "thumbnail" definido no workspace.config.json
//   2. imagem convencional na raiz do projeto (thumbnail.png, screenshot.png...)
//   3. captura automatica em data/thumbnails/<id>.<ext> (futuro)
// Retorna null quando nao ha imagem -- a interface usa um placeholder neutro.
export function resolveThumbnail(projectId, projectPath, config) {
  if (config?.thumbnail) {
    const abs = path.resolve(projectPath, config.thumbnail);
    if (abs.startsWith(projectPath) && fs.existsSync(abs)) {
      return { absPath: abs, source: "config", version: fileVersion(abs) };
    }
  }
  for (const base of THUMB_BASENAMES) {
    for (const ext of THUMB_EXTENSIONS) {
      const abs = path.join(projectPath, `${base}.${ext}`);
      if (fs.existsSync(abs)) return { absPath: abs, source: "file", version: fileVersion(abs) };
    }
  }
  for (const ext of THUMB_EXTENSIONS) {
    const abs = path.join(CAPTURED_THUMBS_DIR, `${projectId}.${ext}`);
    if (fs.existsSync(abs)) return { absPath: abs, source: "capture", version: fileVersion(abs) };
  }
  return null;
}

// O mtime da pasta raiz so muda quando entradas sao criadas/removidas, entao nao
// reflete edicoes reais. Olhamos um nivel dentro do projeto (e dentro de src/),
// ignorando artefatos gerados, para uma "ultima atualizacao" mais honesta.
const IGNORED_FOR_MTIME = new Set(["node_modules", "dist", "build", ".git", ".next", ".cache", "workspace.config.json"]);

function computeLastUpdated(projectPath) {
  let latest = 0;
  const scan = (dir, depth) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (IGNORED_FOR_MTIME.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      try {
        const mtime = fs.statSync(full).mtimeMs;
        if (mtime > latest) latest = mtime;
      } catch {
        continue;
      }
      if (depth > 0 && entry.isDirectory() && entry.name === "src") scan(full, depth - 1);
    }
  };
  scan(projectPath, 1);
  if (!latest) latest = fs.statSync(projectPath).mtimeMs;
  return new Date(latest).toISOString();
}

// Descobre todos os projetos validos dentro de projectsRoot.
// Um projeto valido eh qualquer subpasta com package.json.
// workspace.config.json (opcional, na raiz do projeto) sobrescreve qualquer campo inferido.
export function discoverProjects(projectsRoot) {
  if (!fs.existsSync(projectsRoot)) return [];

  const entries = fs.readdirSync(projectsRoot, { withFileTypes: true });
  const projects = [];

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;

    const projectPath = path.join(projectsRoot, entry.name);
    const pkgPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(pkgPath)) continue;

    const pkg = readJsonSafe(pkgPath) || {};
    const config = readJsonSafe(path.join(projectPath, "workspace.config.json")) || {};

    const id = entry.name;
    const thumb = resolveThumbnail(id, projectPath, config);

    projects.push({
      id,
      path: projectPath,
      name: config.name || titleCase(pkg.name || entry.name),
      description: config.description || pkg.description || "",
      category: config.category || "geral",
      status: config.status || "ativo",
      // Apenas a origem e a versao (mtime, para cache-busting) vao para o
      // cliente; o arquivo em si eh servido por /api/projects/:id/thumbnail.
      thumbnail: thumb ? { source: thumb.source, version: thumb.version } : null,
      devCommand: config.devCommand || pickDevCommand(pkg),
      port: config.port || null,
      hasNodeModules: fs.existsSync(path.join(projectPath, "node_modules")),
      lastUpdated: computeLastUpdated(projectPath),
    });
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

const EDITABLE_FIELDS = ["name", "description", "category"];

// Mescla os campos editaveis (vindos da interface) no workspace.config.json do
// projeto, preservando qualquer outro campo (devCommand, port, thumbnail...) ja
// definido manualmente ali.
export function updateProjectConfig(projectPath, updates) {
  const configPath = path.join(projectPath, "workspace.config.json");
  const current = readJsonSafe(configPath) || {};

  for (const field of EDITABLE_FIELDS) {
    if (updates[field] !== undefined) {
      const value = String(updates[field]).trim();
      if (value) current[field] = value;
      else delete current[field];
    }
  }

  fs.writeFileSync(configPath, JSON.stringify(current, null, 2) + "\n");
  return current;
}
