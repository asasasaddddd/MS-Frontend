import type { EntityId } from '@/types/common'

export type WorkspaceTodoType =
  | 'all'
  | 'firstcheck'
  | 'periodic'
  | 'change'
  | 'sampling'
  | 'productSupport'

export interface WorkspaceTodoCountEntry {
  type: Exclude<WorkspaceTodoType, 'all'>
  count: number
  key?: string
  alwaysVisible?: boolean
}

export interface WorkspaceLaunchAction {
  key: string
  title: string
  description: string
  path: string
}

export interface WorkspaceTodoRouteTarget {
  path: string
  query?: Record<string, string>
}

export interface BusinessTaskReference {
  businessId: EntityId
}

export interface FirstCheckPhysicalTodoReference {
  id?: string
  businessType?: string
  sourceType?: string
  businessId?: EntityId
  orderId?: EntityId
  taskId?: EntityId
  scanAction?: string
  allowedActions?: readonly string[]
  scanned?: boolean
}

export interface PhysicalTodoReference {
  id?: EntityId
  businessType?: string
  sourceType?: string
  businessId?: EntityId
  orderId?: EntityId
  taskId?: EntityId
  scanAction?: string
  allowedActions?: readonly string[]
  scanned?: boolean
}

const workflowBusinessTypeByTodoType: Record<Exclude<WorkspaceTodoType, 'all'>, string> = {
  firstcheck: 'FIRST_CHECK',
  periodic: 'PERIODIC',
  change: 'CHANGE',
  sampling: 'SAMPLING',
  productSupport: 'PRODUCT_SUPPORT'
}

export function workspaceTodoBusinessType(type: WorkspaceTodoType) {
  return type === 'all' ? undefined : workflowBusinessTypeByTodoType[type]
}

/**
 * 将路由查询参数收敛为总待办支持的业务筛选值。
 *
 * 通知无法直达角色业务页时会回退到 `/todo?type=...`；这里统一处理
 * Vue Router 的单值/数组输入，并拒绝未注册的业务类型。
 */
export function workspaceTodoTypeFromQuery(value: unknown): WorkspaceTodoType {
  const candidate = Array.isArray(value) ? value[0] : value
  if (typeof candidate !== 'string') return 'all'
  if (candidate === 'all' || Object.prototype.hasOwnProperty.call(workflowBusinessTypeByTodoType, candidate)) {
    return candidate as WorkspaceTodoType
  }
  return 'all'
}

export function sumWorkspaceTodoCounts(entries: readonly WorkspaceTodoCountEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.count, 0)
}

const changeTaskRouteByRole: Record<string, string> = {
  MEASURE_ADMIN: '/change/admin-task',
  DEPT_LEADER: '/change/approval',
  MEASURE_LEADER: '/change/approval',
  RESPONSIBLE_ENGINEER: '/change/approval',
  VERIFIER_SELF: '/change/verifier',
  VERIFIER_EXTERNAL: '/change/verifier'
}

/** 四类固定待办入口可直接进入的角色业务页。 */
const fixedTodoRouteByTypeAndRole: Readonly<
  Record<'firstcheck' | 'periodic' | 'change' | 'sampling', Readonly<Record<string, string>>>
> = {
  firstcheck: {
    SUPPLIER: '/firstcheck/supplier',
    MEASURE_ADMIN: '/firstcheck/admin',
    DEPT_LEADER: '/firstcheck/leader',
    RESPONSIBLE_ENGINEER: '/firstcheck/engineer',
    VERIFIER_SELF: '/firstcheck/verifier',
    VERIFIER_EXTERNAL: '/firstcheck/verifier',
    EXTERNAL_OPERATOR: '/scan'
  },
  periodic: {
    MEASURE_ADMIN: '/periodic/admin',
    VERIFIER_SELF: '/periodic/verifier',
    VERIFIER_EXTERNAL: '/periodic/verifier-external',
    RESPONSIBLE_ENGINEER: '/periodic/responsible-engineer',
    EXTERNAL_OPERATOR: '/periodic/external-operator',
    CONFIRMER: '/periodic/confirmer'
  },
  change: changeTaskRouteByRole,
  sampling: {
    PLANNER: '/sampling/plan',
    MEASURE_ADMIN: '/sampling/admin',
    VERIFIER_SELF: '/sampling/verifier',
    CONFIRMER: '/sampling/confirmer'
  }
}

