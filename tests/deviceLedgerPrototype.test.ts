import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/device/DeviceLedgerView.vue', import.meta.url), 'utf8')

for (const text of [
  '搜索条件',
  '字段筛选',
  '计量台账明细',
  '计量编号',
  '设备名称',
  '管理类别',
  '规格型号',
  '出厂编号',
  '设备状态',
  '检定周期',
  '有效期',
  '检定日期',
  '使用部门',
  '生产厂家',
  '检定方式',
  '查看详情',
  '设备详情',
  '设备履历',
  '数据目录',
  '详情导出',
  '采购费用（元）',
  '计量确认员'
]) {
  assert.equal(source.includes(text), true, '缺少原型内容: ' + text)
}

assert.equal(source.includes('参与事件'), false)
