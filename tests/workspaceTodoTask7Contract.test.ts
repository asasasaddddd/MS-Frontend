import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

function blockBetween(content: string, startMarker: string, endMarker: string) {
  const start = content.indexOf(startMarker)
  const end = content.indexOf(endMarker, start + startMarker.length)
  assert.ok(start >= 0, `missing source block: ${startMarker}`)
  assert.ok(end > start, `cannot determine source block boundary: ${startMarker}`)
  return content.slice(start, end)
}

const workspace = source('../src/views/WorkspaceTodoView.vue')
const dashboard = source('../src/components/workflow/WorkspaceTodoDashboard.vue')
const model = source('../src/views/workspaceTodoModel.ts')
const adapters = source('../src/views/workspaceTodoAdapters.ts')

const firstCheckHistory = blockBetween(workspace, 'const firstCheckHistoryEntries', 'const changeHistoryEntries')
const changeHistory = blockBetween(workspace, 'const changeHistoryEntries', 'const periodicPlanPickerIncomplete')
const periodicHistory = blockBetween(workspace, 'const periodicHistoryEntries', 'function samplingPlanGroupKey')
const samplingHistory = blockBetween(workspace, 'const samplingHistoryEntries', 'const productSupportHistoryEntries')
const productSupportHistory = blockBetween(workspace, 'const productSupportHistoryEntries', 'const permittedHistory')
const permittedHistory = blockBetween(workspace, 'const permittedHistory', 'const filteredHistory')

assert.match(workspace, /useRoleTodoDashboard/)
assert.match(workspace, /<WorkspaceTodoDashboard/)
assert.match(workspace, /@open="openDashboardBusiness"/)
assert.doesNotMatch(
  workspace,
  /const (?:firstCheck|periodic|change|sampling|productSupport)TodoEntries|todoContainersFor|sumMyPendingItems|pendingTotal/
)
assert.doesNotMatch(workspace, /listUnifiedScanInbox|getPendingFirstCheckTakeBackRows|scanInboxRows/)
assert.doesNotMatch(workspace, /matchesWorkflowTaskRole|changeNodeCodesByRole/)
assert.doesNotMatch(workspace, /const isVerifier = computed/)
assert.doesNotMatch(workspace, /class="count-pill orange"/)

assert.match(dashboard, /buildWorkspaceDashboardRows/)
assert.match(dashboard, /row\.pendingActionCount === 0/)
assert.match(dashboard, /@click="emit\('open', row\.type\)"/)

assert.match(model, /export function filterTasksWithLoadedDetails/)
assert.doesNotMatch(model, /periodicTodoScopeByRole|samplingTodoNodeCodesByRole/)
assert.match(adapters, /getWorkspaceFixedTodoRoute/)

assert.match(firstCheckHistory, /filterTasksWithLoadedDetails/)
assert.match(changeHistory, /filterTasksWithLoadedDetails/)
assert.match(periodicHistory, /const handledTasks = periodicHistoryTasks\.value/)
assert.match(samplingHistory, /samplingHistoryTasks\.value/)
assert.match(productSupportHistory, /productSupportHistoryTasks\.value/)
for (const historyBlock of [periodicHistory, samplingHistory, productSupportHistory]) {
  assert.doesNotMatch(historyBlock, /pendingIds/)
}
for (const historyName of [
  'firstCheckHistoryEntries',
  'periodicHistoryEntries',
  'changeHistoryEntries',
  'samplingHistoryEntries',
  'productSupportHistoryEntries'
]) {
  assert.match(permittedHistory, new RegExp(`\\.\\.\\.${historyName}\\.value`))
}

assert.match(workspace, /function openDashboardBusiness/)
assert.match(workspace, /type === 'periodic'[\s\S]*?periodicPlanPickerOpen\.value = true/)
assert.match(workspace, /const periodicPlanPickerItems = computed\(\(\) => buildPeriodicPlanPickerItems/)
assert.match(workspace, /<PeriodicPlanPickerDialog/)
assert.match(workspace, /@select="openPeriodicPlan"/)

assert.match(workspace, /useWorkspaceTodoLoad/)
assert.match(workspace, /watch\(workspaceSnapshot,\s*applyWorkspaceSnapshot/)
assert.match(workspace, /clearWorkspaceSummary\(\)/)
assert.doesNotMatch(workspace, /mergePeriodicTaskPhysicalActions/)
assert.doesNotMatch(workspace, /workspaceLoadId|isCurrentWorkspaceLoad/)
assert.doesNotMatch(workspace, /onMounted\(loadWorkflowSummary\)/)
assert.doesNotMatch(workspace, /setInterval|setTimeout/)
