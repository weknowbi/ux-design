import express from "express";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { discoverProjects, updateProjectConfig, resolveThumbnail } from "./discovery.js";
import { startProject, stopProject, getState, stopAll, cleanupOrphans } from "./processManager.js";
import { mountProjectProxy } from "./proxy.js";
import {
  readState,
  withWorkspaceFields,
  createFolder,
  renameFolder,
  deleteFolder,
  assignFolder,
  markOpened,
} from "./workspaceState.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.dirname(__dirname);
const WORKSPACE_ROOT = path.dirname(APP_ROOT);
const PROJECTS_ROOT = path.join(WORKSPACE_ROOT, "projects");
const PORT = process.env.WORKSPACE_PORT || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(APP_ROOT, "public")));

function findProject(id) {
  const projects = discoverProjects(PROJECTS_ROOT);
  return projects.find((p) => p.id === id);
}

// Projeto + campos de organizacao (pasta, ultimo acesso) + estado de execucao.
function present(project, state = readState()) {
  return { ...withWorkspaceFields(project, state), runtime: getState(project.id) };
}

app.get("/api/projects", (req, res) => {
  const state = readState();
  res.json(discoverProjects(PROJECTS_ROOT).map((p) => present(p, state)));
});

app.get("/api/projects/:id", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Projeto nao encontrado" });
  res.json(present(project));
});

app.patch("/api/projects/:id", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Projeto nao encontrado" });
  updateProjectConfig(project.path, req.body || {});
  const updated = findProject(req.params.id);
  res.json(present(updated));
});

app.put("/api/projects/:id/folder", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Projeto nao encontrado" });
  try {
    assignFolder(project.id, req.body?.folderId || null);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  res.json(present(project));
});

app.post("/api/projects/:id/start", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Projeto nao encontrado" });
  // "open: true" = o usuario abriu o projeto pela interface (alimenta Recentes).
  // Reinicios pelo menu nao contam como acesso.
  if (req.body?.open) markOpened(project.id);
  startProject(project); // dispara em background, estado eh consultado via polling
  res.json(present(project));
});

app.post("/api/projects/:id/stop", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Projeto nao encontrado" });
  stopProject(project.id);
  res.json(present(project));
});

// Abre a pasta do projeto no gerenciador de arquivos da maquina que roda o
// workspace (ferramenta local -- nao faz sentido para acesso remoto).
app.post("/api/projects/:id/reveal", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).json({ error: "Projeto nao encontrado" });
  const opener = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
  try {
    const child = spawn(opener, [project.path], { detached: true, stdio: "ignore" });
    child.on("error", () => {});
    child.unref();
  } catch {
    return res.status(500).json({ error: "Nao foi possivel abrir a pasta." });
  }
  res.json({ ok: true });
});

app.get("/api/projects/:id/thumbnail", (req, res) => {
  const project = findProject(req.params.id);
  if (!project) return res.status(404).end();
  const config = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(project.path, "workspace.config.json"), "utf-8"));
    } catch {
      return {};
    }
  })();
  const thumb = resolveThumbnail(project.id, project.path, config);
  if (!thumb) return res.status(404).end();
  res.sendFile(thumb.absPath);
});

// ---------- Pastas ----------

app.get("/api/folders", (req, res) => {
  res.json(readState().folders);
});

app.post("/api/folders", (req, res) => {
  try {
    res.status(201).json(createFolder(req.body?.name));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.patch("/api/folders/:id", (req, res) => {
  try {
    const folder = renameFolder(req.params.id, req.body?.name);
    if (!folder) return res.status(404).json({ error: "Pasta nao encontrada" });
    res.json(folder);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete("/api/folders/:id", (req, res) => {
  if (!deleteFolder(req.params.id)) return res.status(404).json({ error: "Pasta nao encontrada" });
  res.status(204).end();
});

mountProjectProxy(app, { findProject, getState, startProject });

// http-proxy-middleware chama next(err) (em vez do handler "on.error") quando
// o router nao resolve um target -- captura aqui pra nao vazar stack trace
// numa URL que pode estar exposta externamente (ex: via Tailscale).
app.use((err, req, res, next) => {
  if (req.projectProxyError) {
    return res.status(502).send(`Nao foi possivel abrir o projeto: ${req.projectProxyError}`);
  }
  next(err);
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(APP_ROOT, "public", "index.html"));
});

const server = app.listen(PORT, () => {
  // Limpeza de orfaos so depois de garantir a porta: se outro workspace ja
  // estiver rodando, esta instancia nao pode encerrar os projetos dele.
  const orphansKilled = cleanupOrphans();
  if (orphansKilled > 0) {
    console.log(`Encontrados ${orphansKilled} processo(s) orfao(s) de uma sessao anterior (terminal fechado sem Ctrl+C). Encerrados.`);
  }
  console.log(`Workspace disponivel em http://localhost:${PORT}`);
  console.log(`Pasta de projetos: ${PROJECTS_ROOT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `\nA porta ${PORT} ja esta em uso -- provavelmente outro workspace continua rodando em segundo plano.\n` +
        `Feche-o antes de iniciar de novo. Para encontrar o processo:\n` +
        `  netstat -ano | findstr :${PORT}\n` +
        `e encerre o PID mostrado na ultima coluna:  taskkill /pid <PID> /T /F\n`
    );
  } else {
    console.error("Nao foi possivel iniciar o workspace:", err);
  }
  process.exit(1);
});

function shutdown() {
  console.log("\nEncerrando workspace e processos filhos...");
  stopAll();
  // server.close() espera as conexoes abertas terminarem, e conexoes do
  // navegador/HMR do Vite podem ficar abertas indefinidamente -- o processo
  // ficava vivo em segundo plano mesmo apos Ctrl+C ou fechar o terminal.
  server.closeAllConnections?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 1500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// No Windows, fechar a janela do terminal emite SIGHUP (e Ctrl+Break, SIGBREAK)
process.on("SIGHUP", shutdown);
process.on("SIGBREAK", shutdown);

// Rede de seguranca: isso e uma ferramenta local de dev, entao manter o
// workspace de pe (mesmo com um bug pontual registrado no log) e sempre
// melhor do que o processo inteiro cair e tirar do ar todos os projetos
// abertos de uma vez. (Foi exatamente um erro nao tratado desses, dentro
// do proxy, que derrubou o servidor mais cedo -- ver proxy.js.)
process.on("uncaughtException", (err) => {
  console.error("Erro nao tratado (workspace continua rodando):", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Promise rejeitada sem tratamento (workspace continua rodando):", err);
});
