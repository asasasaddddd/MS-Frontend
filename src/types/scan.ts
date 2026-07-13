export type ScanEntityId = string | number

export type FirstCheckScanAction = 'receive' | 'sendout' | 'sendout-return' | 'take-back'

export type PeriodicScanAction =
  | 'periodic-verifier-receive'
  | 'periodic-external-send-out'
  | 'periodic-send-out-return'

export type PeriodicScanScene = 'periodic_receive' | 'periodic_send_out' | 'periodic_send_out_return'

export type UnifiedScanAction = FirstCheckScanAction | PeriodicScanAction | string
export type UnifiedScanBusinessType = 'firstcheck' | 'periodic' | 'change' | string

export interface FirstCheckScanInboxItem {
  orderId: number
  orderNo?: string
  lineNo?: number
  sourceType?: string
  currentNodeName?: string
  scanStatus?: string
  scanAction: FirstCheckScanAction | string
  scanCode?: string
  deviceCode?: string
  deviceName?: string
  materialCode?: string
  useDeptName?: string
  applyTime?: string
  scanned?: boolean
  scanTime?: string
}

export interface UnifiedScanInboxItem {
  id: string
  businessType: UnifiedScanBusinessType
  sourceType: string
  sourceLabel: string
  businessId?: ScanEntityId
  orderId?: number
  taskId?: ScanEntityId
  orderNo?: string
  taskNo?: string
  lineNo?: number
  currentNode?: string
  currentNodeName?: string
  scanStatus?: string
  scanAction: UnifiedScanAction
  scanCode?: string
  deviceCode?: string
  deviceName?: string
  materialCode?: string
  useDeptName?: string
  applyTime?: string
  scanned?: boolean
  scanTime?: string
}

export interface FirstCheckScanRequest {
  orderId: number
  scanCode: string
  scanContent?: string
  scanLocation?: string
  clientType?: string
  terminalCode?: string
  opinion?: string
}

export interface UnifiedScanSubmitRequest {
  scanCode: string
  opinion?: string
}

export interface BusinessScanRecordQuery {
  businessType: string
  businessId: ScanEntityId
  businessItemId?: ScanEntityId
  scanScene: string
}

export interface ScanRecord {
  scanRecordId?: ScanEntityId
  scanNo?: string
  businessType?: string
  businessId?: ScanEntityId
  businessItemId?: ScanEntityId
  orderId?: ScanEntityId
  itemId?: ScanEntityId
  lineNo?: number
  scanCode?: string
  deviceCode?: string
  scanScene?: string
  scanStatus?: string
  operatorId?: string
  operatorName?: string
  scanTime?: string
}
