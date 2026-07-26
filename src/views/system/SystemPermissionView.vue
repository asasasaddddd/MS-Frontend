<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { TablePaginationConfig } from 'ant-design-vue'
import {
  assignUserRoles,
  getUserOrgRelations,
  getUserRoles,
  listSystemOrgs,
  listSystemRoles,
  listSystemUsers,
  type SysOrgVO,
  type SysRoleVO,
  type SysUserOrgRelationVO,
  type SysUserVO
} from '@/api/system'
import {
  deleteUserNodeGrant,
  getUserNodeGrants,
  listNodeOperations,
  previewUserNodeGrant,
  saveUserNodeGrant
} from '@/api/nodePermission'
import type {
  NodeGrantVO,
  NodeOperationVO,
  NodeScopeGrantPreviewVO,
  NodeScopeGrantRequest,
  NodeScopeType
} from '@/types/nodePermission'
import {
  buildNodeGrantPreviewDisplay,
  buildNodeGrantRoleChange,
  buildNodeScopeGrantRequest,
  buildNodeGrantRevokeCommand,
  buildScopeOrganizationTree,
  canSaveNodeGrantPreview,
  filterOperationsForRole,
  getActiveGroupOrgIds,
  isSelectableOrganization,
  isCurrentPermissionResponse,
  normalizeOrganizationType,
  resolvePermissionDetailLoad,
  validateNodeScopeGrantDraft
} from '@/types/nodePermission'
import { roleNameMap } from '@/types/common'

interface OrgOption {
  key: string
  name: string
  fullPath: string
  type: NodeScopeType
  selectable: boolean
  descendantIds: string[]
}

interface OrgTreeNode {
  value: string
  title: string
  searchText: string
  orgType: NodeScopeType
  disabled: boolean
  children?: OrgTreeNode[]
}

interface PermissionPerson extends SysUserVO {
  relations: SysUserOrgRelationVO[]
  existingRoles: string[]
  primaryOrgName: string
  departmentName: string
  groupName: string
}

interface NormalizedNodeOperation {
  businessType: string
  nodeCode: string
  nodeName: string
  operationCode: string
  operationName: string
  permissionCode: string
  defaultRoleCodes: string[]
}

interface GrantForm {
  roleCode: string
  businessType: string
  nodeCode: string
  permissionCode: string
  effect: 'ALLOW' | 'DENY'
  scopeType: NodeScopeType
  scopeOrgId: string
  effectiveFrom: string
  effectiveTo: string
  grantReason: string
  companyElevationConfirmed: boolean
}

const businessOptions = [
  { label: '首检', value: 'FIRST_CHECK' },
  { label: '周期检定', value: 'PERIODIC' },
  { label: '状态变更', value: 'CHANGE' },
  { label: 'C类抽检', value: 'SAMPLING' },
  { label: '产品配套', value: 'PRODUCT_SUPPORT' }
]

const scopeOptions = [
  { label: '班组', value: 'GROUP' },
  { label: '部门提权', value: 'DEPARTMENT' },
  { label: '公司提权', value: 'COMPANY' }
]

const externalRoleCodes = new Set(['SUPPLIER', 'EXTERNAL_OPERATOR'])
const allowedOrgTypes = new Set<NodeScopeType>(['COMPANY', 'DEPARTMENT', 'GROUP'])

const loading = ref(false)
const orgLoading = ref(false)
const roleLoading = ref(false)
const permissionDetailLoading = ref(false)
const roleSaveLoading = ref(false)
const nodeOperationLoading = ref(false)
const grantLoading = ref(false)
const previewLoading = ref(false)
const grantSaveLoading = ref(false)
const deleteLoading = ref(false)

const orgTree = ref<SysOrgVO[]>([])
const orgs = ref<OrgOption[]>([])
const users = ref<PermissionPerson[]>([])
const roles = ref<SysRoleVO[]>([])
const selectedUser = ref<PermissionPerson | null>(null)
const selectedUserRelations = ref<SysUserOrgRelationVO[]>([])
const selectedRoleCodes = ref<string[]>([])
const savedRoleCodes = ref<string[]>([])
const detailReady = ref(false)
const permissionDetailError = ref('')
const nodeOperations = ref<NormalizedNodeOperation[]>([])
const nodeGrants = ref<NodeGrantVO[]>([])
const previewResult = ref<NodeScopeGrantPreviewVO | null>(null)
const previewedPayload = ref<NodeScopeGrantRequest | null>(null)

const selectedDeptId = ref('')
const tempSelectedDeptId = ref('')
const defaultExpandedOrgKeys = ref<string[]>([])
const orgExpandedKeys = ref<string[]>([])
const orgModalOpen = ref(false)
const orgSearchKeyword = ref('')
const permissionModalOpen = ref(false)
const deleteModalOpen = ref(false)
const deleteTarget = ref<{ grant: NodeGrantVO; userId: string } | null>(null)
const deleteReason = ref('')

let userRequestSerial = 0
let permissionRequestSerial = 0
let nodeOperationRequestSerial = 0
let grantRequestSerial = 0
let previewRequestSerial = 0

const filters = reactive({
  employeeId: '',
  employeeName: ''
})

const pager = reactive({
  current: 1,
  size: 20,
  total: 0
})

const grantForm = reactive<GrantForm>({
  roleCode: '',
  businessType: '',
  nodeCode: '',
  permissionCode: '',
  effect: 'ALLOW',
  scopeType: 'GROUP',
  scopeOrgId: '',
  effectiveFrom: '',
  effectiveTo: '',
  grantReason: '',
  companyElevationConfirmed: false
})

const userColumns = [
  { title: '工号', dataIndex: 'employeeId', width: 140 },
  { title: '姓名', dataIndex: 'employeeName', width: 120 },
  { title: '主组织', dataIndex: 'primaryOrgName', width: 180, ellipsis: true },
  { title: '部门', dataIndex: 'departmentName', width: 160, ellipsis: true },
  { title: '班组', dataIndex: 'groupName', width: 150, ellipsis: true },
  { title: '已有角色', dataIndex: 'existingRoles', width: 260 },
  { title: '状态', dataIndex: 'status', width: 90 },
  { title: '操作', dataIndex: 'action', width: 110, fixed: 'right' }
]

