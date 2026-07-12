import assert from 'node:assert/strict'

import {
  buildPeriodicScanRequest,
  buildPeriodicVerificationRecordRequest,
  isPeriodicSecondJudgeDisposal,
  periodicEndpoint,
  periodicNodeName
} from '../src/api/periodicContract.ts'

assert.equal(periodicEndpoint('myTasks'), '/periodic/my-tasks')
assert.equal(periodicEndpoint('generateTestPlan'), '/periodic/plans/generate-test-one')
assert.equal(periodicEndpoint('supplierFillInfo'), '/periodic/supplier-fill-info')
assert.equal(periodicEndpoint('responsibleSecondJudge'), '/periodic/responsible-second-judge')
assert.equal(periodicEndpoint('secondJudge'), '/periodic/second-judge')

assert.equal(periodicNodeName('supplier_fill_info'), '外扩人员填写检定信息')
assert.equal(periodicNodeName('responsible_second_judge'), '责任工程师二次判定')
assert.equal(periodicNodeName('external_third_judge'), '外委检定员三次判定')

assert.equal(isPeriodicSecondJudgeDisposal('qualified'), true)
assert.equal(isPeriodicSecondJudgeDisposal('repair'), true)
assert.equal(isPeriodicSecondJudgeDisposal('scrap'), true)
assert.equal(isPeriodicSecondJudgeDisposal('accept'), false)
assert.equal(isPeriodicSecondJudgeDisposal('unqualified'), false)

const longTaskId = '2073579908903317505'

assert.deepEqual(
  buildPeriodicScanRequest({
    taskId: longTaskId,
    scanCode: '  JL20240000019  '
  }),
  {
    taskId: longTaskId,
    scanCode: 'JL20240000019',
    scanContent: 'JL20240000019',
    scanLocation: '现场扫码'
  }
)

const verificationPayload = buildPeriodicVerificationRecordRequest({
  taskId: longTaskId,
  result: 'qualified',
  forceValidUntil: true,
  confirmationRequired: false,
  certificateAttachmentGroupId: '2073579912313286657'
})

assert.equal(verificationPayload.taskId, longTaskId)
assert.equal(typeof verificationPayload.taskId, 'string')
assert.equal(verificationPayload.forceValidUntil, 1)
assert.equal(verificationPayload.confirmationRequired, 0)
assert.equal(verificationPayload.certificateAttachmentGroupId, '2073579912313286657')
assert.equal(typeof verificationPayload.certificateAttachmentGroupId, 'string')
