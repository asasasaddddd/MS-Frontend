export type NodeGrantEffect = 'ALLOW' | 'DENY'

export type NodeScopeType = 'GROUP' | 'DEPARTMENT' | 'COMPANY'

export type NodeGrantSource = 'NORMAL_CONFIG' | 'MANUAL_ELEVATION'

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

export interface NodeGrantUserSnapshot {
  userId?: string
  employeeId?: string
  userName?: string
  employeeName?: string
}

export interface NodeGrantNodeSnapshot {
  nodeCode?: string
  nodeName?: string
}

export interface NodeGrantOperationSnapshot {
  operationCode?: string
  operationName?: string
  permissionCode?: string
}

export interface NodeGrantScopeSnapshot {
  scopeType?: NodeScopeType
  scopeOrgId?: string
  scopeOrgName?: string
  scopeOrgPath?: string
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

export interface NodeGrantPreviewVO {
  user?: NodeGrantUserSnapshot
  node?: NodeGrantNodeSnapshot
  operation?: NodeGrantOperationSnapshot
  scope?: NodeGrantScopeSnapshot
  userId?: string
  userName?: string
  nodeCode?: string
  nodeName?: string
  operationCode?: string
  operationName?: string
  permissionCode?: string
  scopeType?: NodeScopeType
  scopeOrgId?: string
  scopeOrgName?: string
  scopeOrgPath?: string
  effect: NodeGrantEffect
  grantSource: NodeGrantSource
  effectiveFrom?: string
  effectiveTo?: string
  warnings?: string[]
  existingGrant?: NodeGrantVO | null
  existingGrantSnapshot?: NodeGrantVO | null
}
