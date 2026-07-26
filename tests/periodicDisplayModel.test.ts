import assert from 'node:assert/strict'

import {
  buildPeriodicPlanTodoGroups,
  displayValue,
  getPeriodicTableColumns,
  mapPeriodicTaskRow,
  periodicTagColor
} from '../src/views/periodic/periodicDisplayModel.ts'
import { periodicNodeName, periodicStatusName } from '../src/api/periodicContract.ts'
import type { PeriodicTaskVO } from '../src/types/periodic.ts'

assert.equal(displayValue(undefined), '-')
assert.equal(displayValue(null), '-')
assert.equal(displayValue(''), '-')
assert.equal(displayValue(0), '0')

assert.equal(periodicNodeName('external_common_fill'), '外扩账号填写通用设备检定信息')
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

const exceptionRouteTask: PeriodicTaskVO = {
  ...task,
  currentNode: 'admin_exception_route',
  currentNodeName: '管理员异常分流',
  taskStatus: 'pending'
}

assert.equal(mapPeriodicTaskRow(exceptionRouteTask, 'admin').currentNodeName, '管理员异常分流')
assert.equal(mapPeriodicTaskRow(exceptionRouteTask, 'verifier').currentNodeName, '管理员异常分流')

const todoGroups = buildPeriodicPlanTodoGroups([
  exceptionRouteTask,
  { ...exceptionRouteTask, id: '2' },
  { ...exceptionRouteTask, id: '3', planId: '2073579908903317501' }
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
