import type { EntityId, RowVersion } from '@/types/common'
import type { WorkflowTodoContainer } from '@/types/workflow'

export type { EntityId } from '@/types/common'

export type PeriodicTestPlanScenario = 'self' | 'external_common' | 'external_non_common'

/** 周检任务当前业务节点编码。 */
export type PeriodicNodeCode =
  | 'system_issue'
  | 'admin_exception_route'
  | 'self_verify'
  | 'responsible_scrap_confirm'
  | 'responsible_scrap_tracking_decision'
  | 'external_common_fill'
  | 'verifier_second_judge'
  | 'responsible_second_judge'
  | 'responsible_third_judge'
  | 'verifier_third_judge'
  | 'responsible_fourth_judge'
  | 'verifier_scrap_disposal'
  | 'external_uncommon_fill'
  | 'manager_forward_confirm'
  | 'confirmer_confirm'
  | 'admin_take_back'

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
export type PeriodicConfirmResult = 'qualified' | 'scrap' | 'repair'

/** 周检多轮判定接口允许提交的判定结果。 */
export type PeriodicJudgementResult = 'qualified' | 'unqualified'

/** 周检外委通用设备的一轮正式判定记录。 */
export interface PeriodicJudgementRecordVO {
  id: EntityId
  roundNo: number
  nodeCode: string
  judgeRoleCode: string
  judgeUserId: string
  judgeUserName: string
  judgeResult: PeriodicJudgementResult
  opinion?: string
  sourceRecordId?: EntityId
  judgedAt?: string
}

export interface PeriodicTaskVO {
  id: EntityId
  workflowTaskId?: EntityId
  processInstanceId?: EntityId
  rowVersion?: RowVersion
  allowedActions?: string[]
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
  scanAction?: string
  isPhysicalScan?: boolean
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
  judgementRecords?: PeriodicJudgementRecordVO[]
}

export interface PeriodicTodoPlanEntry extends WorkflowTodoContainer {}

export interface PeriodicDisplayRow {
  taskId: EntityId
  taskNo: string
  planId: EntityId | ''
  currentNode: string
  currentNodeName: string
  taskStatus: string
  taskStatusName: string
  physicalStatus: string
  physicalStatusName: string
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

export interface PeriodicVerificationRecordRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
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
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  confirmerId: string
  confirmerName: string
  opinion?: string
}

export interface PeriodicConfirmerConfirmRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  confirmResult: PeriodicConfirmResult
  opinion?: string
}

/** 周检异常分流中单台设备的统一任务并发身份与变更字段。 */
export interface PeriodicExceptionChangeItem {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  deviceId?: EntityId
  deviceCode?: string
  newStatus?: string
  newCategory?: string
  newVerificationMethod?: string
  newCycleMonth?: number
  newValidUntil?: string
  technicalStatus?: string
  sealReason?: string
  verificationReason?: string
  adjustmentReason?: string
  scrapType?: string
  scrapReason?: string
  precheckRequired?: number
  remark?: string
}

/** 周检异常节点提交到状态变更模块的批量申请。 */
export type PeriodicExceptionFlowType =
  | 'seal'
  | 'defer'
  | 'abnormal_scrap'
  | 'category'
  | 'cycle'

export interface PeriodicExceptionChangeSubmitRequest {
  changeType: PeriodicExceptionFlowType
  sourceType?: 'periodic'
  sourceId?: EntityId
  applyDeptId?: string
  applyDeptName?: string
  reason?: string
  remark?: string
  attachmentGroupId?: EntityId
  items: PeriodicExceptionChangeItem[]
}

export interface PeriodicSupplierFillInfoRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  verificationDate: string
  result: PeriodicVerificationResult
  verificationUnit?: string
  certificateNo?: string
  certificateAttachmentGroupId?: EntityId
  recordAttachmentGroupId?: EntityId
  opinion?: string
}

export interface PeriodicVerifierFillInfoRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  verificationDate: string
  certificateAttachmentGroupId?: EntityId
  verificationUnit?: string
  opinion?: string
}

/** 周检多轮判定请求，由后端依据当前待办决定角色、轮次和下一节点。 */
export interface PeriodicJudgementRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  judgeResult: PeriodicJudgementResult
  opinion?: string
}

/** 外委检定员报废处置请求。 */
export interface PeriodicScrapDisposalRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  scrapReason: string
  opinion?: string
}

export interface PeriodicResponsibleScrapConfirmRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  approved: boolean
  opinion?: string
}

export interface PeriodicResponsibleScrapTrackingDecisionRequest {
  periodicTaskId: EntityId
  taskId: EntityId
  rowVersion: RowVersion
  trackingRequired: boolean
  opinion?: string
}

export type PeriodicResponsibleScrapDecisionRequest =
  | PeriodicResponsibleScrapConfirmRequest
  | PeriodicResponsibleScrapTrackingDecisionRequest
