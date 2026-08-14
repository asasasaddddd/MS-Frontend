import type { EntityId, PageResult, RoleCode, RowVersion } from '@/types/common'

/** 工作流雪花主键在前端保持字符串兼容，禁止强制转换为 Number。 */
export type WorkflowEntityId = EntityId

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

/** 当前激活角色待办汇总的后端权威查询范围。 */
export interface WorkflowTodoSummaryQuery {
  businessType?: BusinessType
  scopeType?: 'order' | 'plan'
  scopeId?: WorkflowEntityId
}

/** 当前身份容器投影中的单个集中节点分组。 */
export interface WorkflowTodoNodeSummary {
  nodeCode: string
  nodeName: string
  myPendingItemCount: number
  myPendingActionCount: number
}

/** 当前身份的权威容器、设备条目和操作任务投影。 */
export interface WorkflowTodoContainer {
  businessType: BusinessType
  containerId: WorkflowEntityId
  containerNo: string
  totalItemCount: number
  myPendingItemCount: number
  myPendingActionCount: number
  unfinishedItemCount?: number
  currentNodeSummary: WorkflowTodoNodeSummary[]
  snapshotAt?: string
}

/** 后端统一任务查询返回的权威任务结构。 */
export interface WorkflowTask {
  taskId: WorkflowEntityId
  processInstanceId: WorkflowEntityId
  businessType: BusinessType
  businessId: WorkflowEntityId
  businessItemId: WorkflowEntityId
  nodeCode: string
  nodeName?: string
  operationCode: string
  requiredRoleCode: RoleCode | string
  permissionCode: string
  scopeType?: string
  scopeOrgId?: string
  audienceMode?: string
  taskStatus: WorkflowTaskStatus
  rowVersion: RowVersion
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
  id: WorkflowEntityId
  taskId?: WorkflowEntityId
  businessItemId?: WorkflowEntityId
  eventKind?: string
  eventKindName?: string
  nodeCode?: string
  nodeName?: string
  actionCode?: string
  actionName?: string
  nextNodeCode?: string
  nextNodeName?: string
  operatorId?: string
  operatorName?: string
  opinion?: string
  resultCode?: string
  resultName?: string
  snapshotJson?: string
  operatedAt?: string
}

export interface WorkflowNode {
  code: string
  name: string
  /** 状态汇总使用的节点文案；未配置时回退到 name。 */
  summaryLabel?: string
  module: 'firstcheck' | 'periodic' | 'change' | 'sampling' | 'productSupport'
  roles: RoleCode[]
  api?: string
}
