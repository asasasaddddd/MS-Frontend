import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const formSource = readFileSync(new URL('../src/views/device/DeviceLedgerEditForm.vue', import.meta.url), 'utf8')
const apiSource = readFileSync(new URL('../src/api/device.ts', import.meta.url), 'utf8')
const typeSource = readFileSync(new URL('../src/types/device.ts', import.meta.url), 'utf8')

for (const text of ['设备名称', '规格型号', '设备用途', '学科大类', '学科小类', '是否强检', '确认间隔', '检定周期', '检定方式', '是否通用设备']) {
  assert.equal(formSource.includes(text), true, '编辑表单缺少字段: ' + text)
}

assert.match(formSource, /a-select/)
assert.match(formSource, /type="date"/)
assert.match(formSource, /a-textarea/)
assert.match(apiSource, /updateDeviceLedger/)
assert.match(apiSource, /updateDeviceStorageLocation/)
assert.match(typeSource, /DeviceLedgerUpdateRequest/)
