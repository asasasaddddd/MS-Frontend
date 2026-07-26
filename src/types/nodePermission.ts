export type NodeGrantEffect = 'ALLOW' | 'DENY'

export type NodeScopeType = 'GROUP' | 'DEPARTMENT' | 'COMPANY'

export type NodeGrantSource = 'NORMAL_CONFIG' | 'MANUAL_ELEVATION'

export interface OrganizationSelectionInput {
  orgId?: string
  orgType?: string
  orgCate?: string
  status?: string
  orgFictitious?: boolean | number | string
}

export interface OrganizationTreeInput extends OrganizationSelectionInput {
  orgFullCName?: string
  orgSimpleCName?: string
  orgFullPath?: string
  children?: OrganizationTreeInput[]
}

export interface ScopeOrganizationTreeNode {
  value: string
  title: string
  searchText: string
  orgType: NodeScopeType
  disabled: boolean
  children?: ScopeOrganizationTreeNode[]
}

export interface UserOrgRelationSelectionInput {
  orgId?: string
  relationType?: string
  status?: string
}

export interface NodeOperationItemVO {
  operationCode: string
  operationName?: string
  permissionCode: string
  defaultRoleCodes?: string[]
}

export interface NodeOperationVO {
  businessType: string
  businessName?: string
  nodeCode: string
  nodeName?: string
  operationCode?: string
  operationName?: string
  permissionCode?: string
  defaultRoleCodes?: string[]
  operations?: NodeOperationItemVO[]
}

export interface NodeScopeGrantRequest {
  roleCode: string
  permissionCode: string
  scopeType: NodeScopeType
  scopeOrgId: string
  effect: NodeGrantEffect
  grantSource: NodeGrantSource
  effectiveFrom?: string
  effectiveTo?: string
  grantReason?: string
  companyElevationConfirmed?: boolean
}

export interface NodeScopeGrantDraft {
  roleCode: string
  permissionCode: string
  scopeType: NodeScopeType
  scopeOrgId: string
  effect: NodeGrantEffect
  effectiveFrom?: string
  effectiveTo?: string
  grantReason?: string
  companyElevationConfirmed?: boolean
}

export interface NodeGrantVO extends NodeScopeGrantRequest {
  id?: string | number
  grantId?: string | number
  userId?: string
  businessType?: string
  businessName?: string
  nodeCode?: string
  nodeName?: string
  operationCode?: string
  operationName?: string
  scopeOrgName?: string
  scopeOrgPath?: string
  rowVersion?: string | number
  status?: string
  createdAt?: string
  updatedAt?: string
}

export interface NodeScopeGrantPreviewVO {
  userId: string
  userName: string
  roleCode: string
  businessType: string
  processType: string
  nodeCode: string
  nodeName: string
  operationCode: string
  operationName: string
  permissionCode: string
  scopeType: NodeScopeType
  scopeOrgId: string
  scopeOrgName: string
  scopeOrgPath: string
  effect: NodeGrantEffect
  grantSource: NodeGrantSource
  effectiveFrom?: string | null
  effectiveTo?: string | null
  grantReason?: string | null
  manualElevation: boolean
  existingGrantId?: string | number | null
  existingGrantStatus?: string | null
  existingRowVersion?: string | number | null
  warnings: string[]
}

export interface NodeGrantPreviewDisplay {
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
  existingGrant: {
    id: string
    status: string
    rowVersion: string | number | null
  } | null
}

export interface PermissionDetailLoadState<Relation, Grant> {
  detailReady: boolean
  roleCodes: string[]
  relations: Relation[]
  grants: Grant[]
  failedSections: string[]
}

export interface NodeGrantRevokeCommand {
  userId: string
  grantId: string
  rowVersion: number
  reason: string
}

export function normalizeOrganizationType(value?: string): NodeScopeType | null {
  const normalized = String(value || '').trim().toUpperCase()
  if (['COMPANY', 'CORPORATION', '公司', '单位'].includes(normalized)) return 'COMPANY'
  if (['DEPARTMENT', 'DEPT', '部门'].includes(normalized)) return 'DEPARTMENT'
  if (['GROUP', 'TEAM', '班组', '小组'].includes(normalized)) return 'GROUP'
  return null
}

function backendFlagIsTrue(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized || ['false', '0', 'no', 'n', 'off'].includes(normalized)) return false
  if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true
  return true
}

