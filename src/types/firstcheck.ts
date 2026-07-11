export type FirstCheckNodeCode =
  | 'supplier_submit'
  | 'manager_check'
  | 'dept_leader_approve'
  | 'engineer_confirm_type'
  | 'verifier_receive'
  | 'external_sendout'
  | 'verifier_return_verify'
  | 'verifier_verify'
  | 'manager_forward'
  | 'confirmer_confirm'
  | 'assign_code'

export type ManageCategory = 'A类' | 'B类' | 'C类'
export type VerificationType = 'self_check' | 'external_commission'
export type VerificationResult = 'qualified' | 'unqualified' | 'partial'
export type ConfirmResult = 'APPROVE' | 'REJECT' | 'PASS' | 'RETURN'
export type AttachmentId = string | number

export interface FirstCheckOrder {
  id: number
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
}

export interface ApproveRequest {
  orderId: number
  approve?: boolean
  confirmerId?: string
  confirmerName?: string
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
  orderIds: Array<string | number>
  opinion?: string
}

export interface BatchOperationResult {
  successCount?: number
  failedItems?: Array<{
    orderId: string | number
    errorMsg?: string
  }>
}

export interface DeviceCodePreview {
  index?: number
  deviceCode: string
  deviceName?: string
  modelSpec?: string
  manufacturer?: string
  subjectSubcategory?: string
}

export interface AssignCodeRequest {
  orderId: number
  codeAssigns: Array<{
    deviceCode: string
  }>
  opinion?: string
}

export interface BatchAssignCodesRequest {
  orderId: number
  deviceCodes: string[]
}

export interface ConfirmCategoryRequest {
  orderId: number
  isWithReport: number
  reportFileId?: number
  requestedCategory: ManageCategory
  measureManagerId?: string
  measureManagerName?: string
  responsibleEngineerId: string
  responsibleEngineerName?: string
  confirmerId?: string
  confirmerName?: string
  opinion?: string
}

export interface ConfirmVerificationTypeRequest {
  orderId: number
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

export interface VerifierVerifyRequest {
  orderId: number
  verificationResult: VerificationResult
  qualifiedQuantity?: number
  unqualifiedQuantity?: number
  certificateAttachmentGroupId?: AttachmentId
  deviceName?: string
  modelSpec?: string
  deviceUsage?: string
  measureRange?: string
  resolution?: string
  precisionLevel?: string
  allowedError?: string
  manufacturer?: string
  factoryCode?: string
  factoryDate?: string
  subjectCategory?: string
  subjectSubcategory?: string
  deviceStatus?: string
  isMandatory?: number
  standardDevice?: string
  confirmInterval?: string
  specialProject?: string
  verificationCycleMonth?: number
  verificationDate?: string
  validUntil?: string
  storageLocation?: string
  verificationOpinion?: string
  verificationUnitPrice: number
  opinion?: string
}

export interface ConfirmCheckRequest {
  orderId: number
  confirmResult: 'PASS' | 'REJECT' | 'RETURN'
  opinion?: string
}

export interface FirstCheckAdminRow {
  key: number
  taskId: number
  nodeCode: string
  nodeName: string
  statusLabel: string
  statusColor: 'orange' | 'blue' | 'red' | 'green' | 'cyan'
  order: FirstCheckOrder
}
