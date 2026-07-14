import assert from 'node:assert/strict'

import {
  buildPeriodicPlanTodoGroups,
  buildPeriodicPlanSummary,
  displayValue,
  getPeriodicTableColumns,
  mapPeriodicTaskRow,
  periodicTagColor
} from '../src/views/periodic/periodicDisplayModel.ts'
import { periodicNodeName, periodicStatusName } from '../src/api/periodicContract.ts'
import type { PeriodicPlanVO, PeriodicTaskVO } from '../src/types/periodic.ts'

assert.equal(displayValue(undefined), '-')
assert.equal(displayValue(null), '-')
assert.equal(displayValue(''), '-')
assert.equal(displayValue(0), '0')

assert.equal(periodicNodeName('supplier_fill_info'), '外扩人员填写检定信息')
assert.equal(periodicNodeName('manager_forward_confirm'), '管理员转办确认员')
assert.equal(periodicStatusName('completed'), '已完成')
assert.equal(periodicTagColor('confirmer_confirm'), 'orange')

const longTaskId = '2073579908903317505'
const task: PeriodicTaskVO = {
  id: longTaskId,
  planId: '2073579908903317500',
  taskNo: 'ZJ2026070001',
  deviceCode: 'JL20240000104',
  deviceName: '压力变送器',
  modelSpec: '0-2.5MPa',
  currentNode: 'manager_forward_confirm',
  taskStatus: 'wait_confirm',
  verificationMethod: 'send_out',
  verificationCycleMonth: 12,
  isCommon: 0
}

const row = mapPeriodicTaskRow(task)
assert.equal(row.taskId, longTaskId)
assert.equal(typeof row.taskId, 'string')
assert.equal(row.currentNodeName, '管理员转办确认员')
assert.equal(row.taskStatusName, '待确认')
assert.equal(row.factoryCode, '-')
assert.equal(row.deptName, '-')
assert.equal(row.verificationCycle, '12个月')
assert.equal(row.verificationMethodName, '外委')
assert.equal(row.isCommonName, '否')

const dualEntryTask: PeriodicTaskVO = {
  ...task,
  currentNode: 'plan_confirm',
  currentNodeName: '待实物交接',
  taskStatus: 'pending',
  physicalStatus: 'wait_verifier_receive'
}

assert.equal(mapPeriodicTaskRow(dualEntryTask, 'admin').currentNodeName, '待异常分流')
assert.equal(mapPeriodicTaskRow(dualEntryTask, 'verifier').currentNodeName, '待扫码接收')
assert.equal(
  mapPeriodicTaskRow({ ...dualEntryTask, physicalStatus: 'verifier_received' }, 'admin').currentNodeName,
  '待实物交接'
)

const plan: PeriodicPlanVO = {
  id: '2073579908903317500',
  planNo: '202607',
  deviceCount: 4,
  completedCount: 1
}

const summary = buildPeriodicPlanSummary(plan, [
  task,
  { ...task, id: '2', currentNode: 'responsible_second_judge', taskStatus: 'wait_confirm' },
  { ...task, id: '3', currentNode: 'external_third_judge', taskStatus: 'wait_confirm' },
  { ...task, id: '4', currentNode: 'completed', taskStatus: 'completed', labelStatus: 'printed', physicalStatus: 'taken_back' },
  { ...task, id: '5', currentNode: 'exception_disposal', taskStatus: 'exception', exceptionFlowName: '封存' },
  { ...task, id: '6', currentNode: 'completed', taskStatus: 'completed', labelStatus: 'pending' }
])

assert.equal(summary.planNo, '202607')
assert.equal(summary.deviceCount, 6)
assert.equal(summary.statusChangeCount, 1)
assert.equal(summary.statusChangeBreakdown, '封存 1')
assert.equal(summary.metrics.find((item) => item.key === 'externalReturned')?.value, 2)
assert.equal(summary.metrics.find((item) => item.key === 'labelPending')?.value, 1)
assert.equal(summary.metrics.find((item) => item.key === 'labelPrinted')?.value, 1)
assert.equal(summary.metrics.find((item) => item.key === 'takenBack')?.value, 1)

const todoGroups = buildPeriodicPlanTodoGroups([
  dualEntryTask,
  { ...dualEntryTask, id: '2' },
  { ...dualEntryTask, id: '3', planId: '2073579908903317501' }
])
assert.equal(todoGroups.length, 2)
assert.equal(todoGroups.find((group) => group.planId === '2073579908903317500')?.deviceCount, 2)
assert.equal(todoGroups.find((group) => group.planId === '2073579908903317501')?.deviceCount, 1)

assert.deepEqual(
  getPeriodicTableColumns('admin').map((column) => column.title),
  ['当前状态', '计量编号', '设备名称', '规格型号', '出厂编号', '使用部门', '类别', '检定周期', '有效日期', '计量检定员', '检定方式']
)

assert.deepEqual(
  getPeriodicTableColumns('verifier').map((column) => column.title),
  ['当前状态', '计量编号', '设备名称', '规格型号', '出厂编号', '使用部门', '类别', '检定周期', '有效日期', '计量管理员', '检定方式', '是否通用', '操作']
)

assert.deepEqual(
  getPeriodicTableColumns('confirmer').map((column) => column.title),
  ['当前状态', '计量编号', '设备名称', '规格型号', '出厂编号', '使用部门', '类别', '检定周期', '有效日期', '计量管理员', '检定方式', '是否通用', '操作']
)