export function isSelectableOrganization(org: OrganizationSelectionInput) {
  const type = normalizeOrganizationType(org.orgType || org.orgCate)
  if (!org.orgId || !type) return false

  const status = String(org.status || '').trim().toLowerCase()
  if (['disabled', 'inactive', '0', '停用', '禁用'].includes(status)) return false

  return !backendFlagIsTrue(org.orgFictitious)
}

export function resolvePermissionDetailLoad<Relation, Grant>(
  roleResult: PromiseSettledResult<string[]>,
  relationResult: PromiseSettledResult<Relation[]>,
  grantResult: PromiseSettledResult<Grant[]>
): PermissionDetailLoadState<Relation, Grant> {
  const failedSections: string[] = []
  const rolesReady = roleResult.status === 'fulfilled' && Array.isArray(roleResult.value)
  const relationsReady = relationResult.status === 'fulfilled' && Array.isArray(relationResult.value)
  const grantsReady = grantResult.status === 'fulfilled' && Array.isArray(grantResult.value)
  if (!rolesReady) failedSections.push('人员角色')
  if (!relationsReady) failedSections.push('组织关系')
  if (!grantsReady) failedSections.push('历史授权')
  const detailReady = failedSections.length === 0

  return {
    detailReady,
    roleCodes: detailReady && rolesReady ? [...roleResult.value] : [],
    relations: detailReady && relationsReady
      ? [...relationResult.value]
      : [],
    grants: grantsReady ? [...grantResult.value] : [],
    failedSections
  }
}

export function filterOperationsForRole<T extends { defaultRoleCodes?: string[] }>(
  operations: T[],
  roleCode: string
) {
  const normalizedRole = roleCode.trim().toUpperCase()
  if (!normalizedRole) return []
  return operations.filter((operation) => (operation.defaultRoleCodes || [])
    .some((code) => code.trim().toUpperCase() === normalizedRole))
}

export function buildNodeGrantRoleChange(roleCode: string) {
  return {
    roleCode: roleCode.trim().toUpperCase(),
    nodeCode: '',
    permissionCode: ''
  }
}

export function getActiveGroupOrgIds(relations: UserOrgRelationSelectionInput[]) {
  const groupIds = new Set<string>()
  for (const relation of relations || []) {
    const relationType = String(relation.relationType || '').trim().toUpperCase()
    const status = String(relation.status || '').trim().toLowerCase()
    if (!relation.orgId || relationType !== 'GROUP') continue
    if (['disabled', 'inactive', '0', '停用', '禁用'].includes(status)) continue
    groupIds.add(relation.orgId)
  }
  return groupIds
}

export function buildScopeOrganizationTree(
  organizations: OrganizationTreeInput[],
  targetType?: NodeScopeType,
  allowedGroupIds: Set<string> = new Set()
): ScopeOrganizationTreeNode[] {
  const nodes: ScopeOrganizationTreeNode[] = []
  for (const org of organizations || []) {
    const children = buildScopeOrganizationTree(org.children || [], targetType, allowedGroupIds)
    const orgType = normalizeOrganizationType(org.orgType || org.orgCate)
    if (!org.orgId || !orgType || !isSelectableOrganization(org)) {
      nodes.push(...children)
      continue
    }

    const targetSelectable = targetType == null || orgType === targetType
    const selectable = targetType === 'GROUP'
      ? targetSelectable && allowedGroupIds.has(org.orgId)
      : targetSelectable
    if (targetType === 'GROUP' && !selectable && children.length === 0) continue

    const name = org.orgSimpleCName || org.orgFullCName || org.orgId
    nodes.push({
      value: org.orgId,
      title: `${name} · ${orgType}`,
      searchText: [org.orgId, name, org.orgFullCName, org.orgFullPath]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
      orgType,
      disabled: !selectable,
      children: children.length ? children : undefined
    })
  }
  return nodes
}

export function isCurrentPermissionResponse(
  requestSerial: number,
  currentSerial: number,
  requestedUserId: string,
  currentUserId?: string,
  requestedPayload?: NodeScopeGrantRequest | null,
  currentPayload?: NodeScopeGrantRequest | null
) {
  return requestSerial === currentSerial
    && requestedUserId === currentUserId
    && (requestedPayload === undefined || currentPayload === undefined
      || sameNodeScopeGrantRequest(requestedPayload, currentPayload))
}

function sameNodeScopeGrantRequest(
  left: NodeScopeGrantRequest | null,
  right: NodeScopeGrantRequest | null
) {
  if (!left || !right) return false
  const fields: Array<keyof NodeScopeGrantRequest> = [
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
  ]
  return fields.every((field) => left[field] === right[field])
}

