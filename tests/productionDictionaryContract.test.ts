import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const api = source('../src/api/dict.ts')
const dictionaries = source('../src/composables/useProductionDictionaries.ts')
const firstCheck = source('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue')
const ledger = source('../src/views/device/DeviceLedgerEditForm.vue')
const changeApply = source('../src/views/change/components/ChangeApplyDialog.vue')
const changeVerifier = source('../src/views/change/components/ChangeVerifierHandleDialog.vue')
const periodicException = source('../src/views/periodic/components/PeriodicExceptionDialog.vue')
const changeModel = source('../src/views/change/changeVerifierDialogModel.ts')

assert.match(api, /\/dict\/item\/listByType/)
assert.match(api, /DictItemVO/)

for (const typeCode of [
  'device_usage',
  'verification_cycle_month',
  'subject_category',
  'subject_subcategory',
  'special_project'
]) {
  assert.ok(dictionaries.includes(typeCode), `缺少生产字典类型：${typeCode}`)
}

assert.match(dictionaries, /parentItemCode/)
assert.match(dictionaries, /positiveVerificationCycleOptions/)
assert.match(dictionaries, /loadProductionDictionaries/)

for (const component of [firstCheck, ledger, changeApply, changeVerifier, periodicException]) {
  assert.match(component, /useProductionDictionaries/)
}

assert.doesNotMatch(firstCheck, /工艺控制|质量检验|试验验证|温度 010101|卡尺 050102/)
assert.doesNotMatch(ledger, /工艺控制|质量检验|试验验证|温度 010101|卡尺 050102/)
assert.doesNotMatch(changeModel, /verificationCycleOptions\s*=\s*\[/)
assert.doesNotMatch(changeApply, /const cycleOptions\s*=\s*\[/)
assert.doesNotMatch(periodicException, /label: '3个月'[\s\S]*label: '36个月'/)

assert.match(firstCheck, /:options="specialProjectOptions"/)
assert.match(ledger, /:options="currentSpecialProjectOptions"/)
