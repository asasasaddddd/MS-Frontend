import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(
  new URL('../src/views/cost/CostListView.vue', import.meta.url),
  'utf8'
)
const ledgerSource = readFileSync(
  new URL('../src/views/device/DeviceLedgerView.vue', import.meta.url),
  'utf8'
)

assert.equal(source.includes('backendSummary'), false)
assert.equal(source.includes('getCostSummary'), false)
assert.equal(source.includes('total: sumCost(targetRows)'), true)
assert.equal(source.includes('count: targetRows.length'), true)
assert.equal(ledgerSource.includes('device.verificationCost'), true)
assert.equal(ledgerSource.includes('device.selfCost'), false)
assert.equal(ledgerSource.includes('device.sendoutCost'), false)
