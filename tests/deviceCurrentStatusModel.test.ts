import assert from 'node:assert/strict'

import { resolveDeviceCurrentStatus } from '../src/views/device/deviceCurrentStatusModel.ts'

assert.deepEqual(
  resolveDeviceCurrentStatus({
    deviceStatus: 'repair',
    verificationStatus: 'periodic_check',
    sourceType: 'periodic',
    sourceOrderId: '1001'
  }),
  { code: 'repair', text: '维修中', color: 'orange', intermediate: true }
)

assert.equal(resolveDeviceCurrentStatus({ deviceStatus: '在用', verificationStatus: '首检中' }).text, '首检中')
assert.equal(resolveDeviceCurrentStatus({ deviceStatus: 'in_use', verificationStatus: 'periodic_check' }).text, '周检中')
assert.equal(resolveDeviceCurrentStatus({ deviceStatus: 'in_use', verificationStatus: '抽检中' }).text, '抽检中')
assert.equal(resolveDeviceCurrentStatus({ deviceStatus: 'in_use', verificationStatus: '用前检定中' }).text, '用前检定中')

assert.equal(
  resolveDeviceCurrentStatus({
    deviceStatus: 'in_use',
    verificationStatus: '检定完成',
    sourceType: 'PERIODIC',
    sourceOrderId: 2001
  }).text,
  '在用'
)
assert.equal(
  resolveDeviceCurrentStatus({
    deviceStatus: 'in_use',
    verificationStatus: 'none',
    sourceType: 'sampling',
    sourceOrderId: 2002
  }).text,
  '在用'
)

assert.deepEqual(
  resolveDeviceCurrentStatus({ deviceStatus: '在用', sourceType: 'periodic' }),
  { code: 'in_use', text: '在用', color: 'green', intermediate: false }
)
assert.deepEqual(
  resolveDeviceCurrentStatus({ deviceStatus: '封存' }),
  { code: 'sealed', text: '封存', color: 'orange', intermediate: false }
)

assert.deepEqual(
  resolveDeviceCurrentStatus({ deviceStatus: 'sealed', verificationStatus: 'deferred' }),
  { code: 'sealed', text: '封存', color: 'orange', intermediate: false }
)
assert.deepEqual(
  resolveDeviceCurrentStatus({ deviceStatus: 'scrapped', verificationStatus: 'deferred' }),
  { code: 'scrapped', text: '已报废', color: 'red', intermediate: false }
)
assert.deepEqual(
  resolveDeviceCurrentStatus({ deviceStatus: 'in_use', verificationStatus: 'deferred' }),
  { code: 'deferred', text: '缓检', color: 'orange', intermediate: true }
)
