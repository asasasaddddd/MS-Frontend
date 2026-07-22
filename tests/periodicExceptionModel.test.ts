import assert from 'node:assert/strict'

import {
  buildPeriodicExceptionDisposeRequest,
  buildPeriodicExceptionChangeRequest,
  canDisposePeriodicException,
  canSubmitPeriodicException,
  maxPeriodicVerificationCycleMonth,
  periodicExceptionSubmitNodeCodes,
  periodicExceptionHandlingType,
  periodicCycleExtensionOptions
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

assert.deepEqual(periodicExceptionSubmitNodeCodes, ['plan_confirm'])
assert.equal(
  canSubmitPeriodicException({
    currentNode: 'plan_confirm',
    taskStatus: 'pending',
    physicalStatus: 'wait_verifier_receive'
  }),
  true
)
assert.equal(
  canSubmitPeriodicException({
    currentNode: 'plan_issue',
    taskStatus: 'pending',
    physicalStatus: 'wait_verifier_receive'
  }),
  false
)
assert.equal(
  canSubmitPeriodicException({
    currentNode: 'plan_confirm',
    taskStatus: 'pending',
    physicalStatus: 'verifier_received'
  }),
  false
)
assert.equal(
  canSubmitPeriodicException({
    currentNode: 'plan_confirm',
    taskStatus: 'exception',
    physicalStatus: 'wait_verifier_receive'
  }),
  false
)
assert.equal(
  canSubmitPeriodicException({
    currentNode: 'exception_disposal',
    taskStatus: 'exception',
    physicalStatus: 'wait_verifier_receive'
  }),
  false
)
assert.equal(
  canDisposePeriodicException({
    currentNode: 'exception_disposal',
    taskStatus: 'exception',
    relatedChangeOrderId: '9001'
  }),
  true
)
assert.equal(
  canDisposePeriodicException({ currentNode: 'exception_disposal', taskStatus: 'exception' }),
  false
)
assert.deepEqual(
  buildPeriodicExceptionDisposeRequest({
    id: '2001',
    currentNode: 'exception_disposal',
    taskStatus: 'exception',
    exceptionFlowType: 'cycle',
    relatedChangeOrderId: '9001'
  }),
  {
    taskId: '2001',
    handlingType: 'change',
    relatedChangeOrderId: '9001',
    opinion: '状态变更审批完成，关闭周检异常任务'
  }
)

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
  adjustmentReason: '风险降低',
  scrapType: 'damaged'
})
assert.equal(category.changeType, 'category')
assert.equal(category.items[0].newCategory, 'C')
assert.equal(category.items[0].adjustmentReason, '风险降低')
assert.equal(periodicExceptionHandlingType('category'), 'change')

assert.throws(
  () => buildPeriodicExceptionChangeRequest(
    { ...task, manageCategory: 'C' },
    applicant,
    {
      actionType: 'category',
      adjustmentReason: '重复调整',
      scrapType: 'damaged'
    }
  ),
  /C类设备不能再次发起周检管理类别调整/
)

const cycle = buildPeriodicExceptionChangeRequest(task, applicant, {
  actionType: 'cycle',
  newCycleMonth: 24,
  adjustmentReason: '使用频次降低',
  scrapType: 'damaged'
})
assert.equal(cycle.changeType, 'cycle')
assert.equal(cycle.items[0].newCycleMonth, 24)
assert.equal(periodicExceptionHandlingType('cycle'), 'change')

const taskWithLongerCycle = {
  ...task,
  id: '2073579908903317507',
  deviceId: '2073579908903317508',
  deviceCode: 'JL20240000020',
  verificationCycleMonth: 24
}
assert.equal(maxPeriodicVerificationCycleMonth([task, taskWithLongerCycle]), 24)
assert.deepEqual(
  periodicCycleExtensionOptions(
    [
      { label: '6', value: 6 },
      { label: '12', value: 12 },
      { label: '24', value: 24 },
      { label: '36', value: 36 }
    ],
    [task, taskWithLongerCycle]
  ).map((option) => option.value),
  [36]
)

assert.throws(
  () => buildPeriodicExceptionChangeRequest(task, applicant, {
    actionType: 'cycle',
    newCycleMonth: 12,
    adjustmentReason: '保持周期',
    scrapType: 'damaged'
  }),
  /调整后检定周期必须大于当前检定周期/
)

assert.throws(
  () => buildPeriodicExceptionChangeRequest(task, applicant, {
    actionType: 'cycle',
    newCycleMonth: 6,
    adjustmentReason: '缩短周期',
    scrapType: 'damaged'
  }),
  /调整后检定周期必须大于当前检定周期/
)

assert.throws(
  () => buildPeriodicExceptionChangeRequest(
    { ...task, verificationCycleMonth: undefined },
    applicant,
    {
      actionType: 'cycle',
      newCycleMonth: 24,
      adjustmentReason: '缺少原周期',
      scrapType: 'damaged'
    }
  ),
  /缺少有效的当前检定周期/
)
