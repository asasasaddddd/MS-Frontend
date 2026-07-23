import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const directTodoPages = [
  '../src/views/firstcheck/FirstCheckAdminView.vue',
  '../src/views/firstcheck/FirstCheckVerifierView.vue',
  '../src/views/firstcheck/FirstCheckEngineerView.vue',
  '../src/views/firstcheck/FirstCheckLeaderView.vue',
  '../src/views/change/ChangeVerifierView.vue',
  '../src/views/change/ChangeDeptLeaderView.vue',
  '../src/views/change/components/ChangeReceiveAdminPanel.vue',
  '../src/views/product-support/ProductSupportVerifierView.vue'
]

for (const path of directTodoPages) {
  const pageSource = source(path)
  assert.match(pageSource, /FlowStatusSummary/, `${path} must use the shared todo summary component`)
  assert.doesNotMatch(pageSource, /setInterval|setTimeout/, `${path} must not poll the summary`)
}

const periodicWorkspace = source('../src/views/periodic/components/PeriodicTaskWorkspace.vue')
const periodicSummary = source('../src/views/periodic/components/PeriodicPlanSummary.vue')
const periodicDetail = source('../src/views/periodic/components/PeriodicDetailDialog.vue')
assert.match(periodicWorkspace, /PeriodicPlanSummary/)
assert.match(periodicSummary, /FlowStatusSummary/)
assert.doesNotMatch(periodicSummary, /计划基本信息|plan-panel|a-descriptions/)
assert.doesNotMatch(periodicDetail, /计划基本信息|PeriodicPlanVO|plan\?\./)
assert.doesNotMatch(periodicWorkspace, /getPeriodicPlan\(|currentPlan|:plan="currentPlan"/)

const samplingWorkspace = source('../src/views/sampling/components/SamplingTaskWorkspace.vue')
const samplingSummary = source('../src/views/sampling/components/SamplingPlanSummary.vue')
assert.match(samplingWorkspace, /SamplingPlanSummary/)
assert.match(samplingSummary, /FlowStatusSummary/)

const nonTodoPages = [
  '../src/views/firstcheck/FirstCheckSupplierView.vue',
  '../src/views/change/ChangeApplyView.vue',
  '../src/views/change/components/ChangeHistoryPanel.vue',
  '../src/views/sampling/SamplingPlannerView.vue',
  '../src/views/product-support/ProductSupportWarehouseView.vue'
]

for (const path of nonTodoPages) {
  assert.doesNotMatch(source(path), /FlowStatusSummary/, `${path} is not a role todo page`)
}
