import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import * as changeContract from '../src/api/changeContract.ts'

const identity = {
  orderId: '2080000000000000001',
  taskId: '2080000000000000002',
  rowVersion: 4
}
const revision = {
  ...identity,
  reason: '按退回意见补充检定路径',
  remark: '管理员修订',
  attachmentGroupId: '2080000000000000003',
  opinion: '已按退回意见修订',
  items: [{ deviceId: '2080000000000000004' }]
}

assert.equal(changeContract.changeEndpoint('revise' as never), '/change/revise')
assert.equal(typeof (changeContract as Record<string, unknown>).buildChangeReviseRequest, 'function')
assert.deepEqual(
  (changeContract as unknown as { buildChangeReviseRequest: (input: typeof revision) => typeof revision })
    .buildChangeReviseRequest(revision),
  revision
)

const typeSource = readFileSync(new URL('../src/types/change.ts', import.meta.url), 'utf8')
const apiSource = readFileSync(new URL('../src/api/change.ts', import.meta.url), 'utf8')
const workflowSource = readFileSync(new URL('../src/workflows/metrologyWorkflow.ts', import.meta.url), 'utf8')
const displaySource = readFileSync(new URL('../src/views/change/changeDisplayModel.ts', import.meta.url), 'utf8')
const adminSource = readFileSync(
  new URL('../src/views/change/components/ChangeReceiveAdminPanel.vue', import.meta.url),
  'utf8'
)
const applyDialogSource = readFileSync(
  new URL('../src/views/change/components/ChangeApplyDialog.vue', import.meta.url),
  'utf8'
)
const approvalDialogSource = readFileSync(
  new URL('../src/views/change/components/ChangeApprovalDialog.vue', import.meta.url),
  'utf8'
)

assert.match(
  typeSource,
  /interface ChangeReviseRequest \{[\s\S]*?orderId:\s*EntityId[\s\S]*?taskId:\s*EntityId[\s\S]*?rowVersion:\s*EntityId[\s\S]*?reason\?:\s*string[\s\S]*?remark\?:\s*string[\s\S]*?attachmentGroupId\?:\s*EntityId[\s\S]*?opinion:\s*string[\s\S]*?items:\s*ChangeItemSubmitRequest\[\]/
)
assert.match(apiSource, /function reviseChange\([\s\S]*changeEndpoint\('revise'\)[\s\S]*buildChangeReviseRequest\(data\)/)
assert.match(workflowSource, /code:\s*'manager_revise'[\s\S]*module:\s*'change'[\s\S]*RESUBMIT[\s\S]*\/api\/change\/revise/)
assert.match(workflowSource, /receiveAdmin:\s*\[[^\]]*'manager_revise'[^\]]*'receive_admin_confirm'/)
assert.match(displaySource, /CHANGE_REVISE_ACTION\s*=\s*'RESUBMIT'/)
assert.match(displaySource, /manager_revise:\s*'[^']+'/)
assert.match(adminSource, /reviseChange/)
assert.match(adminSource, /ChangeApplyDialog/)
assert.match(adminSource, /row\.nodeCode\s*===\s*'manager_revise'/)
assert.match(adminSource, /taskId:\s*order\.taskId/)
assert.match(adminSource, /rowVersion:\s*order\.rowVersion/)
assert.match(adminSource, /items:\s*payload\.items/)
assert.match(adminSource, /opinion:\s*payload\.opinion/)
assert.match(adminSource, /originalDeviceIds[\s\S]*revisedDeviceIds/)

assert.doesNotMatch(applyDialogSource, /precheckRequired:\s*(?:undefined as )?number \| undefined/)
assert.doesNotMatch(applyDialogSource, /verificationMethod:\s*undefined as string \| undefined/)
assert.match(applyDialogSource, /revisionOpinion:/)
assert.match(
  applyDialogSource,
  /props\.type === 'category'[\s\S]*?newVerificationMethod:\s*device\.verificationMethod/
)
assert.match(
  applyDialogSource,
  /props\.type === 'cycle'[\s\S]*?newVerificationMethod:\s*device\.verificationMethod/
)
assert.doesNotMatch(applyDialogSource, /type === 'category' \|\| type === 'cycle'[\s\S]*?是否检定/)
assert.match(
  applyDialogSource,
  /props\.type === 'precheck'[\s\S]*?newVerificationMethod:\s*device\.verificationMethod/
)
assert.doesNotMatch(applyDialogSource, /props\.type === 'precheck'[\s\S]*?sendOutRequired:/)
assert.doesNotMatch(applyDialogSource, /type === 'precheck'[\s\S]*?v-model:value="form\.verificationMethod"/)

assert.doesNotMatch(approvalDialogSource, /sendOutRequired|sendOutUnit/)
assert.doesNotMatch(approvalDialogSource, /precheckRequired/)