const grantColumns = [
  { title: '角色', dataIndex: 'roleCode', width: 150 },
  { title: '节点 / 操作', dataIndex: 'nodeOperation', width: 220 },
  { title: '范围', dataIndex: 'scope', width: 220 },
  { title: '效果', dataIndex: 'effect', width: 90 },
  { title: '来源', dataIndex: 'grantSource', width: 160 },
  { title: '有效期', dataIndex: 'validity', width: 220 },
  { title: '操作', dataIndex: 'action', width: 90, fixed: 'right' }
]

const tempSelectedDeptKeys = computed(() => (tempSelectedDeptId.value ? [tempSelectedDeptId.value] : []))

const selectedDeptIds = computed(() => {
  if (!selectedDeptId.value) return []
  const org = orgs.value.find((item) => item.key === selectedDeptId.value)
  return org?.descendantIds.length ? org.descendantIds : [selectedDeptId.value]
})

const orgTreeData = computed(() => toOrgTreeNodes(orgTree.value))

const grantOrgTreeData = computed(() => buildScopeOrganizationTree(
  orgTree.value,
  grantForm.scopeType,
  getActiveGroupOrgIds(selectedUserRelations.value)
))

const selectedDeptName = computed(() => {
  if (!selectedDeptId.value) return '全部组织'
  return orgs.value.find((org) => org.key === selectedDeptId.value)?.name || selectedDeptId.value
})

const selectedDeptDescription = computed(() => {
  if (!selectedDeptId.value) return '未选择组织时显示全系统人员'
  const org = orgs.value.find((item) => item.key === selectedDeptId.value)
  if (!org) return selectedDeptId.value
  const childCount = Math.max(org.descendantIds.length - 1, 0)
  return `${org.fullPath}${childCount ? ` · 含${childCount}个可用下级组织` : ''}`
})

const roleOptions = computed(() =>
  roles.value.map((role) => ({
    label: role.roleName || roleNameMap[role.roleCode] || role.roleCode,
    value: role.roleCode
  }))
)

const grantRoleOptions = computed(() =>
  savedRoleCodes.value.map((roleCode) => ({
    label: `${roleNameMap[roleCode as keyof typeof roleNameMap] || roleCode}（${roleCode}）`,
    value: roleCode
  }))
)

const rolesDirty = computed(() => !sameCodeSet(selectedRoleCodes.value, savedRoleCodes.value))

const externalAccount = computed(() => savedRoleCodes.value.some((roleCode) =>
  externalRoleCodes.has(roleCode.trim().toUpperCase())))

const roleScopedNodeOperations = computed(() =>
  filterOperationsForRole(nodeOperations.value, grantForm.roleCode)
)

const nodeOptions = computed(() => {
  const seen = new Set<string>()
  return roleScopedNodeOperations.value.reduce<Array<{ label: string; value: string }>>((options, item) => {
    if (seen.has(item.nodeCode)) return options
    seen.add(item.nodeCode)
    options.push({ label: `${item.nodeName}（${item.nodeCode}）`, value: item.nodeCode })
    return options
  }, [])
})

const operationOptions = computed(() =>
  roleScopedNodeOperations.value
    .filter((item) => item.nodeCode === grantForm.nodeCode)
    .map((item) => ({
      label: `${item.operationName}（${item.operationCode}）`,
      value: item.permissionCode
    }))
)

const grantSource = computed(() =>
  grantForm.scopeType === 'GROUP' ? 'NORMAL_CONFIG' : 'MANUAL_ELEVATION'
)

const isElevation = computed(() => grantForm.scopeType !== 'GROUP')

const previewDisplay = computed(() =>
  previewResult.value ? buildNodeGrantPreviewDisplay(previewResult.value) : null
)

const previewRows = computed(() => {
  const preview = previewDisplay.value
  if (!preview) return []
  return [
    { label: '人员', value: preview.user },
    { label: '操作角色', value: preview.role },
    { label: '业务', value: preview.business },
    { label: '流程类型', value: preview.process },
    { label: '节点', value: preview.node },
    { label: '操作', value: preview.operation },
    { label: '权限编码', value: preview.permissionCode },
    { label: '范围', value: preview.scope },
    { label: '组织', value: preview.organization },
    { label: '组织路径', value: preview.organizationPath },
    { label: '效果', value: preview.effect },
    { label: '来源', value: preview.source },
    { label: '人工提权', value: preview.manualElevation },
    { label: '生效时间', value: preview.effectiveFrom },
    { label: '失效时间', value: preview.effectiveTo },
    { label: '授权原因', value: preview.grantReason }
  ]
})

const existingGrant = computed(() => previewDisplay.value?.existingGrant || null)

function orgTypeOf(org: SysOrgVO) {
  return normalizeOrganizationType(org.orgType || org.orgCate)
}

function isSelectableOrg(org: SysOrgVO) {
  return isSelectableOrganization(org)
}

function formatOrgName(org: SysOrgVO) {
  return org.orgSimpleCName || org.orgFullCName || org.orgId
}

function formatOrgPath(org: SysOrgVO) {
  return org.orgFullPath || org.orgFullCName || org.orgSimpleCName || org.orgId
}

function flattenOrgs(input: SysOrgVO[], bucket: OrgOption[] = []): string[] {
  const selectableIds: string[] = []
  for (const org of input) {
    const childIds = flattenOrgs(org.children || [], bucket)
    const type = orgTypeOf(org)
    if (!org.orgId || !type || !allowedOrgTypes.has(type)) {
      selectableIds.push(...childIds)
      continue
    }
    const selectable = isSelectableOrg(org)
    const descendantIds = [...(selectable ? [org.orgId] : []), ...childIds]
    bucket.push({
      key: org.orgId,
      name: formatOrgName(org),
      fullPath: formatOrgPath(org),
      type,
      selectable,
      descendantIds
    })
    selectableIds.push(...descendantIds)
  }
  return selectableIds
}

function toOrgTreeNodes(input: SysOrgVO[]): OrgTreeNode[] {
  return buildScopeOrganizationTree(input)
}

