import type { EntityId } from '@/types/periodic'

export interface DeviceVO {
  id: EntityId
  deviceCode?: string
  qrCode?: string
  deviceName?: string
  deviceAlias?: string
  materialCode?: string
  materialName?: string
  purchaseOrderNo?: string
  supplierCode?: string
  supplierName?: string
  usageScenario?: string
  modelSpec?: string
  manageCategory?: string
  deviceStatus?: string
  verificationStatus?: string
  deviceUsage?: string
  measureRange?: string
  resolution?: string
  accuracy?: string
  accuracyLevel?: string
  allowedError?: string
  manufacturer?: string
  factoryCode?: string
  factoryDate?: string
  subjectCategory?: string
  subjectSubCategory?: string
  isMandatory?: number
  isCommon?: number
  standardDevice?: string
  confirmInterval?: string
  specialProject?: string
  verificationMethod?: string
  verificationCycleMonth?: number
  lastVerificationDate?: string
  validUntil?: string
  nextVerificationDate?: string
  deptId?: string
  deptName?: string
  measureManagerId?: string
  measureManagerName?: string
  verifierId?: string
  verifierName?: string
  responsibleEngineerId?: string
  responsibleEngineerName?: string
  confirmEngineerId?: string
  confirmEngineerName?: string
  technicalStatus?: string
  storageLocation?: string
  sourceType?: string
  sourceOrderId?: EntityId
  selfCost?: number
  sendoutCost?: string
  verificationCost?: number | string
  purchaseCost?: number | string
  remark?: string
}

export interface DeviceLedgerUpdateRequest {
  deviceName: string
  deviceAlias?: string
  materialCode?: string
  materialName?: string
  purchaseOrderNo?: string
  supplierCode?: string
  supplierName?: string
  usageScenario?: string
  modelSpec?: string
  deviceUsage?: string
  measureRange?: string
  resolution?: string
  accuracyLevel?: string
  allowedError?: string
  manufacturer?: string
  factoryCode?: string
  factoryDate?: string
  subjectCategory?: string
  subjectSubCategory?: string
  isMandatory?: number
  isCommon?: number
  standardDevice?: string
  confirmInterval?: string
  specialProject?: string
  verificationMethod?: string
  verificationCycleMonth?: number
  lastVerificationDate?: string
  validUntil?: string
  technicalStatus?: string
  storageLocation?: string
  remark?: string
}

export interface DeviceBusinessEventVO {
  caseId: EntityId
  businessType?: string
  businessTypeName?: string
  businessId?: EntityId
  businessNo?: string
  eventSubtype?: string
  title?: string
  statusCode?: string
  statusName?: string
  currentNodeCode?: string
  currentNodeName?: string
  resultCode?: string
  resultName?: string
  startedAt?: string
  endedAt?: string
  deviceId?: EntityId
  deviceCode?: string
  businessItemId?: EntityId
  relationRole?: string
  joinedAt?: string
}

export interface BusinessCaseDeviceVO {
  id?: EntityId
  caseId?: EntityId
  deviceId?: EntityId
  deviceCode?: string
  businessItemId?: EntityId
  relationRole?: string
  joinedAt?: string
}

export interface BusinessCaseRelationVO {
  id?: EntityId
  sourceCaseId?: EntityId
  targetCaseId?: EntityId
  relationType?: string
  remark?: string
  createdBy?: string
  createdAt?: string
}

export interface BusinessFlowLogVO {
  id: EntityId
  caseId?: EntityId
  businessItemId?: EntityId
  processInstanceId?: EntityId
  taskId?: EntityId
  eventKind?: string
  eventKindName?: string
  nodeCode?: string
  nodeName?: string
  actionCode?: string
  actionName?: string
  nextNodeCode?: string
  nextNodeName?: string
  operatorId?: string
  operatorName?: string
  opinion?: string
  resultCode?: string
  resultName?: string
  snapshotJson?: string
  schemaVersion?: number
  idempotencyKey?: string
  operatedAt?: string
}

export interface BusinessCaseDetailVO {
  id: EntityId
  businessType?: string
  businessTypeName?: string
  businessId?: EntityId
  businessNo?: string
  parentCaseId?: EntityId
  eventSubtype?: string
  processInstanceId?: EntityId
  title?: string
  statusCode?: string
  statusName?: string
  currentNodeCode?: string
  currentNodeName?: string
  resultCode?: string
  resultName?: string
  startedAt?: string
  endedAt?: string
  createdAt?: string
  updatedAt?: string
  devices?: BusinessCaseDeviceVO[]
  outgoingRelations?: BusinessCaseRelationVO[]
  incomingRelations?: BusinessCaseRelationVO[]
  timeline?: BusinessFlowLogVO[]
}

export interface CaseAttachmentFileVO {
  id: EntityId
  attachmentGroupId?: EntityId
  fileName?: string
  fileExt?: string
  fileMime?: string
  fileSize?: number
  storageProvider?: string
  fileUrl?: string
  contentSha256?: string
  uploaderId?: string
  uploaderName?: string
  uploadedAt?: string
  remark?: string
}

export interface CaseAttachmentLinkVO {
  id?: EntityId
  attachmentGroupId?: EntityId
  caseId?: EntityId
  flowLogId?: EntityId
  businessItemId?: EntityId
  deviceId?: EntityId
  purpose?: string
  linkScope?: string
  primary?: boolean
  linkedBy?: string
  linkedAt?: string
}

export interface CaseAttachmentGroupVO {
  id: EntityId
  groupNo?: string
  status?: string
  versionNo?: number
  supersedesGroupId?: EntityId
  fileCount?: number
  totalSize?: number
  creatorId?: string
  creatorName?: string
  lockedBy?: string
  lockedAt?: string
  createdAt?: string
  files?: CaseAttachmentFileVO[]
}

export interface AttachmentCaseGroupVO {
  link?: CaseAttachmentLinkVO
  group: CaseAttachmentGroupVO
  purposeName?: string
  linkScopeName?: string
  statusName?: string
}

export interface DevicePageQuery {
  current?: number
  size?: number
  deviceCode?: string
  deviceName?: string
  modelSpec?: string
  factoryCode?: string
  deptName?: string
  manageCategory?: string
  deviceStatus?: string
  verificationCycleMonth?: number
  validUntil?: string
  lastVerificationDate?: string
  manufacturer?: string
  verificationMethod?: string
}
