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

const firstCheckTodo = blockBetween(workspace, 'const firstCheckTodoEntries', 'const firstCheckHistoryEntries')
const firstCheckHistory = blockBetween(workspace, 'const firstCheckHistoryEntries', 'const changeTodoEntries')
const changeTodo = blockBetween(workspace, 'const changeTodoEntries', 'const changeHistoryEntries')
const changeHistory = blockBetween(workspace, 'const changeHistoryEntries', 'function derivePeriodicPlanLabel')
const periodicTodo = blockBetween(workspace, 'const periodicTodoEntries', 'const periodicHistoryEntries')
const periodicHistory = blockBetween(workspace, 'const periodicHistoryEntries', 'function samplingPlanGroupKey')
const samplingTodo = blockBetween(workspace, 'const samplingTodoEntries', 'const samplingHistoryEntries')
const samplingHistory = blockBetween(workspace, 'const samplingHistoryEntries', 'const productSupportTodoEntries')
const productSupportHistory = blockBetween(workspace, 'const productSupportHistoryEntries', 'const permittedTodos')
const pendingTotal = blockBetween(workspace, 'const pendingTotal', 'const visibleFilterOptions')

assert.match(model, /export function filterTasksWithLoadedDetails/)
assert.match(firstCheckTodo, /filterTasksWithLoadedDetails/)
assert.match(firstCheckHistory, /filterTasksWithLoadedDetails/)
assert.match(changeTodo, /filterTasksWithLoadedDetails/)
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

assert.match(workspace, /watch\(\s*roleCode,/)
assert.match(workspace, /clearWorkspaceSummary\(\)/)
assert.match(workspace, /const loadId = \+\+workspaceLoadId/)
assert.match(workspace, /loadId === workspaceLoadId && roleCode\.value === requestedRole/)
assert.doesNotMatch(workspace, /onMounted\(loadWorkflowSummary\)/)
assert.doesNotMatch(workspace, /setInterval|setTimeout/)
