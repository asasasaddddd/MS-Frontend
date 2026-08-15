import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const workspace = readFileSync(
  new URL('../src/views/WorkspaceTodoView.vue', import.meta.url),
  'utf8'
)
const componentUrl = new URL(
  '../src/components/workflow/WorkspaceTodoDashboard.vue',
  import.meta.url
)

assert.equal(existsSync(componentUrl), true, 'compact dashboard component must exist')
const component = existsSync(componentUrl) ? readFileSync(componentUrl, 'utf8') : ''

assert.match(workspace, /useRoleTodoDashboard/)
assert.match(workspace, /<WorkspaceTodoDashboard/)
assert.match(workspace, /dashboardQuery/)
assert.doesNotMatch(workspace, /pendingTotal\s*=/)
assert.doesNotMatch(workspace, /sumWorkspaceTodoCounts\(permittedTodos/)
assert.doesNotMatch(workspace, /useRoleTodoSummary/)
assert.doesNotMatch(workspace, /<FlowStatusSummary/)
assert.doesNotMatch(workspace, /const (firstCheck|periodic|change|sampling|productSupport)TodoEntries/)
assert.match(workspace, /activeBucket === 'history'/)
assert.match(workspace, /PeriodicPlanPickerDialog/)
assert.match(workspace, /todoContainers/)

assert.match(component, /统一待办仪表盘/)
assert.match(component, /今日新增/)
assert.match(component, /当前待办/)
assert.match(component, /待办构成/)
assert.match(component, /业务类型/)
assert.match(component, /待操作/)
assert.match(component, /业务单据/)
assert.match(component, /涉及对象/)
assert.match(component, /--/)
assert.match(component, /重试/)
assert.match(component, /aria-live="polite"/)
assert.match(component, /@click="emit\('open', row\.type\)"/)
assert.match(component, /@click\.stop="emit\('open', row\.type\)"/)
assert.match(component, /dashboard-skeleton-summary/)
assert.match(component, /dashboard-skeleton-row/)
assert.match(component, /transition:\s*color\s+180ms/)
assert.match(component, /border-radius:\s*8px/)
assert.match(component, /overflow-wrap:\s*anywhere/)
assert.match(component, /@media \(max-width: 720px\)/)
assert.match(component, /grid-template-areas/)
assert.doesNotMatch(component, /overflow-x:\s*(auto|scroll)/)
