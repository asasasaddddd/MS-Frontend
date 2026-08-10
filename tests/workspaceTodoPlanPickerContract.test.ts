import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workspace = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')
const displayModel = readFileSync(
  new URL('../src/views/periodic/periodicDisplayModel.ts', import.meta.url),
  'utf8'
)

assert.match(workspace, /import \{ message \} from 'ant-design-vue'/)
assert.match(workspace, /import PeriodicPlanPickerDialog from '@\/views\/periodic\/components\/PeriodicPlanPickerDialog\.vue'/)
assert.match(workspace, /buildPeriodicPlanPickerItems/)
assert.match(displayModel, /export function derivePeriodicPlanLabel/)
assert.match(displayModel, /export function buildPeriodicPlanSubtitle/)
assert.doesNotMatch(workspace, /function derivePeriodicPlanLabel/)
assert.doesNotMatch(workspace, /function buildPeriodicPlanSubtitle/)
assert.match(workspace, /const periodicPlanPickerOpen = ref\(false\)/)
assert.match(
  workspace,
  /const periodicPlanPickerItems = computed\(\(\) => buildPeriodicPlanPickerItems\(periodicTasks\.value\)\)/
)
assert.match(workspace, /const periodicPlanPickerIncomplete = computed/)

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

assert.match(workspace, /<PeriodicPlanPickerDialog/)
assert.match(workspace, /v-model:open="periodicPlanPickerOpen"/)
assert.match(workspace, /:items="periodicPlanPickerItems"/)
assert.match(workspace, /:incomplete="periodicPlanPickerIncomplete"/)
assert.match(workspace, /@select="openPeriodicPlan"/)

assert.match(workspace, /const periodicHistoryEntries/)
assert.match(workspace, /query:\s*planId\.startsWith\('task-'\)/)
