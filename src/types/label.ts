export type LabelVerificationMethod = 'self' | 'send_out'

export interface LabelPrintRecord {
  id: string | number
  labelType?: string
  deviceCode?: string
  deviceId?: string | number
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
  firstPrintTime?: string
  lastPrintTime?: string
  printCount?: number
  sourceType?: string
  sourceId?: string | number
  qrCodeData?: string
  createdAt?: string
  updatedAt?: string
}
