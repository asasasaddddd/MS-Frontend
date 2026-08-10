import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const viewSource = readFileSync(new URL('../src/views/change/ChangeApplyView.vue', import.meta.url), 'utf8')
const modelSource = readFileSync(new URL('../src/views/change/changeDisplayModel.ts', import.meta.url), 'utf8')

assert.match(viewSource, /本部门计量设备台账/)
assert.match(viewSource, /row-selection="ledgerRowSelection"/)
assert.match(viewSource, /@click="selectCheckedDevices"/)
assert.match(viewSource, /deviceLedgerDataColumns/)
assert.match(viewSource, /mapDeviceLedgerRow/)
assert.match(viewSource, /column\.key === 'categoryText'/)
assert.match(viewSource, /column\.key === 'statusText'/)
assert.match(viewSource, /deptId:\s*session\.user\?\.deptId\s*\|\|\s*undefined/)
assert.doesNotMatch(viewSource, /deptName:\s*session\.user\?\.deptName/)
assert.doesNotMatch(viewSource, /title:\s*'查看详情'|title:\s*'履历'/)
assert.match(modelSource, /resolveDeviceCurrentStatus/)
