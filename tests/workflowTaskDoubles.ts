import type { AxiosRequestConfig } from 'axios'

type RequestHandler = (config: AxiosRequestConfig) => unknown | Promise<unknown>

export const workflowRequestCalls: AxiosRequestConfig[] = []

let requestHandler: RequestHandler = () => ({ records: [], total: 0, current: 1, size: 20 })

export function resetWorkflowRequestDouble() {
  workflowRequestCalls.length = 0
  requestHandler = () => ({ records: [], total: 0, current: 1, size: 20 })
}

export function setWorkflowRequestHandler(handler: RequestHandler) {
  requestHandler = handler
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  workflowRequestCalls.push(config)
  return requestHandler(config) as Promise<T>
}

export function buildAuthHeaders() {
  return { 'X-User-Role': 'TEST_ROLE' }
}

export function getApiBaseUrl() {
  return '/api'
}
