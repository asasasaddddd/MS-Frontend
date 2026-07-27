import type { PageResult } from '@/types/common'
import type { BusinessType, WorkflowEntityId } from '@/types/workflow'

export interface TodoNotification {
  id: WorkflowEntityId
  businessType: BusinessType
  scopeType?: 'order' | 'plan' | string
  scopeId?: WorkflowEntityId
  nodeCode?: string
  requiredRoleCode?: string
  title: string
  content?: string
  itemCount: number
  countUnit?: string
  createdAt?: string
  read: boolean
  readAt?: string
}

export interface TodoNotificationPageQuery {
  includeRead?: boolean
  current?: number
  size?: number
}

export type TodoNotificationPage = PageResult<TodoNotification>

export interface TodoNotificationInvalidation {
  eventIds: WorkflowEntityId[]
}
