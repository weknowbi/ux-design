import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isPortFree, pingHttp, extractPortFromLog } from "./util.js";

const READY_TIMEOUT_MS = 60_000;
const LOG_LIMIT = 200;
const IS_WINDOWS = process.platform === "win32";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(SERVER_DIR, "data");
const REGISTRY_PATH = path.join(DATA_DIR, "running-pids.json");

// Registro em disco dos PIDs que este servidor iniciou. Se o terminal for
// fechado sem Ctrl+C (janela fechada no X, por exemplo), o processo do
// workspace morre sem rodar stopAll() e os processos filhos (Vite, etc.)
// ficam orfaos, presos em portas. Na proxima vez que o workspace iniciar,
// ele le esse arquivo e mata qualquer PID que tenha sobrado de uma sessao
// anterior antes de continuar.
function readRegistry() {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_PATH, "utf-8"));
  } catch {
    return {};
  }
}

function writeRegistry(registry) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  } catch {
    // nao critico: pior caso, um orfao nao eh limpo automaticamente depois
  }
}

function registerPid(projectId, pid, port = null) {
  const registry = readRegistry();
  registry[projectId] = { pid, port };
  writeRegistry(registry);
}

function registerPort(projectId, port) {
  const registry = readRegistry();
  if (registry[projectId]) {
    registry[projectId].port = port;
    writeRegistry(registry);
  }
}

function unregisterPid(projectId) {
  const registry = readRegistry();
  delete registry[projectId];
  writeRegistry(registry);
}

function killPid(pid) {
  if (!pid) return;
  if (IS_WINDOWS) {
    try {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } catch {
      // processo pode ja ter saido
    }
  } else {
    try {
      process.kill(-pid, "SIGTERM");
    } catch {
      try {
        process.kill(pid, "SIGTERM");
      } catch {
        // processo pode ja ter saido
      }
    }
  }
}

// No Windows, "npm run dev" passa por varias camadas (cmd.exe -> npm.cmd -> node.exe)
// e, em alguns casos, matar a arvore a partir do PID do shell reportado pelo Node
// nao alcanca o processo real que ficou escutando a porta (ele fica "reparentado").
// Como fallback garantido, perguntamos ao sistema quem esta de fato escutando
// naquela porta e matamos esse PID diretamente -- isso sempre libera a porta,
// independente de qualquer confusao na arvore de processos do shell.
function findPidsListeningOnPort(port) {
  if (!IS_WINDOWS || !port) return [];
  try {
    // sem "-p tcp": inclui IPv6 (ex: servidor escutando so em [::1])
    const out = execSync(`netstat -ano`, { encoding: "utf-8" });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      if (!/LISTENING/i.test(line)) continue;
      if (!new RegExp(`[:.]${port}\\s`).test(line)) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (/^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

function killPort(port) {
  for (const pid of findPidsListeningOnPort(port)) killPid(pid);
}

// spawn(..., { shell: true }) cria um processo intermediario (cmd.exe no Windows).
// child.kill() so mataria esse intermediario, deixando o processo real (e a porta)
// orfao e vivo. killProcessTree mata a arvore inteira, e killPort complementa
// matando quem estiver de fato escutando na porta conhecida (ver comentario acima).
function killProcessTree(child, port) {
  if (child?.pid) killPid(child.pid);
  if (port) killPort(port);
}

// Chamado uma vez, ao iniciar o servidor do workspace (ver index.js).
export function cleanupOrphans() {
  const registry = readRegistry();
  const entries = Object.values(registry);
  for (const entry of entries) {
    killPid(entry.pid);
    if (entry.port) killPort(entry.port);
  }
  writeRegistry({});
  return entries.length;
}

// Map<projectId, RunningProject>
// RunningProject = { status, port, child, logs, error, startedAt }
const runningProjects = new Map();

function appendLog(state, chunk) {
  const lines = chunk.toString().split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    state.logs.push(line);
    if (state.logs.length > LOG_LIMIT) state.logs.shift();
  }
}

export function getState(projectId) {
  const state = runningProjects.get(projectId);
  if (!state) return { status: "parado", port: null, logs: [], error: null };
  return {
    status: state.status,
    port: state.port,
    logs: state.logs.slice(-50),
    error: state.error,
  };
}

function isAlive(state) {
  return state?.child && state.child.exitCode === null && !state.child.killed;
}

// "Esta rodando e respondendo?" -- olha o processo E a porta. No Windows o
// processo intermediario (cmd.exe) pode sair enquanto o servidor real segue
// escutando, entao o handle do processo sozinho nao eh confiavel.
async function isServing(state) {
  if (state?.status !== "rodando") return false;
  if (isAlive(state)) return true;
  return !!state.port && (await pingHttp(state.port));
}

function releaseStale(projectId) {
  const entry = readRegistry()[projectId];
  if (!entry) return;
  killPid(entry.pid);
  if (entry.port) killPort(entry.port);
  unregisterPid(projectId);
}

// Projetos sem dependencias (ex: servidor em Node puro) nunca criam
// node_modules -- sem essa checagem rodavam "npm install" a cada inicio.
function needsInstall(projectPath) {
  if (fs.existsSync(path.join(projectPath, "node_modules"))) return false;
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, "package.json"), "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return Object.keys(deps).length > 0;
  } catch {
    return true;
  }
}

