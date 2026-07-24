import type { EntityId } from '@/types/periodic'

export type ChangeType =
  | 'seal'
  | 'enable'
  | 'transfer'
  | 'category'
  | 'cycle'
  | 'scrap'
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
  /** 统一工作流任务主键。 */
  taskId: EntityId
  /** 统一工作流任务乐观并发版本。 */
  rowVersion: number
  opinion?: string
}

export interface ChangeRejectRequest {
  orderId: EntityId
  /** 统一工作流任务主键。 */
  taskId: EntityId
  /** 统一工作流任务乐观并发版本。 */
  rowVersion: number
  reason?: string
}

export interface ChangeVerifierHandleRequest {
  orderId: EntityId
  /** 统一工作流任务主键。 */
  taskId: EntityId
  /** 统一工作流任务乐观并发版本。 */
  rowVersion: number
  verificationResult: 'qualified' | 'unqualified' | 'scrap' | 'repair' | string
  verificationDate?: string
  validUntil?: string
  certificateAttachmentGroupId?: EntityId
  reason?: string
  sendOutRequired?: number
  responsibleEngineerId?: string
  responsibleEngineerName?: string
  newCycleMonth?: number
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
  deptId?: string
  deptName?: string
  responsibleEngineerId?: string
  responsibleEngineerName?: string
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
  processInstanceId?: EntityId
  taskId?: EntityId
  rowVersion?: number
  currentNodeCode?: string
  currentNodeName?: string
  allowedActions?: string[]
  items?: ChangeItemVO[]
}
