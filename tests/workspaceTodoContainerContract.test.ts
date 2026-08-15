import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { buildPeriodicPlanPickerItems } from '../src/views/periodic/periodicDisplayModel.ts'
import type { PeriodicTodoPlanEntry } from '../src/types/periodic.ts'

const workflowTypes = readFileSync(
  new URL('../src/types/workflow.ts', import.meta.url),
  'utf8'
)
const workspaceSource = readFileSync(
  new URL('../src/views/WorkspaceTodoView.vue', import.meta.url),
  'utf8'
)
const pickerSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicPlanPickerDialog.vue', import.meta.url),
  'utf8'
)
const workflowApiSource = readFileSync(
  new URL('../src/api/workflow.ts', import.meta.url),
  'utf8'
)
const adapterSource = readFileSync(
  new URL('../src/views/workspaceTodoAdapters.ts', import.meta.url),
  'utf8'
)

const containerBlock = workflowTypes.match(
  /export interface WorkflowTodoContainer[\s\S]*?\n}\s*/
)?.[0] || ''
assert.ok(containerBlock, 'missing the unified frontend todo container type')

for (const field of [
  'containerId',
  'containerNo',
  'totalItemCount',
  'myPendingItemCount',
  'myPendingActionCount',
  'currentNodeSummary'
]) {
  assert.match(containerBlock, new RegExp(`\\b${field}\\s*:`), `missing frozen field: ${field}`)
}

assert.doesNotMatch(
  workspaceSource,
  /Math\.max\(detailDeviceCount,\s*workflowDeviceCount,\s*physicalDeviceCount\)/,
  'personal todo count must not union unrelated detail, workflow, and scan projections'
)
assert.match(workspaceSource, /useRoleTodoDashboard/)
assert.doesNotMatch(workspaceSource, /myPendingItemCount/)
assert.match(workspaceSource, /containerId/)
assert.match(pickerSource, /containerId/)
assert.match(pickerSource, /myPendingItemCount/)
assert.match(pickerSource, /myPendingActionCount/)
assert.match(workflowApiSource, /url:\s*'\/workflow\/todo-containers'/)
assert.match(adapterSource, /listWorkflowTodoContainers/)
assert.doesNotMatch(adapterSource, /listPeriodicTodoPlans/)
assert.match(workspaceSource, /useTodoNotificationStore/)
assert.match(
  workspaceSource,
  /useWorkspaceTodoLoad[\s\S]*?invalidationVersion:\s*workspaceInvalidationVersion/,
  'the workspace must delegate SSE-driven refreshes to the mounted latest-identity loader'
)

const tenItemContainer = {
  containerId: 'P1',
  containerNo: 'ZJ-202608-0001',
  totalItemCount: 10,
  myPendingItemCount: 5,
  myPendingActionCount: 5,
  unfinishedItemCount: 5,
  currentNodeSummary: [{
    nodeCode: 'verifier_receive',
    nodeName: 'Pending receive',
    myPendingItemCount: 5,
    myPendingActionCount: 5
  }]
} as unknown as PeriodicTodoPlanEntry

const pickerItems = buildPeriodicPlanPickerItems([], [tenItemContainer])
assert.equal(pickerItems.length, 1, 'a container with personal pending items must remain visible')
assert.equal(pickerItems[0]?.containerId, 'P1')
assert.equal(pickerItems[0]?.totalItemCount, 10)
assert.equal(pickerItems[0]?.myPendingItemCount, 5)
assert.equal(pickerItems[0]?.myPendingActionCount, 5)

const fullyReleasedContainer = {
  ...tenItemContainer,
  myPendingItemCount: 0,
  myPendingActionCount: 0,
  unfinishedItemCount: 0
} as unknown as PeriodicTodoPlanEntry
assert.deepEqual(
  buildPeriodicPlanPickerItems([], [fullyReleasedContainer]),
  [],
  'a container must disappear once every device in the plan has been fully released'
)

const inFlightButNotMineContainer = {
  ...tenItemContainer,
  myPendingItemCount: 0,
  myPendingActionCount: 0,
  unfinishedItemCount: 3
} as unknown as PeriodicTodoPlanEntry
assert.equal(
  buildPeriodicPlanPickerItems([], [inFlightButNotMineContainer]).length,
  1,
  'a container must remain visible while any device is still in flight, even with no pending items for the current identity'
)

assert.match(
  workspaceSource,
  /openPeriodicPlan\(containerId[\s\S]*?containerId/,
  'selecting a container must route using that container id'
)
assert.match(
  pickerSource,
  /emit\('select',\s*record\.containerId\)/,
  'the picker must emit the selected container id, not a derived aggregate key'
)
