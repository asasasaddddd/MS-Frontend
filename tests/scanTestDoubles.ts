import type { AxiosRequestConfig } from 'axios'
import type { PeriodicTaskVO } from '../src/types/periodic.ts'

type RequestHandler = (config: AxiosRequestConfig) => unknown | Promise<unknown>

export const scanRequestCalls: AxiosRequestConfig[] = []

let requestHandler: RequestHandler = () => []
let periodicTasks: PeriodicTaskVO[] = []
let periodicHistory: PeriodicTaskVO[] = []

export function resetScanTestDoubles() {
  scanRequestCalls.length = 0
  requestHandler = () => []
  periodicTasks = []
  periodicHistory = []
}

export function setScanRequestHandler(handler: RequestHandler) {
  requestHandler = handler
}

export function setPeriodicTasks(tasks: PeriodicTaskVO[]) {
  periodicTasks = tasks
}

export function setPeriodicHistory(tasks: PeriodicTaskVO[]) {
  periodicHistory = tasks
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  scanRequestCalls.push(config)
  return requestHandler(config) as Promise<T>
}

export async function queryWorkflowTasks(query: { view: string }, _signal?: AbortSignal) {
  const records = (query.view === 'todo' ? periodicTasks : periodicHistory).map((task) => ({
    taskId: task.id,
    processInstanceId: task.planId || task.id,
    businessType: 'PERIODIC',
    businessId: task.id,
    nodeCode: task.currentNode || '',
    operationCode: 'SUBMIT',
    requiredRoleCode: 'VERIFIER_EXTERNAL',
    permissionCode: 'periodic.test.submit',
    taskStatus: 'pending',
    rowVersion: 0,
    allowedActions: task.allowedActions || []
  }))
  return { records, total: records.length, current: 1, size: 200 }
}

export async function getPeriodicTask(taskId: string | number) {
  const task = [...periodicTasks, ...periodicHistory].find((item) => String(item.id) === String(taskId))
  if (!task) throw new Error('periodic task not found')
  return task
}

export async function verifierReceivePeriodic() {}
export async function externalSendOutPeriodic() {}
export async function sendOutReturnPeriodic() {}
