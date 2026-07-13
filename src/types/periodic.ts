export type EntityId = string | number

export type PeriodicTestPlanScenario = 'self' | 'external_common' | 'external_non_common'

export type PeriodicNodeCode =
  | 'plan_issue'
  | 'plan_confirm'
  | 'transfer_verifier'
  | 'verifier_receive'
  | 'self_verify'
  | 'verification_record'
  | 'send_out'
  | 'send_out_return'
  | 'supplier_fill_info'
  | 'verifier_fill_info'
  | 'responsible_second_judge'
  | 'external_third_judge'
  | 'manager_forward_confirm'
  | 'confirmer_confirm'
  | 'exception_disposal'
  | 'completed'
  | string

export type PeriodicTaskStatus =
  | 'pending'
  | 'processing'
  | 'wait_scan'
  | 'wait_verify'
  | 'wait_confirm'
  | 'exception'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | string

export type PeriodicVerificationResult = 'qualified' | 'unqualified' | string
export type PeriodicConfirmResult = 'APPROVE' | 'REJECT' | 'PASS' | 'RETURN' | string
export type PeriodicResponsibleJudgeResult = 'qualified' | 'unqualified'
export type PeriodicSecondJudgeDisposal = 'qualified' | 'repair' | 'scrap'

export interface PeriodicPlanVO {
  id: EntityId
  planNo?: string
  planYear?: number
  planMonth?: number
  planName?: string
  ownerId?: string
  ownerName?: string
  deptId?: string
  deptName?: string
  planStartDate?: string
  planEndDate?: string
  deviceCount?: number
  completedCount?: number
  status?: string
  statusName?: string
  generatedAt?: string
  remark?: string
}

export interface PeriodicTaskVO {
  id: EntityId
  planId?: EntityId
  taskNo?: string
  deviceId?: EntityId
  deviceCode?: string
  deviceName?: string
  materialCode?: string
  materialName?: string
  modelSpec?: string
  deptId?: string
  deptName?: string
  taskType?: string
  taskTypeName?: string
  currentNode?: PeriodicNodeCode
  currentNodeName?: string
  physicalStatus?: string
  physicalStatusName?: string
  labelStatus?: string
  labelStatusName?: string
  labelRecordId?: EntityId
  exceptionFlowType?: string
  exceptionFlowName?: string
  relatedChangeOrderId?: EntityId
  responsibleEngineerId?: string
  responsibleEngineerName?: string
  taskStatus?: PeriodicTaskStatus
  taskStatusName?: string
  verificationMethod?: string
  requiredFinishTime?: string
  assignedVerifierId?: string
  assignedVerifierName?: string
  transferTime?: string
  receiveTime?: string
  verificationRecordId?: EntityId
  certificateAttachmentGroupId?: EntityId
  recordAttachmentGroupId?: EntityId
  result?: PeriodicVerificationResult
  remark?: string
  factoryCode?: string
  manageCategory?: string
  verificationCycleMonth?: number
  validUntil?: string
  isCommon?: number
  manufacturer?: string
  deviceStatus?: string
  deviceStatusName?: string
  subjectCategory?: string
  measureManagerName?: string
  verificationTime?: string
  newValidUntil?: string
}

export interface PeriodicDisplayRow {
  taskId: EntityId
  taskNo: string
  planId: EntityId | ''
  currentNode: string
  currentNodeName: string
  taskStatus: string
  taskStatusName: string
  deviceCode: string
  deviceName: string
  materialCode: string
  materialName: string
  modelSpec: string
  factoryCode: string
  deptName: string
  manageCategory: string
  verificationCycle: string
  validUntil: string
  assignedVerifierName: string
  measureManagerName: string
  verificationMethod: string
  verificationMethodName: string
  isCommonName: string
  manufacturer: string
  deviceStatusName: string
  subjectCategory: string
  responsibleEngineerName: string
  requiredFinishTime: string
  verificationTime: string
  newValidUntil: string
  result: string
  remark: string
}

export interface GeneratePeriodicPlanRequest {
  planYear: number
  planMonth: number
  ownerId?: string
  ownerName?: string
  deptId?: string
  deptName?: string
  planStartDate?: string
  planEndDate?: string
  remark?: string
}

export interface GenerateBeforeUsePlanRequest {
  deviceIds: EntityId[]
  planStartDate?: string
  planEndDate?: string
  remark?: string
}

export interface PeriodicScanRequest {
  taskId: EntityId
  scanCode: string
  scanContent?: string
  scanLocation?: string
  opinion?: string
}

export interface PeriodicNormalSubmitRequest {
  planId: EntityId
  taskIds: EntityId[]
  opinion?: string
}

export interface PeriodicVerificationRecordRequest {
  taskId: EntityId
  reportNo?: string
  verificationTime?: string
  verificationUnit?: string
  result?: PeriodicVerificationResult
  conclusion?: string
  opinion?: string
  newValidUntil?: string
  forceValidUntil?: boolean | number
  environmentTemp?: number | string
  environmentHumidity?: number | string
  certificateAttachmentGroupId?: EntityId
  recordAttachmentGroupId?: EntityId
  nonconformingDisposal?: string
  repairUserId?: string
  repairUserName?: string
  repairRequirement?: string
  scrapEngineerId?: string
  scrapEngineerName?: string
  confirmationRequired?: boolean | number
  confirmerId?: string
  confirmerName?: string
}

export interface PeriodicManagerForwardConfirmRequest {
  taskId: EntityId
  confirmerId: string
  confirmerName: string
  opinion?: string
}

export interface PeriodicConfirmerConfirmRequest {
  taskId: EntityId
  confirmResult: PeriodicConfirmResult
  opinion?: string
}

export interface PeriodicExceptionDisposeRequest {
  taskId: EntityId
  handlingType: 'repair' | 'scrap' | 'change' | 'defer' | string
  relatedChangeOrderId?: EntityId
  opinion?: string
}

export interface PeriodicSupplierFillInfoRequest {
  taskId: EntityId
  verificationDate: string
  result: PeriodicVerificationResult
  verificationUnit?: string
  certificateNo?: string
  certificateAttachmentGroupId?: EntityId
  recordAttachmentGroupId?: EntityId
  opinion?: string
}

export interface PeriodicVerifierFillInfoRequest {
  taskId: EntityId
  verificationDate: string
  certificateAttachmentGroupId?: EntityId
  verificationUnit?: string
  opinion?: string
}

export interface PeriodicSecondJudgeRequest {
  taskId: EntityId
  disposal: PeriodicSecondJudgeDisposal | string
  opinion?: string
}

export interface PeriodicResponsibleSecondJudgeRequest {
  taskId: EntityId
  judgeResult: PeriodicResponsibleJudgeResult | string
  opinion?: string
}
