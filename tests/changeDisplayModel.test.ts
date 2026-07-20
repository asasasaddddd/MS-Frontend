import assert from 'node:assert/strict'

import {
  changeStatusName,
  changeTypeName,
  changeTypeTitle,
  formatCycleMonth,
  normalizeCategory,
  normalizeCategoryCode,
  normalizeChangeType
} from '../src/views/change/changeDisplayModel.ts'
import { buildChangeSubmitRequest } from '../src/api/changeContract.ts'

assert.equal(changeTypeName('seal'), '封存')
assert.equal(changeTypeName('cycle'), '检定周期调整')
assert.equal(changeTypeTitle('precheck'), '用前检定')
assert.equal(normalizeChangeType('scrap'), 'scrap')

assert.equal(normalizeCategory('A'), 'A类')
assert.equal(normalizeCategory('B类'), 'B类')
assert.equal(normalizeCategoryCode('C类'), 'C')
assert.equal(formatCycleMonth(12), '12个月')
assert.equal(changeStatusName('running'), '流转中')

const payload = buildChangeSubmitRequest({
  changeType: 'cycle',
  reason: '周期调整',
  items: [{ deviceId: '1', deviceCode: 'JL-1', newCycleMonth: 12 }]
})

assert.equal(payload.changeType, 'cycle')
assert.equal(payload.items[0].newCycleMonth, 12)