function findOrgNode(nodes: OrgTreeNode[], value: string): OrgTreeNode | null {
  for (const node of nodes) {
    if (node.value === value) return node
    const child = node.children?.length ? findOrgNode(node.children, value) : null
    if (child) return child
  }
  return null
}

function collectKeys(nodes: OrgTreeNode[], maxDepth = Number.POSITIVE_INFINITY, depth = 0): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    if (depth <= maxDepth) keys.push(node.value)
    if (node.children?.length) keys.push(...collectKeys(node.children, maxDepth, depth + 1))
  }
  return keys
}

function filterTreeNode(node: { searchText?: string }) {
  const keyword = orgSearchKeyword.value.trim().toLowerCase()
  return !keyword || String(node.searchText || '').includes(keyword)
}

function filterScopeOrgTreeNode(input: string, node: { searchText?: string }) {
  return String(node.searchText || '').includes(input.trim().toLowerCase())
}

function relationTypeOf(relation: SysUserOrgRelationVO) {
  return normalizeOrganizationType(relation.relationType)
}

function relationName(relation: SysUserOrgRelationVO) {
  return relation.orgName || relation.orgFullName || relation.orgId
}

function isPrimaryRelation(relation: SysUserOrgRelationVO) {
  return relation.primary === true || ['true', '1'].includes(String(relation.isPrimary).toLowerCase())
}

function personFromDetails(
  user: SysUserVO,
  relations: SysUserOrgRelationVO[],
  roleCodes: string[]
): PermissionPerson {
  const primary = relations.find(isPrimaryRelation)
  const department = relations.find((relation) => relationTypeOf(relation) === 'DEPARTMENT')
  const group = relations.find((relation) => relationTypeOf(relation) === 'GROUP')
  return {
    ...user,
    relations,
    existingRoles: roleCodes,
    primaryOrgName: primary ? relationName(primary) : user.orgName || '-',
    departmentName: department ? relationName(department) : user.deptName || '-',
    groupName: group ? relationName(group) : '-'
  }
}

async function enrichPerson(user: SysUserVO) {
  const [relationResult, roleResult] = await Promise.allSettled([
    getUserOrgRelations(user.employeeId),
    getUserRoles(user.employeeId)
  ])
  const relations = relationResult.status === 'fulfilled' ? relationResult.value || [] : []
  const roleCodes = roleResult.status === 'fulfilled'
    ? roleResult.value || []
    : user.roles || (user.role ? [user.role] : [])
  return personFromDetails(user, relations, roleCodes)
}

function sameCodeSet(left: string[], right: string[]) {
  if (left.length !== right.length) return false
  const rightSet = new Set(right)
  return left.every((item) => rightSet.has(item))
}

function roleLabel(roleCode: string) {
  const role = roles.value.find((item) => item.roleCode === roleCode)
  return role?.roleName || roleNameMap[roleCode as keyof typeof roleNameMap] || roleCode
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback
}

function flattenNodeOperations(input: NodeOperationVO[]) {
  const flattened: NormalizedNodeOperation[] = []
  for (const node of input || []) {
    if (node.operations?.length) {
      for (const operation of node.operations) {
        flattened.push({
          businessType: node.businessType,
          nodeCode: node.nodeCode,
          nodeName: node.nodeName || node.nodeCode,
          operationCode: operation.operationCode,
          operationName: operation.operationName || operation.operationCode,
          permissionCode: operation.permissionCode,
          defaultRoleCodes: [...(operation.defaultRoleCodes || node.defaultRoleCodes || [])]
        })
      }
      continue
    }
    if (!node.permissionCode || !node.operationCode) continue
    flattened.push({
      businessType: node.businessType,
      nodeCode: node.nodeCode,
      nodeName: node.nodeName || node.nodeCode,
      operationCode: node.operationCode,
      operationName: node.operationName || node.operationCode,
      permissionCode: node.permissionCode,
      defaultRoleCodes: [...(node.defaultRoleCodes || [])]
    })
  }
  return flattened
}

function resetGrantEditor() {
  grantForm.roleCode = ''
  grantForm.businessType = ''
  grantForm.nodeCode = ''
  grantForm.permissionCode = ''
  grantForm.effect = 'ALLOW'
  grantForm.scopeType = 'GROUP'
  grantForm.scopeOrgId = ''
  grantForm.effectiveFrom = ''
  grantForm.effectiveTo = ''
  grantForm.grantReason = ''
  grantForm.companyElevationConfirmed = false
  nodeOperations.value = []
  previewResult.value = null
  previewedPayload.value = null
}

function invalidatePreview() {
  previewResult.value = null
  previewedPayload.value = null
  previewRequestSerial += 1
}

async function loadOrgs() {
  orgLoading.value = true
  try {
    orgTree.value = await listSystemOrgs()
    const flattened: OrgOption[] = []
    flattenOrgs(orgTree.value, flattened)
    orgs.value = flattened
    defaultExpandedOrgKeys.value = collectKeys(toOrgTreeNodes(orgTree.value), 1)
    orgExpandedKeys.value = defaultExpandedOrgKeys.value
  } catch (error) {
    message.error(errorMessage(error, '组织树加载失败'))
  } finally {
    orgLoading.value = false
  }
}

async function loadRoles() {
  roleLoading.value = true
  try {
    roles.value = await listSystemRoles()
  } catch (error) {
    message.error(errorMessage(error, '角色列表加载失败'))
  } finally {
    roleLoading.value = false
  }
}

async function loadUsers(page = pager.current) {
  const requestId = ++userRequestSerial
  loading.value = true
  try {
    const result = await listSystemUsers({
      current: page,
      size: pager.size,
      deptId: selectedDeptId.value || undefined,
      deptIds: selectedDeptId.value ? selectedDeptIds.value : undefined,
      employeeId: filters.employeeId.trim() || undefined,
      employeeName: filters.employeeName.trim() || undefined,
      status: 'enabled'
    })
    const enrichedUsers = await Promise.all((result.records || []).map(enrichPerson))
    if (requestId !== userRequestSerial) return
    users.value = enrichedUsers
    pager.current = Number(result.current || page)
    pager.size = Number(result.size || pager.size)
    pager.total = Number(result.total || 0)
  } catch (error) {
    if (requestId === userRequestSerial) message.error(errorMessage(error, '人员列表加载失败'))
  } finally {
    if (requestId === userRequestSerial) loading.value = false
  }
}

