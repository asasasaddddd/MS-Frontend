import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const workflowApi = source('../src/api/workflow.ts')
const workflowTypes = source('../src/types/workflow.ts')
const firstCheckApi = source('../src/api/firstcheck.ts')
const firstCheckTypes = source('../src/types/firstcheck.ts')
const workflowModel = source('../src/workflows/metrologyWorkflow.ts')
const firstCheckViews = [
  source('../src/views/firstcheck/FirstCheckAdminView.vue'),
  source('../src/views/firstcheck/FirstCheckLeaderView.vue'),
  source('../src/views/firstcheck/FirstCheckEngineerView.vue'),
  source('../src/views/firstcheck/FirstCheckVerifierView.vue')
]
const firstCheckDialogs = [
  source('../src/views/firstcheck/components/FirstCheckCategoryDialog.vue'),
  source('../src/views/firstcheck/components/FirstCheckLeaderDialog.vue'),
  source('../src/views/firstcheck/components/FirstCheckEngineerDialog.vue'),
  source('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue')
]

assert.match(workflowApi, /\/workflow\/tasks/)
assert.match(workflowApi, /view/)
assert.match(workflowApi, /businessType/)
assert.doesNotMatch(workflowApi, /\/workflow\/my-tasks|\/workflow\/my-history/)

for (const field of ['taskId', 'rowVersion', 'requiredRoleCode', 'permissionCode', 'allowedActions']) {
  assert.match(workflowTypes, new RegExp(`${field}\\??:`))
}
assert.doesNotMatch(workflowTypes, /\n\s*id:\s*number/)

assert.match(firstCheckApi, /params:\s*\{\s*taskId\s*\}/)
assert.doesNotMatch(firstCheckApi, /\/firstcheck\/my-tasks|\/firstcheck\/summary/)

for (const field of ['taskId', 'taskRowVersion']) {
  assert.match(firstCheckTypes, new RegExp(`${field}:`))
}
assert.match(firstCheckTypes, /items:\s*BatchWorkflowTaskItem\[\]/)
assert.doesNotMatch(firstCheckTypes, /orderIds:/)

for (const nodeCode of ['manager_classify', 'manager_revise', 'engineer_route', 'verifier_verify_assign']) {
  assert.match(workflowModel, new RegExp(nodeCode))
}
assert.doesNotMatch(
  workflowModel.match(/export const firstCheckNodes:[\s\S]*?\n\]/)?.[0] || '',
  /manager_check|engineer_confirm_type|verifier_receive|external_sendout|verifier_return_verify|verifier_verify['"]/
)

for (const view of firstCheckViews) {
  assert.match(view, /task\.taskId/)
  assert.match(view, /task\.rowVersion/)
  assert.match(view, /getFirstCheckDetail\(task\.businessId,\s*task\.taskId\)/)
  assert.doesNotMatch(view, /getFirstCheckFlowSummary/)
}

for (const dialog of firstCheckDialogs) {
  assert.match(dialog, /task-id|taskId/)
  assert.match(dialog, /task-row-version|taskRowVersion/)
}
