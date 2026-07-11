import { request } from '@/api/request'

export interface LabelPrintRecord {
  id: string | number
  labelType?: string
  deviceCode?: string
  deviceId?: string | number
  deviceName?: string
  validUntil?: string
  verificationDate?: string
  verificationMethod?: string
  verificationMethodName?: string
  verificationTypeName?: string
  manageCategory?: string
  isCommon?: number
  sealDate?: string
  printUserId?: string
  printUserName?: string
  signUserId?: string
  signUserName?: string
  firstPrintTime?: string
  lastPrintTime?: string
  printCount?: number
  sourceType?: string
  sourceId?: string | number
  qrCodeData?: string
  createdAt?: string
  updatedAt?: string
}

export function listUnprintedLabels(sourceType?: string) {
  return request<LabelPrintRecord[]>({
    url: '/label/unprintedList',
    method: 'GET',
    params: sourceType ? { sourceType } : undefined
  })
}

export function listPrintedLabels(sourceType?: string) {
  return request<LabelPrintRecord[]>({
    url: '/label/printedList',
    method: 'GET',
    params: sourceType ? { sourceType } : undefined
  })
}

export function printLabelRecord(recordId: string | number) {
  return request<void>({
    url: `/label/print/${recordId}`,
    method: 'POST'
  })
}