async function loadNodeGrants(userId: string) {
  const requestId = ++grantRequestSerial
  grantLoading.value = true
  try {
    const grants = await getUserNodeGrants(userId)
    if (requestId !== grantRequestSerial || selectedUser.value?.employeeId !== userId) return
    nodeGrants.value = grants || []
  } catch (error) {
    if (requestId === grantRequestSerial) message.error(errorMessage(error, '节点授权加载失败'))
  } finally {
    if (requestId === grantRequestSerial) grantLoading.value = false
  }
}

async function loadOperations(businessType: string) {
  const requestId = ++nodeOperationRequestSerial
  nodeOperations.value = []
  if (!businessType) {
    nodeOperationLoading.value = false
    return
  }
  nodeOperationLoading.value = true
  try {
    const operations = await listNodeOperations(businessType)
    if (requestId !== nodeOperationRequestSerial || grantForm.businessType !== businessType) return
    nodeOperations.value = flattenNodeOperations(operations || [])
  } catch (error) {
    if (requestId === nodeOperationRequestSerial) message.error(errorMessage(error, '节点操作加载失败'))
  } finally {
    if (requestId === nodeOperationRequestSerial) nodeOperationLoading.value = false
  }
}

function handleSelectDept(deptId: string) {
  selectedDeptId.value = deptId
  pager.current = 1
  loadUsers(1)
}

function openOrgPicker() {
  tempSelectedDeptId.value = selectedDeptId.value
  orgSearchKeyword.value = ''
  orgExpandedKeys.value = defaultExpandedOrgKeys.value
  orgModalOpen.value = true
}

function handleOrgTreeSelect(keys: (string | number)[]) {
  const nextKey = keys[0] ? String(keys[0]) : ''
  const node = findOrgNode(orgTreeData.value, nextKey)
  if (!node || node.disabled) return
  tempSelectedDeptId.value = nextKey
  if (!node.children?.length) return
  const expanded = new Set(orgExpandedKeys.value)
  if (expanded.has(nextKey)) expanded.delete(nextKey)
  else expanded.add(nextKey)
  orgExpandedKeys.value = Array.from(expanded)
}

function handleOrgTreeExpand(keys: (string | number)[]) {
  orgExpandedKeys.value = keys.map(String)
}

function handleSelectAllDept() {
  tempSelectedDeptId.value = ''
}

function handleOrgConfirm() {
  orgModalOpen.value = false
  handleSelectDept(tempSelectedDeptId.value)
}

function handleSearch() {
  pager.current = 1
  loadUsers(1)
}

function handleReset() {
  filters.employeeId = ''
  filters.employeeName = ''
  selectedDeptId.value = ''
  pager.current = 1
  loadUsers(1)
}

function handleTableChange(nextPager: TablePaginationConfig) {
  pager.current = Number(nextPager.current || 1)
  pager.size = Number(nextPager.pageSize || pager.size)
  loadUsers(pager.current)
}

function tableRow(record: PermissionPerson) {
  return { onClick: () => openPermissionModal(record) }
}

async function openPermissionModal(user: PermissionPerson) {
  selectedUser.value = user
  selectedUserRelations.value = user.relations
  selectedRoleCodes.value = [...user.existingRoles]
  savedRoleCodes.value = [...user.existingRoles]
  nodeGrants.value = []
  detailReady.value = false
  permissionDetailError.value = ''
  resetGrantEditor()
  permissionModalOpen.value = true
  await loadPermissionDetails(user)
}

async function loadPermissionDetails(user: PermissionPerson) {
  const requestId = ++permissionRequestSerial
  permissionDetailLoading.value = true
  const [roleResult, relationResult, grantResult] = await Promise.allSettled([
    getUserRoles(user.employeeId),
    getUserOrgRelations(user.employeeId),
    getUserNodeGrants(user.employeeId)
  ])
  if (!isCurrentPermissionResponse(
    requestId,
    permissionRequestSerial,
    user.employeeId,
    selectedUser.value?.employeeId
  )) return

  const detail = resolvePermissionDetailLoad(roleResult, relationResult, grantResult)
  detailReady.value = detail.detailReady
  permissionDetailError.value = detail.detailReady
    ? ''
    : `人员权限详情加载失败：${detail.failedSections.join('、')}`
  selectedRoleCodes.value = [...detail.roleCodes]
  savedRoleCodes.value = [...detail.roleCodes]
  selectedUserRelations.value = [...detail.relations]
  nodeGrants.value = [...detail.grants]
  grantForm.roleCode = savedRoleCodes.value[0] || ''
  permissionDetailLoading.value = false
}

async function retryPermissionDetails() {
  const user = selectedUser.value
  if (!user) return
  detailReady.value = false
  permissionDetailError.value = ''
  await loadPermissionDetails(user)
}

async function handleSaveRoles() {
  const user = selectedUser.value
  if (!user || !detailReady.value) return
  roleSaveLoading.value = true
  try {
    await assignUserRoles(user.employeeId, selectedRoleCodes.value)
    savedRoleCodes.value = [...selectedRoleCodes.value]
    if (!savedRoleCodes.value.includes(grantForm.roleCode)) {
      grantForm.roleCode = savedRoleCodes.value[0] || ''
    }
    const row = users.value.find((item) => item.employeeId === user.employeeId)
    if (row) row.existingRoles = [...savedRoleCodes.value]
    user.existingRoles = [...savedRoleCodes.value]
    message.success('人员角色已保存')
  } catch (error) {
    message.error(errorMessage(error, '角色保存失败'))
  } finally {
    roleSaveLoading.value = false
  }
}

function handleNodeChange() {
  grantForm.permissionCode = ''
}

function handleScopeChange() {
  grantForm.scopeOrgId = ''
  grantForm.companyElevationConfirmed = false
  if (grantForm.scopeType === 'GROUP') {
    grantForm.grantReason = ''
    grantForm.effectiveTo = ''
  }
}

