import type { RoleCode } from '@/types/common'

export type BusinessType = 'first_check' | 'periodic' | 'change'

export type WorkflowTaskStatus = 'PENDING' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | string

export interface WorkflowTask {
  id: number
  processInstanceId?: number
  businessType: string
  businessId: number
  nodeCode: string
  nodeName?: string
  assigneeId?: string
  assigneeName?: string
  taskStatus?: WorkflowTaskStatus
  taskStatusName?: string
  dueTime?: string
  receivedAt?: string
  completedAt?: string
  action?: string
  opinion?: string
  createdAt?: string
  updatedAt?: string
}

export interface WorkflowProcess {
  id?: number
  processNo?: string
  businessType?: string
  businessId?: number
  processName?: string
  currentNodeCode?: string
  currentNodeName?: string
  starterId?: string
  starterName?: string
  startedAt?: string
  endedAt?: string
  status?: string
  statusName?: string
  remark?: string
}

export interface WorkflowNode {
  code: string
  name: string
  module: 'firstcheck' | 'periodic' | 'change'
  roles: RoleCode[]
  api?: string
}