export function canSaveNodeGrantPreview(input: {
  detailReady: boolean
  externalAccount: boolean
  preview: unknown
  previewedPayload: NodeScopeGrantRequest | null
  currentPayload: NodeScopeGrantRequest
}) {
  return input.detailReady
    && !input.externalAccount
    && Boolean(input.preview)
    && sameNodeScopeGrantRequest(input.previewedPayload, input.currentPayload)
}

export function buildNodeGrantRevokeCommand(
  userId: string,
  grant: Pick<NodeGrantVO, 'id' | 'grantId' | 'rowVersion' | 'status'>,
  reason: string
): NodeGrantRevokeCommand | null {
  const grantId = grant.grantId ?? grant.id
  const rowVersion = parseSafeNonNegativeInteger(grant.rowVersion)
  const normalizedReason = reason.trim()
  if (String(grant.status || '').trim().toLowerCase() !== 'active') return null
  if (!userId || grantId == null || !String(grantId).trim()) return null
  if (rowVersion == null || !normalizedReason) return null
  return {
    userId,
    grantId: String(grantId),
    rowVersion,
    reason: normalizedReason
  }
}

function parseSafeNonNegativeInteger(value: string | number | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null
  }

  const normalized = value?.trim()
  if (!normalized || !/^\d+$/.test(normalized)) return null
  const parsed = Number(normalized)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function namedCode(name: string | null | undefined, code: string | null | undefined) {
  if (name && code) return `${name}（${code}）`
  return name || code || '-'
}

export function buildNodeGrantPreviewDisplay(
  preview: NodeScopeGrantPreviewVO
): NodeGrantPreviewDisplay {
  const hasExistingGrant = preview.existingGrantId != null
    || preview.existingGrantStatus != null
    || preview.existingRowVersion != null

  return {
    user: namedCode(preview.userName, preview.userId),
    role: preview.roleCode || '-',
    business: preview.businessType || '-',
    process: preview.processType || '-',
    node: namedCode(preview.nodeName, preview.nodeCode),
    operation: namedCode(preview.operationName, preview.operationCode),
    permissionCode: preview.permissionCode || '-',
    scope: preview.scopeType || '-',
    organization: namedCode(preview.scopeOrgName, preview.scopeOrgId),
    organizationPath: preview.scopeOrgPath || '-',
    effect: preview.effect || '-',
    source: preview.grantSource || '-',
    manualElevation: preview.manualElevation ? '是' : '否',
    effectiveFrom: preview.effectiveFrom || '立即生效',
    effectiveTo: preview.effectiveTo || '长期有效',
    grantReason: preview.grantReason || '-',
    warnings: [...(preview.warnings || [])],
    existingGrant: hasExistingGrant
      ? {
          id: preview.existingGrantId == null ? '-' : String(preview.existingGrantId),
          status: preview.existingGrantStatus || '-',
          rowVersion: preview.existingRowVersion ?? null
        }
      : null
  }
}

export function validateNodeScopeGrantDraft(draft: NodeScopeGrantDraft) {
  const errors: string[] = []
  if (!draft.roleCode) errors.push('请选择操作角色')
  if (!draft.permissionCode) errors.push('请选择操作')
  if (!draft.scopeOrgId) errors.push('请选择授权组织')

  if (draft.scopeType !== 'GROUP') {
    if (!draft.grantReason?.trim()) errors.push('部门/公司提权必须填写原因')
    if (!draft.effectiveTo) errors.push('部门/公司提权必须设置失效时间')
  }
  if (draft.scopeType === 'COMPANY' && !draft.companyElevationConfirmed) {
    errors.push('公司提权必须明确确认风险')
  }
  return errors
}

export function buildNodeScopeGrantRequest(draft: NodeScopeGrantDraft): NodeScopeGrantRequest {
  const request: NodeScopeGrantRequest = {
    roleCode: draft.roleCode,
    permissionCode: draft.permissionCode,
    scopeType: draft.scopeType,
    scopeOrgId: draft.scopeOrgId,
    effect: draft.effect,
    grantSource: draft.scopeType === 'GROUP' ? 'NORMAL_CONFIG' : 'MANUAL_ELEVATION'
  }

  if (draft.effectiveFrom) request.effectiveFrom = draft.effectiveFrom
  if (draft.effectiveTo) request.effectiveTo = draft.effectiveTo
  if (draft.grantReason?.trim()) request.grantReason = draft.grantReason.trim()
  if (draft.scopeType === 'COMPANY') {
    request.companyElevationConfirmed = Boolean(draft.companyElevationConfirmed)
  }
  return request
}