function validateGrantForm() {
  if (rolesDirty.value) return '人员角色有未保存变更，请先保存角色'
  if (!grantForm.businessType) return '请选择业务'
  if (!grantForm.nodeCode) return '请选择节点'
  return validateNodeScopeGrantDraft(grantForm)[0] || ''
}

function buildGrantRequest(): NodeScopeGrantRequest {
  return buildNodeScopeGrantRequest(grantForm)
}

async function handlePreviewGrant() {
  const user = selectedUser.value
  if (!user || !detailReady.value || externalAccount.value) return
  const validationError = validateGrantForm()
  if (validationError) {
    message.warning(validationError)
    return
  }
  const requestId = ++previewRequestSerial
  const payload = buildGrantRequest()
  previewLoading.value = true
  try {
    const result = await previewUserNodeGrant(user.employeeId, payload)
    if (!isCurrentPermissionResponse(
      requestId,
      previewRequestSerial,
      user.employeeId,
      selectedUser.value?.employeeId,
      payload,
      buildGrantRequest()
    )) return
    previewResult.value = result
    previewedPayload.value = payload
  } catch (error) {
    if (requestId === previewRequestSerial) message.error(errorMessage(error, '授权预览失败'))
  } finally {
    if (requestId === previewRequestSerial) previewLoading.value = false
  }
}

async function handleSaveGrant() {
  const user = selectedUser.value
  const payload = previewedPayload.value
  const currentPayload = buildGrantRequest()
  if (!user || !payload || !canSaveNodeGrantPreview({
    detailReady: detailReady.value,
    externalAccount: externalAccount.value,
    preview: previewResult.value,
    previewedPayload: payload,
    currentPayload
  })) {
    message.warning('请先预览并确认后端返回的授权结果')
    return
  }
  grantSaveLoading.value = true
  try {
    await saveUserNodeGrant(user.employeeId, payload)
    message.success('节点授权已保存')
    invalidatePreview()
    await loadNodeGrants(user.employeeId)
  } catch (error) {
    message.error(errorMessage(error, '节点授权保存失败'))
  } finally {
    grantSaveLoading.value = false
  }
}

function openDeleteGrant(grant: NodeGrantVO) {
  const grantId = grant.grantId || grant.id
  if (!selectedUser.value || !grantId || grant.rowVersion === undefined) {
    message.error('授权记录缺少删除所需的编号或版本')
    return
  }
  deleteTarget.value = { grant, userId: selectedUser.value.employeeId }
  deleteReason.value = ''
  deleteModalOpen.value = true
}

async function handleDeleteGrant() {
  const target = deleteTarget.value
  const grantId = target?.grant.grantId || target?.grant.id
  if (!target || !grantId || target.grant.rowVersion === undefined) return
  if (!deleteReason.value.trim()) {
    message.warning('请输入删除原因')
    return
  }
  deleteLoading.value = true
  try {
    const command = buildNodeGrantRevokeCommand(target.userId, target.grant, deleteReason.value)
    if (!command) {
      message.error('授权记录缺少删除所需的编号、版本或原因')
      return
    }
    await deleteUserNodeGrant(command.userId, command.grantId, command.rowVersion, command.reason)
    message.success('节点授权已删除')
    deleteModalOpen.value = false
    if (selectedUser.value?.employeeId === target.userId) await loadNodeGrants(target.userId)
  } catch (error) {
    message.error(errorMessage(error, '节点授权删除失败'))
  } finally {
    deleteLoading.value = false
  }
}

function grantNodeOperationText(grant: NodeGrantVO) {
  const node = grant.nodeName || grant.nodeCode || '-'
  const operation = grant.operationName || grant.operationCode || grant.permissionCode || '-'
  return `${node} / ${operation}`
}

function grantScopeText(grant: NodeGrantVO) {
  return `${grant.scopeType} · ${grant.scopeOrgName || grant.scopeOrgId}`
}

function grantValidityText(grant: NodeGrantVO) {
  return `${grant.effectiveFrom || '立即'} 至 ${grant.effectiveTo || '长期'}`
}

function grantRowKey(grant: NodeGrantVO) {
  return grant.grantId || grant.id || `${grant.roleCode}-${grant.permissionCode}-${grant.scopeOrgId}`
}

watch(orgSearchKeyword, (keyword) => {
  orgExpandedKeys.value = keyword.trim()
    ? collectKeys(orgTreeData.value)
    : defaultExpandedOrgKeys.value
})

watch(() => grantForm.roleCode, (roleCode, previousRoleCode) => {
  if (roleCode === previousRoleCode) return
  Object.assign(grantForm, buildNodeGrantRoleChange(roleCode))
})

watch(() => grantForm.businessType, (businessType) => {
  grantForm.nodeCode = ''
  grantForm.permissionCode = ''
  loadOperations(businessType)
})

watch(() => grantForm.nodeCode, () => {
  grantForm.permissionCode = ''
})

watch(
  () => [
    grantForm.roleCode,
    grantForm.businessType,
    grantForm.nodeCode,
    grantForm.permissionCode,
    grantForm.effect,
    grantForm.scopeType,
    grantForm.scopeOrgId,
    grantForm.effectiveFrom,
    grantForm.effectiveTo,
    grantForm.grantReason,
    grantForm.companyElevationConfirmed
  ],
  invalidatePreview
)

onMounted(async () => {
  await Promise.all([loadOrgs(), loadRoles()])
  await loadUsers(1)
})
</script>

