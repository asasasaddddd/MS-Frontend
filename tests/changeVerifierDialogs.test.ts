import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ChangeOrderVO } from '../src/types/change.ts'
import {
  buildChangeVerifierHandleRequest,
  resolveChangeVerifierDialog,
  shouldShowChangeVerifierInspectionFields,
  validateChangeVerifierForm,
  verifierResultOptions,
  type ChangeVerifierFormState
} from '../src/views/change/changeVerifierDialogModel.ts'

const dialogSource = readFileSync(
  new URL('../src/views/change/components/ChangeVerifierHandleDialog.vue', import.meta.url),
  'utf8'
)
const modelSource = readFileSync(
  new URL('../src/views/change/changeVerifierDialogModel.ts', import.meta.url),
  'utf8'
)
const verifierViewSource = readFileSync(
  new URL('../src/views/change/ChangeVerifierView.vue', import.meta.url),
  'utf8'
)
const applyDialogSource = readFileSync(
  new URL('../src/views/change/components/ChangeApplyDialog.vue', import.meta.url),
  'utf8'
)
const receiveAdminSource = readFileSync(
  new URL('../src/views/change/components/ChangeReceiveAdminPanel.vue', import.meta.url),
  'utf8'
)
const productSupportSource = readFileSync(
  new URL('../src/views/product-support/ProductSupportVerifierView.vue', import.meta.url),
  'utf8'
)
const changeTypeSource = readFileSync(new URL('../src/types/change.ts', import.meta.url), 'utf8')

const baseFields = [
  '计量编号',
  '设备名称',
  '规格型号',
  '管理类别',
  '检定方式',
  '有效期',
  '检定周期',
  '使用部门'
]

const verificationFields = [
  '检定日期',
  '有效期',
  '结果判定',
  '责任工程',
  '审批意见'
]

function assertFields(source: string, fields: string[], dialogName: string) {
  fields.forEach((field) => {
    assert.ok(source.includes(field), `${dialogName}缺少原型字段：${field}`)
  })
}

assertFields(dialogSource, baseFields, '状态变更检定员弹窗')
assertFields(dialogSource, verificationFields, '状态变更检定信息区')
assertFields(dialogSource, ['申请时间', '附件', '上传文件', '返回', '提交'], '状态变更操作区')

;[
  '启用信息填写',
  '封存确认',
  '确认报废 / 实物入库',
  '周检报废退回',
  '管理类别调整填写',
  '检定周期调整填写',
  '用前检定填写弹窗',
  '缓检确认'
].forEach((title) => assert.ok(modelSource.includes(title), `缺少动态弹窗标题：${title}`))

assert.deepEqual(
  verifierResultOptions.map(({ label, value }) => ({ label, value })),
  [
    { label: '合格', value: 'qualified' },
    { label: '报废', value: 'scrap' },
    { label: '维修', value: 'repair' }
  ],
  '状态变更检定结果只允许合格、报废和维修'
)

const deferOrder: ChangeOrderVO = {
  id: 'CHANGE-DEFER-1',
  changeType: 'defer',
  taskId: 'TASK-DEFER-1',
  rowVersion: 1,
  reason: '申请缓检',
  items: [{ id: 'ITEM-DEFER-1', verificationReason: '申请缓检' }]
}
const deferConfig = resolveChangeVerifierDialog(deferOrder)
assert.equal(deferConfig.type, 'defer')
assert.equal(deferConfig.title, '缓检确认')
assert.equal(deferConfig.showVerification, false, '缓检不进入检定员，不应展示检定信息')

const transferConfig = resolveChangeVerifierDialog({
  id: 'CHANGE-TRANSFER-1',
  changeType: 'transfer'
})
assert.equal(transferConfig.showVerification, false, '设备转移不应展示检定结果')

assert.doesNotMatch(applyDialogSource, /label="是否检定"|form\.precheckRequired/)
assert.doesNotMatch(applyDialogSource, /precheckRequired:\s*form\.precheckRequired/)

