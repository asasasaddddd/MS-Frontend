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
for (const helper of [
  'resolvePermissionDetailLoad',
  'filterOperationsForRole',
  'getActiveGroupOrgIds',
  'buildScopeOrganizationTree',
  'buildNodeGrantRoleChange',
  'isCurrentPermissionResponse',
  'canSaveNodeGrantPreview',
  'buildNodeGrantRevokeCommand'
]) {
  assert.equal(typeof runtime[helper], 'function', `缺少可执行的权限状态规则：${helper}`)
}

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
  existingGrant: { id: string; status: string; rowVersion: string | number | null } | null
}
const validateNodeScopeGrantDraft = runtime.validateNodeScopeGrantDraft as (
  draft: Record<string, unknown>
) => string[]
const buildNodeScopeGrantRequest = runtime.buildNodeScopeGrantRequest as (
  draft: Record<string, unknown>
) => Record<string, unknown>
const resolvePermissionDetailLoad = runtime.resolvePermissionDetailLoad as (
  roles: PromiseSettledResult<string[]>,
  relations: PromiseSettledResult<Array<Record<string, unknown>>>,
  grants: PromiseSettledResult<Array<Record<string, unknown>>>
) => {
  detailReady: boolean
  roleCodes: string[]
  relations: Array<Record<string, unknown>>
  grants: Array<Record<string, unknown>>
  failedSections: string[]
}
const filterOperationsForRole = runtime.filterOperationsForRole as (
  operations: Array<Record<string, unknown>>,
  roleCode: string
) => Array<Record<string, unknown>>
const getActiveGroupOrgIds = runtime.getActiveGroupOrgIds as (
  relations: Array<Record<string, unknown>>
) => Set<string>
const buildScopeOrganizationTree = runtime.buildScopeOrganizationTree as (
  organizations: Array<Record<string, unknown>>,
  scopeType?: string,
  allowedGroupIds?: Set<string>
) => Array<{ value: string; disabled: boolean; children?: Array<{ value: string; disabled: boolean }> }>
const buildNodeGrantRoleChange = runtime.buildNodeGrantRoleChange as (
  roleCode: string
) => { roleCode: string; nodeCode: string; permissionCode: string }
const isCurrentPermissionResponse = runtime.isCurrentPermissionResponse as (
  requestSerial: number,
  currentSerial: number,
  requestedUserId: string,
  currentUserId?: string,
  requestedPayload?: Record<string, unknown> | null,
  currentPayload?: Record<string, unknown> | null
) => boolean
const canSaveNodeGrantPreview = runtime.canSaveNodeGrantPreview as (input: {
  detailReady: boolean
  externalAccount: boolean
  preview: unknown
  previewedPayload: Record<string, unknown> | null
  currentPayload: Record<string, unknown>
}) => boolean
const buildNodeGrantRevokeCommand = runtime.buildNodeGrantRevokeCommand as (
  userId: string,
  grant: Record<string, unknown>,
  reason: string
) => { userId: string; grantId: string; rowVersion: number; reason: string } | null

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
  existingRowVersion: '7',
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
  rowVersion: '7'
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
const roleChangedDraft = {
  ...baseDraft,
  businessType: 'PERIODIC',
  nodeCode: 'plan_confirm',
  ...buildNodeGrantRoleChange('VERIFIER')
}
assert.deepEqual(
  [roleChangedDraft.roleCode, roleChangedDraft.nodeCode, roleChangedDraft.permissionCode],
  ['VERIFIER', '', ''],
  '切换操作角色后必须清空旧节点和旧操作'
)
assert.equal(
  buildNodeScopeGrantRequest({ ...roleChangedDraft, scopeType: 'GROUP' }).permissionCode,
  '',
  '角色切换后不得继续构造旧角色的节点操作组合'
)
assert.ok(
  validateNodeScopeGrantDraft({ ...roleChangedDraft, scopeType: 'GROUP' }).includes('请选择操作'),
  '清空旧操作后必须阻止预览和保存'
)
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

const fulfilledRoles = { status: 'fulfilled', value: ['MEASURE_ADMIN'] } as const
const fulfilledRelations = {
  status: 'fulfilled',
  value: [{ orgId: 'G-OWNED', relationType: 'GROUP', status: 'enabled' }]
} as const
const fulfilledGrants = {
  status: 'fulfilled',
  value: [{ id: 'GRANT-1', rowVersion: '4' }]
} as const
const readyDetails = resolvePermissionDetailLoad(
  fulfilledRoles,
  fulfilledRelations,
  fulfilledGrants
)
assert.equal(readyDetails.detailReady, true)
assert.deepEqual(readyDetails.roleCodes, ['MEASURE_ADMIN'])
assert.deepEqual(readyDetails.grants, fulfilledGrants.value)

