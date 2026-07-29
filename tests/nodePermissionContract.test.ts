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
  'buildScopeOrganizationTree',
  'buildNodeGrantRoleChange',
  'isCurrentPermissionResponse',
  'canSaveNodeGrantPreview',
  'buildNodeGrantRevokeCommand'
]) {
  assert.equal(typeof runtime[helper], 'function', `缺少可执行的权限状态规则：${helper}`)
}
assert.equal(
  runtime.getActiveGroupOrgIds,
  undefined,
  '组织授权不得再导出按人员 MDM 主组收窄范围的 helper'
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
const buildScopeOrganizationTree = runtime.buildScopeOrganizationTree as (
  organizations: Array<Record<string, unknown>>,
  scopeType?: string
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
  scopeType: 'GROUP',
  scopeOrgId: 'G100305001',
  effect: 'DENY',
  effectiveFrom: '',
  effectiveTo: '',
  grantReason: ''
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
  ['部门提权必须填写原因', '部门提权必须设置失效时间']
)
assert.deepEqual(
  validateNodeScopeGrantDraft({
    ...baseDraft,
    scopeType: 'COMPANY'
  } as never),
  ['请选择有效授权范围']
)

const groupRequest = buildNodeScopeGrantRequest(baseDraft)
assert.equal(groupRequest.grantSource, 'NORMAL_CONFIG')
assert.equal('companyElevationConfirmed' in groupRequest, false)

assert.throws(
  () => buildNodeScopeGrantRequest({ ...baseDraft, scopeType: 'COMPANY' } as never),
  /GROUP|DEPARTMENT/,
  'write builder must reject historical COMPANY scope'
)

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
], 'GROUP')
assert.equal(groupScopeTree.length, 1)
assert.equal(groupScopeTree[0]?.disabled, true, '公司祖先只能导航')
assert.equal(groupScopeTree[0]?.children?.[0]?.disabled, true, '部门祖先只能导航')
assert.deepEqual(
  groupScopeTree[0]?.children?.[0]?.children?.map((node) => [node.value, node.disabled]),
  [['G-OWNED', false], ['G-FOREIGN', false]],
  'GROUP 范围必须允许树中全部有效组，不能按人员 MDM 主组过滤'
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

assert.doesNotMatch(
  nodePermissionTypeSource,
  /UserOrgRelationSelectionInput|getActiveGroupOrgIds|allowedGroupIds/,
  '节点授权类型层不得保留人员 MDM 组白名单参数或 helper'
)
assert.match(
  nodePermissionTypeSource,
  /export function buildScopeOrganizationTree\(\s*organizations:\s*OrganizationTreeInput\[],\s*targetType\?:\s*NodeScopeType\s*\)/,
  '组织树 helper 只能接受组织树和目标类型'
)

// 页面只能消费后端允许部门树。根节点与动态 MDM 组必须原样建模，不能继续
// 调用系统全量组织，也不能猜测固定层级或硬编码特殊部门下的组名单。
assert.doesNotMatch(viewSource, /visibleOrgLevels|['"]4['"],\s*['"]5['"],\s*['"]6['"]|listSystemOrgs/)
assert.match(viewSource, /getAllowedOrganizationTree/)
assert.match(viewSource, /AllowedOrganizationNodeVO/)
assert.match(viewSource, /org\.children\s*\|\|\s*\[\]/)
assert.doesNotMatch(viewSource, /allowedGroupIds|getActiveGroupOrgIds/)
assert.doesNotMatch(
  viewSource,
  /质检(?:部|组)|电站服务事业部|备件部|工程部/,
  'allowed-tree consumers must not hardcode dynamic MDM group names'
)
assert.match(systemApiSource, /orgFictitious\?:\s*boolean\s*\|\s*number\s*\|\s*string/)
assert.doesNotMatch(systemApiSource, /isVirtual\?:|virtual\?:/)
assert.match(viewSource, /orgFullPath/)
assert.match(viewSource, /filterTreeNode/)
assert.match(viewSource, /orgSearchKeyword/)

// 人员只能在 allowed-users 返回集合内做工号、姓名和分页。部门选择传本部门
// 及所有后代组，组选择只传自身，未选择组织时传空数组表示全部允许范围。
assert.match(viewSource, /listAllowedOrganizationUsers/)
assert.doesNotMatch(viewSource, /listSystemUsers/)
assert.match(
  viewSource,
  /const selectedOrganizationUserIds = computed\([\s\S]*?if \(!selectedOrgId\.value\) return \[\][\s\S]*?org\?\.type === 'DEPARTMENT'[\s\S]*?return org\.descendantIds[\s\S]*?return \[selectedOrgId\.value\]/,
  'selected organization must map department to descendants and group to its own id'
)
assert.match(
  viewSource,
  /listAllowedOrganizationUsers\(selectedOrganizationUserIds\.value\)/,
  'allowed users query must receive the selected allowed-tree scope'
)
assert.match(viewSource, /allowedUsers\.value\.filter/)
assert.match(viewSource, /\.slice\(start,\s*start \+ pager\.size\)/)
const loadAllowedUsersStart = viewSource.indexOf('async function loadAllowedUsers')
const loadAllowedUsersEnd = viewSource.indexOf('async function loadNodeGrants', loadAllowedUsersStart)
assert.ok(loadAllowedUsersStart >= 0 && loadAllowedUsersEnd > loadAllowedUsersStart, 'missing allowed-users loader')
const loadAllowedUsersSource = viewSource.slice(loadAllowedUsersStart, loadAllowedUsersEnd)
assert.equal(
  [...loadAllowedUsersSource.matchAll(/listAllowedOrganizationUsers\(/g)].length,
  1,
  'allowed-users loader must issue exactly one allowed personnel request'
)
assert.doesNotMatch(
  loadAllowedUsersSource,
  /getUserOrgRelations|getUserRoles|enrichPerson|Promise\.all/,
  'allowed-users loader must not fan out per-person relation or role requests'
)
assert.match(
  loadAllowedUsersSource,
  /\(result\s*\|\|\s*\[\]\)\.map\(personFromAllowedUser\)/,
  'allowed-users response must be mapped locally into lightweight rows'
)
assert.doesNotMatch(viewSource, /async function enrichPerson/)
const permissionDetailsStart = viewSource.indexOf('async function loadPermissionDetails')
const permissionDetailsEnd = viewSource.indexOf('async function retryPermissionDetails', permissionDetailsStart)
const permissionDetailsSource = viewSource.slice(permissionDetailsStart, permissionDetailsEnd)
for (const detailCall of [
  'getUserRoles',
  'getUserOrgRelations',
  'getUserNodeGrants',
  'listUserRoleScopes'
]) {
  assert.match(
    permissionDetailsSource,
    new RegExp(`${detailCall}\\(user\\.employeeId\\)`),
    `permission detail must lazily load ${detailCall}`
  )
}
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
for (const readOnlyPath of ['primaryOrgPath', 'departmentPath', 'groupPath']) {
  assert.match(viewSource, new RegExp(`\\b${readOnlyPath}\\b`), `人员缺少只读 MDM 路径：${readOnlyPath}`)
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
  'grantReason'
]) {
  assert.match(nodePermissionTypeSource, new RegExp(`\\b${field}\\??:`), `授权请求缺少字段：${field}`)
}
assert.match(nodePermissionTypeSource, /export type NodeGrantScopeType\s*=\s*'GROUP'\s*\|\s*'DEPARTMENT'/)
assert.match(nodePermissionTypeSource, /'NORMAL_CONFIG'\s*\|\s*'MANUAL_ELEVATION'/)
for (const contractName of ['NodeScopeGrantRequest', 'NodeScopeGrantDraft']) {
  const contractSource = nodePermissionTypeSource.match(
    new RegExp(`interface ${contractName}[\\s\\S]*?\\n}`)
  )
  assert.ok(contractSource, `missing ${contractName}`)
  assert.match(contractSource[0], /scopeType:\s*NodeGrantScopeType/)
  assert.doesNotMatch(contractSource[0], /COMPANY|companyElevationConfirmed/)
}
assert.match(
  nodePermissionTypeSource,
  /interface NodeGrantVO[\s\S]*?scopeType:\s*NodeScopeType[\s\S]*?\bstatus\??:/,
  'historical grant VO must preserve COMPANY-compatible scope type and backend status'
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

// 普通配置仅限班组，部门提权必须预览、填写原因和有效期。
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
assert.doesNotMatch(viewSource, /companyElevationConfirmed/)
assert.match(viewSource, /validateNodeScopeGrantDraft/)
assert.match(viewSource, /buildNodeScopeGrantRequest/)
const scopeOptionsSource = viewSource.match(/const scopeOptions\s*=\s*\[[\s\S]*?\n]/)
assert.ok(scopeOptionsSource, 'missing node-grant scope options')
assert.match(scopeOptionsSource[0], /value:\s*'GROUP'/)
assert.match(scopeOptionsSource[0], /value:\s*'DEPARTMENT'/)
assert.doesNotMatch(scopeOptionsSource[0], /value:\s*'COMPANY'/)
assert.doesNotMatch(viewSource, /公司提权|公司级提权|公司风险确认/)
assert.doesNotMatch(nodePermissionApiSource, /companyElevationConfirmed/)

for (const functionName of ['validateNodeScopeGrantDraft', 'buildNodeScopeGrantRequest']) {
  const functionSource = nodePermissionTypeSource.match(
    new RegExp(`export function ${functionName}[\\s\\S]*?\\n}`)
  )
  assert.ok(functionSource, `missing ${functionName}`)
  assert.doesNotMatch(functionSource[0], /companyElevationConfirmed|scopeType\s*===\s*'COMPANY'/)
}
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
const nodeScopeGrantRequestSource = nodePermissionTypeSource.match(
  /interface NodeScopeGrantRequest[\s\S]*?\n}/
)
assert.ok(nodeScopeGrantRequestSource, 'missing node-scope grant request contract')
assert.doesNotMatch(nodeScopeGrantRequestSource[0], /scopeType[^\n]*PERSON/)
assert.doesNotMatch(nodePermissionApiSource, /scopeType[^\n]*PERSON/)

// 授权记录可能只返回 id，表格行键必须兼容 grantId / id。
assert.match(viewSource, /:row-key="grantRowKey"/)
assert.match(viewSource, /grantColumns[\s\S]*?dataIndex:\s*'status'/)
assert.match(viewSource, /column\.dataIndex === 'status'[\s\S]*?record\.status/)
assert.match(viewSource, /record\.status === 'active'[\s\S]*?openDeleteGrant/)

// 最终生效权限只展示后端预览/快照，不在前端推导候选数量或最终权限。
assert.match(viewSource, /后端预览/)
assert.doesNotMatch(viewSource, /candidateCount|effectivePermission\s*=|deriveEffectivePermission/)

// New organization-scoped business configuration must stay inside the allowed
// department tree. Historical node-grant reads may still expose COMPANY via
// NodeScopeType, but new role scopes and selectable options must not.
assert.match(
  nodePermissionTypeSource,
  /export type RoleScopeType\s*=\s*'DEPARTMENT'\s*\|\s*'GROUP'/,
  'missing restricted DEPARTMENT/GROUP role-scope type'
)
assert.doesNotMatch(
  nodePermissionTypeSource,
  /export type RoleScopeType[^\n]*COMPANY/,
  'new role scopes must not expose COMPANY'
)
const roleScopeTypeOptions = runtime.ROLE_SCOPE_TYPE_OPTIONS as Array<{ value: string }> | undefined
assert.ok(Array.isArray(roleScopeTypeOptions), 'missing exported role-scope options')
assert.deepEqual(
  roleScopeTypeOptions.map((option) => option.value),
  ['DEPARTMENT', 'GROUP'],
  'new role-scope options must contain only DEPARTMENT and GROUP'
)

for (const field of [
  'orgId',
  'orgName',
  'orgFullPath',
  'orgType',
  'parentOrgId',
  'allowedDepartmentOrgId',
  'children'
]) {
  assert.match(
    nodePermissionTypeSource,
    new RegExp(`interface AllowedOrganizationNodeVO[\\s\\S]*?\\b${field}\\??:`),
    `allowed organization node is missing ${field}`
  )
}
assert.match(
  nodePermissionTypeSource,
  /interface AllowedOrganizationNodeVO[\s\S]*?orgType:\s*RoleScopeType/,
  'allowed organization tree must use the restricted DEPARTMENT/GROUP type'
)

for (const field of [
  'roleCode',
  'scopeType',
  'scopeOrgId',
  'audienceMode',
  'grantSource',
  'effectiveFrom',
  'effectiveTo',
  'grantReason',
  'rowVersion'
]) {
  assert.match(
    nodePermissionTypeSource,
    new RegExp(`interface UserRoleScopeRequest[\\s\\S]*?\\b${field}\\??:`),
    `role-scope request is missing ${field}`
  )
}
assert.match(
  nodePermissionTypeSource,
  /interface UserRoleScopeRequest[\s\S]*?scopeType:\s*RoleScopeType/,
  'role-scope requests must reject COMPANY at compile time'
)

for (const field of [
  'id',
  'userId',
  'userName',
  'roleCode',
  'roleName',
  'scopeType',
  'scopeOrgId',
  'scopeOrgName',
  'scopeOrgPath',
  'allowedDepartmentOrgId',
  'audienceMode',
  'grantSource',
  'effectiveFrom',
  'effectiveTo',
  'grantReason',
  'status',
  'rowVersion'
]) {
  assert.match(
    nodePermissionTypeSource,
    new RegExp(`interface UserRoleScopeVO[\\s\\S]*?\\b${field}\\??:`),
    `role-scope VO is missing ${field}`
  )
}
for (const field of [
  'roleWillBeAssigned',
  'existingScopeId',
  'existingStatus',
  'existingRowVersion',
  'warnings'
]) {
  assert.match(
    nodePermissionTypeSource,
    new RegExp(`interface UserRoleScopePreviewVO[\\s\\S]*?\\b${field}\\??:`),
    `role-scope preview is missing ${field}`
  )
}

for (const apiName of [
  'listUserRoleScopes',
  'previewUserRoleScope',
  'saveUserRoleScope',
  'updateUserRoleScope',
  'revokeUserRoleScope',
  'getEffectivePermissions',
  'previewTaskCandidates'
]) {
  assert.match(
    nodePermissionApiSource,
    new RegExp(`export function ${apiName}\\b`),
    `missing node-permission API ${apiName}`
  )
}
for (const endpoint of [
  '/role-scopes',
  '/role-scopes/preview',
  '/effective-permissions',
  '/task-candidates/preview'
]) {
  assert.ok(nodePermissionApiSource.includes(endpoint), `missing endpoint ${endpoint}`)
}
assert.match(nodePermissionApiSource, /previewTaskCandidates[\s\S]*?method:\s*'GET'[\s\S]*?params:\s*query/)
assert.match(nodePermissionApiSource, /saveUserRoleScope[\s\S]*?method:\s*'POST'/)
assert.match(nodePermissionApiSource, /updateUserRoleScope[\s\S]*?encodeURIComponent\(scopeId\)[\s\S]*?method:\s*'PUT'/)
assert.match(nodePermissionApiSource, /revokeUserRoleScope[\s\S]*?encodeURIComponent\(scopeId\)[\s\S]*?method:\s*'DELETE'[\s\S]*?rowVersion[\s\S]*?reason/)

for (const apiName of ['getAllowedOrganizationTree', 'listAllowedOrganizationUsers']) {
  assert.match(systemApiSource, new RegExp(`export function ${apiName}\\b`), `missing system API ${apiName}`)
}
assert.match(systemApiSource, /getAllowedOrganizationTree[\s\S]*?\/system\/org-scopes\/allowed-tree[\s\S]*?method:\s*'GET'/)
assert.match(systemApiSource, /listAllowedOrganizationUsers[\s\S]*?\/system\/org-scopes\/users[\s\S]*?method:\s*'GET'[\s\S]*?orgIds/)

// 权限弹窗的主配置是可重复的角色范围矩阵；同一角色允许多部门/多组，
// 不得按人员 MDM 主部门或主组过滤授权目标。
for (const apiName of [
  'listUserRoleScopes',
  'previewUserRoleScope',
  'saveUserRoleScope',
  'updateUserRoleScope',
  'revokeUserRoleScope'
]) {
  assert.match(viewSource, new RegExp(`\\b${apiName}\\b`), `permission page missing ${apiName}`)
}
assert.match(viewSource, />角色范围</)
assert.match(viewSource, />\s*新增角色范围\s*</)
const roleScopeColumnsSource = viewSource.match(/const roleScopeColumns\s*=\s*\[[\s\S]*?\n]/)
assert.ok(roleScopeColumnsSource, 'missing role-scope matrix columns')
for (const column of ['角色', '范围类型', '组织', '覆盖模式', '来源', '有效期', '状态', '操作']) {
  assert.ok(roleScopeColumnsSource[0].includes(`'${column}'`), `role-scope matrix missing column ${column}`)
}
for (const option of ['NORMAL_CONFIG', 'CROSS_ORG_ASSIGNMENT', 'MANUAL_ELEVATION']) {
  assert.match(viewSource, new RegExp(`value:\\s*'${option}'`), `missing role-scope source ${option}`)
}
assert.match(viewSource, /roleScopeForm\.scopeType === 'GROUP'[\s\S]*?roleScopeForm\.audienceMode = 'EXACT'/)
assert.match(viewSource, /roleScopeForm\.scopeType = 'DEPARTMENT'[\s\S]*?roleScopeForm\.audienceMode = 'SUBTREE'/)
const roleScopeValidationSource = viewSource.match(
  /function validateRoleScopeForm\(\)[\s\S]*?\n}/
)
assert.ok(roleScopeValidationSource, 'missing role-scope validation')
assert.match(
  roleScopeValidationSource[0],
  /grantSource === 'CROSS_ORG_ASSIGNMENT'[\s\S]*?grantReason/,
  'cross-organization assignment must require a reason'
)
assert.match(
  roleScopeValidationSource[0],
  /grantSource === 'MANUAL_ELEVATION'[\s\S]*?scopeType !== 'DEPARTMENT'[\s\S]*?grantReason[\s\S]*?effectiveTo/,
  'manual elevation must require department scope, reason, and expiry'
)
assert.doesNotMatch(
  roleScopeValidationSource[0],
  /grantSource !== 'NORMAL_CONFIG'[\s\S]*?effectiveTo/,
  'cross-organization assignments may be long-lived'
)
assert.match(viewSource, /previewUserRoleScope\([\s\S]*?roleScopePreview/)
assert.match(viewSource, /saveUserRoleScope\([\s\S]*?updateUserRoleScope\(/)
assert.match(viewSource, /updateUserRoleScope\([\s\S]*?rowVersion/)
assert.match(viewSource, /revokeUserRoleScope\([\s\S]*?rowVersion[\s\S]*?reason/)
assert.match(viewSource, /编辑/)
assert.match(viewSource, /撤销/)
assert.match(viewSource, /v-if="!externalAccount"[\s\S]*?>\s*新增角色范围\s*</)

// 更新接口不允许改变角色、范围类型和组织。编辑模式下这三个业务键必须只读，
// 新增模式 scopeId 为空时仍可正常选择。
for (const immutableModel of [
  'roleScopeForm.roleCode',
  'roleScopeForm.scopeType',
  'roleScopeForm.scopeOrgId'
]) {
  assert.match(
    viewSource,
    new RegExp(`v-model:value="${immutableModel.replace('.', '\\.')}"[\\s\\S]{0,700}?:disabled="roleScopeForm\\.scopeId != null"`),
    `editing role scopes must lock ${immutableModel}`
  )
}

// 既有节点授权仍保留在高级权限区域，写入范围只允许部门/组，组织树同样
// 来自 allowed tree。外部账号不能新增，但历史矩阵和节点授权仍可撤销。
assert.match(viewSource, />高级权限</)
assert.match(viewSource, /previewUserNodeGrant/)
assert.match(viewSource, /saveUserNodeGrant/)
assert.match(viewSource, /deleteUserNodeGrant/)
assert.match(viewSource, /ALLOW/)
assert.match(viewSource, /DENY/)
assert.doesNotMatch(viewSource, /value:\s*'COMPANY'/)
assert.match(viewSource, /role-scope-table-scroll/)
assert.match(viewSource, /grant-table-scroll/)

// Candidate preview is a workflow/history compatibility contract. COMPANY is
// retained here only; it must not leak into new role-scope types or options.
assert.match(
  nodePermissionTypeSource,
  /export type TaskCandidateScopeType\s*=\s*'PERSON'\s*\|\s*'DEPARTMENT'\s*\|\s*'GROUP'\s*\|\s*'COMPANY'/,
  'candidate preview scope compatibility must include PERSON/DEPARTMENT/GROUP/COMPANY'
)

for (const [branch, contracts] of [
  ['PersonTaskCandidatePreviewQuery', [
    /scopeType:\s*'PERSON'/,
    /assigneeId:\s*string/,
    /scopeOrgId\?:\s*never/,
    /audienceMode\?:\s*'EXACT'/
  ]],
  ['DepartmentTaskCandidatePreviewQuery', [
    /scopeType:\s*'DEPARTMENT'/,
    /scopeOrgId:\s*string/,
    /audienceMode:\s*RoleScopeAudienceMode/,
    /assigneeId\?:\s*never/
  ]],
  ['ExactOrganizationTaskCandidatePreviewQuery', [
    /scopeType:\s*'GROUP'\s*\|\s*'COMPANY'/,
    /scopeOrgId:\s*string/,
    /audienceMode\?:\s*'EXACT'/,
    /assigneeId\?:\s*never/
  ]]
] as const) {
  const branchMatch = nodePermissionTypeSource.match(
    new RegExp(`interface ${branch}[\\s\\S]*?\\n}`)
  )
  assert.ok(branchMatch, `missing candidate preview branch ${branch}`)
  for (const contract of contracts) {
    assert.match(branchMatch[0], contract, `${branch} violates ${contract}`)
  }
}
assert.match(
  nodePermissionTypeSource,
  /export type TaskCandidatePreviewQuery\s*=\s*\|\s*PersonTaskCandidatePreviewQuery\s*\|\s*DepartmentTaskCandidatePreviewQuery\s*\|\s*ExactOrganizationTaskCandidatePreviewQuery/,
  'candidate preview query must be discriminated by scopeType'
)

assert.match(
  nodePermissionTypeSource,
  /interface AllowedOrganizationNodeVO[\s\S]*?orgFullPath\?:\s*string\s*\|\s*null/,
  'allowed organization path must tolerate a missing MDM snapshot'
)
for (const field of ['scopeOrgPath', 'allowedDepartmentOrgId']) {
  assert.match(
    nodePermissionTypeSource,
    new RegExp(`interface UserRoleScopeVO[\\s\\S]*?\\b${field}\\?:\\s*string\\s*\\|\\s*null`),
    `role-scope display field ${field} must tolerate a missing snapshot`
  )
}
