import {
  getChangeTaskRoute,
  getWorkspaceFixedTodoRoute,
  getWorkspaceRoleTodoPath,
  type WorkspaceTodoRouteTarget,
  type WorkspaceTodoType
} from './workspaceTodoModel.ts'
import { matchesBusinessType } from '../workflows/metrologyWorkflow.ts'
import type { RoleCode } from '../types/common.ts'
import type { WorkflowTask } from '../types/workflow.ts'
import type { ChangeOrderVO } from '../types/change.ts'
import type { FirstCheckOrder } from '../types/firstcheck.ts'
import type { PeriodicTaskVO, PeriodicTodoPlanEntry } from '../types/periodic.ts'
import type { ProductSupportOrderVO } from '../types/productSupport.ts'
import type { SamplingTaskVO } from '../types/sampling.ts'

export type TodoModuleType = Exclude<WorkspaceTodoType, 'all'>
export type TodoDetail =
  | ChangeOrderVO
  | FirstCheckOrder
  | PeriodicTaskVO
  | ProductSupportOrderVO
  | SamplingTaskVO

export interface TodoModuleAdapter<TDetail extends TodoDetail = TodoDetail> {
  readonly type: TodoModuleType
  readonly businessType: string
  loadDetail: (task: Pick<WorkflowTask, 'businessId' | 'taskId'>, signal: AbortSignal) => Promise<TDetail>
  todoRoute: (roleCode?: RoleCode) => WorkspaceTodoRouteTarget | undefined
  historyRoute: (roleCode?: RoleCode) => string | undefined
}

const productSupportRouteByRole: Partial<Record<RoleCode, string>> = {
  VERIFIER_SELF: '/product-support/verifier',
  VERIFIER_EXTERNAL: '/product-support/verifier'
}

function fixedTodoRoute(
  type: 'firstcheck' | 'periodic' | 'change' | 'sampling',
  roleCode?: RoleCode
) {
  return getWorkspaceFixedTodoRoute(type, roleCode)
}

function historyTodoRoute(
  type: 'firstcheck' | 'periodic' | 'change' | 'sampling',
  roleCode?: RoleCode
) {
  return getWorkspaceRoleTodoPath(type, roleCode)
}

export const todoModuleAdapters: Readonly<Record<TodoModuleType, TodoModuleAdapter>> = {
  firstcheck: {
    type: 'firstcheck',
    businessType: 'FIRST_CHECK',
    loadDetail: async (task, signal) => {
      const { getFirstCheckDetail } = await import('../api/firstcheck.ts')
      return getFirstCheckDetail(task.businessId, task.taskId, signal)
    },
    todoRoute: (roleCode) => fixedTodoRoute('firstcheck', roleCode),
    historyRoute: (roleCode) => historyTodoRoute('firstcheck', roleCode)
  },
  periodic: {
    type: 'periodic',
    businessType: 'PERIODIC',
    loadDetail: async (task, signal) => {
      const [{ getPeriodicTask }, { parsePeriodicNodeCode }] = await Promise.all([
        import('../api/periodic.ts'),
        import('../api/periodicContract.ts')
      ])
      const detail = await getPeriodicTask(task.businessId, task.taskId, signal)
      return { ...detail, currentNode: parsePeriodicNodeCode(detail.currentNode) }
    },
    todoRoute: (roleCode) => fixedTodoRoute('periodic', roleCode),
    historyRoute: (roleCode) => historyTodoRoute('periodic', roleCode)
  },
  change: {
    type: 'change',
    businessType: 'CHANGE',
    loadDetail: async (task, signal) => {
      const { getChangeOrderDetail } = await import('../api/change.ts')
      return getChangeOrderDetail(task.businessId, signal)
    },
    todoRoute: (roleCode) => fixedTodoRoute('change', roleCode),
    historyRoute: (roleCode) => getChangeTaskRoute(roleCode)
  },
  sampling: {
    type: 'sampling',
    businessType: 'SAMPLING',
    loadDetail: async (task, signal) => {
      const { getSamplingTask } = await import('../api/sampling.ts')
      return getSamplingTask(task.businessId, task.taskId, signal)
    },
    todoRoute: (roleCode) => fixedTodoRoute('sampling', roleCode),
    historyRoute: (roleCode) => historyTodoRoute('sampling', roleCode)
  },
  productSupport: {
    type: 'productSupport',
    businessType: 'PRODUCT_SUPPORT',
    loadDetail: async (task, signal) => {
      const { getProductSupportOrder } = await import('../api/productSupport.ts')
      return getProductSupportOrder(task.businessId, signal)
    },
    todoRoute: (roleCode) => {
      const path = roleCode ? productSupportRouteByRole[roleCode] : undefined
      return path ? { path } : undefined
    },
    historyRoute: (roleCode) => roleCode ? productSupportRouteByRole[roleCode] : undefined
  }
}

export function getTodoModuleAdapter(type: TodoModuleType) {
  return todoModuleAdapters[type]
}

export function getTodoModuleAdapterForTask(task: Pick<WorkflowTask, 'businessType'>) {
  return Object.values(todoModuleAdapters).find((adapter) =>
    matchesBusinessType(task.businessType, adapter.type)
  )
}

export async function loadTodoModuleDetail(
  task: Pick<WorkflowTask, 'businessType' | 'businessId' | 'taskId'>,
  signal: AbortSignal
) {
  const adapter = getTodoModuleAdapterForTask(task)
  if (!adapter) throw new Error(`不支持的工作流业务类型：${task.businessType}`)
  return adapter.loadDetail(task, signal)
}

export async function loadPeriodicTodoPlanEntries(): Promise<PeriodicTodoPlanEntry[]> {
  const { listPeriodicTodoPlans } = await import('../api/periodic.ts')
  return listPeriodicTodoPlans()
}
