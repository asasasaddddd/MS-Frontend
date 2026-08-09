import type { EntityId } from '@/types/common'

export type LabelVerificationMethod = 'self' | 'send_out'

export interface LabelSourceDetail {
  sourceId?: EntityId
  businessNo?: string
  purchaseOrderNo?: string
  materialCode?: string
  materialName?: string
  deviceName?: string
  modelSpec?: string
  quantity?: number
  applyDeptName?: string
  supplierName?: string
  applicantId?: string
  applicantName?: string
  applyTime?: string
  remark?: string
  hasAttachment?: boolean
}

export interface LabelPrintRecord {
  id: EntityId
  labelType?: string
  deviceCode?: string
  deviceId?: EntityId
  deviceName?: string
  validUntil?: string
  verificationDate?: string
  verificationMethod?: LabelVerificationMethod
  manageCategory?: string
  isCommon?: number
  sealDate?: string
  printUserId?: string
  printUserName?: string
  signUserId?: string
  signUserName?: string
  printAssigneeId?: string
  printAssigneeRoleCode?: string
  printRoleCode?: string
  firstPrintTime?: string
  lastPrintTime?: string
  printCount?: number
  sourceType?: string
  sourceLabel?: string
  sourceId?: EntityId
  qrCodeData?: string
  sourceDetail?: LabelSourceDetail
  createdAt?: string
  updatedAt?: string
}
