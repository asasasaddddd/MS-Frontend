import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function source(path: string) {
  const url = new URL(path, import.meta.url)
  assert.ok(existsSync(url), `缺少节点权限实现文件：${path}`)
  return readFileSync(url, 'utf8')
}

const viewSource = source('../src/views/system/SystemPermissionView.vue')
const systemApiSource = source('../src/api/system.ts')
const nodePermissionApiSource = source('../src/api/nodePermission.ts')
const nodePermissionTypeSource = source('../src/types/nodePermission.ts')

// 权威组织树只能按真实组织类型建模，不能继续猜测固定 L4/L5/L6 层级。
assert.doesNotMatch(viewSource, /visibleOrgLevels|['"]4['"],\s*['"]5['"],\s*['"]6['"]/)
for (const orgType of ['COMPANY', 'DEPARTMENT', 'GROUP']) {
  assert.ok(viewSource.includes(orgType), `组织树缺少真实类型 ${orgType}`)
}
assert.match(viewSource, /isSelectableOrg/)
assert.match(viewSource, /isVirtualOrg/)
assert.match(viewSource, /orgFullPath/)
assert.match(viewSource, /filterTreeNode/)
assert.match(viewSource, /orgSearchKeyword/)

// 人员必须支持工号、姓名模糊查询，并按需补齐组织关系与多角色。
assert.match(viewSource, /输入工号模糊查询/)
assert.match(viewSource, /输入姓名模糊查询/)
assert.match(systemApiSource, /getUserOrgRelations/)
assert.match(systemApiSource, /\/system\/users\/\$\{encodeURIComponent\(employeeId\)\}\/org-relations/)
assert.match(viewSource, /getUserOrgRelations/)
assert.match(viewSource, /getUserRoles/)
assert.match(viewSource, /selectedRoleCodes/)
assert.match(viewSource, /multiple/)
for (const column of ['主组织', '部门', '班组', '已有角色']) {
  assert.ok(viewSource.includes(column), `人员列表缺少字段：${column}`)
}

// 授权配置必须严格按 操作角色 -> 业务 -> 节点 -> 操作 -> 范围 -> 组织 排列。
const orderedLabels = ['操作角色', '业务', '节点', '操作', '范围', '组织']
let previousIndex = -1
for (const label of orderedLabels) {
  const currentIndex = viewSource.indexOf(`>${label}<`)
  assert.ok(currentIndex > previousIndex, `权限配置顺序错误或缺少：${label}`)
  previousIndex = currentIndex
}

// 节点、操作及 ALLOW/DENY 必须来自明确的后端协议。
assert.match(nodePermissionApiSource, /\/system\/node-operations/)
assert.match(nodePermissionApiSource, /businessType/)
assert.match(nodePermissionTypeSource, /'ALLOW'\s*\|\s*'DENY'/)
assert.ok(viewSource.includes('ALLOW'))
assert.ok(viewSource.includes('DENY'))

// 节点授权接口路径与请求字段保持后端权威契约。
for (const endpoint of [
  '/node-grants',
  '/node-grants/preview'
]) {
  assert.ok(nodePermissionApiSource.includes(endpoint), `缺少节点授权接口：${endpoint}`)
}
assert.match(nodePermissionApiSource, /method:\s*'GET'/)
assert.match(nodePermissionApiSource, /method:\s*'POST'/)
assert.match(nodePermissionApiSource, /method:\s*'PUT'/)
assert.match(nodePermissionApiSource, /method:\s*'DELETE'/)
assert.match(nodePermissionApiSource, /rowVersion/)
assert.match(nodePermissionApiSource, /reason/)

for (const field of [
  'roleCode',
  'permissionCode',
  'scopeType',
  'scopeOrgId',
  'effect',
  'grantSource',
  'effectiveFrom',
  'effectiveTo',
  'grantReason',
  'companyElevationConfirmed'
]) {
  assert.match(nodePermissionTypeSource, new RegExp(`\\b${field}\\??:`), `授权请求缺少字段：${field}`)
}
assert.match(nodePermissionTypeSource, /'GROUP'\s*\|\s*'DEPARTMENT'\s*\|\s*'COMPANY'/)
assert.match(nodePermissionTypeSource, /'NORMAL_CONFIG'\s*\|\s*'MANUAL_ELEVATION'/)

// 普通配置仅限班组，部门/公司提权必须预览、填写原因和有效期，公司还需明确确认。
assert.match(viewSource, /NORMAL_CONFIG/)
assert.match(viewSource, /MANUAL_ELEVATION/)
assert.match(viewSource, /previewUserNodeGrant/)
assert.match(viewSource, /previewResult/)
assert.match(viewSource, /effectiveFrom/)
assert.match(viewSource, /effectiveTo/)
assert.match(viewSource, /grantReason/)
assert.match(viewSource, /companyElevationConfirmed/)
assert.match(viewSource, /请先预览/)

// 外部账号保留多角色分配，但组织授权不适用，绝不能伪造 PERSON scope grant。
assert.match(viewSource, /SUPPLIER/)
assert.match(viewSource, /EXTERNAL_OPERATOR/)
assert.match(viewSource, /PERSON/)
assert.match(viewSource, /组织授权不适用/)
assert.match(viewSource, /v-if="!externalAccount"\s+class="grant-list-section"/)
assert.doesNotMatch(nodePermissionTypeSource, /scopeType[^\n]*PERSON/)
assert.doesNotMatch(nodePermissionApiSource, /scopeType[^\n]*PERSON/)

// 授权记录可能只返回 id，表格行键必须兼容 grantId / id。
assert.match(viewSource, /:row-key="grantRowKey"/)

// 最终生效权限只展示后端预览/快照，不在前端推导候选数量或最终权限。
assert.match(viewSource, /后端预览/)
assert.doesNotMatch(viewSource, /candidateCount|effectivePermission\s*=|deriveEffectivePermission/)