const failedDetails = resolvePermissionDetailLoad(
  fulfilledRoles,
  { status: 'rejected', reason: new Error('relations unavailable') },
  fulfilledGrants
)
assert.equal(failedDetails.detailReady, false)
assert.deepEqual(failedDetails.roleCodes, [], '任一详情失败后不得保留可用于新增授权的角色')
assert.deepEqual(failedDetails.relations, [], '任一详情失败后不得保留可用于新增授权的组织关系')
assert.deepEqual(failedDetails.grants, fulfilledGrants.value, '成功加载的历史授权仍应允许查看和撤销')
assert.deepEqual(failedDetails.failedSections, ['组织关系'])
const missingRoleDetails = resolvePermissionDetailLoad(
  { status: 'fulfilled', value: null } as unknown as PromiseSettledResult<string[]>,
  fulfilledRelations,
  fulfilledGrants
)
assert.equal(missingRoleDetails.detailReady, false, '详情接口返回 null 也必须 fail-closed')
assert.deepEqual(missingRoleDetails.roleCodes, [])

const roleFilteredOperations = filterOperationsForRole([
  { permissionCode: 'A', defaultRoleCodes: ['MEASURE_ADMIN'] },
  { permissionCode: 'B', defaultRoleCodes: ['VERIFIER'] },
  { permissionCode: 'C' }
], 'MEASURE_ADMIN')
assert.deepEqual(roleFilteredOperations.map((item) => item.permissionCode), ['A'])

const activeGroupIds = getActiveGroupOrgIds([
  { orgId: 'G-OWNED', relationType: 'GROUP', status: 'enabled' },
  { orgId: 'G-DISABLED', relationType: 'GROUP', status: 'disabled' },
  { orgId: 'G-UNTRUSTED', orgType: 'GROUP', status: 'enabled' },
  { orgId: 'D-1', relationType: 'DEPARTMENT', status: 'enabled' }
])
assert.deepEqual([...activeGroupIds], ['G-OWNED'])

const groupScopeTree = buildScopeOrganizationTree([
  {
    orgId: 'C-1',
    orgType: 'COMPANY',
    status: 'enabled',
    children: [{
      orgId: 'D-1',
      orgType: 'DEPARTMENT',
      status: 'enabled',
      children: [
        { orgId: 'G-OWNED', orgType: 'GROUP', status: 'enabled' },
        { orgId: 'G-FOREIGN', orgType: 'GROUP', status: 'enabled' }
      ]
    }]
  }
], 'GROUP', activeGroupIds)
assert.equal(groupScopeTree.length, 1)
assert.equal(groupScopeTree[0]?.disabled, true, '公司祖先只能导航')
assert.equal(groupScopeTree[0]?.children?.[0]?.disabled, true, '部门祖先只能导航')
assert.deepEqual(
  groupScopeTree[0]?.children?.[0]?.children?.map((node) => [node.value, node.disabled]),
  [['G-OWNED', false]],
  'GROUP 范围只能暴露人员真实有效班组'
)

const visibleOrganizationTree = buildScopeOrganizationTree([
  {
    orgId: 'C-DISABLED',
    orgType: 'COMPANY',
    status: 'disabled',
    children: [{
      orgId: 'D-ACTIVE',
      orgType: 'DEPARTMENT',
      status: 'enabled',
      children: [
        { orgId: 'G-VIRTUAL', orgType: 'GROUP', status: 'enabled', orgFictitious: true },
        { orgId: 'G-ACTIVE', orgType: 'GROUP', status: 'enabled' }
      ]
    }]
  },
  {
    orgId: 'C-ACTIVE',
    orgType: 'COMPANY',
    status: 'enabled',
    children: [
      {
        orgId: 'D-VIRTUAL',
        orgType: 'DEPARTMENT',
        status: 'enabled',
        orgFictitious: '1',
        children: [{ orgId: 'G-PROMOTED', orgType: 'GROUP', status: 'enabled' }]
      },
      { orgId: 'D-DISABLED-LEAF', orgType: 'DEPARTMENT', status: 'disabled' }
    ]
  }
])
assert.deepEqual(
  visibleOrganizationTree.map((node) => [
    node.value,
    node.disabled,
    node.children?.map((child) => [child.value, child.disabled]) || []
  ]),
  [
    ['D-ACTIVE', false, [['G-ACTIVE', false]]],
    ['C-ACTIVE', false, [['G-PROMOTED', false]]]
  ],
  '组织树必须隐藏停用/虚拟节点，并按真实层级保留其有效后代'
)

