import type { EntityId, RowVersion } from '@/types/common'

export type ScanEntityId = EntityId

export type FirstCheckScanAction = 'receive' | 'sendout' | 'sendout-return' | 'take-back'

export type PeriodicScanAction =
  | 'periodic-verifier-receive'
  | 'periodic-external-send-out'
  | 'periodic-send-out-return'
  | 'periodic-manager-take-back'

export type PeriodicScanScene =
  | 'periodic_receive'
  | 'periodic_send_out'
  | 'periodic_send_out_return'
  | 'periodic_take_back'

export type ChangeScanAction =
  | 'change-verifier-receive'
  | 'change-external-send-out'
  | 'change-send-out-return'
  | 'change-manager-take-back'
  | 'change-scrap-inbound'
  | 'change-transfer-receive'

export type ChangeScanScene =
  | 'change_receive'
  | 'change_send_out'
  | 'change_send_out_return'
  | 'change_take_back'
  | 'change_scrap_inbound'
  | 'change_transfer_receive'

export type UnifiedScanAction = FirstCheckScanAction | PeriodicScanAction | ChangeScanAction | string
export type UnifiedScanBusinessType = 'firstcheck' | 'periodic' | 'change' | string

export interface FirstCheckScanInboxItem {
  orderId: ScanEntityId
  workflowTaskId?: ScanEntityId
  rowVersion?: RowVersion
  orderNo?: string
  lineNo?: number
  sourceType?: string
  currentNodeName?: string
  scanStatus?: string
  scanAction: FirstCheckScanAction | string
  allowedActions?: string[]
  scanCode?: string
  deviceCode?: string
  deviceName?: string
  materialCode?: string
  useDeptName?: string
  applyTime?: string
  scanned?: boolean
  scanTime?: string
}

export interface PeriodicScanInboxItem {
  taskId: ScanEntityId
  workflowTaskId?: ScanEntityId
  rowVersion?: RowVersion
  planId?: ScanEntityId
  taskNo?: string
  taskType?: string
  sourceType?: string
  currentNodeName?: string
  scanStatus?: string
  scanAction: PeriodicScanAction | string
  scanScene?: PeriodicScanScene | string
  scanCode?: string
  deviceId?: ScanEntityId
  deviceCode?: string
  deviceName?: string
  materialCode?: string
  useDeptName?: string
  applyTime?: string
  scanned?: boolean
  scanTime?: string
  allowedActions?: string[]
}

export interface ChangeScanInboxItem {
  orderId: ScanEntityId
  itemId: ScanEntityId
  taskId?: ScanEntityId
  rowVersion?: RowVersion
  orderNo?: string
  changeType?: string
  currentNodeName?: string
  scanStatus?: string
  scanAction: ChangeScanAction | string
  scanScene?: ChangeScanScene | string
  scanCode?: string
  deviceId: ScanEntityId
  deviceCode?: string
  deviceName?: string
  materialCode?: string
  useDeptName?: string
  applyTime?: string
  scanned?: boolean
  scanTime?: string
  allowedActions?: string[]
}

export interface UnifiedScanInboxItem {
  id: string
  businessType: UnifiedScanBusinessType
  sourceType: string
  sourceLabel: string
  businessId?: ScanEntityId
  orderId?: ScanEntityId
  itemId?: ScanEntityId
  taskId?: ScanEntityId
  workflowTaskId?: ScanEntityId
  rowVersion?: RowVersion
  deviceId?: ScanEntityId
  orderNo?: string
  taskNo?: string
  lineNo?: number
  currentNode?: string
  currentNodeName?: string
  scanStatus?: string
  scanAction: UnifiedScanAction
  allowedActions: string[]
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
  orderId: ScanEntityId
  workflowTaskId?: ScanEntityId
  rowVersion?: RowVersion
  scanCode: string
  scanContent?: string
  scanLocation?: string
  clientType?: string
  terminalCode?: string
  opinion?: string
}

export interface ChangeScanRequest {
  orderId: ScanEntityId
  itemId: ScanEntityId
  deviceId: ScanEntityId
  taskId?: ScanEntityId
  rowVersion?: RowVersion
  scanCode: string
  scanContent?: string
  scanLocation?: string
  opinion?: string
}

export interface UnifiedScanSubmitRequest {
  scanCode: string
  scanContent: string
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
