import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { runRoleSwitchTransaction } from '../src/components/appShellRoleSwitch.ts'
import {
  getWorkspaceFixedTodoRoute,
  getWorkspaceRoleTodoPath
} from '../src/views/workspaceTodoModel.ts'
import { todoModuleAdapters } from '../src/views/workspaceTodoAdapters.ts'

function source(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

const flowSummary = source('../src/components/workflow/FlowStatusSummary.vue')
const workspace = source('../src/views/WorkspaceTodoView.vue')
const picker = source('../src/views/periodic/components/PeriodicPlanPickerDialog.vue')
const adapters = source('../src/views/workspaceTodoAdapters.ts')
const workflowTypes = source('../src/types/workflow.ts')
const workspaceLoader = source('../src/composables/useWorkspaceTodoLoad.ts')
const request = source('../src/api/request.ts')
const router = source('../src/router/index.ts')
const navSectionsSource = source('../src/composables/useNavSections.ts')

const overviewCardClasses = [
  ...flowSummary.matchAll(/<a-card\s+class="([^"]+)"/g)
].map((match) => match[1]).filter((className) =>
  className.startsWith('summary-metric-card') || className === 'status-summary-card'
)
assert.deepEqual(overviewCardClasses, [
  'summary-metric-card overview-metric summary-metric-card--today',
  'summary-metric-card overview-metric summary-metric-card--pending',
  'status-summary-card'
], 'the workspace overview must keep its three production cards')

const fixedAdapterBusinessTypes = [
  ['firstcheck', 'FIRST_CHECK'],
  ['periodic', 'PERIODIC'],
  ['change', 'CHANGE'],
  ['sampling', 'SAMPLING'],
  ['productSupport', 'PRODUCT_SUPPORT']
] as const
for (const [adapterKey, businessType] of fixedAdapterBusinessTypes) {
  assert.ok(
    Object.hasOwn(todoModuleAdapters, adapterKey),
    `the ${adapterKey} adapter must remain registered`
  )
  assert.equal(todoModuleAdapters[adapterKey].businessType, businessType)
}

const fixedEntryMatrix = [
  ['firstcheck', 'SUPPLIER', '/firstcheck/supplier'],
  ['firstcheck', 'MEASURE_ADMIN', '/firstcheck/admin'],
  ['firstcheck', 'DEPT_LEADER', '/firstcheck/leader'],
  ['firstcheck', 'RESPONSIBLE_ENGINEER', '/firstcheck/engineer'],
  ['firstcheck', 'VERIFIER_SELF', '/firstcheck/verifier'],
  ['firstcheck', 'VERIFIER_EXTERNAL', '/firstcheck/verifier'],
  ['firstcheck', 'EXTERNAL_OPERATOR', '/scan'],
  ['periodic', 'MEASURE_ADMIN', '/periodic/admin'],
  ['periodic', 'VERIFIER_SELF', '/periodic/verifier'],
  ['periodic', 'VERIFIER_EXTERNAL', '/periodic/verifier-external'],
  ['periodic', 'RESPONSIBLE_ENGINEER', '/periodic/responsible-engineer'],
  ['periodic', 'EXTERNAL_OPERATOR', '/periodic/external-operator'],
  ['periodic', 'CONFIRMER', '/periodic/confirmer'],
  ['change', 'MEASURE_ADMIN', '/change/admin-task'],
  ['change', 'DEPT_LEADER', '/change/approval'],
  ['change', 'MEASURE_LEADER', '/change/approval'],
  ['change', 'RESPONSIBLE_ENGINEER', '/change/approval'],
  ['change', 'VERIFIER_SELF', '/change/verifier'],
  ['change', 'VERIFIER_EXTERNAL', '/change/verifier'],
  ['sampling', 'PLANNER', '/sampling/plan'],
  ['sampling', 'MEASURE_ADMIN', '/sampling/admin'],
  ['sampling', 'VERIFIER_SELF', '/sampling/verifier'],
  ['sampling', 'CONFIRMER', '/sampling/confirmer']
] as const
for (const [type, role, path] of fixedEntryMatrix) {
  assert.equal(getWorkspaceRoleTodoPath(type, role), path)
  assert.deepEqual(getWorkspaceFixedTodoRoute(type, role), { path })
}
assert.deepEqual(todoModuleAdapters.productSupport.todoRoute('VERIFIER_SELF'), {
  path: '/product-support/verifier'
})
assert.deepEqual(todoModuleAdapters.productSupport.todoRoute('VERIFIER_EXTERNAL'), {
  path: '/product-support/verifier'
})

