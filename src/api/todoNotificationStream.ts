import { buildAuthHeaders, getApiBaseUrl } from '@/api/request'
import type { TodoNotificationInvalidation } from '@/types/todoNotification'

export const TODO_NOTIFICATION_RETRY_DELAYS = [1000, 2000, 4000, 8000, 15000]

export interface TodoNotificationStreamHandlers {
  onConnected?: (connected: boolean) => void
  onCalibration?: () => void | Promise<void>
  onInvalidated?: (event: TodoNotificationInvalidation) => void | Promise<void>
  onError?: (error: unknown) => void
}

interface ParsedSseEvent {
  event: string
  data: string
}

export function parseTodoNotificationSseBlock(block: string): ParsedSseEvent | undefined {
  let event = 'message'
  const data: string[] = []
  block.split('\n').forEach((line) => {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  })
  return data.length > 0 || event !== 'message' ? { event, data: data.join('\n') } : undefined
}

function parseInvalidation(data: string): TodoNotificationInvalidation {
  if (!data) return { eventIds: [] }
  const payload = JSON.parse(data) as Partial<TodoNotificationInvalidation>
  return { eventIds: Array.isArray(payload.eventIds) ? payload.eventIds : [] }
}

function waitForReconnect(delay: number, isClosed: () => boolean) {
  return new Promise<void>((resolve) => {
    if (isClosed()) {
      resolve()
      return
    }
    window.setTimeout(resolve, delay)
  })
}

export function connectTodoNotificationStream(handlers: TodoNotificationStreamHandlers = {}) {
  let closed = false
  let activeController: AbortController | undefined

  async function consume(response: Response) {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('待办消息流未返回可读响应体')
    const decoder = new TextDecoder()
    let buffer = ''
    while (!closed) {
      const chunk = await reader.read()
      if (chunk.done) break
      buffer += decoder.decode(chunk.value, { stream: true }).replace(/\r\n/g, '\n')
      let boundary = buffer.indexOf('\n\n')
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary)
        buffer = buffer.slice(boundary + 2)
        const event = parseTodoNotificationSseBlock(block)
        if (event?.event === 'connected') handlers.onConnected?.(true)
        if (event?.event === 'heartbeat') handlers.onConnected?.(true)
        if (event?.event === 'todo-invalidated') {
          await handlers.onInvalidated?.(parseInvalidation(event.data))
        }
        boundary = buffer.indexOf('\n\n')
      }
    }
  }

  async function run() {
    let retryIndex = 0
    while (!closed) {
      activeController = new AbortController()
      try {
        const headers = buildAuthHeaders({ method: 'GET' })
        if (!headers.Authorization && !headers['X-User-Role']) {
          throw new Error('待办消息流缺少 Authorization 或 X-User-Role 认证上下文')
        }
        const response = await fetch(`${getApiBaseUrl()}/workflow/notifications/stream`, {
          method: 'GET',
          headers,
          signal: activeController.signal
        })
        if (!response.ok) throw new Error(`待办消息流连接失败：HTTP ${response.status}`)
        retryIndex = 0
        handlers.onConnected?.(true)
        await handlers.onCalibration?.()
        await consume(response)
        if (!closed) throw new Error('待办消息流连接已断开')
      } catch (error) {
        if (closed || activeController.signal.aborted) break
        handlers.onConnected?.(false)
        handlers.onError?.(error)
        const delay = TODO_NOTIFICATION_RETRY_DELAYS[Math.min(retryIndex, TODO_NOTIFICATION_RETRY_DELAYS.length - 1)]
        retryIndex += 1
        await waitForReconnect(delay, () => closed)
      }
    }
  }

  void run()
  return () => {
    closed = true
    activeController?.abort()
    handlers.onConnected?.(false)
  }
}
