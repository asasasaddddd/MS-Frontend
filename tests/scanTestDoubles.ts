import type { AxiosRequestConfig } from 'axios'

type RequestHandler = (config: AxiosRequestConfig) => unknown | Promise<unknown>

export const scanRequestCalls: AxiosRequestConfig[] = []
export const workflowQueryCalls: Array<{
  query: { view: string; businessType?: string; current?: number; size?: number }
  signal?: AbortSignal
}> = []

let requestHandler: RequestHandler = () => []

export function resetScanTestDoubles() {
  scanRequestCalls.length = 0
  workflowQueryCalls.length = 0
  requestHandler = () => []
}

export function setScanRequestHandler(handler: RequestHandler) {
  requestHandler = handler
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  scanRequestCalls.push(config)
  return requestHandler(config) as Promise<T>
}

export async function queryWorkflowTasks(
  query: { view: string; businessType?: string; current?: number; size?: number },
  signal?: AbortSignal
) {
  workflowQueryCalls.push({ query, ...(signal ? { signal } : {}) })
  return {
    records: [{
      taskId: 'wf-1',
      processInstanceId: 'wf-1',
      businessType: query.businessType || 'PERIODIC',
      businessId: '200',
      nodeCode: 'self_verify',
      operationCode: 'SUBMIT',
      requiredRoleCode: 'VERIFIER_SELF',
      permissionCode: 'periodic.self_verify.submit',
      taskStatus: 'pending',
      rowVersion: 0,
      allowedActions: ['SUBMIT']
    }],
    total: 1,
    current: 1,
    size: 200
  }
}

export async function getPeriodicTask() {
  return {
    id: '200',
    planId: '100',
    taskNo: 'ZJ-202607-0001-00001',
    currentNode: 'self_verify',
    allowedActions: ['SUBMIT']
  }
}

export async function verifierReceivePeriodic() {}
export async function externalSendOutPeriodic() {}
export async function sendOutReturnPeriodic() {}
