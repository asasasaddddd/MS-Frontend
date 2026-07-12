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
