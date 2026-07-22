import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const apiSource = source('../src/api/flowSummary.ts')
const summaryComponentSource = source('../src/views/sampling/components/SamplingPlanSummary.vue')
const workspaceSource = source('../src/views/sampling/components/SamplingTaskWorkspace.vue')
const displayModelSource = source('../src/views/sampling/samplingDisplayModel.ts')
const roleViewSources = [
  source('../src/views/sampling/SamplingAdminView.vue'),
  source('../src/views/sampling/SamplingVerifierView.vue'),
  source('../src/views/sampling/SamplingConfirmerView.vue')
]

assert.match(apiSource, /function getSamplingPlanFlowSummary/)
assert.match(apiSource, /\/sampling\/plans\/\$\{encodeURIComponent\(String\(planId\)\)\}\/summary/)

assert.match(summaryComponentSource, /FlowStatusSummary/)
assert.match(summaryComponentSource, /summary\??:\s*FlowSummary\s*\|\s*null/)
assert.match(summaryComponentSource, /title="抽检流程汇总"/)
assert.doesNotMatch(summaryComponentSource, /tasks\??\s*:/)
assert.doesNotMatch(summaryComponentSource, /buildSamplingPlanSummary/)
assert.doesNotMatch(summaryComponentSource, /外委|扫码/)

assert.match(workspaceSource, /getSamplingPlanFlowSummary/)
assert.match(workspaceSource, /samplingFlowSummary/)
assert.match(workspaceSource, /Promise\.allSettled/)
assert.match(workspaceSource, /summaryResult\.status === 'fulfilled'/)
assert.match(workspaceSource, /:summary="samplingFlowSummary"/)
assert.doesNotMatch(workspaceSource, /:tasks="scopedSummaryTasks"/)
assert.doesNotMatch(workspaceSource, /setInterval|setTimeout/)

assert.equal(roleViewSources.every((viewSource) => viewSource.includes('SamplingTaskWorkspace')), true)

assert.doesNotMatch(displayModelSource, /interface SamplingPlanSummary/)
assert.doesNotMatch(displayModelSource, /interface SamplingPlanMetric/)
assert.doesNotMatch(displayModelSource, /function buildSamplingPlanSummary/)
assert.doesNotMatch(displayModelSource, /function countTasks|function nodeIn/)
