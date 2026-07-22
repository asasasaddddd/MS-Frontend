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
const migratedSources = [applyView, ...pendingSources, historyPanel]

assert.match(applyView, /getChangeFlowSummary\('applied'\)/)
assert.doesNotMatch(applyView, /getChangeFlowSummary\('(pending|history)'\)/)

for (const pendingSource of pendingSources) {
  assert.match(pendingSource, /getChangeFlowSummary\('pending'\)/)
  assert.doesNotMatch(pendingSource, /getChangeFlowSummary\('(history|applied)'\)/)
}

assert.match(historyPanel, /getChangeFlowSummary\('history'\)/)
assert.doesNotMatch(historyPanel, /getChangeFlowSummary\('(pending|applied)'\)/)

for (const migratedSource of migratedSources) {
  assert.match(migratedSource, /FlowStatusSummary/)
  assert.match(migratedSource, /Promise\.allSettled/)
  assert.match(migratedSource, /:summary="changeFlowSummary"/)
  assert.doesNotMatch(migratedSource, /setInterval|setTimeout/)
}

assert.match(applyView, /listDevicePage/)
assert.match(approvalView, /listWorkflowTasks/)
assert.match(verifierView, /listWorkflowTasks/)
assert.match(adminPanel, /listWorkflowTasks/)
assert.match(historyPanel, /listWorkflowHistory/)

for (const taskView of [...pendingSources, historyPanel]) {
  assert.doesNotMatch(taskView, /const\s+metrics\b|todayKey|metrics\./)
}
assert.doesNotMatch(approvalView, /summary-line|今日新增/)
assert.doesNotMatch(verifierView, /summary-line|status-strip|今日新增|通过后完成状态回写/)
assert.doesNotMatch(adminPanel, /pendingCount/)

assert.match(applyView, /状态变更流程汇总（本人申请）/)
assert.match(approvalView, /状态变更流程汇总（当前待办）/)
assert.match(verifierView, /状态变更流程汇总（当前待办）/)
assert.match(adminPanel, /状态变更流程汇总（当前待办）/)
assert.match(historyPanel, /状态变更流程汇总（历史已办）/)
