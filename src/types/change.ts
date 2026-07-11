import type { EntityId } from '@/types/periodic'

export type ChangeType =
  | 'seal'
  | 'enable'
  | 'transfer'
  | 'category'
  | 'category_change'
  | 'cycle'
  | 'cycle_change'
  | 'scrap'
  | 'abnormal_scrap'
  | 'precheck'

export type ChangeOrderStatus =
  | 'draft'
  | 'submitted'
  | 'processing'
  | 'returned'
  | 'approved'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | string

export interface ChangeItemSubmitRequest {
  deviceId: EntityId
  deviceCode?: string
  newStatus?: string
  newCategory?: string
  newVerificationMethod?: string
  newCycleMonth?: number
  newValidUntil?: string
  technicalStatus?: string
  sealReason?: string
  enableReason?: string
  verificationReason?: string
  adjustmentReason?: string
  transferToDeptId?: string
  transferToDeptName?: string
  transferReason?: string
  scrapType?: string
  scrapReason?: string
  repairRequirement?: string
  precheckRequired?: number
  sendOutRequired?: number
  sendOutUnit?: string
  remark?: string
}

export interface ChangeSubmitRequest {
  changeType: ChangeType | string
  applyDeptId?: string
  applyDeptName?: string
  reason?: string
  sourceType?: string
  sourceId?: EntityId
  remark?: string
  attachmentGroupId?: EntityId
  items: ChangeItemSubmitRequest[]
}

export interface ChangeApproveRequest {
  orderId: EntityId
  opinion?: string
}

export interface ChangeRejectRequest {
  orderId: EntityId
  reason?: string
  opinion?: string
}

export interface ChangeVerifierHandleRequest {
  orderId: EntityId
  verificationResult: 'qualified' | 'unqualified' | string
  verificationDate?: string
  validUntil?: string
  verificationRecordId?: EntityId
  certificateAttachmentGroupId?: EntityId
  opinion?: string
}

export interface ChangeItemVO {
  id: EntityId
  orderId?: EntityId
  lineNo?: number
  deviceId?: EntityId
  deviceCode?: string
  deviceName?: string
  modelSpec?: string
  factoryCode?: string
  deptName?: string
  oldStatus?: string
  newStatus?: string
  oldCategory?: string
  newCategory?: string
  oldVerificationMethod?: string
  newVerificationMethod?: string
  oldCycleMonth?: number
  newCycleMonth?: number
  oldValidUntil?: string
  newValidUntil?: string
  technicalStatus?: string
  sealReason?: string
  enableReason?: string
  verificationReason?: string
  adjustmentReason?: string
  transferToDeptId?: string
  transferToDeptName?: string
  transferReason?: string
  scrapType?: string
  scrapReason?: string
  repairRequirement?: string
  precheckRequired?: number
  sendOutRequired?: number
  sendOutUnit?: string
  approvalStatus?: string
  rejectReason?: string
  verifierRejectOpinion?: string
  verifierId?: string
  verifierName?: string
  verificationRecordId?: EntityId
  certificateAttachmentGroupId?: EntityId
  itemStatus?: string
  remark?: string
}

export interface ChangeOrderVO {
  id: EntityId
  orderNo?: string
  changeType?: ChangeType | string
  changeTypeName?: string
  applicantId?: string
  applicantName?: string
  applyDeptId?: string
  applyDeptName?: string
  applyTime?: string
  itemCount?: number
  reason?: string
  status?: ChangeOrderStatus
  statusName?: string
  workflowStatus?: string
  submittedAt?: string
  remark?: string
  attachmentGroupId?: EntityId
  items?: ChangeItemVO[]
}
