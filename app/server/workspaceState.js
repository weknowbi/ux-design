import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(SERVER_DIR, "data");
const STATE_PATH = path.join(DATA_DIR, "workspace-state.json");

// Estado de organizacao do workspace (nao pertence a nenhum projeto):
//   folders:     [{ id, name, createdAt }]  -- ordem = ordem na sidebar
//   assignments: { projectId: folderId }     -- um projeto pertence a no maximo uma pasta
//   lastOpened:  { projectId: ISO string }   -- alimenta "Recentes"
//
// Fica num JSON local (mesma pasta do registro de PIDs) de proposito: eh
// organizacao pessoal do workspace, nao metadata do projeto -- mover um projeto
// de pasta nao deveria gerar alteracao dentro do repositorio dele. Se um dia
// virar workspace compartilhado, basta trocar este modulo por um banco.
function emptyState() {
  return { folders: [], assignments: {}, lastOpened: {} };
}

export function readState() {
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_PATH, "utf-8"));
    return {
      folders: Array.isArray(raw.folders) ? raw.folders : [],
      assignments: raw.assignments && typeof raw.assignments === "object" ? raw.assignments : {},
      lastOpened: raw.lastOpened && typeof raw.lastOpened === "object" ? raw.lastOpened : {},
    };
  } catch {
    return emptyState();
  }
}

function writeState(state) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = STATE_PATH + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_PATH);
}

function normalizeName(name) {
  return String(name ?? "").trim().slice(0, 60);
}

export function listFolders() {
  return readState().folders;
}

export function createFolder(name) {
  const clean = normalizeName(name);
  if (!clean) throw new Error("Nome da pasta obrigatorio.");
  const state = readState();
  const folder = { id: crypto.randomUUID().slice(0, 8), name: clean, createdAt: new Date().toISOString() };
  state.folders.push(folder);
  writeState(state);
  return folder;
}

export function renameFolder(id, name) {
  const clean = normalizeName(name);
  if (!clean) throw new Error("Nome da pasta obrigatorio.");
  const state = readState();
  const folder = state.folders.find((f) => f.id === id);
  if (!folder) return null;
  folder.name = clean;
  writeState(state);
  return folder;
}

// Excluir uma pasta nunca exclui projetos: eles apenas voltam a ficar sem pasta.
export function deleteFolder(id) {
  const state = readState();
  const before = state.folders.length;
  state.folders = state.folders.filter((f) => f.id !== id);
  if (state.folders.length === before) return false;
  for (const [projectId, folderId] of Object.entries(state.assignments)) {
    if (folderId === id) delete state.assignments[projectId];
  }
  writeState(state);
  return true;
}

export function assignFolder(projectId, folderId) {
  const state = readState();
  if (folderId && !state.folders.some((f) => f.id === folderId)) {
    throw new Error("Pasta nao encontrada.");
  }
  if (folderId) state.assignments[projectId] = folderId;
  else delete state.assignments[projectId];
  writeState(state);
}

export function markOpened(projectId) {
  const state = readState();
  state.lastOpened[projectId] = new Date().toISOString();
  writeState(state);
}

// Anexa os campos de organizacao a um projeto descoberto.
export function withWorkspaceFields(project, state) {
  const folderId = state.assignments[project.id];
  const folderExists = folderId && state.folders.some((f) => f.id === folderId);
  return {
    ...project,
    folderId: folderExists ? folderId : null,
    lastOpened: state.lastOpened[project.id] || null,
  };
}
