import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as workspaceModel from '../src/views/workspaceTodoModel.ts'

const workspace = readFileSync(
  new URL('../src/views/WorkspaceTodoView.vue', import.meta.url),
  'utf8'
)
const model = workspaceModel as Record<string, (...args: any[]) => any>

assert.match(workspace, /useRoleTodoDashboard/)
assert.match(workspace, /const dashboardQuery = computed\(\(\) => \(\{[\s\S]*businessType:\s*selectedWorkflowBusinessType\.value/)
assert.match(workspace, /identityKey:\s*workflowIdentity/)
assert.match(workspace, /selectedType,\s*query:\s*dashboardQuery/)
assert.match(workspace, /const showWorkspaceTaskSections = computed\(\(\) => shouldShowWorkspaceTaskSections\(roleCode\.value\)\)/)
assert.match(workspace, /user && showWorkspaceTaskSections\.value \? `\$\{user\.employeeId\}\|\$\{user\.roleCode\}` : ''/)
assert.match(
  workspace,
  /<WorkspaceTodoDashboard\s+v-if="showWorkspaceTaskSections && route\.path === '\/todo' && activeBucket === 'todo'"/,
  'supplier-style launch-only roles must not request or render the dashboard'
)
assert.match(workspace, /watch\(\s*\(\) => route\.query\.type[\s\S]*workspaceTodoTypeFromQuery/)
assert.doesNotMatch(workspace, /useRoleTodoSummary|<FlowStatusSummary/)

assert.equal(model.workspaceTodoBusinessType('all'), undefined)
assert.equal(model.workspaceTodoBusinessType('periodic'), 'PERIODIC')
assert.equal(model.workspaceTodoBusinessType('firstcheck'), 'FIRST_CHECK')
assert.equal(model.workspaceTodoTypeFromQuery('periodic'), 'periodic')
assert.equal(model.workspaceTodoTypeFromQuery(['change', 'periodic']), 'change')
assert.equal(model.workspaceTodoTypeFromQuery('unsupported'), 'all')
assert.equal(model.shouldShowWorkspaceTaskSections('SUPPLIER'), false)
assert.equal(model.shouldShowWorkspaceTaskSections('MEASURE_ADMIN'), true)