const handleRequest = buildChangeVerifierHandleRequest(
  {
    id: 'CHANGE-CYCLE-1',
    changeType: 'cycle',
    taskId: 'TASK-CYCLE-1',
    rowVersion: 2
  },
  {
    reason: '调整周期',
    verificationRequired: 1,
    verificationDate: '2026-07-27',
    validUntil: '2027-07-26',
    result: 'qualified',
    opinion: ''
  } as ChangeVerifierFormState
)
assert.equal(
  Object.prototype.hasOwnProperty.call(handleRequest, 'sendOutRequired'),
  false,
  '状态变更检定请求不再提交需送检字段'
)
assert.equal(handleRequest.verificationRequired, 1)

const handleRequestTypeSource = changeTypeSource.match(
  /export interface ChangeVerifierHandleRequest \{[\s\S]*?\n\}/
)?.[0]
assert.ok(handleRequestTypeSource)
assert.doesNotMatch(handleRequestTypeSource, /sendOutRequired/)
assert.doesNotMatch(handleRequestTypeSource, /unqualified/)
assert.match(handleRequestTypeSource, /verificationRequired:\s*0\s*\|\s*1/)
assert.match(changeTypeSource, /\| 'defer'/)

assert.doesNotMatch(dialogSource, /需送检|已标记送检|showNeedSend|needSend|toggleNeedSend/)
assert.doesNotMatch(modelSource, /showNeedSend|needSend|unqualified/)
assert.doesNotMatch(dialogSource, /是否需要外送|外送单位/)

const oneTimeConfig = resolveChangeVerifierDialog({
  id: 'CHANGE-ONE-TIME-1',
  changeType: 'precheck',
  items: [{ id: 'ITEM-ONE-TIME-1', confirmInterval: '一次检定' }]
})
assert.equal(oneTimeConfig.validUntilRequired, false)
assert.equal(oneTimeConfig.showNewCycle, false, '一次检定不得继续要求或提交检定周期')
assert.equal(validateChangeVerifierForm(oneTimeConfig, {
  reason: '一次检定',
  verificationRequired: 1,
  verificationDate: '2026-07-28',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}), '')
assert.match(dialogSource, /config\.validUntilRequired/)

const oneTimeRequest = buildChangeVerifierHandleRequest(
  {
    id: 'CHANGE-ONE-TIME-CATEGORY-1',
    changeType: 'category',
    taskId: 'TASK-ONE-TIME-CATEGORY-1',
    rowVersion: 3,
    items: [{ id: 'ITEM-ONE-TIME-CATEGORY-1', confirmInterval: '一次检定' }]
  },
  {
    reason: '一次检定无需周期和有效期',
    verificationRequired: 1,
    verificationDate: '2026-07-28',
    validUntil: '2027-07-27',
    newCycleMonth: 12,
    result: 'qualified',
    opinion: ''
  }
)
assert.equal(Object.prototype.hasOwnProperty.call(oneTimeRequest, 'validUntil'), false)
assert.equal(Object.prototype.hasOwnProperty.call(oneTimeRequest, 'newCycleMonth'), false)

const periodicCategoryConfig = resolveChangeVerifierDialog({
  id: 'CHANGE-PERIODIC-CATEGORY-1',
  changeType: 'category',
  items: [{ id: 'ITEM-PERIODIC-CATEGORY-1', confirmInterval: '周期检定' }]
})
assert.equal(periodicCategoryConfig.validUntilRequired, false, '调整为C类后标签使用检定日期，不应继续要求有效期')
assert.equal(periodicCategoryConfig.showNewCycle, false, '管理类别调整为C类时检定周期必须置空')
assert.equal(periodicCategoryConfig.showVerificationDecision, true)
assert.equal(validateChangeVerifierForm(periodicCategoryConfig, {
  reason: '调整为C类后按一次检定处理',
  verificationRequired: 1,
  verificationDate: '2026-07-28',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}), '')

