import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildNodeGrantRevokeCommand,
  buildNodeScopeGrantRequest,
  buildScopeOrganizationTree,
  normalizeOrganizationType,
  resolvePermissionDetailLoad,
  validateNodeScopeGrantDraft
} from '../src/types/nodePermission.ts'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const typeSource = source('../src/types/nodePermission.ts')
const apiSource = source('../src/api/nodePermission.ts')
const systemApiSource = source('../src/api/system.ts')
const viewSource = source('../src/views/system/SystemPermissionView.vue')

assert.equal(normalizeOrganizationType('DEPT'), 'DEPARTMENT')
assert.equal(normalizeOrganizationType('TEAM'), 'GROUP')
assert.equal(normalizeOrganizationType('COMPANY'), 'COMPANY')

assert.deepEqual(validateNodeScopeGrantDraft({
  roleCode: 'VERIFIER_SELF',
  permissionCode: 'periodic.main.verify.submit',
  scopeType: 'GROUP',
  scopeOrgId: 'G-1',
  effect: 'ALLOW'
}), [])

assert.deepEqual(buildNodeScopeGrantRequest({
  roleCode: 'VERIFIER_SELF',
  permissionCode: 'periodic.main.verify.submit',
  scopeType: 'DEPARTMENT',
  scopeOrgId: 'D-1',
  effect: 'ALLOW',
  grantReason: '临时代理',
  effectiveTo: '2026-12-31T23:59:59'
}), {
  roleCode: 'VERIFIER_SELF',
  permissionCode: 'periodic.main.verify.submit',
  scopeType: 'DEPARTMENT',
  scopeOrgId: 'D-1',
  effect: 'ALLOW',
  grantSource: 'MANUAL_ELEVATION',
  effectiveTo: '2026-12-31T23:59:59',
  grantReason: '临时代理'
})

assert.deepEqual(buildNodeGrantRevokeCommand('U1', {
  id: '100',
  rowVersion: 2,
  status: 'active'
}, '岗位调整'), {
  userId: 'U1',
  grantId: '100',
  rowVersion: 2,
  reason: '岗位调整'
})

assert.deepEqual(buildScopeOrganizationTree([{
  orgId: 'D-1',
  orgType: 'DEPARTMENT',
  orgSimpleCName: '质检部',
  children: [{
    orgId: 'G-1',
    orgType: 'GROUP',
    orgSimpleCName: '总装组'
  }]
}], 'GROUP').map((node) => ({
  value: node.value,
  disabled: node.disabled,
  children: node.children?.map((child) => child.value)
})), [{ value: 'D-1', disabled: true, children: ['G-1'] }])

assert.deepEqual(resolvePermissionDetailLoad(
  { status: 'fulfilled', value: ['VERIFIER_SELF'] },
  { status: 'fulfilled', value: [{ orgId: 'G-1' }] },
  { status: 'fulfilled', value: [{ id: '1' }] }
), {
  detailReady: true,
  roleCodes: ['VERIFIER_SELF'],
  relations: [{ orgId: 'G-1' }],
  grants: [{ id: '1' }],
  failedSections: []
})

// The restricted organization tree remains the single source for supplier and
// change screens; the permission page itself has moved to flat units.
assert.match(systemApiSource, /getAllowedOrganizationTree[\s\S]*?\/system\/org-scopes\/allowed-tree/)
assert.match(systemApiSource, /listAllowedOrganizationUsers[\s\S]*?\/system\/org-scopes\/users/)
assert.match(systemApiSource, /listAllowedUnits[\s\S]*?\/system\/org-scopes\/units/)
assert.doesNotMatch(viewSource, /getAllowedOrganizationTree/)
assert.match(viewSource, /listAllowedOrganizationUsers\(selectedOrganizationIds\.value\)/)
assert.match(viewSource, /UserWorkScopeDialog/)

// Daily permission editing is the flat-unit + attribute work-scope matrix only.
for (const importName of [
  'listNodeOperations',
  'previewUserNodeGrant',
  'saveUserNodeGrant',
  'deleteUserNodeGrant',
  'previewUserRoleScope',
  'saveUserRoleScope',
  'updateUserRoleScope',
  'revokeUserRoleScope'
]) {
  assert.doesNotMatch(viewSource, new RegExp(`\\b${importName}\\b`))
}

// Matrix contract is transaction-shaped: one GET and one full replacement PUT.
for (const contractName of [
  'UserWorkScopeEntry',
  'UserWorkScopeMatrixRequest',
  'UserWorkScopeMatrixVO'
]) {
  assert.match(typeSource, new RegExp(`interface ${contractName}\\b`))
}
assert.match(apiSource, /getUserWorkScopes[\s\S]*?\/work-scopes[\s\S]*?method:\s*'GET'/)
assert.match(apiSource, /replaceUserWorkScopes[\s\S]*?\/work-scopes[\s\S]*?method:\s*'PUT'/)

// Legacy node-grant APIs remain available for runtime and historical
// compatibility even though the new page no longer imports them; role-scope
// CRUD has been retired entirely.
for (const apiName of [
  'getUserNodeGrants',
  'previewUserNodeGrant',
  'saveUserNodeGrant',
  'deleteUserNodeGrant',
  'getEffectivePermissions',
  'previewTaskCandidates'
]) {
  assert.match(apiSource, new RegExp(`export function ${apiName}\\b`), `missing ${apiName}`)
}
for (const endpoint of [
  '/node-grants',
  '/node-grants/preview',
  '/effective-permissions',
  '/task-candidates/preview'
]) {
  assert.ok(apiSource.includes(endpoint), `missing compatibility endpoint ${endpoint}`)
}
assert.doesNotMatch(apiSource, /role-scope-matrix|\/role-scopes/)

// New editable scopes exclude company-level configuration; candidate preview
// keeps PERSON/COMPANY solely for workflow compatibility.
assert.match(typeSource, /export type RoleScopeType\s*=\s*'DEPARTMENT'\s*\|\s*'GROUP'/)
assert.doesNotMatch(typeSource, /export type RoleScopeType[^\n]*COMPANY/)
assert.match(
  typeSource,
  /export type TaskCandidateScopeType\s*=\s*'PERSON'\s*\|\s*'DEPARTMENT'\s*\|\s*'GROUP'\s*\|\s*'COMPANY'/
)
assert.match(typeSource, /interface NodeScopeGrantRequest[\s\S]*?scopeType:\s*NodeGrantScopeType/)
assert.match(typeSource, /export type NodeGrantScopeType\s*=\s*'GROUP'\s*\|\s*'DEPARTMENT'/)
assert.match(typeSource, /export type NodeScopeType\s*=\s*'GROUP'\s*\|\s*'DEPARTMENT'\s*\|\s*'COMPANY'/)

console.log('node permission compatibility and matrix contract tests passed')
