import assert from 'node:assert/strict'

import {
  dedupeTodoEntriesByKey,
  filterVisibleTodoEntries,
  getChangeTaskRoute,
  getWorkspaceLaunchActions,
  uniqueTasksByBusinessId,
  visibleTodoTypeValues
} from '../src/views/workspaceTodoModel.ts'

const entries = [
  { type: 'firstcheck' as const, count: 1 },
  { type: 'periodic' as const, count: 0 },
  { type: 'change' as const, count: 2 }
]

assert.deepEqual(filterVisibleTodoEntries(entries), [entries[0], entries[2]])
assert.deepEqual(visibleTodoTypeValues(entries), ['all', 'firstcheck', 'change'])

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