const noVerificationCategoryRequest = buildChangeVerifierHandleRequest(
  {
    id: 'CHANGE-CATEGORY-SKIP-1',
    changeType: 'category',
    taskId: 'TASK-CATEGORY-SKIP-1',
    rowVersion: 4,
    items: [{ id: 'ITEM-CATEGORY-SKIP-1', newCategory: 'C' }]
  },
  {
    reason: '接收后确认无需检定',
    verificationRequired: 0,
    verificationDate: '2026-07-28',
    validUntil: '2027-07-27',
    result: 'qualified',
    newCycleMonth: 12,
    opinion: ''
  }
)
assert.equal(noVerificationCategoryRequest.verificationRequired, 0)
assert.equal(Object.prototype.hasOwnProperty.call(noVerificationCategoryRequest, 'verificationResult'), false)
assert.equal(Object.prototype.hasOwnProperty.call(noVerificationCategoryRequest, 'verificationDate'), false)
assert.equal(Object.prototype.hasOwnProperty.call(noVerificationCategoryRequest, 'validUntil'), false)
assert.equal(Object.prototype.hasOwnProperty.call(noVerificationCategoryRequest, 'newCycleMonth'), false)
assert.equal(validateChangeVerifierForm(periodicCategoryConfig, {
  reason: '无需检定',
  verificationRequired: 0,
  verificationDate: '',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}), '')
assert.match(dialogSource, /props\.order\?\.id/)
assert.match(dialogSource, /是否检定/)
assert.match(dialogSource, /form\.verificationRequired/)

const externalCategoryBeforeReturnOrder: ChangeOrderVO = {
  id: 'CHANGE-CATEGORY-EXTERNAL-BEFORE-RETURN',
  changeType: 'category',
  taskId: 'TASK-CATEGORY-EXTERNAL-BEFORE-RETURN',
  rowVersion: 5,
  items: [{
    id: 'ITEM-CATEGORY-EXTERNAL-BEFORE-RETURN',
    oldVerificationMethod: 'send_out',
    physicalStatus: 'wait_external_send_out'
  }]
}
const externalCategoryBeforeReturnConfig = resolveChangeVerifierDialog(externalCategoryBeforeReturnOrder)
assert.equal(shouldShowChangeVerifierInspectionFields(externalCategoryBeforeReturnConfig, {
  reason: 'external decision only',
  verificationRequired: 1,
  verificationDate: '',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}, externalCategoryBeforeReturnOrder), false, 'external category/cycle before return must hide inspection fields when need verification is selected')
assert.equal(validateChangeVerifierForm(externalCategoryBeforeReturnConfig, {
  reason: 'external decision only',
  verificationRequired: 1,
  verificationDate: '',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}, externalCategoryBeforeReturnOrder), '', 'external category/cycle decision before return must not validate inspection fields')

const externalCategoryDisplayMethodOrder: ChangeOrderVO = {
  id: 'CHANGE-CATEGORY-EXTERNAL-DISPLAY-METHOD',
  changeType: 'category',
  taskId: 'TASK-CATEGORY-EXTERNAL-DISPLAY-METHOD',
  rowVersion: 6,
  items: [{
    id: 'ITEM-CATEGORY-EXTERNAL-DISPLAY-METHOD',
    oldVerificationMethod: '外委',
    sendOutRequired: 1,
    physicalStatus: 'wait_external_send_out'
  }]
}
const externalCategoryDisplayMethodConfig = resolveChangeVerifierDialog(externalCategoryDisplayMethodOrder)
assert.equal(shouldShowChangeVerifierInspectionFields(externalCategoryDisplayMethodConfig, {
  reason: 'external decision only',
  verificationRequired: 1,
  verificationDate: '',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}, externalCategoryDisplayMethodOrder), false, 'external display method values must also hide inspection fields before return')

