import { CURRENT_USER } from '@/data/account'
import { TASKS, type Task } from '@/data/portal'

/**
 * Os alertas criados pelo Weknow IA. Viram tarefas, na lista de Tarefas do
 * portal, logo depois das que já existem: no Weknow, alerta e envio agendado
 * são o mesmo tipo de coisa, uma rotina que roda depois de cada execução.
 *
 * Ficam no navegador, como as conversas.
 */

const KEY = 'wk-alert-tasks-v1'

function load(): Task[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

let created = load()

/** As tarefas do portal, com os alertas criados aqui no fim. */
export const allTasks = (): Task[] => [...TASKS, ...created]

/** Cria a tarefa do alerta e devolve o código dela ("08"). */
export function addAlertTask(name: string): string {
  const code = String(allTasks().length + 1).padStart(2, '0')
  const task: Task = { kind: 'task', id: `alerta-${Date.now().toString(36)}`, code, name, updatedAt: new Date().toISOString(), updatedBy: CURRENT_USER.name }
  created = [...created, task]
  try {
    localStorage.setItem(KEY, JSON.stringify(created))
  } catch {
    /* sem armazenamento: vale só nesta visita */
  }
  return code
}