assert.match(workspace, /<PeriodicPlanPickerDialog[\s\S]*?:items="periodicPlanPickerItems"/)
assert.match(workspace, /@select="openPeriodicPlan"/)
assert.match(picker, /<a-modal[\s\S]*?periodic-plan-picker-dialog/)
for (const field of [
  'containerId',
  'containerNo',
  'totalItemCount',
  'myPendingItemCount',
  'myPendingActionCount',
  'currentNodeSummary'
]) {
  assert.match(picker, new RegExp(`\\b${field}\\b`), `missing order-dialog field ${field}`)
}
assert.match(picker, /emit\('select',\s*record\.containerId\)/)

for (const field of ['businessId', 'businessItemId', 'taskId']) {
  assert.match(workflowTypes, new RegExp(`\\b${field}\\s*:`), `missing task identity ${field}`)
}
assert.match(adapters, /Pick<WorkflowTask, 'businessId' \| 'businessItemId' \| 'taskId'>/)
assert.match(adapters, /getFirstCheckDetail\(task\.businessId, task\.taskId, signal\)/)
assert.match(adapters, /getPeriodicTask\(task\.businessItemId, task\.taskId, signal\)/)
assert.match(adapters, /getChangeOrderDetail\(task\.businessId, task\.taskId, signal\)/)
assert.match(adapters, /getSamplingTask\(task\.businessId, task\.taskId, signal\)/)
assert.match(adapters, /getProductSupportOrder\(task\.businessId, signal\)/)

