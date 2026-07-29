import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const verifyDialogSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicVerifyDialog.vue', import.meta.url),
  'utf8'
)
const externalDialogSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicExternalVerifyDialog.vue', import.meta.url),
  'utf8'
)

const baseFields = [
  '计量编号',
  '设备名称',
  '生产厂商',
  '出厂编号',
  '规格型号',
  '有效期',
  '检定周期',
  '使用部门',
  '设备状态',
  '管理类别',
  '检定方法',
  '学科分类'
]

function assertFields(source: string, fields: string[], dialogName: string) {
  fields.forEach((field) => {
    assert.ok(source.includes(`>${field}<`), `${dialogName}缺少原型字段：${field}`)
  })
}

assertFields(verifyDialogSource, baseFields, '自检及外委通用弹窗')
assertFields(
  verifyDialogSource,
  ['检定人', '检定时间', '新有效期', '检定结果', '不合格处理方式', '责任工程师', '检定意见', '上传附件'],
  '自检及外委通用弹窗'
)
assert.ok(!verifyDialogSource.includes('>数据目录<'), '责任工程师选择不应伪装成数据目录入口')

;['报告编号', '检定单位', '强制使用新有效期', '环境温度', '环境湿度', '是否需要确认员'].forEach((field) => {
  assert.ok(!verifyDialogSource.includes(`>${field}<`), `自检及外委通用弹窗不应显示：${field}`)
})

assert.match(verifyDialogSource, /listUsersByDeptAndRole\([^)]*'RESPONSIBLE_ENGINEER'/s)
assert.match(verifyDialogSource, /calculateValidUntil/)
assert.match(verifyDialogSource, /setMonth\(/)
assert.ok(verifyDialogSource.includes('date.setDate(date.getDate() - 1)'))
assert.match(verifyDialogSource, /needsResponsibleEngineer/)
assert.match(verifyDialogSource, /form\.nonconformingDisposal === 'scrap'/)
assert.match(verifyDialogSource, /v-if="needsResponsibleEngineer"/)
assert.doesNotMatch(verifyDialogSource, /repairUserId:/)
assert.doesNotMatch(verifyDialogSource, /repairUserName:/)
assert.match(verifyDialogSource, /scrapEngineerId:/)
assert.match(verifyDialogSource, /scrapEngineerName:/)

assertFields(externalDialogSource, baseFields, '外委否通用弹窗')
assertFields(externalDialogSource, ['检定时间', '检定意见', '上传附件'], '外委否通用弹窗')
assert.ok(!externalDialogSource.includes('>检定单位<'), '外委否通用弹窗不应显示检定单位')
assert.doesNotMatch(externalDialogSource, /verificationUnit/)
assert.match(externalDialogSource, /检定员填写周检信息外委否通用设备/)
