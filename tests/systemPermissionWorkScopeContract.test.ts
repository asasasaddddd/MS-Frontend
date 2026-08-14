import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const viewSource = source('../src/views/system/SystemPermissionView.vue')
const dialogSource = source('../src/views/system/components/UserWorkScopeDialog.vue')
const modelSource = source('../src/views/system/workScopeModel.ts')
const apiSource = source('../src/api/nodePermission.ts')
const typeSource = source('../src/types/nodePermission.ts')
const systemApiSource = source('../src/api/system.ts')

// 权限页：组织树已退役，平级单位作为一维选项，人员筛选只按单位编码。
assert.doesNotMatch(viewSource, /getAllowedOrganizationTree/)
assert.doesNotMatch(viewSource, /a-tree-select|tree-data|filter-tree-node/)
assert.doesNotMatch(viewSource, /\bTree\b|\bchildren\b|SUBTREE/)
assert.match(viewSource, /listAllowedUnits/)
assert.match(viewSource, /listAllowedOrganizationUsers\(selectedOrganizationIds\.value\)/)
assert.match(viewSource, /UserWorkScopeDialog/)
assert.doesNotMatch(viewSource, /RoleScopeMatrixDialog/)

// 权限页与弹窗不得导入旧矩阵 API 或旧模型。
for (const sourceText of [viewSource, dialogSource]) {
  assert.doesNotMatch(sourceText, /getUserRoleScopeMatrix|replaceUserRoleScopeMatrix/)
  assert.doesNotMatch(sourceText, /roleScopeMatrixModel/)
}

// 权限页不出现节点粒度或旧 role-scopes 编辑入口。
for (const forbiddenImport of [
  'listNodeOperations',
  'previewUserNodeGrant',
  'saveUserNodeGrant',
  'deleteUserNodeGrant',
  'previewUserRoleScope',
  'saveUserRoleScope',
  'updateUserRoleScope',
  'revokeUserRoleScope',
  'listUserRoleScopes'
]) {
  assert.doesNotMatch(viewSource, new RegExp(`\\b${forbiddenImport}\\b`))
  assert.doesNotMatch(dialogSource, new RegExp(`\\b${forbiddenImport}\\b`))
}

// 弹窗头部显示姓名、工号和主单位。
assert.match(dialogSource, /user\?\.employeeName/)
assert.match(dialogSource, /user\?\.employeeId/)
assert.match(dialogSource, /homeUnitName/)

// 弹窗三栏：左栏角色分配（全部启用角色，勾选立即调用覆盖式分配接口），
// 中栏人员信息，右栏范围规则表单；无角色人员可先在左栏授予角色再配范围。
assert.match(dialogSource, /角色分配/)
assert.match(dialogSource, /人员信息/)
assert.match(dialogSource, /assignUserRoles/)
assert.match(dialogSource, /assignedRoleCodes/)
assert.match(dialogSource, /handleRoleToggle/)
assert.match(systemApiSource, /assignUserRoles[\s\S]*?\/system\/users\/\$\{encodeURIComponent\(employeeId\)\}\/roles[\s\S]*?method:\s*'PUT'/)

// 角色驱动表单：管理员只显示单位；自检加学科小类且隐藏通用性；外委再加通用/否通用。
assert.match(modelSource, /MEASURE_ADMIN[\s\S]*?fixedSubjectSubcategory:\s*'ALL'/)
assert.match(modelSource, /VERIFIER_SELF[\s\S]*?fixedVerificationMethod:\s*'self'[\s\S]*?fixedCommonScope:\s*'NOT_APPLICABLE'/)
assert.match(modelSource, /VERIFIER_EXTERNAL[\s\S]*?fixedVerificationMethod:\s*'send_out'/)
assert.match(modelSource, /VERIFIER_EXTERNAL[\s\S]*?commonRequired:\s*true/)
assert.match(dialogSource, /v-if="formCapabilities\.subjectRequired"/)
assert.match(dialogSource, /v-if="formCapabilities\.commonRequired"/)
assert.match(dialogSource, /通用 \/ 否通用（必选）/)

