import { request } from '@/api/request'
import type {
  TodoNotificationPage,
  TodoNotificationPageQuery
} from '@/types/todoNotification'
import type { WorkflowEntityId } from '@/types/workflow'

const notificationEndpoint = '/workflow/notifications'

export function listTodoNotifications(query: TodoNotificationPageQuery = {}) {
  return request<TodoNotificationPage>({
    url: notificationEndpoint,
    method: 'GET',
    params: {
      includeRead: query.includeRead ?? true,
      current: query.current ?? 1,
      size: query.size ?? 20
    }
  })
}

export function getTodoNotificationUnreadCount() {
  return request<number>({
    url: `${notificationEndpoint}/unread-count`,
    method: 'GET'
  })
}

export function markTodoNotificationRead(eventId: WorkflowEntityId) {
  return request<void>({
    url: `${notificationEndpoint}/${encodeURIComponent(String(eventId))}/read`,
    method: 'POST'
  })
}

export function markAllTodoNotificationsRead() {
  return request<void>({
    url: `${notificationEndpoint}/read-all`,
    method: 'POST'
  })
}
