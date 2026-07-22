import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const dialog = source('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue')
const table = source('../src/views/firstcheck/components/FirstCheckQualifiedDeviceTable.vue')

assert.match(dialog, /每台合格设备都必须填写检定日期/)
assert.doesNotMatch(dialog, /外委设备必须逐台上传检定证书/)
assert.doesNotMatch(dialog, /:attachment-required=/)

assert.match(table, /检定日期[\s\S]*required/)
assert.match(table, /检定证书（选传）/)
assert.doesNotMatch(table, /attachmentRequired|检定证书（必传）/)
