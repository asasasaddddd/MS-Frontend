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

export const useTodoNotificationStore = defineStore('todoNotification', () => {
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
        listTodoNotifications({ includeRead: true, current: 1, size: 20 }),
        getTodoNotificationUnreadCount()
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

  async function handleInvalidation(eventIds: readonly WorkflowEntityId[]) {
    const identity = activeIdentity.value
    const visibleItems = await refresh()
    if (!identity || identity !== activeIdentity.value) return
    invalidationVersion.value += 1

    const promptResult = findNewPromptNotifications(visibleItems, eventIds, promptedIds)
    promptedIds = promptResult.promptedIds
    writePromptedIds(identity, promptedIds)
    promptResult.notifications.forEach((item) => {
      notification.open({
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
    void refresh()
    stopStream = connectTodoNotificationStream({
      onConnected: (value) => {
        if (activeIdentity.value === identity) connected.value = value
      },
      onCalibration: async () => {
        await refresh()
      },
      onInvalidated: (event) => handleInvalidation(event.eventIds),
      onError: (cause) => {
        if (activeIdentity.value === identity) error.value = cause
      }
    })
  }

  async function markRead(eventId: WorkflowEntityId) {
    await markTodoNotificationRead(eventId)
    const item = items.value.find((candidate) => String(candidate.id) === String(eventId))
    if (item && !item.read) {
      item.read = true
      item.readAt = new Date().toISOString()
      unreadCount.value = Math.max(0, unreadCount.value - 1)
    }
  }

  async function markAllRead() {
    await markAllTodoNotificationsRead()
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