export function getChangeTaskRoute(roleCode?: string) {
  return roleCode ? changeTaskRouteByRole[roleCode] : undefined
}

/**
 * 解析四类固定待办入口的导航目标。
 *
 * 有角色业务页时直接进入；无角色业务页时仍保留入口，并回退到总待办的
 * 业务筛选视图。回退页只展示该角色后端可见数量，不提供越权操作入口。
 */
export function getWorkspaceFixedTodoRoute(
  type: 'firstcheck' | 'periodic' | 'change' | 'sampling',
  roleCode?: string
): WorkspaceTodoRouteTarget {
  const path = getWorkspaceRoleTodoPath(type, roleCode)
  return path ? { path } : { path: '/todo', query: { type } }
}

/** 返回角色实际拥有的业务详情页；历史记录不得使用固定入口的只读回退。 */
export function getWorkspaceRoleTodoPath(
  type: 'firstcheck' | 'periodic' | 'change' | 'sampling',
  roleCode?: string
) {
  return roleCode ? fixedTodoRouteByTypeAndRole[type][roleCode] : undefined
}

/**
 * 保留详情接口确认当前角色可见的任务，防止仅凭工作流摘要展示越权入口。
 */
export function filterTasksWithLoadedDetails<T extends BusinessTaskReference, D>(
  tasks: readonly T[],
  details: Readonly<Record<string, D | null | undefined>>
) {
  return tasks.filter((task) => Boolean(details[String(task.businessId)]))
}

export function uniqueTasksByBusinessId<T extends BusinessTaskReference>(tasks: readonly T[]) {
  const taskByBusiness = new Map<string, T>()
  tasks.forEach((task) => taskByBusiness.set(String(task.businessId), task))
  return Array.from(taskByBusiness.values())
}

export function countUniqueBusinessTasks<T extends BusinessTaskReference>(tasks: readonly T[]) {
  return uniqueTasksByBusinessId(tasks).length
}

export function getPendingFirstCheckTakeBackRows<T extends FirstCheckPhysicalTodoReference>(rows: readonly T[]) {
  return rows.filter((row) =>
    String(row.businessType || '').toLowerCase() === 'firstcheck' &&
    row.scanAction === 'take-back' &&
    row.scanned !== true
  )
}

export function countFirstCheckTodoItems(
  workflowTaskCount: number,
  physicalTakeBackRows: readonly FirstCheckPhysicalTodoReference[]
) {
  return workflowTaskCount + getPendingFirstCheckTakeBackRows(physicalTakeBackRows).length
}

const physicalActionCodeByScanAction: Record<string, string> = {
  receive: 'RECEIVE',
  sendout: 'SEND_OUT',
  'sendout-return': 'SEND_OUT_RETURN',
  'take-back': 'TAKE_BACK',
  'periodic-verifier-receive': 'RECEIVE',
  'periodic-external-send-out': 'SEND_OUT',
  'periodic-send-out-return': 'SEND_OUT_RETURN',
  'periodic-manager-take-back': 'TAKE_BACK'
}

function normalizeTodoType(value?: string) {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized === 'first_check') return 'firstcheck'
  if (normalized === 'product_support') return 'productSupport'
  return normalized
}

function rowBusinessType(row: Pick<PhysicalTodoReference, 'businessType' | 'sourceType'>) {
  return normalizeTodoType(row.businessType || row.sourceType)
}

function isPendingPhysicalTodo(row: PhysicalTodoReference) {
  if (row.scanned === true) return false
  const requiredAction = physicalActionCodeByScanAction[String(row.scanAction || '')]
  if (!requiredAction) return false
  return (row.allowedActions || []).map((action) => String(action).toUpperCase()).includes(requiredAction)
}

