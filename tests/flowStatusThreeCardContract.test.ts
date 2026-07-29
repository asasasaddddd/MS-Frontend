import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import type { FlowSummary } from '../src/types/flowSummary.ts'
import * as flowDefinitions from '../src/components/workflow/flowStatusDefinitions.ts'

const component = readFileSync(
  new URL('../src/components/workflow/FlowStatusSummary.vue', import.meta.url),
  'utf8'
)

const emptySummary: FlowSummary = {
  businessType: 'ALL',
  scope: 'all',
  snapshotAt: '2026-07-27T18:10:00',
  overview: [],
  dimensions: []
}

assert.match(component, /todayMetric/)
assert.match(component, /pendingMetric/)
assert.match(component, /summary-three-card-grid/)
assert.match(component, /status-summary-card/)
assert.doesNotMatch(component, /:image="null"/)
assert.match(component, /:image="false"/)
assert.match(component, /今日新增/)
assert.match(component, /当前待办/)
assert.equal(flowDefinitions.buildFlowStatusViewModel(emptySummary).overview.length, 2)
assert.deepEqual(
  (flowDefinitions as Record<string, unknown>).globalSummaryStatusLabels,
  ['首次检定', '周检计划', '状态变更', '抽检计划', '产品配套']
)
