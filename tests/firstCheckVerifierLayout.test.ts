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
assert.doesNotMatch(source, /<span>检定证书\/报告附件<\/span>/)
assert.equal((source.match(/business-type="FIRST_CHECK_CERTIFICATE"/g) || []).length, 1)
assert.doesNotMatch(source, /\{ label: '停用', value: 'stopped' \}/)
assert.match(
  source,
  /<span>标准器<\/span>[\s\S]*?v-model:value="form\.standardDevice"[\s\S]*?\{ label: '否', value: '否' \}[\s\S]*?\{ label: '是', value: '是' \}/
)
assert.match(source, /\{ label: '一次检定', value: '一次检定' \}/)
assert.doesNotMatch(source, /\{ label: '自然', value: '自然' \}/)
assert.match(source, /\{ label: '12', value: 12 \}/)
assert.match(source, /\{ label: '6', value: 6 \}/)
assert.match(source, /\{ label: '24', value: 24 \}/)
assert.doesNotMatch(source, /\{ label: '\d+个月', value: \d+ \}/)