// 主管领导只读“本单位”，计量领导与责任工程师只读“全视角”。
assert.match(modelSource, /DEPT_LEADER:\s*'本单位'/)
assert.match(modelSource, /MEASURE_LEADER:\s*'全视角'/)
assert.match(modelSource, /RESPONSIBLE_ENGINEER:\s*'全视角'/)

// 保存前差异：将新增/撤销/保留可见；自检行永远 NOT_APPLICABLE；外委未选通用性时禁用保存。
assert.match(dialogSource, /新增 \{\{ matrixDiff\.added\.length \}\}/)
assert.match(dialogSource, /移除 \{\{ matrixDiff\.removed\.length \}\}/)
assert.match(dialogSource, /保留 \{\{ matrixDiff\.retained\.length \}\}/)
assert.match(dialogSource, /validateWorkScopeDraft\(draftEntries\.value\)/)
assert.match(modelSource, /WORK_SCOPE_EXTERNAL_COMMON_REQUIRED/)


// 矩阵版本冲突：HTTP 409 原样提示，不允许本地改写或静默重试。
assert.match(dialogSource, /isMatrixVersionConflict/)
assert.match(modelSource, /response\?\.status === 409/)

// 作业范围 API 契约：一个 GET 读取、一个 PUT 整组替换。
assert.match(apiSource, /getUserWorkScopes[\s\S]*?\/work-scopes[\s\S]*?method:\s*'GET'/)
assert.match(apiSource, /replaceUserWorkScopes[\s\S]*?\/work-scopes[\s\S]*?method:\s*'PUT'/)

// 旧 role-scope 矩阵与 role-scopes CRUD 调用已整体删除，无回退分支。
assert.doesNotMatch(apiSource, /role-scope-matrix|\/role-scopes/)
assert.doesNotMatch(apiSource, /getUserRoleScopeMatrix|replaceUserRoleScopeMatrix|listUserRoleScopes/)
assert.doesNotMatch(apiSource, /previewUserRoleScope|saveUserRoleScope|updateUserRoleScope|revokeUserRoleScope/)

// 类型契约：平级单位、角色策略、标准规则行与预览查询全部存在。
for (const contractName of [
  'AllowedUnitVO',
  'WorkScopeRolePolicyVO',
  'UserWorkScopeEntry',
  'UserWorkScopeMatrixVO',
  'UserWorkScopeMatrixRequest',
  'WorkScopeCandidatePreviewQuery',
  'WorkScopeCandidateVO'
]) {
  assert.match(typeSource, new RegExp(`interface ${contractName}\\b`))
}
assert.match(typeSource, /export type WorkScopeVerificationMethod\s*=\s*'NOT_APPLICABLE'\s*\|\s*'self'\s*\|\s*'send_out'/)
assert.match(typeSource, /export type WorkScopeCommonScopeCode\s*=\s*'NOT_APPLICABLE'\s*\|\s*'COMMON'\s*\|\s*'NON_COMMON'/)

// 旧矩阵类型已删除。
assert.doesNotMatch(typeSource, /interface UserRoleScopeMatrixEntry\b/)
assert.doesNotMatch(typeSource, /interface UserRoleScopeMatrixRequest\b/)
assert.doesNotMatch(typeSource, /interface UserRoleScopeMatrixVO\b/)

// 平级单位接口：GET 一维数组。
assert.match(systemApiSource, /listAllowedUnits[\s\S]*?\/system\/org-scopes\/units[\s\S]*?method:\s*'GET'/)

// 保留的兼容 API：节点授权历史查询、统一模板操作目录与旧候选预览（首检分类弹窗仍在使用）。
for (const apiName of [
  'listNodeOperations',
  'getUserNodeGrants',
  'previewUserNodeGrant',
  'saveUserNodeGrant',
  'deleteUserNodeGrant',
  'getEffectivePermissions',
  'previewTaskCandidates'
]) {
  assert.match(apiSource, new RegExp(`export function ${apiName}\\b`), `missing ${apiName}`)
}

console.log('system permission work scope contract tests passed')
