import assert from 'node:assert/strict'

import {
  buildRoleScopeMatrix,
  diffRoleScopeMatrices,
  roleCountForScope,
  rolesForScope,
  toRoleScopeMatrixRequest,
  updateScopeRoles
} from '../src/views/system/roleScopeMatrixModel.ts'

const initial = buildRoleScopeMatrix([
  { scopeOrgId: 'G-B', roleCodes: ['VERIFIER_EXTERNAL'] },
  { scopeOrgId: 'D-A', roleCodes: ['MEASURE_ADMIN', 'VERIFIER_SELF'] }
])

assert.deepEqual(rolesForScope(initial, 'D-A'), ['MEASURE_ADMIN', 'VERIFIER_SELF'])
assert.equal(roleCountForScope(initial, 'D-A'), 2)
assert.equal(roleCountForScope(initial, 'UNKNOWN'), 0)

const updated = updateScopeRoles(initial, 'D-A', ['CONFIRMER', 'MEASURE_ADMIN', 'CONFIRMER'])
assert.deepEqual(rolesForScope(initial, 'D-A'), ['MEASURE_ADMIN', 'VERIFIER_SELF'])
assert.deepEqual(rolesForScope(updated, 'D-A'), ['CONFIRMER', 'MEASURE_ADMIN'])

const removed = updateScopeRoles(updated, 'G-B', [])
assert.equal(removed.has('G-B'), false)

assert.deepEqual(diffRoleScopeMatrices(initial, removed), {
  added: [
    { scopeOrgId: 'D-A', roleCode: 'CONFIRMER' }
  ],
  removed: [
    { scopeOrgId: 'D-A', roleCode: 'VERIFIER_SELF' },
    { scopeOrgId: 'G-B', roleCode: 'VERIFIER_EXTERNAL' }
  ],
  retained: [
    { scopeOrgId: 'D-A', roleCode: 'MEASURE_ADMIN' }
  ]
})

assert.deepEqual(toRoleScopeMatrixRequest(removed, 'matrix-v1'), {
  matrixVersion: 'matrix-v1',
  entries: [
    { scopeOrgId: 'D-A', roleCodes: ['CONFIRMER', 'MEASURE_ADMIN'] }
  ]
})

console.log('role scope matrix model tests passed')
