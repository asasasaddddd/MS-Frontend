import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { deriveVerificationResult } from '../src/views/firstcheck/firstCheckVerificationResultModel.ts'

assert.equal(deriveVerificationResult(1, 0), 'qualified')
assert.equal(deriveVerificationResult(0, 1), 'unqualified')
assert.equal(deriveVerificationResult(1, 1), 'partial')

const dialog = readFileSync(
  new URL('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue', import.meta.url),
  'utf8'
)

assert.doesNotMatch(dialog, /form\.verificationResult/)
assert.doesNotMatch(dialog, /<span>检定结果<\/span>/)
assert.doesNotMatch(dialog, /\{ label: '部分合格', value: 'partial' \}/)
assert.match(dialog, /verificationResult:\s*deriveVerificationResult\(/)
assert.match(
  dialog,
  /<span>合格数量<\/span><a-input-number[^>]*v-model:value="form\.qualifiedQuantity"[^>]*:min="0"/
)
assert.match(dialog, /:disabled="Number\(form\.qualifiedQuantity \|\| 0\) > 0 && !reservationReady"/)
assert.match(
  dialog,
  /v-if="Number\(form\.qualifiedQuantity \|\| 0\) > 0"[^>]*:loading="reserving"[^>]*@click="generateDeviceCodes"/
)
