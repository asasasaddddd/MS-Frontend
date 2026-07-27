import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

/** 旧模块汇总客户端必须清空，所有角色待办汇总只走 workflow API。 */
const apiSource = readFileSync(new URL('../src/api/flowSummary.ts', import.meta.url), 'utf8')

assert.doesNotMatch(apiSource, /\/periodic\/plans\/.*\/summary/)
assert.doesNotMatch(apiSource, /\/firstcheck\/summary/)
assert.doesNotMatch(apiSource, /\/change\/summary/)
assert.doesNotMatch(apiSource, /\/sampling\/plans\/.*\/summary/)
assert.doesNotMatch(apiSource, /\/product-support\/my-tasks\/summary/)
assert.doesNotMatch(apiSource, /getPeriodicPlanFlowSummary|getChangeFlowSummary|getSamplingPlanFlowSummary/)
assert.doesNotMatch(apiSource, /setInterval|setTimeout/)
