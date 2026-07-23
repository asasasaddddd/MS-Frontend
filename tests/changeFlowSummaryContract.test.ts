import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const applyView = source('../src/views/change/ChangeApplyView.vue')
const approvalView = source('../src/views/change/ChangeDeptLeaderView.vue')
const verifierView = source('../src/views/change/ChangeVerifierView.vue')
const adminPanel = source('../src/views/change/components/ChangeReceiveAdminPanel.vue')
const historyPanel = source('../src/views/change/components/ChangeHistoryPanel.vue')

const pendingSources = [approvalView, verifierView, adminPanel]
const nonTodoSources = [applyView, historyPanel]

for (const nonTodoSource of nonTodoSources) {
  assert.doesNotMatch(nonTodoSource, /getChangeFlowSummary/)
  assert.doesNotMatch(nonTodoSource, /FlowStatusSummary/)
  assert.doesNotMatch(nonTodoSource, /:summary="changeFlowSummary"/)
}

for (const pendingSource of pendingSources) {
  assert.match(pendingSource, /getChangeFlowSummary\('pending'\)/)
  assert.doesNotMatch(pendingSource, /getChangeFlowSummary\('(history|applied)'\)/)
  assert.match(pendingSource, /FlowStatusSummary/)
  assert.match(pendingSource, /Promise\.allSettled/)
  assert.match(pendingSource, /:summary="changeFlowSummary"/)
}

for (const pageSource of [...nonTodoSources, ...pendingSources]) {
  assert.doesNotMatch(pageSource, /setInterval|setTimeout/)
}

assert.match(applyView, /listDevicePage/)
assert.match(approvalView, /listWorkflowTasks/)
assert.match(verifierView, /listWorkflowTasks/)
assert.match(adminPanel, /listWorkflowTasks/)
assert.match(historyPanel, /listWorkflowHistory/)

for (const taskView of [...pendingSources, historyPanel]) {
  assert.doesNotMatch(taskView, /const\s+metrics\b|todayKey|metrics\./)
}
assert.doesNotMatch(approvalView, /summary-line/)
assert.doesNotMatch(verifierView, /summary-line|status-strip/)
assert.doesNotMatch(adminPanel, /pendingCount/)
