import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const applySource = readFileSync(
  new URL('../src/views/change/ChangeApplyView.vue', import.meta.url),
  'utf8'
)
const adminTaskSource = readFileSync(
  new URL('../src/views/change/ChangeAdminTaskView.vue', import.meta.url),
  'utf8'
)
const workspaceSource = readFileSync(
  new URL('../src/views/WorkspaceTodoView.vue', import.meta.url),
  'utf8'
)
const routerSource = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')

assert.doesNotMatch(applySource, /ChangeReceiveAdminPanel/)
assert.doesNotMatch(applySource, /ChangeHistoryPanel/)
assert.match(adminTaskSource, /ChangeReceiveAdminPanel/)
assert.match(adminTaskSource, /ChangeHistoryPanel/)
assert.match(adminTaskSource, /role-code="MEASURE_ADMIN"/)
assert.match(workspaceSource, /getChangeTaskRoute/)
assert.doesNotMatch(workspaceSource, /const changeRouteByRole/)
assert.match(routerSource, /['"]\/change\/admin-task['"]:\s*\(\)\s*=>\s*import\(['"]@\/views\/change\/ChangeAdminTaskView\.vue['"]\)/)
