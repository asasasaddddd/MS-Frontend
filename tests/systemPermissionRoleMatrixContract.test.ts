import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const viewSource = source('../src/views/system/SystemPermissionView.vue')
const dialogSource = source('../src/views/system/components/RoleScopeMatrixDialog.vue')
const apiSource = source('../src/api/nodePermission.ts')
const typeSource = source('../src/types/nodePermission.ts')

assert.match(viewSource, /getAllowedOrganizationTree/)
assert.match(viewSource, /RoleScopeMatrixDialog/)
assert.match(viewSource, /listAllowedOrganizationUsers/)

for (const forbiddenImport of [
  'listNodeOperations',
  'previewUserNodeGrant',
  'saveUserNodeGrant',
  'deleteUserNodeGrant',
  'previewUserRoleScope',
  'saveUserRoleScope',
  'updateUserRoleScope',
  'revokeUserRoleScope'
]) {
  assert.doesNotMatch(viewSource, new RegExp(`\\b${forbiddenImport}\\b`))
}

assert.match(dialogSource, />\s*权限范围\s*</)
assert.match(dialogSource, />\s*角色配置\s*</)
assert.match(dialogSource, /a-tree/)
assert.match(dialogSource, /a-checkbox-group/)
assert.match(dialogSource, /roleCountForScope/)
assert.match(dialogSource, /diffRoleScopeMatrices/)
assert.match(dialogSource, /matrixVersion/)
assert.match(dialogSource, /getUserRoleScopeMatrix/)
assert.match(dialogSource, /replaceUserRoleScopeMatrix/)
assert.doesNotMatch(dialogSource, /ALLOW|DENY|节点授权|业务类型|操作权限/)

for (const apiName of ['getUserRoleScopeMatrix', 'replaceUserRoleScopeMatrix']) {
  assert.match(apiSource, new RegExp(`export function ${apiName}\\b`))
}
assert.match(apiSource, /role-scope-matrix/)
assert.match(apiSource, /getUserRoleScopeMatrix[\s\S]*?method:\s*'GET'/)
assert.match(apiSource, /replaceUserRoleScopeMatrix[\s\S]*?method:\s*'PUT'/)

for (const contractName of [
  'UserRoleScopeMatrixEntry',
  'UserRoleScopeMatrixRequest',
  'UserRoleScopeMatrixVO'
]) {
  assert.match(typeSource, new RegExp(`interface ${contractName}\\b`))
}

// Compatibility APIs remain callable by the workflow runtime and historical tools.
for (const legacyApi of ['getUserNodeGrants', 'previewUserNodeGrant', 'saveUserNodeGrant']) {
  assert.match(apiSource, new RegExp(`export function ${legacyApi}\\b`))
}

console.log('system permission role matrix contract tests passed')
