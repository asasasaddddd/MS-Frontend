import assert from 'node:assert/strict'

import {
  countFirstCheckTodoItems,
  countTodoItemsWithPhysicalActions,
  countUniqueBusinessTasks,
  dedupeTodoEntriesByKey,
  getPendingFirstCheckTakeBackRows,
  getPendingPhysicalTodoRows,
  getSupplementalPhysicalTodoRows,
  getWorkspaceFixedTodoRoute,
  shouldShowWorkspaceTaskSections,
  getWorkspaceRoleTodoPath,
  filterTasksWithLoadedDetails,
  filterVisibleTodoEntries,
  getChangeTaskRoute,
  getWorkspaceLaunchActions,
  uniqueTasksByBusinessId,
  visibleTodoTypeValues
} from '../src/views/workspaceTodoModel.ts'

const businessRoles = [
  'MEASURE_ADMIN',
  'VERIFIER_SELF',
  'VERIFIER_EXTERNAL',
  'DEPT_LEADER',
  'MEASURE_LEADER',
  'RESPONSIBLE_ENGINEER',
  'PLANNER',
  'CONFIRMER',
  'EXTERNAL_OPERATOR',
  'SUPPLIER',
  'PURCHASE_WAREHOUSE'
]
const fixedTodoTypes = ['firstcheck', 'periodic', 'change', 'sampling'] as const

businessRoles.forEach((role) => {
  fixedTodoTypes.forEach((type) => {
    const route = getWorkspaceFixedTodoRoute(type, role)
    assert.ok(route.path, `${role} 的 ${type} 固定入口必须始终可导航`)
  })
})
assert.deepEqual(
  getWorkspaceFixedTodoRoute('periodic', 'VERIFIER_EXTERNAL'),
  { path: '/periodic/verifier-external' }
)
assert.deepEqual(
  getWorkspaceFixedTodoRoute('sampling', 'VERIFIER_EXTERNAL'),
  { path: '/todo', query: { type: 'sampling' } },
  '无角色业务页时必须保留入口并回退到只读筛选，不得隐藏'
)
assert.equal(getWorkspaceRoleTodoPath('periodic', 'VERIFIER_EXTERNAL'), '/periodic/verifier-external')
assert.equal(getWorkspaceRoleTodoPath('periodic', 'MEASURE_LEADER'), undefined)

const entries = [
  { type: 'firstcheck' as const, count: 1 },
  { type: 'periodic' as const, count: 0, alwaysVisible: true },
  { type: 'sampling' as const, count: 0, alwaysVisible: true },
  { type: 'change' as const, count: 2 }
]

assert.deepEqual(filterVisibleTodoEntries(entries), entries)
assert.deepEqual(visibleTodoTypeValues(entries), ['all', 'firstcheck', 'periodic', 'sampling', 'change'])

const duplicateEntries = [
  { key: 'firstcheck-100', type: 'firstcheck' as const, count: 1 },
  { key: 'firstcheck-100', type: 'firstcheck' as const, count: 1 },
  { key: 'periodic-200', type: 'periodic' as const, count: 3 }
]
assert.deepEqual(dedupeTodoEntriesByKey(duplicateEntries), [duplicateEntries[0], duplicateEntries[2]])

assert.deepEqual(getWorkspaceLaunchActions('SUPPLIER'), [
  {
    key: 'firstcheck-start',
    title: '发起首检',
    description: '填写测量设备首次使用申请',
    path: '/firstcheck/supplier'
  }
])
assert.deepEqual(getWorkspaceLaunchActions('MEASURE_ADMIN'), [])

assert.equal(
  shouldShowWorkspaceTaskSections('SUPPLIER'),
  false,
  '采购供应商在总待办页只需要发起首检入口，不显示待办汇总和流程任务区域'
)
assert.equal(shouldShowWorkspaceTaskSections('MEASURE_ADMIN'), true)

assert.equal(getChangeTaskRoute('MEASURE_ADMIN'), '/change/admin-task')
assert.equal(getChangeTaskRoute('DEPT_LEADER'), '/change/approval')
assert.equal(getChangeTaskRoute('MEASURE_LEADER'), '/change/approval')
assert.equal(getChangeTaskRoute('RESPONSIBLE_ENGINEER'), '/change/approval')
assert.equal(getChangeTaskRoute('VERIFIER_SELF'), '/change/verifier')
assert.equal(getChangeTaskRoute('VERIFIER_EXTERNAL'), '/change/verifier')
assert.equal(getChangeTaskRoute('SUPPLIER'), undefined)

const uniqueFirstCheckTasks = uniqueTasksByBusinessId([
  { id: 'task-1', businessId: 'order-1' },
  { id: 'task-2', businessId: 'order-1' },
  { id: 'task-3', businessId: 'order-2' }
])
assert.deepEqual(uniqueFirstCheckTasks.map((task) => task.id), ['task-2', 'task-3'])
assert.equal(countUniqueBusinessTasks(uniqueFirstCheckTasks), 2)

