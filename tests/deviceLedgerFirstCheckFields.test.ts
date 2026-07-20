import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const typeSource = readFileSync(new URL('../src/types/device.ts', import.meta.url), 'utf8')
const viewSource = readFileSync(new URL('../src/views/device/DeviceLedgerView.vue', import.meta.url), 'utf8')

assert.match(typeSource, /supplierName\?:\s*string/)
assert.match(typeSource, /usageScenario\?:\s*string/)
assert.match(viewSource, /供应商名称[\s\S]*device\.supplierName/)
assert.match(viewSource, /设备使用场景[\s\S]*device\.usageScenario/)
