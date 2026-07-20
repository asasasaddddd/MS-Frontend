import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

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
assertFields(dialogSource, ['申请时间', '附件', '上传文件', '需送检', '返回', '提交'], '状态变更操作区')

;[
  '启用信息填写',
  '封存确认',
  '非正常报废确认',
  '周检报废退回',
  '管理类别调整填写',
  '检定周期调整填写',
  '用前检定填写弹窗'
].forEach((title) => assert.ok(modelSource.includes(title), `缺少动态弹窗标题：${title}`))

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