<template>
  <div class="permission-page">
    <header class="page-heading">
      <div>
        <h1>超级管理员权限配置</h1>
        <p>人员角色与节点范围授权由后端校验，最终生效权限以后端预览和保存结果为准。</p>
      </div>
      <div class="page-metrics" aria-label="权限配置概览">
        <span>当前组织 <strong>{{ selectedDeptName }}</strong></span>
        <span>人员 <strong>{{ pager.total }}</strong></span>
        <span>角色 <strong>{{ roles.length }}</strong></span>
      </div>
    </header>

    <section class="permission-layout">
      <aside class="org-panel">
        <div class="panel-title">
          <div>
            <h2>组织筛选</h2>
            <span>公司 / 部门 / 真实班组</span>
          </div>
        </div>
        <a-spin :spinning="orgLoading">
          <button class="org-selector-button" type="button" @click="openOrgPicker">
            <span>{{ selectedDeptName }}</span>
            <small>按名称、编码或完整路径查找</small>
          </button>
          <div class="org-current">
            <span>当前选择</span>
            <strong>{{ selectedDeptName }}</strong>
            <small>{{ selectedDeptDescription }}</small>
          </div>
        </a-spin>
      </aside>

      <main class="user-panel">
        <a-form class="filter-form" layout="inline" :model="filters" @submit.prevent="handleSearch">
          <a-form-item label="工号">
            <a-input v-model:value="filters.employeeId" placeholder="输入工号模糊查询" allow-clear />
          </a-form-item>
          <a-form-item label="姓名">
            <a-input v-model:value="filters.employeeName" placeholder="输入姓名模糊查询" allow-clear />
          </a-form-item>
          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit">查询</a-button>
              <a-button @click="handleReset">重置</a-button>
            </a-space>
          </a-form-item>
        </a-form>

        <a-table
          row-key="employeeId"
          :columns="userColumns"
          :data-source="users"
          :loading="loading"
          :scroll="{ x: 1320 }"
          :pagination="{ current: pager.current, pageSize: pager.size, total: pager.total, showSizeChanger: true }"
          size="middle"
          @change="handleTableChange"
          @row="tableRow"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'existingRoles'">
              <a-space v-if="record.existingRoles?.length" :size="[4, 4]" wrap>
                <a-tag v-for="roleCode in record.existingRoles" :key="roleCode" color="blue">
                  {{ roleLabel(roleCode) }}
                </a-tag>
              </a-space>
              <span v-else>-</span>
            </template>
            <template v-else-if="column.dataIndex === 'status'">
              <a-tag :color="record.status === 'enabled' ? 'green' : 'default'">
                {{ record.status === 'enabled' ? '启用' : record.status || '未知' }}
              </a-tag>
            </template>
            <template v-else-if="column.dataIndex === 'action'">
              <a-button type="link" size="small" @click.stop="openPermissionModal(record)">配置权限</a-button>
            </template>
          </template>
        </a-table>
      </main>
    </section>

    <a-modal
      v-model:open="orgModalOpen"
      title="选择组织"
      width="760px"
      ok-text="确认"
      cancel-text="取消"
      @ok="handleOrgConfirm"
    >
      <div class="org-picker-modal">
        <div class="org-picker-actions">
          <a-button :type="!tempSelectedDeptId ? 'primary' : 'default'" @click="handleSelectAllDept">
            全部组织
          </a-button>
          <a-input-search
            v-model:value="orgSearchKeyword"
            class="org-search"
            placeholder="搜索名称、编码、完整路径"
            allow-clear
          />
        </div>
        <a-alert
          type="info"
          show-icon
          message="仅启用且非虚拟的公司、部门和真实班组可选择。"
        />
        <a-spin :spinning="orgLoading">
          <a-tree
            v-if="orgTreeData.length"
            class="org-picker-tree"
            block-node
            show-line
            :tree-data="orgTreeData"
            :field-names="{ key: 'value', title: 'title', children: 'children' }"
            :selected-keys="tempSelectedDeptKeys"
            :expanded-keys="orgExpandedKeys"
            :filter-tree-node="filterTreeNode"
            @select="handleOrgTreeSelect"
            @expand="handleOrgTreeExpand"
          />
          <a-empty v-else image="simple" description="未找到组织" />
        </a-spin>
      </div>
    </a-modal>

    <a-modal
      v-model:open="permissionModalOpen"
      title="人员权限配置"
      width="1120px"
      :footer="null"
      destroy-on-close
    >
      <a-spin :spinning="permissionDetailLoading">
        <div v-if="selectedUser" class="permission-editor">
          <div class="user-summary">
            <div>
              <span>工号</span>
              <strong>{{ selectedUser.employeeId }}</strong>
            </div>
            <div>
              <span>姓名</span>
              <strong>{{ selectedUser.employeeName || '-' }}</strong>
            </div>
            <div>
              <span>主组织</span>
              <strong>{{ personFromDetails(selectedUser, selectedUserRelations, savedRoleCodes).primaryOrgName }}</strong>
            </div>
          </div>

          <a-alert
            v-if="permissionDetailError"
            type="error"
            show-icon
            :message="permissionDetailError"
            description="新增授权已停用；成功加载的历史授权仍可在下方查看和撤销。"
          >
            <template #action>
              <a-button size="small" :loading="permissionDetailLoading" @click="retryPermissionDetails">
                重试
              </a-button>
            </template>
          </a-alert>

          <section class="editor-section">
            <div class="step-heading"><b>1</b><span>操作角色</span></div>
            <div class="role-assignment-row">
              <a-form-item label="人员角色（可多选）" class="grow-field">
                <a-select
                  v-model:value="selectedRoleCodes"
                  mode="multiple"
                  :options="roleOptions"
                  :loading="roleLoading"
                  :disabled="!detailReady"
                  placeholder="选择一个或多个角色"
                  allow-clear
                />
              </a-form-item>
              <a-button
                type="primary"
                :loading="roleSaveLoading"
                :disabled="!detailReady || !rolesDirty"
                @click="handleSaveRoles"
              >
                保存角色
              </a-button>
            </div>
            <a-alert
              v-if="rolesDirty"
              type="warning"
              show-icon
              message="角色变更尚未保存；节点授权只能使用已保存角色。"
            />
            <a-form-item v-if="detailReady && !externalAccount" label="本次操作角色" class="compact-field">
              <a-select
                v-model:value="grantForm.roleCode"
                :options="grantRoleOptions"
                placeholder="选择本次授权使用的角色"
              />
            </a-form-item>
          </section>

          <a-alert
            v-if="detailReady && externalAccount"
            type="info"
            show-icon
            message="外部账号的工作流任务采用 PERSON 账号级精确指派，组织授权不适用。"
            description="供应商和外扩人员可继续维护人员角色；任务由 ASSIGNEE_ID、角色、模板和 DENY 规则在后端确定，本页不会创建不受支持的 PERSON 范围授权。"
          />

          <template v-else-if="detailReady">
            <section class="editor-section">
              <div class="step-heading"><b>2</b><span>业务</span></div>
              <a-select
                v-model:value="grantForm.businessType"
                class="full-field"
                :options="businessOptions"
                placeholder="选择业务类型"
              />
            </section>

            <section class="editor-section">
              <div class="step-heading"><b>3</b><span>节点</span></div>
              <a-select
                v-model:value="grantForm.nodeCode"
                class="full-field"
                :options="nodeOptions"
                :loading="nodeOperationLoading"
                :disabled="!grantForm.businessType"
                placeholder="先选择业务，再选择后端返回的节点"
                @change="handleNodeChange"
              />
            </section>

            <section class="editor-section">
              <div class="step-heading"><b>4</b><span>操作</span></div>
              <div class="two-column-grid">
                <a-form-item label="节点操作">
                  <a-select
                    v-model:value="grantForm.permissionCode"
                    :options="operationOptions"
                    :disabled="!grantForm.nodeCode"
                    placeholder="选择后端定义的操作"
                  />
                </a-form-item>
                <a-form-item label="授权效果">
                  <a-radio-group v-model:value="grantForm.effect" button-style="solid">
                    <a-radio-button value="ALLOW">ALLOW 允许</a-radio-button>
                    <a-radio-button value="DENY">DENY 拒绝</a-radio-button>
                  </a-radio-group>
                </a-form-item>
              </div>
            </section>

            <section class="editor-section">
              <div class="step-heading"><b>5</b><span>范围</span></div>
              <a-radio-group v-model:value="grantForm.scopeType" @change="handleScopeChange">
                <a-radio v-for="option in scopeOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </a-radio>
              </a-radio-group>
              <div class="scope-meta">
                <a-tag :color="isElevation ? 'orange' : 'blue'">{{ grantSource }}</a-tag>
                <span v-if="!isElevation">普通配置仅允许 GROUP 班组范围。</span>
                <span v-else>DEPARTMENT / COMPANY 属于人工提权，必须填写原因和失效时间。</span>
              </div>
              <div class="two-column-grid scope-fields">
                <a-form-item label="生效时间（可选）">
                  <a-date-picker
                    v-model:value="grantForm.effectiveFrom"
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    show-time
                    class="full-field"
                    placeholder="立即生效"
                  />
                </a-form-item>
                <a-form-item :label="isElevation ? '失效时间（必填）' : '失效时间（可选）'">
                  <a-date-picker
                    v-model:value="grantForm.effectiveTo"
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    show-time
                    class="full-field"
                    :placeholder="isElevation ? '选择提权失效时间' : '长期有效'"
                  />
                </a-form-item>
              </div>
              <a-form-item :label="isElevation ? '授权原因（必填）' : '授权原因（可选）'">
                <a-textarea
                  v-model:value="grantForm.grantReason"
                  :rows="2"
                  :maxlength="300"
                  show-count
                  placeholder="说明授权用途或提权依据"
                />
              </a-form-item>
            </section>

            <section class="editor-section">
              <div class="step-heading"><b>6</b><span>组织</span></div>
              <a-tree-select
                v-model:value="grantForm.scopeOrgId"
                class="full-field"
                :tree-data="grantOrgTreeData"
                :field-names="{ value: 'value', label: 'title', children: 'children' }"
                :filter-tree-node="filterScopeOrgTreeNode"
                tree-node-filter-prop="searchText"
                tree-default-expand-all
                show-search
                allow-clear
                placeholder="按名称、编码或完整路径选择匹配范围的组织"
              />
              <a-checkbox
                v-if="grantForm.scopeType === 'COMPANY'"
                v-model:checked="grantForm.companyElevationConfirmed"
                class="company-confirmation"
              >
                我已确认公司级提权影响范围，并确认该授权有明确业务依据和到期时间。
              </a-checkbox>
            </section>

            <div class="preview-actions">
              <div>
                <strong>后端预览是唯一事实来源</strong>
                <span>先预览，再保存；表单变化后必须重新预览。</span>
              </div>
              <a-space>
                <a-button :loading="previewLoading" :disabled="!detailReady" @click="handlePreviewGrant">
                  预览授权
                </a-button>
                <a-button
                  type="primary"
                  :loading="grantSaveLoading"
                  :disabled="!detailReady || !previewResult"
                  @click="handleSaveGrant"
                >
                  保存已预览授权
                </a-button>
              </a-space>
            </div>

            <section v-if="previewResult" class="backend-preview" aria-live="polite">
              <div class="section-title-row">
                <h3>后端预览结果</h3>
                <a-tag color="green">待确认</a-tag>
              </div>
              <a-descriptions bordered size="small" :column="2">
                <a-descriptions-item v-for="item in previewRows" :key="item.label" :label="item.label">
                  {{ item.value }}
                </a-descriptions-item>
              </a-descriptions>
              <a-alert
                v-for="warning in previewDisplay?.warnings || []"
                :key="warning"
                type="warning"
                show-icon
                :message="warning"
              />
              <div v-if="existingGrant" class="existing-snapshot">
                <strong>现有授权快照</strong>
                <span>
                  授权ID {{ existingGrant.id }} · 状态 {{ existingGrant.status }} ·
                  版本 {{ existingGrant.rowVersion ?? '-' }}
                </span>
              </div>
            </section>
          </template>

          <section class="grant-list-section">
            <div class="section-title-row">
              <div>
                <h3>现有节点授权</h3>
                <span>列表内容由后端返回，不代表前端推导的最终生效权限。</span>
              </div>
            </div>
            <a-table
              :row-key="grantRowKey"
              :columns="grantColumns"
              :data-source="nodeGrants"
              :loading="grantLoading"
              :pagination="false"
              :scroll="{ x: 1060 }"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.dataIndex === 'roleCode'">
                  {{ roleLabel(record.roleCode) }}
                </template>
                <template v-else-if="column.dataIndex === 'nodeOperation'">
                  {{ grantNodeOperationText(record) }}
                </template>
                <template v-else-if="column.dataIndex === 'scope'">
                  {{ grantScopeText(record) }}
                </template>
                <template v-else-if="column.dataIndex === 'effect'">
                  <a-tag :color="record.effect === 'ALLOW' ? 'green' : 'red'">{{ record.effect }}</a-tag>
                </template>
                <template v-else-if="column.dataIndex === 'grantSource'">
                  {{ record.grantSource }}
                </template>
                <template v-else-if="column.dataIndex === 'validity'">
                  {{ grantValidityText(record) }}
                </template>
                <template v-else-if="column.dataIndex === 'action'">
                  <a-button type="link" danger size="small" @click="openDeleteGrant(record)">删除</a-button>
                </template>
              </template>
              <template #emptyText>
                <a-empty image="simple" description="暂无节点授权" />
              </template>
            </a-table>
          </section>
        </div>
      </a-spin>
    </a-modal>

    <a-modal
      v-model:open="deleteModalOpen"
      title="删除节点授权"
      ok-text="确认删除"
      cancel-text="取消"
      :confirm-loading="deleteLoading"
      @ok="handleDeleteGrant"
    >
      <a-alert type="warning" show-icon message="删除授权会立即影响后续权限判定，请填写原因。" />
      <a-textarea
        v-model:value="deleteReason"
        class="delete-reason"
        :rows="3"
        :maxlength="300"
        show-count
        placeholder="请输入删除原因"
      />
    </a-modal>
  </div>
