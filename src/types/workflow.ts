import type { PageResult, RoleCode } from '@/types/common'

/** 工作流雪花主键在前端保持字符串兼容，禁止强制转换为 Number。 */
export type WorkflowEntityId = string | number

/** 统一工作流支持的查询视图。 */
export type WorkflowTaskView = 'todo' | 'handled' | 'participated' | 'department'

export type BusinessType = 'FIRST_CHECK' | 'PERIODIC' | 'CHANGE' | 'SAMPLING' | 'PRODUCT_SUPPORT' | string

export type WorkflowTaskStatus = 'pending' | 'completed' | 'rejected' | 'cancelled' | string

/** 统一工作流任务查询参数。 */
export interface WorkflowTaskQuery {
  view: WorkflowTaskView
  current?: number
  size?: number
  businessType?: BusinessType
}

/** 后端统一任务查询返回的权威任务结构。 */
export interface WorkflowTask {
  taskId: WorkflowEntityId
  processInstanceId: WorkflowEntityId
  businessType: BusinessType
  businessId: WorkflowEntityId
  nodeCode: string
  nodeName?: string
  operationCode: string
  requiredRoleCode: RoleCode | string
  permissionCode: string
  scopeType?: string
  scopeOrgId?: string
  audienceMode?: string
  taskStatus: WorkflowTaskStatus
  rowVersion: number
  handlerId?: string
  handlerName?: string
  handlerRoleCode?: RoleCode | string
  handlerOrgId?: string
  matchedGrantId?: WorkflowEntityId
  outcomeCode?: string
  opinion?: string
  createdAt?: string
  completedAt?: string
  processStatus?: string
  currentNodeCode?: string
  currentNodeName?: string
  allowedActions: string[]
}

/** 统一任务分页响应。 */
export type WorkflowTaskPage = PageResult<WorkflowTask>

export interface WorkflowProcess {
  id?: WorkflowEntityId
  processNo?: string
  businessType?: string
  businessId?: WorkflowEntityId
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

export interface WorkflowTimelineEntry {
  taskId?: WorkflowEntityId
  sourceNodeCode?: string
  targetNodeCode?: string
  operationCode?: string
  outcomeCode?: string
  handlerId?: string
  handlerName?: string
  handlerRoleCode?: string
  opinion?: string
  occurredAt?: string
}

export interface WorkflowNode {
  code: string
  name: string
  module: 'firstcheck' | 'periodic' | 'change'
  roles: RoleCode[]
  api?: string
}