async function runInstall(project, state) {
  state.status = "instalando";
  await new Promise((resolve, reject) => {
    const install = spawn("npm", ["install"], {
      cwd: project.path,
      shell: true,
      windowsHide: true,
      detached: !IS_WINDOWS,
    });
    install.stdout.on("data", (d) => appendLog(state, d));
    install.stderr.on("data", (d) => appendLog(state, d));
    install.on("error", reject);
    install.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`npm install falhou (codigo ${code})`));
    });
  });
}

// Inicios em andamento, por projeto. A interface e o proxy podem pedir para
// iniciar o mesmo projeto ao mesmo tempo; sem isso cada pedido subia um
// servidor proprio e o primeiro virava um orfao ocupando a porta.
const pendingStarts = new Map();

export function startProject(project) {
  const pending = pendingStarts.get(project.id);
  if (pending) return pending;
  const promise = doStartProject(project).finally(() => pendingStarts.delete(project.id));
  pendingStarts.set(project.id, promise);
  return promise;
}

async function doStartProject(project) {
  let state = runningProjects.get(project.id);

  if (await isServing(state)) {
    return getState(project.id);
  }

  if (!project.devCommand) {
    state = { status: "erro", port: null, logs: [], error: "Nenhum comando de execucao encontrado (defina devCommand em workspace.config.json ou um script 'dev'/'start' no package.json)." };
    runningProjects.set(project.id, state);
    return getState(project.id);
  }

  // Rede de seguranca: se o registro ainda aponta um servidor deste projeto
  // (acompanhamento perdido por qualquer motivo), encerra antes de subir outro.
  // O registro so contem processos iniciados por este workspace.
  releaseStale(project.id);

  state = { status: "iniciando", port: null, logs: [], error: null, child: null, startedAt: Date.now() };
  runningProjects.set(project.id, state);
  let detectedPort = project.port || null;

  try {
    if (needsInstall(project.path)) {
      await runInstall(project, state);
    }

    if (project.port) {
      const free = await isPortFree(project.port);
      if (!free) {
        state.status = "erro";
        state.error = `A porta ${project.port} configurada para este projeto ja esta em uso por outro processo.`;
        return getState(project.id);
      }
    }

    state.status = "iniciando";
    const child = spawn(project.devCommand, {
      cwd: project.path,
      shell: true,
      windowsHide: true,
      detached: !IS_WINDOWS,
      env: { ...process.env, BROWSER: "none", PORT: project.port ? String(project.port) : process.env.PORT },
    });
    state.child = child;
    registerPid(project.id, child.pid);

    child.stdout.on("data", (d) => {
      appendLog(state, d);
      if (!detectedPort) {
        const found = extractPortFromLog(d.toString());
        if (found) detectedPort = found;
      }
    });
    child.stderr.on("data", (d) => {
      appendLog(state, d);
      if (!detectedPort) {
        const found = extractPortFromLog(d.toString());
        if (found) detectedPort = found;
      }
    });
    child.on("exit", async (code) => {
      // Evento de um processo antigo (ja parado ou substituido por um novo
      // inicio): nao pode mexer no registro do processo atual.
      if (runningProjects.get(project.id) !== state) return;
      // Intermediario saiu mas o servidor continua na porta: segue "rodando";
      // parar vai encerrar pela porta (ver stopProject).
      if (state.status === "rodando" && state.port && (await pingHttp(state.port))) {
        state.child = null;
        return;
      }
      unregisterPid(project.id);
      if (state.status !== "erro") {
        state.status = code === 0 ? "parado" : "erro";
        if (code !== 0) state.error = `Processo encerrou inesperadamente (codigo ${code}). Veja os logs.`;
      }
    });
    child.on("error", (err) => {
      state.status = "erro";
      state.error = err.message;
    });

    const deadline = Date.now() + READY_TIMEOUT_MS;
    while (Date.now() < deadline) {
      if (state.status === "erro") return getState(project.id);
      if (detectedPort) {
        const ok = await pingHttp(detectedPort);
        if (ok) {
          state.port = detectedPort;
          state.status = "rodando";
          registerPort(project.id, detectedPort);
          return getState(project.id);
        }
      }
      await new Promise((r) => setTimeout(r, 500));
    }

    killProcessTree(state.child, detectedPort);
    unregisterPid(project.id);
    state.status = "erro";
    state.error = "Tempo limite esperando o servidor do projeto ficar disponivel. Veja os logs.";
    return getState(project.id);
  } catch (err) {
    if (state.child) killProcessTree(state.child, detectedPort);
    unregisterPid(project.id);
    state.status = "erro";
    state.error = err.message;
    return getState(project.id);
  }
}

// Parar sempre libera a porta conhecida do projeto -- mesmo que o handle do
// processo ja tenha se perdido. Porta vem da memoria ou do registro em disco
// (que so guarda portas de servidores iniciados por este workspace).
export function stopProject(projectId) {
  const state = runningProjects.get(projectId);
  const registered = readRegistry()[projectId];
  if (state?.child && isAlive(state)) killPid(state.child.pid);
  for (const port of new Set([state?.port, registered?.port].filter(Boolean))) {
    killPort(port);
  }
  unregisterPid(projectId);
  runningProjects.delete(projectId);
  return { status: "parado", port: null, logs: [], error: null };
}

export function stopAll() {
  for (const [id, state] of runningProjects) {
    killProcessTree(isAlive(state) ? state.child : null, state.port);
    unregisterPid(id);
  }
  runningProjects.clear();
}
