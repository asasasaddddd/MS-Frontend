import type { EntityId, RowVersion } from '@/types/common'

export type NodeGrantEffect = 'ALLOW' | 'DENY'

export type NodeScopeType = 'GROUP' | 'DEPARTMENT' | 'COMPANY'

export type NodeGrantScopeType = 'GROUP' | 'DEPARTMENT'

export type NodeGrantSource = 'NORMAL_CONFIG' | 'MANUAL_ELEVATION'

export type RoleScopeType = 'DEPARTMENT' | 'GROUP'

export type RoleScopeAudienceMode = 'EXACT' | 'SUBTREE'

export type RoleScopeGrantSource =
  | 'NORMAL_CONFIG'
  | 'CROSS_ORG_ASSIGNMENT'
  | 'MANUAL_ELEVATION'

export type RoleScopeRecordGrantSource = RoleScopeGrantSource | 'MIGRATION'

export type TaskCandidateScopeType = 'PERSON' | 'DEPARTMENT' | 'GROUP' | 'COMPANY'

export const ROLE_SCOPE_TYPE_OPTIONS = [
  { label: '部门', value: 'DEPARTMENT' },
  { label: '组', value: 'GROUP' }
] as const satisfies ReadonlyArray<{ label: string; value: RoleScopeType }>

export interface AllowedOrganizationNodeVO {
  orgId: string
  orgName?: string | null
  orgFullPath?: string | null
  orgType: RoleScopeType
  parentOrgId?: string | null
  allowedDepartmentOrgId: string
  children: AllowedOrganizationNodeVO[]
}

/** 平级授权单位；单位之间无父子继承关系。 */
export interface AllowedUnitVO {
  unitId: string
  unitName?: string | null
  orgFullPath?: string | null
}

/** 角色作业范围策略，与后端 WorkScopeRolePolicy 序列化字段一致。 */
export interface WorkScopeRolePolicyVO {
  roleCode: string
  strategy: string
  configurable: boolean
  subjectRequired: boolean
  commonRequired: boolean
}

export type WorkScopeVerificationMethod = 'NOT_APPLICABLE' | 'self' | 'send_out'

export type WorkScopeCommonScopeCode = 'NOT_APPLICABLE' | 'COMMON' | 'NON_COMMON'

/** 人员作业范围标准行；同一规则可配置给多人，同一人员内不得重复。 */
export interface UserWorkScopeEntry {
  id?: EntityId | null
  roleCode: string
  unitId: string
  unitName?: string | null
  orgFullPath?: string | null
  subjectSubcategory: string
  verificationMethod: WorkScopeVerificationMethod
  commonScope: WorkScopeCommonScopeCode
  grantSource?: string | null
  status?: string | null
}

export interface UserWorkScopeMatrixVO {
  userId: string
  userName?: string | null
  homeUnitId?: string | null
  homeUnitName?: string | null
  matrixVersion: string
  rolePolicies: WorkScopeRolePolicyVO[]
  entries: UserWorkScopeEntry[]
}

export interface UserWorkScopeMatrixRequest {
  matrixVersion: string
  entries: UserWorkScopeEntry[]
}

/** 作业范围候选预览条件，与后端 TaskCandidateQuery 一致。 */
export interface WorkScopeCandidatePreviewQuery {
  businessType: string
  nodeCode: string
  operationCode: string
  permissionCode: string
  requiredRoleCode: string
  routingContext: {
    unitId?: string | null
    subjectSubcategory?: string | null
    verificationMethod?: string | null
    commonScope?: WorkScopeCommonScopeCode | null
  }
}

/** 作业范围候选预览结果。 */
export interface WorkScopeCandidateVO {
  userId: string
  userName?: string | null
  roleCode?: string | null
  requiredRoleCode?: string | null
  permissionCode?: string | null
  matchedWorkScopeId?: EntityId | null
  matchStrategy?: string | null
  unitId?: string | null
  matchSource?: string | null
  matchReason?: string | null
}

export interface EffectivePermissionItemVO {
  roleCode: string
  permissionCode: string
  scopeType: NodeScopeType
  scopeOrgId: string
  audienceMode: RoleScopeAudienceMode
  decision: string
  source: string
  matchedRoleScopeId?: EntityId | null
  matchedGrantId?: EntityId | null
}

/** 旧组织范围授权记录，仅在生效权限诊断视图中回读展示。 */
export interface LegacyRoleScopeRecordVO {
  id: EntityId
  userId: string
  userName?: string | null
  roleCode: string
  roleName?: string | null
  scopeType: RoleScopeType
  scopeOrgId: string
  scopeOrgName?: string | null
  scopeOrgPath?: string | null
  allowedDepartmentOrgId?: string | null
  audienceMode: RoleScopeAudienceMode
  grantSource: RoleScopeRecordGrantSource
  effectiveFrom?: string | null
  effectiveTo?: string | null
  grantReason?: string | null
  grantedBy?: string | null
  status: string
  revokedBy?: string | null
  revokedAt?: string | null
  revokeReason?: string | null
  rowVersion: RowVersion
  createdAt?: string | null
  updatedAt?: string | null
}

