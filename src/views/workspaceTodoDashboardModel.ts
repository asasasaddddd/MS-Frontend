import type {
  WorkflowTodoDashboard,
  WorkflowTodoBusinessRow
} from '../types/workflow.ts'
import type {
  WorkspaceTodoRouteTarget,
  WorkspaceTodoType
} from './workspaceTodoModel.ts'

type WorkspaceDashboardType = Exclude<WorkspaceTodoType, 'all'>

export const workspaceDashboardDefinitions = Object.freeze([
  Object.freeze({ type: 'firstcheck', businessType: 'FIRST_CHECK', title: '首次检定', itemUnit: 'device' }),
  Object.freeze({ type: 'periodic', businessType: 'PERIODIC', title: '周检计划', itemUnit: 'device' }),
  Object.freeze({ type: 'change', businessType: 'CHANGE', title: '状态变更', itemUnit: 'device' }),
  Object.freeze({ type: 'sampling', businessType: 'SAMPLING', title: 'C 类物资抽检', itemUnit: 'device' }),
  Object.freeze({ type: 'productSupport', businessType: 'PRODUCT_SUPPORT', title: '产品配套', itemUnit: 'material' })
] as const)

type WorkspaceDashboardDefinition = (typeof workspaceDashboardDefinitions)[number]

export interface WorkspaceTodoDashboardRow {
  type: WorkspaceDashboardType
  businessType: WorkspaceDashboardDefinition['businessType']
  title: string
  itemUnit: WorkspaceDashboardDefinition['itemUnit']
  pendingActionCount: number | null
  containerCount: number | null
  affectedItemCount: number | null
  affectedItemText: string
  routeFallback: WorkspaceTodoRouteTarget
}

function definitionsFor(selectedType: WorkspaceTodoType) {
  return selectedType === 'all'
    ? workspaceDashboardDefinitions
    : workspaceDashboardDefinitions.filter((item) => item.type === selectedType)
}

export function workspaceDashboardFallbackRoute(
  type: WorkspaceDashboardType
): WorkspaceTodoRouteTarget {
  return { path: '/todo', query: { type } }
}

function affectedItemUnitLabel(unit: string) {
  return unit === 'device' ? '台' : '项'
}

export function validateWorkspaceTodoDashboard(
  dashboard: WorkflowTodoDashboard,
  selectedType: WorkspaceTodoType
) {
  const expected = definitionsFor(selectedType)
  const actualTypes = dashboard.businessRows.map((row) => row.businessType)
  if (actualTypes.join('|') !== expected.map((item) => item.businessType).join('|')) {
    throw new Error('WORKSPACE_TODO_DASHBOARD_ROW_ORDER_INVALID')
  }
  const rowTotal = dashboard.businessRows.reduce(
    (sum, row) => sum + row.pendingActionCount,
    0
  )
  if (rowTotal !== dashboard.overview.pendingActionCount) {
    throw new Error('WORKSPACE_TODO_DASHBOARD_CONSERVATION_FAILED')
  }
}

function availableRow(
  definition: WorkspaceDashboardDefinition,
  row: WorkflowTodoBusinessRow
): WorkspaceTodoDashboardRow {
  return {
    ...definition,
    pendingActionCount: row.pendingActionCount,
    containerCount: row.containerCount,
    affectedItemCount: row.affectedItemCount,
    affectedItemText: `${row.affectedItemCount} ${affectedItemUnitLabel(row.affectedItemUnit)}`,
    routeFallback: workspaceDashboardFallbackRoute(definition.type)
  }
}

function unavailableRow(
  definition: WorkspaceDashboardDefinition
): WorkspaceTodoDashboardRow {
  return {
    ...definition,
    pendingActionCount: null,
    containerCount: null,
    affectedItemCount: null,
    affectedItemText: '--',
    routeFallback: workspaceDashboardFallbackRoute(definition.type)
  }
}

export function buildWorkspaceDashboardRows(
  dashboard: WorkflowTodoDashboard | null | undefined,
  selectedType: WorkspaceTodoType
): WorkspaceTodoDashboardRow[] {
  const definitions = definitionsFor(selectedType)
  if (!dashboard) return definitions.map(unavailableRow)
  validateWorkspaceTodoDashboard(dashboard, selectedType)
  return definitions.map((definition, index) =>
    availableRow(definition, dashboard.businessRows[index]!)
  )
}
