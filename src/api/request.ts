import axios, { type AxiosRequestConfig } from 'axios'
import { useSessionStore } from '@/stores/session'
import type { ApiResponse } from '@/types/common'
import { getClientRuntime } from '@/platform/pdaClient'

export class ApiError extends Error {
  code: number

  constructor(code: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 20000
})

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return typeof value === 'object' && value !== null && 'code' in value && 'message' in value
}

function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.code === 200) {
    return response.data
  }
  throw new ApiError(response.code, response.message || '请求失败')
}

function clearSessionOnUnauthorized(code?: number, status?: number) {
  if (code !== 401 && status !== 401) return
  const session = useSessionStore()
  session.clear()
  const loginPath = `${import.meta.env.BASE_URL}login`
  if (window.location.pathname !== loginPath) {
    window.location.assign(loginPath)
  }
}

export function buildAuthHeaders(config: AxiosRequestConfig): Record<string, string> {
  const session = useSessionStore()
  const user = session.user
  const client = getClientRuntime()
  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData
  const headers: Record<string, string> = {}

  if (!isFormData) {
    headers['Content-Type'] = 'application/json'
  }

  if (session.token) {
    headers.Authorization = `Bearer ${session.token}`
  }

  if (user) {
    headers['X-User-Id'] = user.employeeId
    headers['X-User-Name'] = encodeURIComponent(user.employeeName)
    headers['X-User-Role'] = user.roleCode
    headers['X-User-Dept-Id'] = user.deptId || ''
    headers['X-User-Dept-Name'] = encodeURIComponent(user.deptName || '')
  }

  headers['X-Client-Type'] = client.clientType
  headers['X-Terminal-Code'] = client.terminalCode
  if (client.appVersion) {
    headers['X-Client-Version'] = client.appVersion
  }

  return headers
}

export function getApiBaseUrl() {
  return String(httpClient.defaults.baseURL || '/api').replace(/\/$/, '')
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const headers = buildAuthHeaders(config)

  try {
    const response = await httpClient.request<ApiResponse<T>>({
      ...config,
      headers: {
        ...headers,
        ...(config.headers || {})
      }
    })
    return unwrapResponse(response.data)
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      const payload = error.response?.data
      if (isApiResponse(payload)) {
        clearSessionOnUnauthorized(payload.code, status)
        throw new ApiError(payload.code, payload.message || '请求失败')
      }
      clearSessionOnUnauthorized(undefined, status)
      throw new ApiError(status || 0, error.message || '网络请求失败')
    }
    throw error
  }
}

export async function requestBlob(config: AxiosRequestConfig): Promise<Blob> {
  const headers = buildAuthHeaders(config)

  try {
    const response = await httpClient.request<Blob>({
      ...config,
      responseType: 'blob',
      headers: {
        ...headers,
        ...(config.headers || {})
      }
    })
    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      clearSessionOnUnauthorized(undefined, status)
      throw new ApiError(status || 0, error.message || '文件下载失败')
    }
    throw error
  }
}
