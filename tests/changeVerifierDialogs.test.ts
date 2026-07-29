import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { ChangeOrderVO } from '../src/types/change.ts'
import {
  buildChangeVerifierHandleRequest,
  resolveChangeVerifierDialog,
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
  '非正常报废确认',
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

const handleRequest = buildChangeVerifierHandleRequest(
  {
    id: 'CHANGE-CYCLE-1',
    changeType: 'cycle',
    taskId: 'TASK-CYCLE-1',
    rowVersion: 2
  },
  {
    reason: '调整周期',
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

const handleRequestTypeSource = changeTypeSource.match(
  /export interface ChangeVerifierHandleRequest \{[\s\S]*?\n\}/
)?.[0]
assert.ok(handleRequestTypeSource)
assert.doesNotMatch(handleRequestTypeSource, /sendOutRequired/)
assert.doesNotMatch(handleRequestTypeSource, /unqualified/)
assert.match(changeTypeSource, /\| 'defer'/)

assert.doesNotMatch(dialogSource, /需送检|已标记送检|showNeedSend|needSend|toggleNeedSend/)
assert.doesNotMatch(modelSource, /showNeedSend|needSend|sendOutRequired|unqualified/)
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
assert.equal(periodicCategoryConfig.validUntilRequired, true)
assert.equal(periodicCategoryConfig.showNewCycle, true)
assert.notEqual(validateChangeVerifierForm(periodicCategoryConfig, {
  reason: '周期检定仍需周期和有效期',
  verificationDate: '2026-07-28',
  validUntil: '',
  result: 'qualified',
  opinion: ''
}), '')
assert.match(dialogSource, /props\.order\?\.id/)

assert.match(modelSource, /scrapType.*normal|normal.*scrapType/s)
assert.match(dialogSource, /listUsersByDeptAndRole\([^)]*'RESPONSIBLE_ENGINEER'/s)
assert.match(dialogSource, /business-type="CHANGE_VERIFIER"/)
assert.match(dialogSource, /width="820px"/)
assert.match(dialogSource, /grid-template-columns:\s*repeat\(4,/)
assert.ok(verifierViewSource.includes('ChangeVerifierHandleDialog'))
assert.ok(!verifierViewSource.includes('mode="verifier"'))

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