</template>

<style scoped>
.permission-page {
  display: grid;
  gap: 16px;
}

.page-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5eaf1;
}

.page-heading h1,
.panel-title h2,
.section-title-row h3 {
  margin: 0;
  color: #172033;
}

.page-heading h1 {
  font-size: 20px;
}

.page-heading p,
.section-title-row span {
  margin: 5px 0 0;
  color: #667085;
  font-size: 13px;
}

.page-metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 16px;
  color: #667085;
  font-size: 13px;
}

.page-metrics strong {
  margin-left: 5px;
  color: #172033;
}

.permission-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}

.org-panel,
.user-panel {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.org-panel {
  min-height: calc(100vh - 190px);
  padding: 16px;
}

.user-panel {
  min-width: 0;
  padding: 16px;
}

.panel-title {
  margin-bottom: 14px;
}

.panel-title h2 {
  font-size: 16px;
}

.panel-title span {
  color: #667085;
  font-size: 12px;
}

.org-selector-button {
  display: grid;
  width: 100%;
  min-height: 72px;
  gap: 6px;
  padding: 12px 14px;
  border: 1px solid #d3dae6;
  border-radius: 8px;
  background: #ffffff;
  color: #172033;
  text-align: left;
  cursor: pointer;
}

.org-selector-button:hover,
.org-selector-button:focus-visible {
  border-color: #1769e0;
  outline: none;
  box-shadow: 0 0 0 3px rgba(23, 105, 224, 0.1);
}

.org-selector-button span {
  overflow: hidden;
  font-size: 15px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-selector-button small,
.org-current span,
.org-current small {
  color: #667085;
  font-size: 12px;
}

.org-current {
  display: grid;
  gap: 5px;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e5eaf1;
  border-radius: 6px;
  background: #f8fafc;
}

.org-current strong,
.org-current small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-form {
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef1f5;
}

.org-picker-modal,
.permission-editor {
  display: grid;
  gap: 14px;
}

.org-picker-actions,
.role-assignment-row,
.preview-actions,
.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.org-search {
  max-width: 420px;
}

.org-picker-tree {
  max-height: 56vh;
  overflow: auto;
  padding: 8px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
}

.org-picker-tree :deep(.ant-tree-node-content-wrapper) {
  min-height: 30px;
  line-height: 30px;
  border-radius: 6px;
}

.user-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid #e5eaf1;
}

.user-summary div {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.user-summary span {
  color: #667085;
  font-size: 12px;
}

.user-summary strong {
  overflow: hidden;
  color: #172033;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.editor-section,
.backend-preview,
.grant-list-section {
  display: grid;
  gap: 12px;
  padding: 14px 0;
  border-bottom: 1px solid #e5eaf1;
}

.step-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #172033;
  font-weight: 600;
}

.step-heading b {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border-radius: 50%;
  background: #1769e0;
  color: #ffffff;
  font-size: 12px;
}

.role-assignment-row {
  align-items: flex-end;
}

.grow-field {
  flex: 1;
  margin-bottom: 0;
}

.compact-field {
  max-width: 520px;
  margin-bottom: 0;
}

.full-field {
  width: 100%;
}

.two-column-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.two-column-grid :deep(.ant-form-item) {
  margin-bottom: 0;
}

.scope-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #667085;
  font-size: 13px;
}

.scope-fields {
  margin-top: 2px;
}

.company-confirmation {
  color: #7a4b00;
}

.preview-actions {
  flex-wrap: wrap;
  padding: 14px;
  border: 1px solid #d6e4ff;
  border-radius: 8px;
  background: #f5f9ff;
}

.preview-actions div {
  display: grid;
  gap: 3px;
}

.preview-actions span {
  color: #667085;
  font-size: 12px;
}

.backend-preview {
  border-bottom-color: #b7eb8f;
}

.section-title-row h3 {
  font-size: 15px;
}

.existing-snapshot {
  display: grid;
  gap: 5px;
  padding: 10px 12px;
  border: 1px solid #e5eaf1;
  border-radius: 6px;
  background: #f8fafc;
}

.existing-snapshot span {
  color: #475467;
  font-size: 13px;
}

.delete-reason {
  margin-top: 14px;
}

@media (max-width: 980px) {
  .page-heading,
  .org-picker-actions,
  .role-assignment-row,
  .preview-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .page-metrics {
    justify-content: flex-start;
  }

  .permission-layout,
  .user-summary,
  .two-column-grid {
    grid-template-columns: 1fr;
  }

  .org-panel {
    min-height: auto;
  }

  .org-search,
  .compact-field {
    max-width: none;
    width: 100%;
  }
}
</style>
