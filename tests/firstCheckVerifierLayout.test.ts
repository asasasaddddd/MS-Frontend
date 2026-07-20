import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue', import.meta.url),
  'utf8'
)

assert.doesNotMatch(source, /<label><span>检定日期<\/span>/)
assert.doesNotMatch(source, /<label><span>有效期<\/span>/)
assert.match(source, /<a-table-column title="检定日期">[\s\S]*v-model:value="form\.verificationDate"/)
assert.match(source, /<a-table-column title="有效期">[\s\S]*v-model:value="form\.validUntil"/)
