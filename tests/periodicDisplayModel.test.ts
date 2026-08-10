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
import * as periodicDisplayModel from '../src/views/periodic/periodicDisplayModel.ts'
import { periodicNodeName, periodicStatusName } from '../src/api/periodicContract.ts'
import type { PeriodicTaskVO } from '../src/types/periodic.ts'
import type { UnifiedScanInboxItem } from '../src/types/scan.ts'

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

const mergePeriodicTaskPhysicalActions = (
  periodicDisplayModel as unknown as {
    mergePeriodicTaskPhysicalActions?: (
      tasks: readonly PeriodicTaskVO[],
      scanRows: readonly UnifiedScanInboxItem[]
    ) => PeriodicTaskVO[]
  }
).mergePeriodicTaskPhysicalActions
assert.equal(typeof mergePeriodicTaskPhysicalActions, 'function')

if (mergePeriodicTaskPhysicalActions) {
  const workflowTask: PeriodicTaskVO = {
    ...task,
    id: 'periodic-task-merge',
    planId: 'periodic-plan-merge',
    currentNode: 'external_common_fill',
    allowedActions: ['SUBMIT'],
    physicalStatus: undefined,
    physicalStatusName: undefined,
    scanAction: undefined
  }
  const physicalRow: UnifiedScanInboxItem = {
    id: 'periodic-periodic-task-merge-periodic-external-send-out-1',
    businessType: 'periodic',
    sourceType: 'PERIODIC',
    sourceLabel: 'periodic',
    businessId: 'periodic-plan-merge',
    taskId: 'periodic-task-merge',
    taskNo: 'ZJ-TEST-0001',
    currentNodeName: 'pending external handover',
    scanAction: 'periodic-external-send-out',
    allowedActions: ['SEND_OUT'],
    scanCode: 'DEVICE-001',
    deviceCode: 'DEVICE-001',
    scanned: false
  }
  const mergedTasks = mergePeriodicTaskPhysicalActions(
    [workflowTask],
    [physicalRow, { ...physicalRow, id: `${physicalRow.id}-duplicate` }]
  )

  assert.equal(mergedTasks.length, 1)
  assert.equal(mergedTasks[0]?.id, 'periodic-task-merge')
  assert.equal(mergedTasks[0]?.currentNode, 'external_common_fill')
  assert.equal(mergedTasks[0]?.physicalStatus, 'wait_external_receive')
  assert.equal(mergedTasks[0]?.physicalStatusName, 'pending external handover')
  assert.equal(mergedTasks[0]?.scanAction, 'periodic-external-send-out')
  assert.deepEqual(mergedTasks[0]?.allowedActions, ['SUBMIT', 'SEND_OUT'])
  assert.equal(resolvePeriodicTaskAction(mergedTasks[0]!), 'scan-send-out')

  const physicalOnlyTasks = mergePeriodicTaskPhysicalActions([], [physicalRow, physicalRow])
  assert.equal(physicalOnlyTasks.length, 1)
  assert.equal(physicalOnlyTasks[0]?.id, 'periodic-task-merge')
  assert.equal(physicalOnlyTasks[0]?.planId, 'periodic-plan-merge')
  assert.equal(physicalOnlyTasks[0]?.currentNode, 'external_common_fill')
}

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

assert.deepEqual(buildPeriodicPlanPickerItems(pickerTasks, [
  { planId: 'P1', deviceCount: 10 },
  { planId: 'P2', deviceCount: 10 },
  { planId: 'P3', deviceCount: 10 }
]), [
  {
    planId: 'P1',
    planNo: 'ZJ-202608-',
    currentNodeSummary: '管理员异常分流',
    deviceCount: 10
  },
  {
    planId: 'P2',
    planNo: 'ZJ-202609-',
    currentNodeSummary: '待接收',
    deviceCount: 10
  },
  {
    planId: 'P3',
    planNo: 'ZJ-202610-',
    currentNodeSummary: '待接收 / 自检检定',
    deviceCount: 10
  }
])

assert.deepEqual(buildPeriodicPlanPickerItems(pickerTasks, []), [])
assert.deepEqual(buildPeriodicPlanPickerItems([], [
  {
    planId: 'P100',
    planNo: 'ZJ-202611-0001',
    currentNodeSummary: '剩余 3 条',
    deviceCount: 10,
    completedCount: 7,
    pendingCount: 3,
    status: 'processing',
    statusName: '进行中'
  }
]), [
  {
    planId: 'P100',
    planNo: 'ZJ-202611-0001',
    currentNodeSummary: '剩余 3 条',
    deviceCount: 10
  }
])

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
