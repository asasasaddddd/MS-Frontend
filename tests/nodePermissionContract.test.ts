import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const runtimeModule = await import('../src/types/nodePermission.ts')
const runtime = runtimeModule as Record<string, unknown>

assert.equal(
  typeof runtime.isSelectableOrganization,
  'function',
  '缺少可执行的后端组织可选性判定'
)
assert.equal(
  typeof runtime.buildNodeGrantPreviewDisplay,
  'function',
  '缺少平铺预览 DTO 的展示模型构造'
)
assert.equal(
  typeof runtime.validateNodeScopeGrantDraft,
  'function',
  '缺少节点授权提权校验'
)
assert.equal(
  typeof runtime.buildNodeScopeGrantRequest,
  'function',
  '缺少节点授权请求构造'
)

const isSelectableOrganization = runtime.isSelectableOrganization as (
  org: Record<string, unknown>
) => boolean
const buildNodeGrantPreviewDisplay = runtime.buildNodeGrantPreviewDisplay as (
  preview: Record<string, unknown>
) => {
  user: string
  role: string
  business: string
  process: string
  node: string
  operation: string
  permissionCode: string
  scope: string
  organization: string
  organizationPath: string
  effect: string
  source: string
  manualElevation: string
  effectiveFrom: string
  effectiveTo: string
  grantReason: string
  warnings: string[]
  existingGrant: { id: string; status: string; rowVersion: number | null } | null
}
const validateNodeScopeGrantDraft = runtime.validateNodeScopeGrantDraft as (
  draft: Record<string, unknown>
) => string[]
const buildNodeScopeGrantRequest = runtime.buildNodeScopeGrantRequest as (
  draft: Record<string, unknown>
) => Record<string, unknown>

const selectableGroup = {
  orgId: 'G100305001',
  orgType: 'GROUP',
  status: 'enabled'
}

for (const nonVirtualValue of ['0', 0, false, 'false', 'FALSE', undefined]) {
  assert.equal(
    isSelectableOrganization({ ...selectableGroup, orgFictitious: nonVirtualValue }),
    true,
    `真实班组应可选择：orgFictitious=${String(nonVirtualValue)}`
  )
}
for (const virtualValue of ['1', 1, true, 'true', 'TRUE', 'yes', 'Y']) {
  assert.equal(
    isSelectableOrganization({ ...selectableGroup, orgFictitious: virtualValue }),
    false,
    `虚拟班组不可选择：orgFictitious=${String(virtualValue)}`
  )
}
assert.equal(isSelectableOrganization({ ...selectableGroup, status: 'disabled' }), false)
assert.equal(isSelectableOrganization({ ...selectableGroup, orgType: 'L6' }), false)

const flatPreview = {
  userId: 'U00109024',
  userName: '计量管理员',
  roleCode: 'MEASURE_ADMIN',
  businessType: 'PERIODIC',
  processType: 'PERIODIC_PLAN',
  nodeCode: 'plan_confirm',
  nodeName: '物资确认',
  operationCode: 'CONFIRM',
  operationName: '确认',
  permissionCode: 'PERIODIC_PLAN_CONFIRM',
  scopeType: 'DEPARTMENT',
  scopeOrgId: 'G10030500',
  scopeOrgName: '重一分厂',
  scopeOrgPath: '中国一重/重一分厂',
  effect: 'ALLOW',
  grantSource: 'MANUAL_ELEVATION',
  effectiveFrom: '2026-07-25T08:00:00',
  effectiveTo: '2026-08-25T08:00:00',
  grantReason: '临时跨班组处理',
  manualElevation: true,
  existingGrantId: '2090000000000000001',
  existingGrantStatus: 'ACTIVE',
  existingRowVersion: 7,
  warnings: ['部门提权将在到期后失效']
}
const previewDisplay = buildNodeGrantPreviewDisplay(flatPreview)
assert.equal(previewDisplay.user, '计量管理员（U00109024）')
assert.equal(previewDisplay.role, 'MEASURE_ADMIN')
assert.equal(previewDisplay.business, 'PERIODIC')
assert.equal(previewDisplay.process, 'PERIODIC_PLAN')
assert.equal(previewDisplay.node, '物资确认（plan_confirm）')
assert.equal(previewDisplay.operation, '确认（CONFIRM）')
assert.equal(previewDisplay.permissionCode, 'PERIODIC_PLAN_CONFIRM')
assert.equal(previewDisplay.scope, 'DEPARTMENT')
assert.equal(previewDisplay.organization, '重一分厂（G10030500）')
assert.equal(previewDisplay.organizationPath, '中国一重/重一分厂')
assert.equal(previewDisplay.manualElevation, '是')
assert.equal(previewDisplay.grantReason, '临时跨班组处理')
assert.deepEqual(previewDisplay.warnings, ['部门提权将在到期后失效'])
assert.deepEqual(previewDisplay.existingGrant, {
  id: '2090000000000000001',
  status: 'ACTIVE',
  rowVersion: 7
})

