import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workspace = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')
const displayModel = readFileSync(
  new URL('../src/views/periodic/periodicDisplayModel.ts', import.meta.url),
  'utf8'
)
const dialog = readFileSync(
  new URL('../src/views/periodic/components/PeriodicPlanPickerDialog.vue', import.meta.url),
  'utf8'
)

assert.match(workspace, /import \{ message \} from 'ant-design-vue'/)
assert.match(workspace, /import PeriodicPlanPickerDialog from '@\/views\/periodic\/components\/PeriodicPlanPickerDialog\.vue'/)
assert.match(workspace, /loadTodoContainers/)
assert.doesNotMatch(workspace, /listPeriodicTodoPlans|@\/api\/periodic/)
assert.match(workspace, /buildPeriodicPlanPickerItems/)
assert.doesNotMatch(displayModel, /todoPlans\?:/)
assert.doesNotMatch(displayModel, /if \(todoPlans !== undefined\)/)
assert.match(displayModel, /export function derivePeriodicPlanLabel/)
assert.match(displayModel, /export function buildPeriodicPlanSubtitle/)
assert.doesNotMatch(workspace, /function derivePeriodicPlanLabel/)
assert.doesNotMatch(workspace, /function buildPeriodicPlanSubtitle/)
assert.match(workspace, /const periodicPlanPickerOpen = ref\(false\)/)
assert.match(
  workspace,
  /const periodicPlanPickerItems = computed\(\(\) => buildPeriodicPlanPickerItems\(\s*periodicTasks\.value,\s*periodicTodoPlans\.value\s*\)\)/
)
assert.match(workspace, /const todoContainers = ref<WorkflowTodoContainer\[\]>\(\[\]\)/)
assert.match(workspace, /const todoContainerLoadFailed = ref\(false\)/)
assert.match(workspace, /const periodicPlanPickerIncomplete = computed/)

assert.match(workspace, /useRoleTodoDashboard/)
assert.doesNotMatch(workspace, /const periodicTodoEntries|periodic-todo-summary|sumMyPendingItems/)

const openDashboardBlock = workspace.match(
  /function openDashboardBusiness\(type: Exclude<WorkspaceTodoType, 'all'>\) \{([\s\S]*?)\n\}/
)?.[1] || ''
assert.match(openDashboardBlock, /type === 'periodic'/)
assert.match(openDashboardBlock, /periodicPlanPickerOpen\.value = true/)
assert.match(openDashboardBlock, /return/)
assert.match(openDashboardBlock, /getTodoModuleAdapter\(type\)\.todoRoute\(roleCode\.value\)/)
assert.match(openDashboardBlock, /router\.push/)

const openPeriodicPlanBlock = workspace.match(/function openPeriodicPlan\(containerId: string\) \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(openPeriodicPlanBlock, /const currentRole = roleCode\.value/)
assert.match(openPeriodicPlanBlock, /getTodoModuleAdapter\('periodic'\)\.todoRoute\(currentRole\)/)
assert.match(openPeriodicPlanBlock, /routeTarget\.path === '\/todo'/)
assert.match(openPeriodicPlanBlock, /message\.error\('当前角色没有可进入的周检工作台'\)/)
assert.match(openPeriodicPlanBlock, /periodicPlanPickerOpen\.value = false/)
assert.match(openPeriodicPlanBlock, /query:\s*\{[\s\S]*routeTarget\.query[\s\S]*planId:\s*containerId[\s\S]*containerId/)

const clearBlock = workspace.match(/function clearWorkspaceSummary\(\) \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(clearBlock, /periodicPlanPickerOpen\.value = false/)
assert.match(clearBlock, /todoContainers\.value = \[\]/)
assert.match(clearBlock, /todoContainerLoadFailed\.value = false/)

const applyBlock = workspace.match(/function applyWorkspaceSnapshot\([\s\S]*?\) \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(workspace, /loadContainers:\s*\(_identityKey, signal\) => loadTodoContainers\(signal\)/)
assert.match(applyBlock, /todoContainers\.value = snapshot\.todoContainers/)
assert.match(applyBlock, /todoContainerLoadFailed\.value = snapshot\.todoContainerLoadFailed/)

assert.match(dialog, /type="error"/)
assert.match(dialog, /周检单据入口加载失败，请检查后端接口/)
assert.match(dialog, /v-else-if="!incomplete"/)

assert.match(workspace, /<PeriodicPlanPickerDialog/)
assert.match(workspace, /v-model:open="periodicPlanPickerOpen"/)
assert.match(workspace, /:items="periodicPlanPickerItems"/)
assert.match(workspace, /:incomplete="periodicPlanPickerIncomplete"/)
assert.match(workspace, /@select="openPeriodicPlan"/)

assert.match(workspace, /const periodicHistoryEntries/)
assert.match(workspace, /query:\s*planId\.startsWith\('task-'\)/)
