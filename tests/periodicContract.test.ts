import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

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

const periodicWorkspaceSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicTaskWorkspace.vue', import.meta.url),
  'utf8'
)
assert.match(periodicWorkspaceSource, /数智部王熙然名下/)
assert.match(periodicWorkspaceSource, /外委通用设备/)
assert.match(periodicWorkspaceSource, /外委否通用设备/)
assert.match(periodicWorkspaceSource, /testPlanScenario/)
assert.match(periodicWorkspaceSource, /提交异常分支/)
assert.match(periodicWorkspaceSource, /转发确认员/)
assert.match(periodicWorkspaceSource, /submitForwardSelection/)
assert.doesNotMatch(periodicWorkspaceSource, /normalSubmit|submitNormalSelection|进入正常检定/)

const periodicApiSource = readFileSync(new URL('../src/api/periodic.ts', import.meta.url), 'utf8')
assert.match(periodicApiSource, /generatePeriodicTestPlan\(scenario: PeriodicTestPlanScenario\)/)
assert.match(periodicApiSource, /params:\s*\{ scenario \}/)
assert.doesNotMatch(periodicApiSource, /normalSubmit|submitPeriodicNormalTasks/)

const periodicContractSource = readFileSync(new URL('../src/api/periodicContract.ts', import.meta.url), 'utf8')
assert.doesNotMatch(periodicContractSource, /normalSubmit|normal-submit/)

const periodicTypeSource = readFileSync(new URL('../src/types/periodic.ts', import.meta.url), 'utf8')
assert.match(periodicTypeSource, /'self'/)
assert.match(periodicTypeSource, /'external_common'/)
assert.match(periodicTypeSource, /'external_non_common'/)
assert.doesNotMatch(periodicTypeSource, /PeriodicNormalSubmitRequest/)

const periodicPlanSummarySource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicPlanSummary.vue', import.meta.url),
  'utf8'
)
assert.doesNotMatch(periodicPlanSummarySource, /计划基本信息/)

const periodicDetailSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicDetailDialog.vue', import.meta.url),
  'utf8'
)
assert.doesNotMatch(periodicDetailSource, /计划基本信息|PeriodicPlanVO|plan\?\./)
assert.doesNotMatch(periodicWorkspaceSource, /getPeriodicPlan\(|currentPlan|:plan="currentPlan"/)

const periodicAdminSource = readFileSync(
  new URL('../src/views/periodic/PeriodicAdminView.vue', import.meta.url),
  'utf8'
)
assert.match(periodicAdminSource, /周检待办明细/)
assert.doesNotMatch(periodicAdminSource, /manager_receive/)

const routerSource = readFileSync(new URL('../src/router/index.ts', import.meta.url), 'utf8')
assert.match(routerSource, /周检计量管理员详情单/)

const scanSource = readFileSync(new URL('../src/api/scan.ts', import.meta.url), 'utf8')
assert.doesNotMatch(scanSource, /periodic-manager-receive/)