assert.match(flowSummary, /v-else-if="!summary && error"/)
assert.match(flowSummary, /<a-alert type="error" show-icon :message="errorMessage"/)
assert.match(picker, /v-if="incomplete"[\s\S]*?type="error"/)
assert.match(request, /export class ApiError extends Error/)
assert.match(request, /throw new ApiError\(payload\.code, payload\.message/)

assert.match(workspaceLoader, /let generation = 0/)
assert.match(workspaceLoader, /controller\?\.abort\(\)/)
assert.match(workspaceLoader, /requestedIdentity === identityKey\.value/)
assert.match(workspaceLoader, /watch\(\s*identityKey,[\s\S]*?snapshot\.value = null/)
const roleSwitchEvents: string[] = []
await runRoleSwitchTransaction({
  previousRole: 'VERIFIER_SELF',
  nextRole: 'VERIFIER_EXTERNAL',
  pause: () => roleSwitchEvents.push('pause'),
  flush: async () => { roleSwitchEvents.push('flush') },
  switchRole: (role) => roleSwitchEvents.push(`role:${role}`),
  navigate: async () => { roleSwitchEvents.push('navigate') },
  rollbackNavigate: async () => { roleSwitchEvents.push('rollback') },
  resume: () => roleSwitchEvents.push('resume')
})
assert.deepEqual(roleSwitchEvents, [
  'pause',
  'flush',
  'role:VERIFIER_EXTERNAL',
  'navigate',
  'resume'
])

const routeComponents = [...router.matchAll(
  /'([^']+)': \(\) => import\('(@\/views\/[^']+)'\)/g
)]
  .map((match) => [match[1], match[2]] as const)
const routeComponentByPath = new Map(routeComponents)
const frozenRouteComponents = [
  ['/firstcheck/admin', '@/views/firstcheck/FirstCheckAdminView.vue'],
  ['/firstcheck/verifier', '@/views/firstcheck/FirstCheckVerifierView.vue'],
  ['/firstcheck/engineer', '@/views/firstcheck/FirstCheckEngineerView.vue'],
  ['/firstcheck/leader', '@/views/firstcheck/FirstCheckLeaderView.vue'],
  ['/firstcheck/supplier', '@/views/firstcheck/FirstCheckSupplierView.vue'],
  ['/periodic/admin', '@/views/periodic/PeriodicAdminView.vue'],
  ['/periodic/verifier', '@/views/periodic/PeriodicVerifierView.vue'],
  ['/periodic/verifier-external', '@/views/periodic/PeriodicVerifierExternalView.vue'],
  ['/periodic/responsible-engineer', '@/views/periodic/PeriodicResponsibleEngineerView.vue'],
  ['/periodic/external-operator', '@/views/periodic/PeriodicExternalOperatorView.vue'],
  ['/periodic/confirmer', '@/views/periodic/PeriodicConfirmerView.vue'],
  ['/change/apply', '@/views/change/ChangeApplyView.vue'],
  ['/change/admin-task', '@/views/change/ChangeAdminTaskView.vue'],
  ['/change/approval', '@/views/change/ChangeDeptLeaderView.vue'],
  ['/change/verifier', '@/views/change/ChangeVerifierView.vue'],
  ['/scan', '@/views/scan/DeviceScanView.vue'],
  ['/label/print', '@/views/label/LabelPrintView.vue'],
  ['/cost/list', '@/views/cost/CostListView.vue'],
  ['/device/ledger', '@/views/device/DeviceLedgerView.vue'],
  ['/sampling/plan', '@/views/sampling/SamplingPlannerView.vue'],
  ['/sampling/admin', '@/views/sampling/SamplingAdminView.vue'],
  ['/sampling/verifier', '@/views/sampling/SamplingVerifierView.vue'],
  ['/sampling/confirmer', '@/views/sampling/SamplingConfirmerView.vue'],
  ['/product-support/warehouse', '@/views/product-support/ProductSupportWarehouseView.vue'],
  ['/product-support/verifier', '@/views/product-support/ProductSupportVerifierView.vue']
] as const
for (const [path, component] of frozenRouteComponents) {
  assert.equal(
    routeComponentByPath.get(path),
    component,
    `permission changes must not replace ${path} or its component entry point`
  )
  assert.ok(
    navSectionsSource.includes(`path: '${path}'`),
    `${path} must remain registered in allNavItems`
  )
}
assert.match(router, /import AppShell from '@\/components\/AppShell\.vue'/)
assert.match(router, /import LoginView from '@\/views\/LoginView\.vue'/)
assert.match(router, /import WorkspaceTodoView from '@\/views\/WorkspaceTodoView\.vue'/)
assert.match(
  router,
  /const navRoutes: RouteRecordRaw\[\] = allNavItems\s*\.filter\(\(item\) => item\.path !== '\/todo'\)\s*\.map\(\(item\) => \(\{[\s\S]*?path: item\.path,[\s\S]*?component: componentByPath\[item\.path\] \|\| WorkspaceTodoView,[\s\S]*?\}\)\)/
)
assert.match(
  router,
  /\{\s*path: '\/login',\s*name: 'login',\s*component: LoginView,[\s\S]*?\}/
)
assert.match(
  router,
  /\{\s*path: '\/todo',\s*name: 'todo',\s*component: WorkspaceTodoView,[\s\S]*?\}/
)
assert.match(router, /\{\s*path: '\/',\s*redirect: '\/todo'\s*\}/)
assert.match(
  router,
  /\{\s*path: '\/',\s*component: AppShell,\s*children: protectedRoutes\s*\}/
)
