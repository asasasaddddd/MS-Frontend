import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

function blockBetween(content: string, startMarker: string, endMarker: string) {
  const start = content.indexOf(startMarker)
  const end = content.indexOf(endMarker, start + startMarker.length)
  assert.ok(start >= 0, `缺少代码段：${startMarker}`)
  assert.ok(end > start, `无法确定代码段边界：${startMarker}`)
  return content.slice(start, end)
}

const workspace = source('../src/views/WorkspaceTodoView.vue')
const model = source('../src/views/workspaceTodoModel.ts')
const adapters = source('../src/views/workspaceTodoAdapters.ts')

const firstCheckTodo = blockBetween(workspace, 'const firstCheckTodoEntries', 'const firstCheckHistoryEntries')
const firstCheckHistory = blockBetween(workspace, 'const firstCheckHistoryEntries', 'const changeTodoEntries')
const changeTodo = blockBetween(workspace, 'const changeTodoEntries', 'const changeHistoryEntries')
const changeHistory = blockBetween(workspace, 'const changeHistoryEntries', 'const periodicTodoEntries')
const periodicTodo = blockBetween(workspace, 'const periodicTodoEntries', 'const periodicHistoryEntries')
const periodicHistory = blockBetween(workspace, 'const periodicHistoryEntries', 'function samplingPlanGroupKey')
const samplingTodo = blockBetween(workspace, 'const samplingTodoEntries', 'const samplingHistoryEntries')
const samplingHistory = blockBetween(workspace, 'const samplingHistoryEntries', 'const productSupportTodoEntries')
const productSupportHistory = blockBetween(workspace, 'const productSupportHistoryEntries', 'const permittedTodos')
const pendingTotal = blockBetween(workspace, 'const pendingTotal', 'const visibleFilterOptions')

assert.match(model, /export function filterTasksWithLoadedDetails/)
assert.doesNotMatch(
  workspace,
  /actionableWorkflowTasks/,
  '总待办必须展示全部候选待办；未扫码等条件门禁只能控制操作按钮，不能隐藏待办入口'
)
assert.match(
  firstCheckTodo,
  /uniqueTasksByBusinessId\(workflowTasks\.value/,
  '首检待办入口必须直接基于统一候选待办，包含 allowedActions 为空的待接收任务'
)
assert.match(firstCheckTodo, /countUniqueBusinessTasks\(tasks\)/)
assert.match(firstCheckTodo, /getPendingFirstCheckTakeBackRows\(scanInboxRows\.value\)/)
assert.match(firstCheckTodo, /countFirstCheckTodoItems\(taskCount,\s*firstCheckTakeBackRows\)/)
assert.doesNotMatch(firstCheckTodo, /if \(tasks\.length === 0\) return \[\]/)
assert.match(firstCheckTodo, /alwaysVisible:\s*true/)
assert.doesNotMatch(changeTodo, /if \(tasks\.length === 0\) return \[\]/)
assert.match(changeTodo, /countUniqueBusinessTasks\(tasks\)/)
assert.match(changeTodo, /alwaysVisible:\s*true/)
assert.match(periodicTodo, /key:\s*'periodic-todo-summary'/)
assert.match(periodicTodo, /countUniqueBusinessTasks\(workflowPeriodicTasks\)/)
assert.match(periodicTodo, /alwaysVisible:\s*true/)
assert.match(samplingTodo, /key:\s*'sampling-todo-summary'/)
assert.match(samplingTodo, /countUniqueBusinessTasks\(workflowSamplingTasks\)/)
assert.match(samplingTodo, /alwaysVisible:\s*true/)
for (const block of [firstCheckTodo, periodicTodo, changeTodo, samplingTodo]) {
  assert.match(block, /getTodoModuleAdapter/)
  assert.doesNotMatch(block, /!path/)
}
assert.match(adapters, /getWorkspaceFixedTodoRoute/)
assert.doesNotMatch(firstCheckTodo, /filterTasksWithLoadedDetails/)
assert.match(firstCheckHistory, /filterTasksWithLoadedDetails/)
assert.doesNotMatch(changeTodo, /filterTasksWithLoadedDetails/)
assert.match(changeHistory, /filterTasksWithLoadedDetails/)
assert.doesNotMatch(workspace, /matchesWorkflowTaskRole|changeNodeCodesByRole/)

assert.doesNotMatch(model, /periodicTodoScopeByRole|samplingTodoNodeCodesByRole/)
assert.match(periodicTodo, /buildPeriodicPlanTodoGroups\(periodicTasks\.value\)/)
assert.match(periodicHistory, /const handledTasks = periodicHistoryTasks\.value/)
assert.match(samplingTodo, /samplingTasks\.value\.forEach/)

assert.doesNotMatch(periodicHistory, /pendingIds/)
assert.doesNotMatch(samplingHistory, /pendingIds/)
assert.doesNotMatch(productSupportHistory, /pendingIds/)
assert.match(pendingTotal, /permittedTodos\.value/)
assert.doesNotMatch(pendingTotal, /History|history/)
assert.doesNotMatch(workspace, /const isVerifier = computed/)
assert.match(workspace, /v-if="activeBucket === 'todo'" class="count-pill orange"/)

assert.match(workspace, /watch\(\s*roleCode,/)
assert.match(workspace, /clearWorkspaceSummary\(\)/)
assert.match(workspace, /const loadId = \+\+workspaceLoadId/)
assert.match(workspace, /loadId === workspaceLoadId && roleCode\.value === requestedRole/)
assert.doesNotMatch(workspace, /onMounted\(loadWorkflowSummary\)/)
assert.doesNotMatch(workspace, /setInterval|setTimeout/)