const baseDraft = {
  roleCode: 'MEASURE_ADMIN',
  permissionCode: 'PERIODIC_PLAN_CONFIRM',
  scopeOrgId: 'G100305001',
  effect: 'DENY',
  effectiveFrom: '',
  effectiveTo: '',
  grantReason: '',
  companyElevationConfirmed: false
}
assert.deepEqual(
  validateNodeScopeGrantDraft({ ...baseDraft, scopeType: 'DEPARTMENT' }),
  ['部门/公司提权必须填写原因', '部门/公司提权必须设置失效时间']
)
assert.deepEqual(
  validateNodeScopeGrantDraft({
    ...baseDraft,
    scopeType: 'COMPANY',
    grantReason: '临时公司级授权',
    effectiveTo: '2026-08-25T08:00:00'
  }),
  ['公司提权必须明确确认风险']
)

const groupRequest = buildNodeScopeGrantRequest({ ...baseDraft, scopeType: 'GROUP' })
assert.equal(groupRequest.grantSource, 'NORMAL_CONFIG')
assert.equal('companyElevationConfirmed' in groupRequest, false)

const companyRequest = buildNodeScopeGrantRequest({
  ...baseDraft,
  scopeType: 'COMPANY',
  scopeOrgId: 'COMPANY-001',
  grantReason: ' 临时公司级授权 ',
  effectiveTo: '2026-08-25T08:00:00',
  companyElevationConfirmed: true
})
assert.equal(companyRequest.grantSource, 'MANUAL_ELEVATION')
assert.equal(companyRequest.grantReason, '临时公司级授权')
assert.equal(companyRequest.companyElevationConfirmed, true)

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
assert.match(viewSource, /isSelectableOrganization/)
assert.match(systemApiSource, /orgFictitious\?:\s*boolean\s*\|\s*number\s*\|\s*string/)
assert.doesNotMatch(systemApiSource, /isVirtual\?:|virtual\?:/)
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

for (const field of [
  'userId',
  'userName',
  'roleCode',
  'businessType',
  'processType',
  'nodeCode',
  'nodeName',
  'operationCode',
  'operationName',
  'permissionCode',
  'scopeType',
  'scopeOrgId',
  'scopeOrgName',
  'scopeOrgPath',
  'effect',
  'grantSource',
  'effectiveFrom',
  'effectiveTo',
  'grantReason',
  'manualElevation',
  'existingGrantId',
  'existingGrantStatus',
  'existingRowVersion',
  'warnings'
]) {
  assert.match(nodePermissionTypeSource, new RegExp(`\\b${field}\\??:`), `平铺预览缺少字段：${field}`)
}
assert.doesNotMatch(
  nodePermissionTypeSource,
  /NodeGrantUserSnapshot|NodeGrantNodeSnapshot|NodeGrantOperationSnapshot|NodeGrantScopeSnapshot|existingGrantSnapshot|existingGrant\?:/
)

// 普通配置仅限班组，部门/公司提权必须预览、填写原因和有效期，公司还需明确确认。
assert.match(viewSource, /NORMAL_CONFIG/)
assert.match(viewSource, /MANUAL_ELEVATION/)
assert.match(viewSource, /previewUserNodeGrant/)
assert.match(viewSource, /previewResult/)
assert.match(viewSource, /buildNodeGrantPreviewDisplay/)
assert.match(viewSource, /existingGrant\.id/)
assert.match(viewSource, /existingGrant\.status/)
assert.match(viewSource, /existingGrant\.rowVersion/)
assert.match(viewSource, /effectiveFrom/)
assert.match(viewSource, /effectiveTo/)
assert.match(viewSource, /grantReason/)
assert.match(viewSource, /companyElevationConfirmed/)
assert.match(viewSource, /validateNodeScopeGrantDraft/)
assert.match(viewSource, /buildNodeScopeGrantRequest/)
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