function physicalTodoIdentity(row: PhysicalTodoReference, businessType?: WorkspaceTodoType | string) {
  const normalizedType = normalizeTodoType(businessType || rowBusinessType(row))
  if (normalizedType === 'periodic') {
    const taskId = row.taskId ?? row.businessId ?? row.id
    return taskId === undefined || taskId === null ? '' : `${normalizedType}:${taskId}`
  }
  if (normalizedType === 'firstcheck') {
    const orderId = row.orderId ?? row.businessId ?? row.id
    const lineKey = row.id ?? row.taskId ?? row.scanAction ?? ''
    return orderId === undefined || orderId === null ? '' : `${normalizedType}:${orderId}:${lineKey}`
  }
  const businessId = row.taskId ?? row.orderId ?? row.businessId ?? row.id
  return businessId === undefined || businessId === null ? '' : `${normalizedType}:${businessId}`
}

function workflowTodoIdentity(task: BusinessTaskReference, businessType?: WorkspaceTodoType | string) {
  const normalizedType = normalizeTodoType(businessType)
  return `${normalizedType}:${task.businessId}`
}

export function getPendingPhysicalTodoRows<T extends PhysicalTodoReference>(
  rows: readonly T[],
  businessType?: WorkspaceTodoType | string
) {
  const normalizedType = normalizeTodoType(businessType)
  return rows.filter((row) =>
    (!normalizedType || rowBusinessType(row) === normalizedType) &&
    isPendingPhysicalTodo(row)
  )
}

export function getSupplementalPhysicalTodoRows<
  TTask extends BusinessTaskReference,
  TPhysical extends PhysicalTodoReference
>(
  workflowTasks: readonly TTask[],
  physicalRows: readonly TPhysical[],
  businessType?: WorkspaceTodoType | string
) {
  const workflowKeys = new Set(workflowTasks.map((task) => workflowTodoIdentity(task, businessType)))
  return getPendingPhysicalTodoRows(physicalRows, businessType)
    .filter((row) => {
      const key = physicalTodoIdentity(row, businessType)
      return key && !workflowKeys.has(key)
    })
}

export function countTodoItemsWithPhysicalActions(
  workflowTasks: readonly BusinessTaskReference[],
  physicalRows: readonly PhysicalTodoReference[],
  businessType?: WorkspaceTodoType | string
) {
  return countUniqueBusinessTasks(workflowTasks) +
    getSupplementalPhysicalTodoRows(workflowTasks, physicalRows, businessType).length
}

export function filterVisibleTodoEntries<T extends WorkspaceTodoCountEntry>(entries: readonly T[]) {
  return entries.filter((entry) =>
    Number.isFinite(entry.count) && (entry.count > 0 || entry.alwaysVisible === true)
  )
}

export function dedupeTodoEntriesByKey<T extends WorkspaceTodoCountEntry>(entries: readonly T[]) {
  const seen = new Set<string>()
  return entries.filter((entry) => {
    if (!entry.key) return true
    if (seen.has(entry.key)) return false
    seen.add(entry.key)
    return true
  })
}

export function visibleTodoTypeValues(entries: readonly WorkspaceTodoCountEntry[]): WorkspaceTodoType[] {
  const visibleTypes = filterVisibleTodoEntries(entries).map((entry) => entry.type)
  return ['all', ...Array.from(new Set(visibleTypes))]
}

export function getWorkspaceLaunchActions(roleCode?: string): WorkspaceLaunchAction[] {
  if (roleCode !== 'SUPPLIER') return []
  return [
    {
      key: 'firstcheck-start',
      title: '发起首检',
      description: '填写测量设备首次使用申请',
      path: '/firstcheck/supplier'
    }
  ]
}

export function shouldShowWorkspaceTaskSections(roleCode?: string) {
  if (!roleCode) return false
  return roleCode !== 'SUPPLIER'
}
