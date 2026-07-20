import assert from 'node:assert/strict'

import {
  buildChangeSubmitRequest,
  changeEndpoint,
  changeTypeName
} from '../src/api/changeContract.ts'
import {
  buildCostManualRequest,
  buildCostCancelRequest,
  buildCostUpdateRequest,
  costEndpoint
} from '../src/api/costContract.ts'

assert.equal(changeEndpoint('submit'), '/change/submit')
assert.equal(changeEndpoint('detail', '2073579908903317505'), '/change/detail/2073579908903317505')
assert.equal(changeTypeName('category'), '管理类别调整')
assert.equal(changeTypeName('cycle'), '检定周期调整')

const change = buildChangeSubmitRequest({
  changeType: 'seal',
  applyDeptId: 'G10030500',
  applyDeptName: '重一分厂',
  reason: '停用封存',
  sourceType: 'periodic',
  sourceId: '2073579908903317505',
  items: [
    {
      deviceId: '2073579908903317506',
      deviceCode: 'JL20240000019',
      sealReason: '停用封存'
    }
  ]
})

assert.equal(change.sourceId, '2073579908903317505')
assert.equal(typeof change.sourceId, 'string')
assert.equal(change.items[0].deviceId, '2073579908903317506')
assert.equal(typeof change.items[0].deviceId, 'string')

assert.equal(costEndpoint('records'), '/cost/records')
assert.equal(costEndpoint('summary'), '/cost/summary')
assert.equal(costEndpoint('manual'), '/cost/manual')

const costUpdate = buildCostUpdateRequest({
  recordId: '2073579908903317507',
  amount: 1200,
  currency: 'CNY'
})

assert.equal(costUpdate.recordId, '2073579908903317507')
assert.equal(typeof costUpdate.recordId, 'string')

const costCancel = buildCostCancelRequest({
  recordId: '2073579908903317508',
  reason: '外观确认不产生费用'
})

assert.equal(costCancel.recordId, '2073579908903317508')
assert.equal(typeof costCancel.recordId, 'string')

const manualCost = buildCostManualRequest({
  deviceCode: 'JL20260001',
  amount: 88,
  occurredAt: '2026-07-07T00:00:00'
})

assert.equal(manualCost.costType, 'other')
assert.equal(manualCost.currency, 'CNY')
assert.equal(manualCost.deviceCode, 'JL20260001')
