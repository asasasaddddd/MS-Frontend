import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const summaryComponentSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicPlanSummary.vue', import.meta.url),
  'utf8'
)
const workspaceSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicTaskWorkspace.vue', import.meta.url),
  'utf8'
)
const displayModelSource = readFileSync(
  new URL('../src/views/periodic/periodicDisplayModel.ts', import.meta.url),
  'utf8'
)

assert.match(summaryComponentSource, /FlowStatusSummary/)
assert.match(summaryComponentSource, /summary\??:\s*FlowSummary\s*\|\s*null/)
assert.doesNotMatch(summaryComponentSource, /tasks\??\s*:/)
assert.doesNotMatch(summaryComponentSource, /buildPeriodicPlanSummary/)

assert.match(workspaceSource, /getPeriodicPlanFlowSummary/)
assert.match(workspaceSource, /periodicFlowSummary/)
assert.match(workspaceSource, /:summary="periodicFlowSummary"/)
assert.doesNotMatch(workspaceSource, /:tasks="scopedSummaryTasks"/)
assert.doesNotMatch(workspaceSource, /setInterval|setTimeout/)

assert.doesNotMatch(displayModelSource, /function buildPeriodicPlanSummary/)
assert.doesNotMatch(displayModelSource, /function countTasks/)

