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

export interface NodeOperationItemVO {
  operationCode: string
  operationName?: string
  permissionCode: string
}

export interface NodeOperationVO {
  businessType: string
  businessName?: string
  nodeCode: string
  nodeName?: string
  operationCode?: string
  operationName?: string
  permissionCode?: string
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
  id?: string
  grantId?: string
  userId?: string
  businessType?: string
  businessName?: string
  nodeCode?: string
  nodeName?: string
  operationCode?: string
  operationName?: string
  scopeOrgName?: string
  scopeOrgPath?: string
  rowVersion?: number
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
  existingGrantId?: string | null
  existingGrantStatus?: string | null
  existingRowVersion?: number | null
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
    rowVersion: number | null
  } | null
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
          id: preview.existingGrantId || '-',
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
