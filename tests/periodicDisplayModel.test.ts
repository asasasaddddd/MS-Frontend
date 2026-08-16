import assert from 'node:assert/strict'

import {
  buildPeriodicPlanPickerItems,
  buildPeriodicPlanTodoGroups,
  displayValue,
  getPeriodicTableColumns,
  mapPeriodicTaskRow,
  periodicTagColor,
  resolvePeriodicTaskAction
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
  physicalStatus: 'wait_verifier_receive',
  physicalStatusName: '待检定员接收',
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
assert.equal(row.physicalStatusName, '待接收')
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
assert.equal(mapPeriodicTaskRow(exceptionRouteTask, 'verifier').currentNodeName, '待接收')

const verifierExternalCarriedTask: PeriodicTaskVO = {
  ...task,
  currentNode: 'admin_exception_route',
  currentNodeName: '管理员异常分流',
  taskStatus: 'wait_scan',
  verificationMethod: 'send_out',
  physicalStatus: 'wait_external_receive',
  physicalStatusName: '待外扩接收',
  allowedActions: []
}
assert.equal(
  mapPeriodicTaskRow(verifierExternalCarriedTask, 'verifier').currentNodeName,
  '待外扩接收',
  '检定员扫码接收后，未完成的外委设备应保留并显示并行实物流转节点'
)
assert.equal(
  mapPeriodicTaskRow(verifierExternalCarriedTask, 'admin').currentNodeName,
  '待外扩接收',
  '管理员异常入口在检定员扫码后失效，但当前周检条目应保留并显示实物下一节点'
)

const derivedChangeTask: PeriodicTaskVO = {
  ...task,
  currentNode: 'exception_disposal',
  currentNodeName: '异常处置',
  exceptionFlowType: 'category',
  exceptionFlowName: '管理类别调整',
  taskStatus: 'exception'
}
assert.equal(
  mapPeriodicTaskRow(derivedChangeTask, 'admin').currentNodeName,
  '管理类别调整',
  '派生流程应显示具体派生类型，而不是通用异常节点或源流程完成状态'
)

const takeBackTask: PeriodicTaskVO = {
  ...task,
  currentNode: 'admin_take_back',
  currentNodeName: undefined,
  taskStatus: 'processing',
  physicalStatus: 'wait_manager_take_back',
  physicalStatusName: undefined,
  allowedActions: ['TAKE_BACK']
}
assert.equal(resolvePeriodicTaskAction(takeBackTask), 'scan-take-back')
assert.equal(mapPeriodicTaskRow(takeBackTask, 'admin').currentNodeName, '管理员取回')
assert.equal(mapPeriodicTaskRow(takeBackTask, 'admin').physicalStatusName, '待管理员取回')

assert.equal(resolvePeriodicTaskAction({
  allowedActions: ['SEND_OUT'],
  physicalStatus: 'wait_external_receive',
  scanAction: 'periodic-external-send-out'
}), 'scan-send-out')
assert.equal(resolvePeriodicTaskAction({
  allowedActions: ['SEND_OUT_RETURN'],
  physicalStatus: 'wait_sendout_return_receive',
  scanAction: 'periodic-send-out-return'
}), 'scan-send-out-return')

assert.equal(resolvePeriodicTaskAction({
  currentNode: 'external_common_fill',
  allowedActions: ['SUBMIT', 'SEND_OUT'],
  physicalStatus: 'wait_external_receive',
  scanAction: 'periodic-external-send-out'
}), 'scan-send-out')

assert.equal(resolvePeriodicTaskAction({
  currentNode: 'external_uncommon_fill',
  allowedActions: ['SUBMIT', 'SEND_OUT_RETURN'],
  physicalStatus: 'wait_sendout_return_receive',
  scanAction: 'periodic-send-out-return'
}), 'scan-send-out-return')

const todoGroups = buildPeriodicPlanTodoGroups([
  exceptionRouteTask,
  { ...exceptionRouteTask, id: '2' },
  { ...exceptionRouteTask, id: '3', planId: '2073579908903317501' }
])
assert.equal(todoGroups.length, 2)
assert.equal(todoGroups.find((group) => group.planId === '2073579908903317500')?.deviceCount, 2)
assert.equal(todoGroups.find((group) => group.planId === '2073579908903317501')?.deviceCount, 1)

const pickerTasks: PeriodicTaskVO[] = [
  ...Array.from({ length: 10 }, (_, index) => ({
    ...exceptionRouteTask,
    id: `P1-${index + 1}`,
    planId: 'P1',
    taskNo: `ZJ-202608-${String(index + 1).padStart(4, '0')}`,
    currentNodeName: '管理员异常分流'
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    ...exceptionRouteTask,
    id: `P2-${index + 1}`,
    planId: 'P2',
    taskNo: `ZJ-202609-${String(index + 1).padStart(4, '0')}`,
    currentNodeName: '待接收'
  })),
  ...Array.from({ length: 10 }, (_, index) => ({
    ...exceptionRouteTask,
    id: `P3-${index + 1}`,
    planId: 'P3',
    taskNo: `ZJ-202610-${String(index + 1).padStart(4, '0')}`,
    currentNodeName: index === 0 ? '待接收' : '自检检定'
  })),
  {
    ...exceptionRouteTask,
    id: 'ORPHAN',
    planId: undefined,
    taskNo: 'ORPHAN-0001'
  }
]

const authoritativePickerItems = buildPeriodicPlanPickerItems(pickerTasks, [{
  businessType: 'PERIODIC',
  containerId: 'P100',
  containerNo: 'ZJ-202611-0001',
  totalItemCount: 10,
  myPendingItemCount: 5,
  myPendingActionCount: 3,
  unfinishedItemCount: 5,
  currentNodeSummary: [{
    nodeCode: 'self_verify',
    nodeName: 'Self verification',
    myPendingItemCount: 5,
    myPendingActionCount: 3
  }]
}])
assert.deepEqual(authoritativePickerItems, [{
  containerId: 'P100',
  containerNo: 'ZJ-202611-0001',
  totalItemCount: 10,
  myPendingItemCount: 5,
  myPendingActionCount: 3,
  unfinishedItemCount: 5,
  currentNodeSummary: 'Self verification'
}])
assert.deepEqual(buildPeriodicPlanPickerItems(pickerTasks, [{
  businessType: 'PERIODIC',
  containerId: 'P100',
  containerNo: 'ZJ-202611-0001',
  totalItemCount: 10,
  myPendingItemCount: 0,
  myPendingActionCount: 0,
  unfinishedItemCount: 0,
  currentNodeSummary: []
}]), [])

assert.deepEqual(
  getPeriodicTableColumns('admin').filter((column) => column.key !== 'action').map((column) => column.title),
  ['当前状态', '计量编号', '设备名称', '规格型号', '出厂编号', '使用部门', '类别', '检定周期', '有效日期', '计量检定员', '检定方式']
)

const adminActionColumn = getPeriodicTableColumns('admin').find((column) => column.key === 'action')
assert.equal(adminActionColumn?.fixed, 'right')
assert.equal(adminActionColumn?.width, 92)

assert.deepEqual(
  getPeriodicTableColumns('verifier').map((column) => column.title),
  ['当前状态', '计量编号', '设备名称', '规格型号', '出厂编号', '使用部门', '类别', '检定周期', '有效日期', '计量管理员', '检定方式', '是否通用', '操作']
)

assert.deepEqual(
  getPeriodicTableColumns('confirmer').map((column) => column.title),
  ['当前状态', '计量编号', '设备名称', '规格型号', '出厂编号', '使用部门', '类别', '检定周期', '有效日期', '计量管理员', '检定方式', '是否通用', '操作']
)
