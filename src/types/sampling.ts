export type SamplingEntityId = string | number

export type SamplingNodeCode =
  | 'admin_confirm'
  | 'verifier_verify'
  | 'confirmer_confirm'
  | 'completed'
  | string

export type SamplingTaskStatus = 'pending' | 'processing' | 'completed' | 'rejected' | 'cancelled' | string
export type SamplingResult = 'qualified' | 'unqualified'
export type SamplingAdminResult = 'normal' | 'seal' | 'missing' | 'scrap' | 'abnormal_scrap' | string
export type SamplingDisposalType = 'repair' | 'scrap' | string

export interface SamplingCreatePlanRequest {
  planName?: string
  sampleRule?: string
  sampleRate?: number | string
  deptId?: string
  deptName?: string
  verificationDate?: string
  planStartDate?: string
  planEndDate?: string
  deviceIds: SamplingEntityId[]
  remark?: string
}

export interface SamplingAdminConfirmRequest {
  samplingTaskId: SamplingEntityId
  taskId: SamplingEntityId
  rowVersion: SamplingEntityId
  opinion?: string
}

export interface SamplingVerificationSubmitRequest {
  samplingTaskId: SamplingEntityId
  taskId: SamplingEntityId
  rowVersion: SamplingEntityId
  result?: SamplingResult
  verificationDate?: string
  validUntil?: string
  attachmentGroupId?: SamplingEntityId
  nonconformingReason?: string
  disposalType?: SamplingDisposalType
  opinion?: string
}

export type SamplingVerificationDraft = Omit<
  SamplingVerificationSubmitRequest,
  'samplingTaskId' | 'taskId' | 'rowVersion'
>

export interface SamplingPlanVO {
  id: SamplingEntityId
  planNo?: string
  planName?: string
  sampleType?: string
  sampleRule?: string
  sampleRate?: number | string
  ownerId?: string
  ownerName?: string
  deptId?: string
  deptName?: string
  verificationDate?: string
  planStartDate?: string
  planEndDate?: string
  deviceCount?: number
  completedCount?: number
  status?: string
  remark?: string
  createdAt?: string
}

export interface SamplingTaskVO {
  id: SamplingEntityId
  workflowTaskId?: SamplingEntityId
  processInstanceId?: SamplingEntityId
  rowVersion?: SamplingEntityId
  allowedActions?: string[]
  planId?: SamplingEntityId
  planNo?: string
  planName?: string
  taskNo?: string
  deviceId?: SamplingEntityId
  deviceCode?: string
  deviceName?: string
  modelSpec?: string
  factoryCode?: string
  deptId?: string
  deptName?: string
  manageCategory?: string
  verificationMethod?: string
  isCommon?: number
  assignedVerifierId?: string
  assignedVerifierName?: string
  confirmerId?: string
  confirmerName?: string
  currentNode?: SamplingNodeCode
  taskStatus?: SamplingTaskStatus
  verificationDate?: string
  validUntil?: string
  verificationRecordId?: SamplingEntityId
  attachmentGroupId?: SamplingEntityId
  result?: SamplingResult | string
  nonconformingReason?: string
  disposalType?: SamplingDisposalType
  remark?: string
  labelStatus?: string
  labelRecordId?: SamplingEntityId
  createdAt?: string
}

export interface SamplingDisplayRow {
  taskId: SamplingEntityId
  planId: SamplingEntityId | ''
  taskNo: string
  planNo: string
  currentNode: string
  currentNodeName: string
  taskStatus: string
  taskStatusName: string
  deviceCode: string
  deviceName: string
  modelSpec: string
  factoryCode: string
  deptName: string
  manageCategory: string
  verificationDate: string
  verificationMethod: string
  verificationMethodName: string
  isCommonName: string
  assignedVerifierName: string
  confirmerName: string
  resultName: string
  validUntil: string
  remark: string
}
