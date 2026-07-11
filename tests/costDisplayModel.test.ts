import assert from 'node:assert/strict'

import {
  buildCostCsv,
  costPageTitle,
  filterCostRows,
  formatMoney,
  groupCostSummary,
  rowQuantity,
  rowUnitPrice,
  sourceTypeName,
  sumCost
} from '../src/views/cost/costDisplayModel.ts'

const rows = [
  {
    id: '1',
    sourceType: 'PERIODIC',
    costType: 'verification',
    costStatus: 'pending',
    deviceCode: 'JL-2026-C-001',
    deviceName: '电子天平',
    amount: 80,
    occurredAt: '2026-06-15T10:00:00'
  },
  {
    id: '2',
    sourceType: 'PRODUCT_SUPPORT',
    costType: 'verification',
    costStatus: 'confirmed',
    deviceCode: 'XM-2026-00123',
    deviceName: '转子类',
    quantity: 10,
    amount: 1800,
    occurredAt: '2026-06-15T10:00:00'
  }
]

assert.equal(costPageTitle('periodic'), '周检费用填写')
assert.equal(costPageTitle('product'), '产品配套费用管理')
assert.equal(costPageTitle('history'), '费用使用清单')

assert.equal(sourceTypeName('PERIODIC'), '周检费用')
assert.equal(sourceTypeName('PRODUCT_SUPPORT'), '产品配套费用')
assert.equal(formatMoney(1880), '¥ 1,880.00')

assert.equal(rowQuantity(rows[0]), 1)
assert.equal(rowQuantity(rows[1]), 10)
assert.equal(rowUnitPrice(rows[1]), 180)
assert.equal(sumCost(rows), 1880)
assert.deepEqual(groupCostSummary(rows).map((item) => item.label), ['周检费用', '产品配套费用'])

assert.deepEqual(
  filterCostRows(rows, {
    sourceType: 'PERIODIC',
    costType: 'all',
    costStatus: 'all',
    deviceCode: '',
    keyword: '',
    startDate: '',
    endDate: ''
  }).map((row) => row.id),
  ['1']
)

assert.deepEqual(
  filterCostRows(rows, {
    sourceType: 'all',
    costType: 'all',
    costStatus: 'all',
    deviceCode: '',
    keyword: '',
    startDate: '2026-06-16',
    endDate: ''
  }).map((row) => row.id),
  []
)

assert.match(buildCostCsv(rows), /费用种类/)
assert.match(buildCostCsv(rows), /JL-2026-C-001/)
