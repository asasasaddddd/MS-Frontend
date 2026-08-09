import assert from 'node:assert/strict'

import {
  changeNodeName,
  changeStatusName,
  changeTypeMetas,
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
assert.equal(changeTypeName('defer'), '缓检')
assert.equal(changeTypeTitle('defer'), '缓检')
assert.equal(normalizeChangeType('scrap'), 'scrap')
assert.deepEqual(
  changeTypeMetas.map(({ value }) => value),
  ['seal', 'enable', 'transfer', 'category', 'cycle', 'scrap', 'precheck'],
  '缓检只能从周检发起，状态变更手工申请入口不得出现 defer'
)

assert.equal(normalizeCategory('A'), 'A类')
assert.equal(normalizeCategory('B类'), 'B类')
assert.equal(normalizeCategoryCode('C类'), 'C')
assert.equal(formatCycleMonth(12), '12个月')
assert.equal(changeStatusName('running'), '流转中')
assert.equal(changeNodeName('manager_forward_confirm'), '管理员转办确认员')
assert.equal(changeNodeName('confirmer_confirm'), '确认员确认')
assert.equal(changeNodeName('label_print'), '检定员打印标签')
assert.equal(changeNodeName('admin_take_back'), '管理员取回')

const payload = buildChangeSubmitRequest({
  changeType: 'cycle',
  reason: '周期调整',
  items: [{ deviceId: '1', deviceCode: 'JL-1', newCycleMonth: 12 }]
})

assert.equal(payload.changeType, 'cycle')
assert.equal(payload.items[0].newCycleMonth, 12)