assert.equal(isCurrentPermissionResponse(2, 2, 'U-2', 'U-2'), true)
assert.equal(isCurrentPermissionResponse(1, 2, 'U-1', 'U-2'), false)
assert.equal(isCurrentPermissionResponse(
  2,
  2,
  'U-2',
  'U-2',
  groupRequest,
  { ...groupRequest, permissionCode: 'CHANGED' }
), false, '旧表单的预览响应不得覆盖当前表单')

assert.equal(canSaveNodeGrantPreview({
  detailReady: true,
  externalAccount: false,
  preview: { permissionCode: 'A' },
  previewedPayload: groupRequest,
  currentPayload: groupRequest
}), true)
assert.equal(canSaveNodeGrantPreview({
  detailReady: true,
  externalAccount: false,
  preview: null,
  previewedPayload: null,
  currentPayload: groupRequest
}), false, '未预览不得保存')
assert.equal(canSaveNodeGrantPreview({
  detailReady: true,
  externalAccount: false,
  preview: { permissionCode: 'A' },
  previewedPayload: groupRequest,
  currentPayload: { ...groupRequest, permissionCode: 'CHANGED' }
}), false, '表单变化后的过期预览不得保存')

assert.deepEqual(
  buildNodeGrantRevokeCommand(
    'U00109024',
    { id: '2090000000000000001', rowVersion: '7', status: 'active' },
    ' 岗位调整 '
  ),
  {
    userId: 'U00109024',
    grantId: '2090000000000000001',
    rowVersion: 7,
    reason: '岗位调整'
  }
)
assert.equal(
  buildNodeGrantRevokeCommand(
    'U00109024',
    { id: '2090000000000000001', rowVersion: '7', status: 'revoked' },
    'historical role adjustment'
  ),
  null,
  'revoked grants must not be revoked again'
)
for (const invalidVersion of ['7.5', '-1', '9007199254740992', Number.MAX_SAFE_INTEGER + 1]) {
  assert.equal(
    buildNodeGrantRevokeCommand(
      'U00109024',
      { id: '2090000000000000001', rowVersion: invalidVersion, status: 'active' },
      '岗位调整'
    ),
    null,
    `不安全的版本号必须拒绝：${String(invalidVersion)}`
  )
}

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
assert.match(
  viewSource,
  /function toOrgTreeNodes[\s\S]*?return buildScopeOrganizationTree\(input\)/,
  '人员导航树和授权树必须复用同一有效组织过滤 helper'
)
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
assert.match(systemApiSource, /relationType\?:\s*string/)
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
assert.match(nodePermissionTypeSource, /defaultRoleCodes\?:\s*string\[\]/)
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
assert.match(
  nodePermissionTypeSource,
  /interface NodeGrantVO[\s\S]*?\bstatus\??:/,
  'historical grant VO must expose backend status'
)

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
assert.match(
  viewSource,
  /watch\(\(\) => grantForm\.roleCode,[\s\S]*?buildNodeGrantRoleChange/,
  '角色变化必须通过统一 helper 清空节点和操作'
)
assert.match(
  viewSource,
  /grantForm\.roleCode[\s\S]*?invalidatePreview/,
  '角色、业务、节点或操作变化后必须使旧预览失效'
)
assert.match(viewSource, /请先预览/)

// 外部账号保留多角色分配，但组织授权不适用，绝不能伪造 PERSON scope grant。
assert.match(viewSource, /SUPPLIER/)
assert.match(viewSource, /EXTERNAL_OPERATOR/)
assert.match(viewSource, /PERSON/)
assert.match(viewSource, /组织授权不适用/)
assert.doesNotMatch(viewSource, /v-if="!externalAccount"\s+class="grant-list-section"/)
assert.match(viewSource, /detailReady/)
assert.match(viewSource, /重试/)
assert.doesNotMatch(nodePermissionTypeSource, /scopeType[^\n]*PERSON/)
assert.doesNotMatch(nodePermissionApiSource, /scopeType[^\n]*PERSON/)

// 授权记录可能只返回 id，表格行键必须兼容 grantId / id。
assert.match(viewSource, /:row-key="grantRowKey"/)
assert.match(viewSource, /grantColumns[\s\S]*?dataIndex:\s*'status'/)
assert.match(viewSource, /column\.dataIndex === 'status'[\s\S]*?record\.status/)
assert.match(viewSource, /record\.status === 'active'[\s\S]*?openDeleteGrant/)

// 最终生效权限只展示后端预览/快照，不在前端推导候选数量或最终权限。
assert.match(viewSource, /后端预览/)
assert.doesNotMatch(viewSource, /candidateCount|effectivePermission\s*=|deriveEffectivePermission/)
