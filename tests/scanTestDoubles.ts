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

export async function listPeriodicMyTasks() {
  return periodicTasks
}

export async function listPeriodicMyHistory() {
  return periodicHistory
}

export async function verifierReceivePeriodic() {}
export async function externalSendOutPeriodic() {}
export async function sendOutReturnPeriodic() {}