const externalCycleWaitingReturnOrder: ChangeOrderVO = {
  id: 'CHANGE-CYCLE-EXTERNAL-WAITING-RETURN',
  changeType: 'cycle',
  taskId: 'TASK-CYCLE-EXTERNAL-WAITING-RETURN',
  rowVersion: 8,
  items: [{
    id: 'ITEM-CYCLE-EXTERNAL-WAITING-RETURN',
    oldVerificationMethod: 'send_out',
    auditStatus: 'verification_required',
    physicalStatus: 'wait_send_out_return'
  }]
}
assert.notEqual(validateChangeVerifierForm(resolveChangeVerifierDialog(externalCycleWaitingReturnOrder), {
  reason: 'external is away',
  verificationRequired: 1,
  verificationDate: '',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}, externalCycleWaitingReturnOrder), '', 'external category/cycle must wait for send-out return before verifier inspection submit')

const externalDecisionRequest = buildChangeVerifierHandleRequest(
  {
    id: 'CHANGE-CYCLE-EXTERNAL-BEFORE-RETURN',
    changeType: 'cycle',
    taskId: 'TASK-CYCLE-EXTERNAL-BEFORE-RETURN',
    rowVersion: 6,
    items: [{
      id: 'ITEM-CYCLE-EXTERNAL-BEFORE-RETURN',
      oldVerificationMethod: 'send_out',
      physicalStatus: 'wait_external_send_out'
    }]
  },
  {
    reason: 'external decision only',
    verificationRequired: 1,
    verificationDate: '2026-07-28',
    validUntil: '2027-07-27',
    result: 'qualified',
    certificateAttachmentGroupId: 'CERT-BEFORE-RETURN',
    opinion: ''
  }
)
assert.equal(externalDecisionRequest.verificationRequired, 1)
assert.equal(Object.prototype.hasOwnProperty.call(externalDecisionRequest, 'verificationResult'), false)
assert.equal(Object.prototype.hasOwnProperty.call(externalDecisionRequest, 'verificationDate'), false)
assert.equal(Object.prototype.hasOwnProperty.call(externalDecisionRequest, 'certificateAttachmentGroupId'), false)

const externalReturnedRequest = buildChangeVerifierHandleRequest(
  {
    id: 'CHANGE-CYCLE-EXTERNAL-RETURNED',
    changeType: 'cycle',
    taskId: 'TASK-CYCLE-EXTERNAL-RETURNED',
    rowVersion: 7,
    items: [{
      id: 'ITEM-CYCLE-EXTERNAL-RETURNED',
      oldVerificationMethod: 'send_out',
      auditStatus: 'verification_required',
      physicalStatus: 'send_out_return_received'
    }]
  },
  {
    reason: 'external returned',
    verificationRequired: 1,
    verificationDate: '2026-07-28',
    validUntil: '2027-07-27',
    result: 'qualified',
    certificateAttachmentGroupId: 'CERT-AFTER-RETURN',
    opinion: ''
  }
)
assert.equal(externalReturnedRequest.verificationResult, 'qualified')
assert.equal(externalReturnedRequest.verificationDate, '2026-07-28')
assert.equal(externalReturnedRequest.certificateAttachmentGroupId, 'CERT-AFTER-RETURN')
assert.match(dialogSource, /verificationFieldsVisible/)

