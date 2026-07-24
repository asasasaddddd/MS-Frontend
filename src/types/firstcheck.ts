import type { BusinessCaseDetailVO } from '@/types/device'

export type FirstCheckNodeCode =
  | 'supplier_submit'
  | 'manager_classify'
  | 'manager_revise'
  | 'dept_leader_approve'
  | 'engineer_route'
  | 'verifier_verify_assign'

export type ManageCategory = 'A类' | 'B类' | 'C类'
export type VerificationType = 'self_check' | 'external_commission'
export type VerificationResult = 'qualified' | 'unqualified' | 'partial'
export type ConfirmResult = 'APPROVE' | 'REJECT' | 'PASS' | 'RETURN'
export type AttachmentId = string | number

export interface FirstCheckOrder {
  id: string | number
  orderNo?: string
  purchaseOrderNo?: string
  purchaseOrderLineId?: string
  purchaseOrderLineNo?: string
  itemCode?: string
  qrCode?: string
  deviceCode?: string
  supplierCode?: string
  supplierName?: string
  attachmentGroupId?: AttachmentId
  usageScenario?: string
  applyDeptId?: string
  applyDeptName?: string
  applicantId?: string
  applicantName?: string
  measureManagerId?: string
  measureManagerName?: string
  responsibleEngineerId?: string
  responsibleEngineerName?: string
  deptLeaderId?: string
  deptLeaderName?: string
  confirmerId?: string
  confirmerName?: string
  verifierId?: string
  verifierName?: string
  externalVerifierId?: string
  externalVerifierName?: string
  externalOperatorId?: string
  externalOperatorName?: string
  materialCode?: string
  materialName?: string
  deviceName?: string
  quantity?: number
  modelSpec?: string
  precisionLevel?: string
  deviceUsage?: string
  manufacturer?: string
  measureRange?: string
  resolution?: string
  allowedError?: string
  subjectCategory?: string
  subjectSubcategory?: string
  storageLocation?: string
  standardDevice?: string
  specialProject?: string
  deviceStatus?: string
  isMandatory?: number
  confirmInterval?: string
  verificationCycleMonth?: number
  requestedCategory?: ManageCategory
  factoryCode?: string
  factoryDate?: string
  verificationRequired?: number
  verificationType?: VerificationType
  verificationTypeDesc?: string
  verificationTime?: string
  verificationDate?: string
  verificationResult?: VerificationResult
  qualifiedQuantity?: number
  unqualifiedQuantity?: number
  validUntil?: string
  certificateAttachmentGroupId?: AttachmentId
  verificationOpinion?: string
  verificationUnitPrice?: number
  isCommon?: number
  isWithReport?: number
  needSendout?: number
  reportFileId?: number
  applyTime?: string
  sendTime?: string
  receiveTime?: string
  status?: string
  statusDesc?: string
  workflowStatus?: string
  physicalStatus?: string
  scanStatus?: string
  lastScanTime?: string
  lastScanScene?: string
  lastScanOperatorId?: string
  lastScanOperatorName?: string
  currentNodeCode?: FirstCheckNodeCode | string
  currentNodeName?: string
  currentAssigneeId?: string
  currentAssigneeName?: string
  currentNode?: string
  remark?: string
  deviceCodes?: string[]
  history?: BusinessCaseDetailVO
}

export interface ApproveRequest {
  orderId: string | number
  taskId: string | number
  taskRowVersion: number
  approve?: boolean
  responsibleEngineerId?: string
  responsibleEngineerName?: string
  opinion?: string
}

export interface FirstCheckMaterialRequest {
  purchaseOrderLineId?: string
  purchaseOrderLineNo?: string
  itemCode?: string
  qrCode?: string
  materialCode: string
  materialName?: string
  deviceName: string
  quantity: number
  modelSpec?: string
  precisionLevel?: string
  deviceUsage?: string
  manufacturer?: string
  measureRange?: string
  resolution?: string
  allowedError?: string
  subjectCategory?: string
  subjectSubcategory?: string
  storageLocation?: string
  standardDevice?: string
  specialProject?: string
  deviceStatus?: string
  isMandatory?: number
  confirmInterval?: string
  verificationCycleMonth?: number
  factoryCode?: string
  factoryDate?: string
  remark?: string
}

export interface StartFirstCheckRequest {
  purchaseOrderNo?: string
  supplierCode?: string
  supplierName?: string
  attachmentGroupId?: AttachmentId
  usageScenario?: string
  applyDeptId: string
  applyDeptName: string
  material: FirstCheckMaterialRequest
  remark?: string
}

export interface BatchDeptLeaderApproveRequest {
  items: BatchWorkflowTaskItem[]
  opinion?: string
}

/** 批量操作中的单条任务并发上下文。 */
export interface BatchWorkflowTaskItem {
  orderId: string | number
  taskId: string | number
  taskRowVersion: number
}

export interface BatchOperationResult {
  successCount?: number
  failedItems?: Array<{
    orderId: string | number
    errorMsg?: string
  }>
}

export interface ConfirmCategoryRequest {
  orderId: string | number
  taskId: string | number
  taskRowVersion: number
  isWithReport: number
  reportFileId?: number
  usageScenario?: string
  requestedCategory: ManageCategory
  measureManagerId?: string
  measureManagerName?: string
  responsibleEngineerId: string
  responsibleEngineerName?: string
  opinion?: string
}

export interface ConfirmVerificationTypeRequest {
  orderId: string | number
  taskId: string | number
  taskRowVersion: number
  verificationType: VerificationType
  selfVerifierId?: string
  selfVerifierName?: string
  externalVerifierId?: string
  externalVerifierName?: string
  externalOperatorId?: string
  externalOperatorName?: string
  isCommon: number
  opinion?: string
}

export interface DeviceCodeReservationRequest {
  orderId: string | number
  taskId: string | number
  taskRowVersion: number
  subjectSubcategory: string
  identifierCode?: string
  qualifiedQuantity: number
}

export interface DeviceCodeReservation {
  reservationId: string
  expiresAt: string
  deviceCodes: string[]
}

export interface QualifiedFirstCheckDeviceRequest {
  deviceCode: string
  factoryCode?: string
  factoryDate?: string
  verificationDate: string
  certificateAttachmentGroupId?: string
}

export interface VerifierVerifyAndAssignRequest {
  orderId: string | number
  taskId: string | number
  taskRowVersion: number
  reservationId?: string
  verificationResult: VerificationResult
  qualifiedQuantity: number
  unqualifiedQuantity: number
  confirmerId?: string
  deviceName?: string
  modelSpec?: string
  deviceUsage?: string
  measureRange?: string
  resolution?: string
  precisionLevel?: string
  allowedError?: string
  manufacturer?: string
  subjectCategory?: string
  subjectSubcategory?: string
  deviceStatus?: string
  isMandatory?: number
  standardDevice?: string
  confirmInterval?: string
  specialProject?: string
  verificationCycleMonth?: number
  storageLocation?: string
  verificationOpinion?: string
  verificationUnitPrice?: number
  opinion?: string
  qualifiedDevices: QualifiedFirstCheckDeviceRequest[]
}

export interface AssignedFirstCheckDevice {
  deviceId: string
  deviceCode: string
  validUntil?: string
  labelRecordId?: string
}

export interface FirstCheckAdminRow {
  key: string
  taskId: string | number
  taskRowVersion: number
  allowedActions: string[]
  nodeCode: string
  nodeName: string
  statusLabel: string
  statusColor: 'orange' | 'blue' | 'red' | 'green' | 'cyan'
  order: FirstCheckOrder
}