export interface EffectivePermissionVO {
  userId: string
  userName?: string | null
  evaluatedAt: string
  roleScopes: LegacyRoleScopeRecordVO[]
  nodeGrants: NodeGrantVO[]
  permissions: EffectivePermissionItemVO[]
}

export interface TaskCandidatePreviewQueryBase {
  businessType: string
  nodeCode: string
  operationCode: string
  permissionCode: string
  requiredRoleCode: string
  occurredAt?: string
}

export interface PersonTaskCandidatePreviewQuery extends TaskCandidatePreviewQueryBase {
  scopeType: 'PERSON'
  assigneeId: string
  scopeOrgId?: never
  audienceMode?: 'EXACT'
}

export interface DepartmentTaskCandidatePreviewQuery extends TaskCandidatePreviewQueryBase {
  scopeType: 'DEPARTMENT'
  scopeOrgId: string
  audienceMode: RoleScopeAudienceMode
  assigneeId?: never
}

export interface ExactOrganizationTaskCandidatePreviewQuery extends TaskCandidatePreviewQueryBase {
  scopeType: 'GROUP' | 'COMPANY'
  scopeOrgId: string
  audienceMode?: 'EXACT'
  assigneeId?: never
}

export type TaskCandidatePreviewQuery =
  | PersonTaskCandidatePreviewQuery
  | DepartmentTaskCandidatePreviewQuery
  | ExactOrganizationTaskCandidatePreviewQuery

export interface TaskCandidateVO {
  userId: string
  userName?: string | null
  requiredRoleCode: string
  permissionCode: string
  matchedGrantId?: EntityId | null
  matchedRoleScopeId?: EntityId | null
  matchedScopeType?: string | null
  matchedScopeOrgId?: string | null
  grantSource?: string | null
  matchSource: string
  matchReason: string
}

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
  scopeType: NodeGrantScopeType
  scopeOrgId: string
  effect: NodeGrantEffect
  grantSource: NodeGrantSource
  effectiveFrom?: string
  effectiveTo?: string
  grantReason?: string
}

export interface NodeScopeGrantDraft {
  roleCode: string
  permissionCode: string
  scopeType: NodeGrantScopeType
  scopeOrgId: string
  effect: NodeGrantEffect
  effectiveFrom?: string
  effectiveTo?: string
  grantReason?: string
}

export interface NodeGrantVO extends Omit<NodeScopeGrantRequest, 'scopeType'> {
  scopeType: NodeScopeType
  id?: EntityId
  grantId?: EntityId
  userId?: string
  businessType?: string
  businessName?: string
  nodeCode?: string
  nodeName?: string
  operationCode?: string
  operationName?: string
  scopeOrgName?: string
  scopeOrgPath?: string
  rowVersion?: RowVersion
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
  scopeType: NodeGrantScopeType
  scopeOrgId: string
  scopeOrgName: string
  scopeOrgPath: string
  effect: NodeGrantEffect
  grantSource: NodeGrantSource
  effectiveFrom?: string | null
  effectiveTo?: string | null
  grantReason?: string | null
  manualElevation: boolean
  existingGrantId?: EntityId | null
  existingGrantStatus?: string | null
  existingRowVersion?: RowVersion | null
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
    rowVersion: RowVersion | null
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

export function buildScopeOrganizationTree(
  organizations: OrganizationTreeInput[],
  targetType?: NodeScopeType
): ScopeOrganizationTreeNode[] {
  const nodes: ScopeOrganizationTreeNode[] = []
  for (const org of organizations || []) {
    const children = buildScopeOrganizationTree(org.children || [], targetType)
    const orgType = normalizeOrganizationType(org.orgType || org.orgCate)
    if (!org.orgId || !orgType || !isSelectableOrganization(org)) {
      nodes.push(...children)
      continue
    }

    const targetSelectable = targetType == null || orgType === targetType
    const selectable = targetSelectable
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
    'grantReason'
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

  if (draft.scopeType !== 'GROUP' && draft.scopeType !== 'DEPARTMENT') {
    errors.push('请选择有效授权范围')
  } else if (draft.scopeType === 'DEPARTMENT') {
    if (!draft.grantReason?.trim()) errors.push('部门提权必须填写原因')
    if (!draft.effectiveTo) errors.push('部门提权必须设置失效时间')
  }
  return errors
}

export function buildNodeScopeGrantRequest(draft: NodeScopeGrantDraft): NodeScopeGrantRequest {
  if (draft.scopeType !== 'GROUP' && draft.scopeType !== 'DEPARTMENT') {
    throw new Error('scopeType must be GROUP or DEPARTMENT')
  }
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
  return request
}
