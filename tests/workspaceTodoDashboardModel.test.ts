import assert from 'node:assert/strict'

import {
  buildWorkspaceDashboardRows,
  validateWorkspaceTodoDashboard,
  workspaceDashboardDefinitions,
  workspaceDashboardFallbackRoute
} from '../src/views/workspaceTodoDashboardModel.ts'

const dashboard = {
  snapshotAt: '2026-08-15T08:11:26',
  overview: { pendingActionCount: 3, todayNewActionCount: 2 },
  businessRows: [
    { businessType: 'FIRST_CHECK', pendingActionCount: 0, containerCount: 0, affectedItemCount: 0, affectedItemUnit: 'device' },
    { businessType: 'PERIODIC', pendingActionCount: 0, containerCount: 0, affectedItemCount: 0, affectedItemUnit: 'device' },
    { businessType: 'CHANGE', pendingActionCount: 3, containerCount: 3, affectedItemCount: 5, affectedItemUnit: 'device' },
    { businessType: 'SAMPLING', pendingActionCount: 0, containerCount: 0, affectedItemCount: 0, affectedItemUnit: 'device' },
    { businessType: 'PRODUCT_SUPPORT', pendingActionCount: 0, containerCount: 0, affectedItemCount: 0, affectedItemUnit: 'material' }
  ]
} as const

assert.equal(Object.isFrozen(workspaceDashboardDefinitions), true)
assert.equal(workspaceDashboardDefinitions.every(Object.isFrozen), true)
assert.doesNotThrow(() => validateWorkspaceTodoDashboard(dashboard, 'all'))

const rows = buildWorkspaceDashboardRows(dashboard, 'all')
assert.deepEqual(rows.map((row) => row.type), [
  'firstcheck', 'periodic', 'change', 'sampling', 'productSupport'
])
assert.equal(rows[2]?.pendingActionCount, 3)
assert.equal(rows[2]?.containerCount, 3)
assert.equal(rows[2]?.affectedItemText, '5 台')
assert.equal(rows[4]?.affectedItemText, '0 项')
assert.equal(rows.filter((row) => row.pendingActionCount === 0).length, 4)
assert.deepEqual(workspaceDashboardFallbackRoute('productSupport'), {
  path: '/todo',
  query: { type: 'productSupport' }
})

const filtered = {
  snapshotAt: dashboard.snapshotAt,
  overview: { pendingActionCount: 3, todayNewActionCount: 2 },
  businessRows: [dashboard.businessRows[2]]
} as const
assert.doesNotThrow(() => validateWorkspaceTodoDashboard(filtered, 'change'))
assert.deepEqual(buildWorkspaceDashboardRows(filtered, 'change').map((row) => row.type), ['change'])

const unavailableRows = buildWorkspaceDashboardRows(null, 'all')
assert.equal(unavailableRows.length, 5)
assert.equal(unavailableRows.every((row) => row.pendingActionCount === null), true)
assert.equal(unavailableRows.every((row) => row.containerCount === null), true)
assert.equal(unavailableRows.every((row) => row.affectedItemCount === null), true)
assert.equal(unavailableRows.every((row) => row.affectedItemText === '--'), true)

assert.throws(() => validateWorkspaceTodoDashboard({
  ...dashboard,
  businessRows: [
    dashboard.businessRows[1],
    dashboard.businessRows[0],
    ...dashboard.businessRows.slice(2)
  ]
}, 'all'), /WORKSPACE_TODO_DASHBOARD_ROW_ORDER_INVALID/)

assert.throws(() => validateWorkspaceTodoDashboard({
  ...dashboard,
  overview: { ...dashboard.overview, pendingActionCount: 5 }
}, 'all'), /WORKSPACE_TODO_DASHBOARD_CONSERVATION_FAILED/)