const selfDecisionOrder: ChangeOrderVO = {
  id: 'CHANGE-CYCLE-SELF-DECISION',
  changeType: 'cycle',
  taskId: 'TASK-CYCLE-SELF-DECISION',
  rowVersion: 9,
  items: [{
    id: 'ITEM-CYCLE-SELF-DECISION',
    oldVerificationMethod: 'self',
    physicalStatus: 'verifier_received'
  }]
}
const selfDecisionConfig = resolveChangeVerifierDialog(selfDecisionOrder)
const selfDecisionForm: ChangeVerifierFormState = {
  reason: '确认需要检定',
  verificationRequired: 1,
  verificationDate: '2026-08-10',
  validUntil: '2027-08-09',
  result: 'qualified',
  certificateAttachmentGroupId: 'CERT-SHOULD-NOT-SEND',
  opinion: ''
}
assert.equal(
  shouldShowChangeVerifierInspectionFields(selfDecisionConfig, selfDecisionForm, selfDecisionOrder),
  false,
  '自检首次选择需要检定时不得立即显示检定信息'
)
assert.equal(
  validateChangeVerifierForm(selfDecisionConfig, selfDecisionForm, selfDecisionOrder),
  '',
  '自检首次决策只校验是否需要检定'
)
const selfDecisionRequest = buildChangeVerifierHandleRequest(selfDecisionOrder, selfDecisionForm)
assert.equal(selfDecisionRequest.verificationRequired, 1)
assert.equal(Object.prototype.hasOwnProperty.call(selfDecisionRequest, 'verificationResult'), false)
assert.equal(Object.prototype.hasOwnProperty.call(selfDecisionRequest, 'verificationDate'), false)
assert.equal(Object.prototype.hasOwnProperty.call(selfDecisionRequest, 'certificateAttachmentGroupId'), false)

const selfInspectionOrder: ChangeOrderVO = {
  ...selfDecisionOrder,
  id: 'CHANGE-CYCLE-SELF-INSPECTION',
  taskId: 'TASK-CYCLE-SELF-INSPECTION',
  items: [{
    id: 'ITEM-CYCLE-SELF-INSPECTION',
    oldVerificationMethod: 'self',
    auditStatus: 'verification_required',
    physicalStatus: 'verifier_received'
  }]
}
assert.equal(
  shouldShowChangeVerifierInspectionFields(
    resolveChangeVerifierDialog(selfInspectionOrder),
    selfDecisionForm,
    selfInspectionOrder
  ),
  true,
  '自检路线决策已持久化后才显示检定信息'
)
const selfInspectionRequest = buildChangeVerifierHandleRequest(selfInspectionOrder, selfDecisionForm)
assert.equal(selfInspectionRequest.verificationResult, 'qualified')
assert.equal(selfInspectionRequest.verificationDate, '2026-08-10')
assert.equal(selfInspectionRequest.certificateAttachmentGroupId, 'CERT-SHOULD-NOT-SEND')

assert.match(modelSource, /scrapType.*normal|normal.*scrapType/s)
assert.match(dialogSource, /listUsersByDeptAndRole\([^)]*'RESPONSIBLE_ENGINEER'/s)
assert.match(dialogSource, /business-type="CHANGE_VERIFIER"/)
assert.match(dialogSource, /width="820px"/)
assert.match(dialogSource, /grid-template-columns:\s*repeat\(4,/)
assert.ok(verifierViewSource.includes('ChangeVerifierHandleDialog'))
assert.ok(!verifierViewSource.includes('mode="verifier"'))

assert.match(changeTypeSource, /physicalStatus\?:\s*string/)
assert.match(changeTypeSource, /lastScanRecordId\?:\s*EntityId/)
assert.match(changeTypeSource, /lastScanUserId\?:\s*string/)
assert.match(receiveAdminSource, /扫码状态/)
assert.match(receiveAdminSource, /接收签字/)
assert.match(receiveAdminSource, /transfer_received/)

assertFields(
  productSupportSource,
  ['合同号', '项目号', '项目类型', '送检时间', '供方', '申请部门'],
  '产品配套基本信息'
)
assertFields(
  productSupportSource,
  ['序号', '名称', '合同数量', '抽检数量', '备注', '费用编号', '合格', '不合格'],
  '产品配套抽检比例'
)
assert.ok(!productSupportSource.includes('含税单价'), '产品配套原型弹窗不应保留含税单价列')
assert.ok(!productSupportSource.includes('含税总价'), '产品配套原型弹窗不应保留含税总价列')
