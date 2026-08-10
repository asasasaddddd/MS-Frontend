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
assert.match(workspace, /loadPeriodicTodoPlanEntries/)
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
assert.match(workspace, /const periodicTodoPlans = ref<PeriodicTodoPlanEntry\[\]>\(\[\]\)/)
assert.match(workspace, /const periodicTodoPlanLoadFailed = ref\(false\)/)
assert.match(workspace, /const periodicPlanPickerIncomplete = computed/)

const periodicSummaryBlock = workspace.match(
  /const periodicTodoEntries = computed<TodoDefinition\[\]>\(\(\) => \{([\s\S]*?)\n\}\)/
)?.[1] || ''
assert.match(periodicSummaryBlock, /countTodoItemsWithPhysicalActions/)
assert.match(periodicSummaryBlock, /buildPeriodicPlanTodoGroups\(periodicTasks\.value\)/)
assert.doesNotMatch(periodicSummaryBlock, /periodicTodoPlans|periodicTodoPlanLoadFailed/)

const openTodoBlock = workspace.match(/function openTodo\(item: TodoDefinition\) \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(openTodoBlock, /activeBucket\.value === 'todo'/)
assert.match(openTodoBlock, /item\.key === 'periodic-todo-summary'/)
assert.match(openTodoBlock, /periodicPlanPickerOpen\.value = true/)
assert.match(openTodoBlock, /return/)
assert.match(openTodoBlock, /router\.push/)

const openPeriodicPlanBlock = workspace.match(/function openPeriodicPlan\(planId: string\) \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(openPeriodicPlanBlock, /const currentRole = roleCode\.value/)
assert.match(openPeriodicPlanBlock, /getTodoModuleAdapter\('periodic'\)\.todoRoute\(currentRole\)/)
assert.match(openPeriodicPlanBlock, /routeTarget\.path === '\/todo'/)
assert.match(openPeriodicPlanBlock, /message\.error\('当前角色没有可进入的周检工作台'\)/)
assert.match(openPeriodicPlanBlock, /periodicPlanPickerOpen\.value = false/)
assert.match(openPeriodicPlanBlock, /query:\s*\{[\s\S]*routeTarget\.query[\s\S]*planId/)

const clearBlock = workspace.match(/function clearWorkspaceSummary\(\) \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(clearBlock, /periodicPlanPickerOpen\.value = false/)
assert.match(clearBlock, /periodicTodoPlans\.value = \[\]/)
assert.match(clearBlock, /periodicTodoPlanLoadFailed\.value = false/)

const loadBlock = workspace.match(/async function loadWorkflowSummary\(\) \{([\s\S]*?)\n\}/)?.[1] || ''
assert.match(loadBlock, /loadPeriodicTodoPlanEntries\(\)/)
assert.match(loadBlock, /periodicTodoPlans\.value = periodicTodoPlanResult\.status === 'fulfilled'/)
assert.match(loadBlock, /periodicTodoPlanLoadFailed\.value = periodicTodoPlanResult\.status === 'rejected'/)

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
