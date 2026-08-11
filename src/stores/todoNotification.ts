import { ref } from 'vue'
import { defineStore } from 'pinia'
import { notification } from 'ant-design-vue'
import {
  getTodoNotificationUnreadCount,
  listTodoNotifications,
  markAllTodoNotificationsRead,
  markTodoNotificationRead
} from '@/api/todoNotification'
import { connectTodoNotificationStream } from '@/api/todoNotificationStream'
import type { TodoNotification } from '@/types/todoNotification'
import type { WorkflowEntityId } from '@/types/workflow'
import {
  findNewPromptNotifications,
  notificationIdentityKey
} from '@/stores/todoNotificationModel'

/** 待办消息仓库的可替换外部依赖，用于隔离网络流和行为测试。 */
export interface TodoNotificationStoreDependencies {
  listNotifications: typeof listTodoNotifications
  getUnreadCount: typeof getTodoNotificationUnreadCount
  markAllRead: typeof markAllTodoNotificationsRead
  markRead: typeof markTodoNotificationRead
  connectStream: typeof connectTodoNotificationStream
  openNotification: typeof notification.open
}

const defaultDependencies: TodoNotificationStoreDependencies = {
  listNotifications: listTodoNotifications,
  getUnreadCount: getTodoNotificationUnreadCount,
  markAllRead: markAllTodoNotificationsRead,
  markRead: markTodoNotificationRead,
  connectStream: connectTodoNotificationStream,
  openNotification: notification.open
}

const promptedStoragePrefix = 'ms.todo-notification.prompted:'

function readPromptedIds(identity: string): WorkflowEntityId[] {
  if (typeof sessionStorage === 'undefined' || !identity) return []
  const raw = sessionStorage.getItem(`${promptedStoragePrefix}${identity}`)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    sessionStorage.removeItem(`${promptedStoragePrefix}${identity}`)
    return []
  }
}

function writePromptedIds(identity: string, eventIds: readonly WorkflowEntityId[]) {
  if (typeof sessionStorage === 'undefined' || !identity) return
  sessionStorage.setItem(`${promptedStoragePrefix}${identity}`, JSON.stringify(eventIds.slice(-200)))
}

/** 创建带身份和连接代次隔离的待办消息仓库。 */
export function createTodoNotificationStore(
  dependencies: TodoNotificationStoreDependencies = defaultDependencies,
  storeId = 'todoNotification'
) {
  return defineStore(storeId, () => {
  const items = ref<TodoNotification[]>([])
  const unreadCount = ref(0)
  const loading = ref(false)
  const connected = ref(false)
  const error = ref<unknown>()
  const invalidationVersion = ref(0)
  const activeIdentity = ref('')

  let promptedIds: WorkflowEntityId[] = []
  let stopStream: (() => void) | undefined
  let activationGeneration = 0

  async function refresh() {
    const generation = activationGeneration
    if (!activeIdentity.value) return []
    loading.value = true
    error.value = undefined
    try {
      const [page, count] = await Promise.all([
        dependencies.listNotifications({ includeRead: true, current: 1, size: 20 }),
        dependencies.getUnreadCount()
      ])
      if (generation !== activationGeneration) return []
      items.value = page.records
      unreadCount.value = count
      return page.records
    } catch (cause) {
      if (generation === activationGeneration) error.value = cause
      return []
    } finally {
      if (generation === activationGeneration) loading.value = false
    }
  }

  async function handleInvalidation(
    identity: string,
    streamGeneration: number,
    eventIds: readonly WorkflowEntityId[]
  ) {
    if (
      !identity
      || identity !== activeIdentity.value
      || streamGeneration !== activationGeneration
    ) return
    const visibleItems = await refresh()
    if (identity !== activeIdentity.value || streamGeneration !== activationGeneration) return
    invalidationVersion.value += 1

    const promptResult = findNewPromptNotifications(visibleItems, eventIds, promptedIds)
    promptedIds = promptResult.promptedIds
    writePromptedIds(identity, promptedIds)
    promptResult.notifications.forEach((item) => {
      dependencies.openNotification({
        key: `todo-notification-${identity}-${String(item.id)}`,
        message: item.title || '收到新的待办任务',
        description: item.content || `新增 ${item.itemCount || 1} 条待办`,
        duration: 6,
        placement: 'topRight'
      })
    })
  }

  function deactivate() {
    activationGeneration += 1
    stopStream?.()
    stopStream = undefined
    activeIdentity.value = ''
    promptedIds = []
    items.value = []
    unreadCount.value = 0
    loading.value = false
    connected.value = false
    error.value = undefined
  }

  function activate(userId?: string, roleCode?: string) {
    const identity = notificationIdentityKey(userId, roleCode)
    if (!identity) {
      deactivate()
      return
    }
    if (identity === activeIdentity.value && stopStream) return

    deactivate()
    activeIdentity.value = identity
    promptedIds = readPromptedIds(identity)
    const streamGeneration = activationGeneration
    const isCurrentStream = () => (
      activeIdentity.value === identity && activationGeneration === streamGeneration
    )
    void refresh()
    stopStream = dependencies.connectStream({
      onConnected: (value) => {
        if (isCurrentStream()) connected.value = value
      },
      onCalibration: async () => {
        if (!isCurrentStream()) return
        await refresh()
      },
      onInvalidated: (event) => {
        if (!isCurrentStream()) return
        return handleInvalidation(identity, streamGeneration, event.eventIds)
      },
      onError: (cause) => {
        if (isCurrentStream()) error.value = cause
      }
    })
  }

  async function markRead(eventId: WorkflowEntityId) {
    await dependencies.markRead(eventId)
    const item = items.value.find((candidate) => String(candidate.id) === String(eventId))
    if (item && !item.read) {
      item.read = true
      item.readAt = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllRead() {
    await dependencies.markAllRead()
    const readAt = new Date().toISOString()
    items.value = items.value.map((item) => ({ ...item, read: true, readAt }))
    unreadCount.value = 0
  }

  return {
    items,
    unreadCount,
    loading,
    connected,
    error,
    invalidationVersion,
    activeIdentity,
    activate,
    deactivate,
    refresh,
    markRead,
    markAllRead
  }
})
}

export const useTodoNotificationStore = createTodoNotificationStore()
