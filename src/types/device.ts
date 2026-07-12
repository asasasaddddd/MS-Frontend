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

export interface DeviceHistoryVO {
  key?: string
  historyType?: string
  historyTypeName?: string
  deviceCode?: string
  sourceType?: string
  sourceId?: EntityId
  sourceItemId?: EntityId
  sourceNo?: string
  eventTime?: string
  title?: string
  summary?: string
  operatorId?: string
  operatorName?: string
  result?: string
  amount?: number | string
  currency?: string
  attachmentGroupId?: EntityId
  certificateAttachmentGroupId?: EntityId
  recordAttachmentGroupId?: EntityId
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
