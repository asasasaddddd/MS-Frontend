import assert from 'node:assert/strict'

import {
  buildPeriodicExceptionChangeRequest,
  canSubmitPeriodicException,
  periodicExceptionSubmitNodeCodes,
  periodicExceptionHandlingType
} from '../src/views/periodic/periodicExceptionModel.ts'

const task = {
  id: '2073579908903317505',
  planId: '2073579908903317500',
  deviceId: '2073579908903317506',
  deviceCode: 'JL20240000019',
  deviceName: '压力表',
  modelSpec: 'Y-100',
  factoryCode: 'FC-001',
  deptId: 'G10030500',
  deptName: '重一分厂',
  manageCategory: 'B',
  verificationCycleMonth: 12,
  validUntil: '2026-08-31'
}

const applicant = {
  employeeId: 'U03013971',
  employeeName: '管理员',
  deptId: 'G10030500',
  deptName: '重一分厂'
}

assert.deepEqual(periodicExceptionSubmitNodeCodes, ['plan_issue', 'plan_confirm', 'manager_receive'])
assert.equal(canSubmitPeriodicException({ currentNode: 'plan_confirm' }), true)
assert.equal(canSubmitPeriodicException({ currentNode: 'manager_receive' }), true)
assert.equal(canSubmitPeriodicException({ currentNode: 'exception_disposal' }), false)
assert.equal(canSubmitPeriodicException({ currentNode: 'exception_disposal', taskStatus: 'exception' }), false)
assert.equal(canSubmitPeriodicException({ currentNode: 'manager_receive', taskStatus: 'completed' }), false)
assert.equal(canSubmitPeriodicException({ currentNode: 'manager_receive', taskStatus: 'rejected' }), false)
assert.equal(canSubmitPeriodicException({ currentNode: 'manager_receive', taskStatus: 'cancelled' }), false)

const seal = buildPeriodicExceptionChangeRequest(task, applicant, {
  actionType: 'seal',
  attachmentGroupId: '8801',
  sealReason: '长期停用',
  scrapType: 'damaged'
})
assert.equal(seal.changeType, 'seal')
assert.equal(seal.sourceType, 'periodic')
assert.equal(seal.sourceId, '2073579908903317500')
assert.equal(typeof seal.sourceId, 'string')
assert.equal(seal.attachmentGroupId, '8801')
assert.equal(seal.items[0].deviceId, '2073579908903317506')
assert.equal(seal.items[0].sealReason, '长期停用')
assert.equal(seal.items[0].newStatus, 'sealed')
assert.equal(periodicExceptionHandlingType('seal'), 'seal')

const defer = buildPeriodicExceptionChangeRequest(task, applicant, {
  actionType: 'defer',
  deferReason: '现场暂不具备送检条件',
  scrapType: 'damaged'
})
assert.equal(defer.changeType, 'precheck')
assert.equal(defer.items[0].verificationReason, '现场暂不具备送检条件')
assert.equal(defer.items[0].precheckRequired, 1)
assert.equal(periodicExceptionHandlingType('defer'), 'defer')

const category = buildPeriodicExceptionChangeRequest(task, applicant, {
  actionType: 'category',
  newCategory: 'C类',
  adjustmentReason: '风险降低',
  scrapType: 'damaged'
})
assert.equal(category.changeType, 'category')
assert.equal(category.items[0].newCategory, 'C')
assert.equal(category.items[0].adjustmentReason, '风险降低')
assert.equal(periodicExceptionHandlingType('category'), 'change')

const cycle = buildPeriodicExceptionChangeRequest(task, applicant, {
  actionType: 'cycle',
  newCycleMonth: 24,
  adjustmentReason: '使用频次降低',
  scrapType: 'damaged'
})
assert.equal(cycle.changeType, 'cycle')
assert.equal(cycle.items[0].newCycleMonth, 24)
assert.equal(periodicExceptionHandlingType('cycle'), 'change')