const tasksWithDetails = filterTasksWithLoadedDetails(
  [
    { id: 'task-1', businessId: 'order-1' },
    { id: 'task-2', businessId: 'order-2' }
  ],
  { 'order-1': { id: 'order-1' } }
)
assert.deepEqual(tasksWithDetails.map((task) => task.id), ['task-1'])

const scanRows = [
  {
    id: 'firstcheck-order-1-1-take-back-JL-001',
    businessType: 'firstcheck',
    sourceType: 'FIRST_CHECK',
    sourceLabel: '首检',
    businessId: 'order-1',
    orderId: 'order-1',
    scanAction: 'take-back',
    allowedActions: ['TAKE_BACK'],
    scanCode: 'JL-001',
    scanned: false
  },
  {
    id: 'firstcheck-order-1-2-take-back-JL-002',
    businessType: 'firstcheck',
    sourceType: 'FIRST_CHECK',
    sourceLabel: '首检',
    businessId: 'order-1',
    orderId: 'order-1',
    scanAction: 'take-back',
    allowedActions: ['TAKE_BACK'],
    scanCode: 'JL-002',
    scanned: false
  },
  {
    id: 'firstcheck-order-2-1-receive-JL-003',
    businessType: 'firstcheck',
    sourceType: 'FIRST_CHECK',
    sourceLabel: '首检',
    businessId: 'order-2',
    orderId: 'order-2',
    scanAction: 'receive',
    allowedActions: ['RECEIVE'],
    scanCode: 'JL-003',
    scanned: false
  },
  {
    id: 'firstcheck-order-3-1-take-back-JL-004',
    businessType: 'firstcheck',
    sourceType: 'FIRST_CHECK',
    sourceLabel: '首检',
    businessId: 'order-3',
    orderId: 'order-3',
    scanAction: 'take-back',
    allowedActions: ['TAKE_BACK'],
    scanCode: 'JL-004',
    scanned: true
  },
  {
    id: 'periodic-task-1-periodic-manager-take-back-JL-005',
    businessType: 'periodic',
    sourceType: 'PERIODIC',
    sourceLabel: '周检',
    businessId: 'plan-1',
    taskId: 'task-1',
    scanAction: 'periodic-manager-take-back',
    allowedActions: ['TAKE_BACK'],
    scanCode: 'JL-005',
    scanned: false
  }
]

assert.deepEqual(
  getPendingFirstCheckTakeBackRows(scanRows).map((row) => row.id),
  ['firstcheck-order-1-1-take-back-JL-001', 'firstcheck-order-1-2-take-back-JL-002']
)
assert.equal(countFirstCheckTodoItems(1, scanRows), 3)

const periodicWorkflowTasks = [
  { businessId: 'task-1' },
  { businessId: 'task-2' },
  { businessId: 'task-3' }
]
const periodicScanRows = [
  {
    id: 'periodic-task-1-receive',
    businessType: 'periodic',
    taskId: 'task-1',
    scanAction: 'periodic-verifier-receive',
    allowedActions: ['RECEIVE'],
    scanned: false
  },
  {
    id: 'periodic-task-2-receive',
    businessType: 'periodic',
    taskId: 'task-2',
    scanAction: 'periodic-verifier-receive',
    allowedActions: ['RECEIVE'],
    scanned: false
  },
  {
    id: 'periodic-task-3-receive',
    businessType: 'periodic',
    taskId: 'task-3',
    scanAction: 'periodic-verifier-receive',
    allowedActions: ['RECEIVE'],
    scanned: false
  },
  {
    id: 'periodic-task-4-send-out',
    businessType: 'periodic',
    taskId: 'task-4',
    scanAction: 'periodic-external-send-out',
    allowedActions: ['SEND_OUT'],
    scanned: false
  },
  {
    id: 'periodic-task-5-scanned',
    businessType: 'periodic',
    taskId: 'task-5',
    scanAction: 'periodic-send-out-return',
    allowedActions: [],
    scanned: true
  }
]

assert.deepEqual(
  getPendingPhysicalTodoRows(periodicScanRows, 'periodic').map((row) => row.id),
  [
    'periodic-task-1-receive',
    'periodic-task-2-receive',
    'periodic-task-3-receive',
    'periodic-task-4-send-out'
  ]
)
assert.deepEqual(
  getSupplementalPhysicalTodoRows(periodicWorkflowTasks, periodicScanRows, 'periodic')
    .map((row) => row.id),
  ['periodic-task-4-send-out']
)
assert.equal(
  countTodoItemsWithPhysicalActions(periodicWorkflowTasks, periodicScanRows, 'periodic'),
  4
)
