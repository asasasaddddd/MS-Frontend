import type { TodoNotification } from '@/types/todoNotification'
import type { WorkflowEntityId } from '@/types/workflow'

export interface TodoNotificationRoute {
  path: string
  query?: Record<string, string>
}

export interface NotificationRouteSource {
  businessType: string
  scopeType?: string
  scopeId?: WorkflowEntityId
}

export function notificationIdentityKey(userId?: string, roleCode?: string) {
  const normalizedUserId = userId?.trim()
  const normalizedRoleCode = roleCode?.trim().toUpperCase()
  return normalizedUserId && normalizedRoleCode ? `${normalizedUserId}|${normalizedRoleCode}` : ''
}

export function mergePromptedEventIds(
  promptedIds: readonly WorkflowEntityId[],
  incomingIds: readonly WorkflowEntityId[]
) {
  const merged = [...promptedIds]
  const seen = new Set(promptedIds.map(String))
  const newEventIds: WorkflowEntityId[] = []
  incomingIds.forEach((eventId) => {
    const key = String(eventId)
    if (!key || seen.has(key)) return
    seen.add(key)
    merged.push(eventId)
    newEventIds.push(eventId)
  })
  return { promptedIds: merged, newEventIds }
}

export function resetNotificationState<T extends { items: unknown[]; unreadCount: number; connected: boolean }>(state: T) {
  return { ...state, items: [], unreadCount: 0, connected: false }
}

const routeByBusinessAndRole: Record<string, Record<string, string>> = {
  FIRST_CHECK: {
    MEASURE_ADMIN: '/firstcheck/admin',
    DEPT_LEADER: '/firstcheck/leader',
    RESPONSIBLE_ENGINEER: '/firstcheck/engineer',
    VERIFIER_SELF: '/firstcheck/verifier',
    VERIFIER_EXTERNAL: '/firstcheck/verifier'
  },
  PERIODIC: {
    MEASURE_ADMIN: '/periodic/admin',
    VERIFIER_SELF: '/periodic/verifier',
    VERIFIER_EXTERNAL: '/periodic/verifier-external',
    RESPONSIBLE_ENGINEER: '/periodic/responsible-engineer',
    EXTERNAL_OPERATOR: '/periodic/external-operator',
    CONFIRMER: '/periodic/confirmer'
  },
  CHANGE: {
    MEASURE_ADMIN: '/change/admin-task',
    DEPT_LEADER: '/change/approval',
    MEASURE_LEADER: '/change/approval',
    RESPONSIBLE_ENGINEER: '/change/approval',
    VERIFIER_SELF: '/change/verifier',
    VERIFIER_EXTERNAL: '/change/verifier'
  },
  SAMPLING: {
    PLANNER: '/sampling/plan',
    MEASURE_ADMIN: '/sampling/admin',
    VERIFIER_SELF: '/sampling/verifier',
    CONFIRMER: '/sampling/confirmer'
  },
  PRODUCT_SUPPORT: {
    PURCHASE_WAREHOUSE: '/product-support/warehouse',
    VERIFIER_SELF: '/product-support/verifier',
    VERIFIER_EXTERNAL: '/product-support/verifier'
  }
}

const todoTypeByBusiness: Record<string, string> = {
  FIRST_CHECK: 'firstcheck',
  PERIODIC: 'periodic',
  CHANGE: 'change',
  SAMPLING: 'sampling',
  PRODUCT_SUPPORT: 'productSupport'
}

export function todoNotificationRoute(
  notification: NotificationRouteSource,
  roleCode?: string
): TodoNotificationRoute {
  const businessType = notification.businessType.trim().toUpperCase()
  const normalizedRole = roleCode?.trim().toUpperCase() || ''
  const scopeId = notification.scopeId === undefined || notification.scopeId === null
    ? ''
    : String(notification.scopeId)
  if (businessType === 'FIRST_CHECK' && normalizedRole === 'EXTERNAL_OPERATOR') {
    return {
      path: '/scan',
      query: {
        module: 'firstcheck',
        action: 'sendout',
        ...(scopeId ? { orderId: scopeId } : {})
      }
    }
  }
  const path = routeByBusinessAndRole[businessType]?.[normalizedRole]
  if (!path) {
    return {
      path: '/todo',
      query: todoTypeByBusiness[businessType] ? { type: todoTypeByBusiness[businessType] } : undefined
    }
  }

  if (!scopeId) return { path }
  if (notification.scopeType === 'plan') return { path, query: { planId: scopeId } }
  if (notification.scopeType === 'order') return { path, query: { orderId: scopeId } }
  return { path }
}

export function findNewPromptNotifications(
  items: readonly TodoNotification[],
  eventIds: readonly WorkflowEntityId[],
  promptedIds: readonly WorkflowEntityId[]
) {
  const merged = mergePromptedEventIds(promptedIds, eventIds)
  const newKeys = new Set(merged.newEventIds.map(String))
  return {
    promptedIds: merged.promptedIds,
    notifications: items.filter((item) => !item.read && newKeys.has(String(item.id)))
  }
}
