import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const typeSource = source('../src/types/sampling.ts')
const resultDialogSource = source('../src/views/sampling/components/SamplingResultDialog.vue')
const detailDialogSource = source('../src/views/sampling/components/SamplingDetailDialog.vue')
const workspaceSource = source('../src/views/sampling/components/SamplingTaskWorkspace.vue')
const plannerSource = source('../src/views/sampling/SamplingPlannerView.vue')
const apiSource = source('../src/api/sampling.ts')
const typeSourceFull = source('../src/types/sampling.ts')
const displayModelSource = source('../src/views/sampling/samplingDisplayModel.ts')
const navSource = source('../src/composables/useNavSections.ts')
const todoSource = source('../src/views/WorkspaceTodoView.vue')

assert.equal(typeSource.includes('costAmount'), false)
assert.equal(resultDialogSource.includes('costAmount'), false)
assert.equal(resultDialogSource.includes('allowCost'), false)
assert.equal(resultDialogSource.includes('费用金额'), false)
assert.equal(detailDialogSource.includes('task?.costAmount'), false)
assert.equal(workspaceSource.includes(':allow-cost='), false)
assert.equal(plannerSource.includes("send_out: '外委'"), false)
assert.equal(displayModelSource.includes("external_commission: '外委'"), false)
assert.equal(
  /path:\s*'\/sampling\/verifier'[\s\S]*?roles:\s*\['VERIFIER_SELF'\]/.test(navSource),
  true
)
assert.equal(todoSource.includes("VERIFIER_EXTERNAL: '/sampling/verifier'"), false)
assert.doesNotMatch(plannerSource, /listDevicePage|page\.records\.filter/)
assert.match(plannerSource, /listSamplingEligibleDevices/)
assert.match(plannerSource, /有效期/)
assert.match(plannerSource, /超期年限/)
assert.match(plannerSource, /数据质量/)
assert.match(plannerSource, /eligible\s*!==\s*true/)
assert.match(apiSource, /\/sampling\/eligible-devices/)
assert.match(typeSourceFull, /interface SamplingEligibleDevice/)
assert.match(workspaceSource, /countResult/)
assert.match(workspaceSource, /abnormalReason/)
for (const result of ['normal', 'lost', 'damaged', 'other']) {
  assert.ok(workspaceSource.includes(`value: '${result}'`), `缺少管理员清点结果：${result}`)
}
