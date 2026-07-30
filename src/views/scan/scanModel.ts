import type {
  ChangeScanAction,
  ChangeScanInboxItem,
  FirstCheckScanAction,
  FirstCheckScanInboxItem,
  PeriodicScanAction,
  PeriodicScanInboxItem,
  UnifiedScanInboxItem
} from '@/types/scan'

export const changeScanActions: ChangeScanAction[] = [
  'change-verifier-receive',
  'change-external-send-out',
  'change-send-out-return',
  'change-manager-take-back',
  'change-scrap-inbound',
  'change-transfer-receive'
]

export const periodicScanActions: PeriodicScanAction[] = [
  'periodic-verifier-receive',
  'periodic-external-send-out',
  'periodic-send-out-return',
  'periodic-manager-take-back'
]

const firstCheckScanActions: FirstCheckScanAction[] = [
  'receive',
  'sendout',
  'sendout-return',
  'take-back'
]

const scanCodeByAction: Readonly<Record<string, string>> = {
  receive: 'RECEIVE',
  sendout: 'SEND_OUT',
  'sendout-return': 'SEND_OUT_RETURN',
  'take-back': 'TAKE_BACK',
  'periodic-verifier-receive': 'RECEIVE',
  'periodic-external-send-out': 'SEND_OUT',
  'periodic-send-out-return': 'SEND_OUT_RETURN',
  'periodic-manager-take-back': 'TAKE_BACK',
  'change-verifier-receive': 'RECEIVE',
  'change-external-send-out': 'SEND_OUT',
  'change-send-out-return': 'SEND_OUT_RETURN',
  'change-manager-take-back': 'TAKE_BACK',
  'change-scrap-inbound': 'SCRAP_INBOUND',
  'change-transfer-receive': 'TRANSFER_RECEIVE'
}

const changeNodeNameByAction: Readonly<Record<ChangeScanAction, string>> = {
  'change-verifier-receive': '\u5f85\u68c0\u5b9a\u5458\u63a5\u6536',
  'change-external-send-out': '\u5f85\u5916\u59d4\u9001\u51fa',
  'change-send-out-return': '\u5f85\u5916\u59d4\u9001\u56de',
  'change-manager-take-back': '\u5f85\u7ba1\u7406\u5458\u53d6\u56de',
  'change-scrap-inbound': '\u5f85\u62a5\u5e9f\u5b9e\u7269\u5165\u5e93',
  'change-transfer-receive': '\u5f85\u63a5\u6536\u90e8\u95e8\u7ba1\u7406\u5458\u626b\u7801'
}

function normalizedActionCodes(actions?: readonly string[]) {
  return Array.from(new Set(actions || []))
}

export function scanActionCode(action: string) {
  return scanCodeByAction[action]
}

export function isUnifiedScanActionAllowed(
  row: Pick<UnifiedScanInboxItem, 'scanAction' | 'allowedActions'>
) {
  const code = scanActionCode(String(row.scanAction))
  return Boolean(code && normalizedActionCodes(row.allowedActions).includes(code))
}

function hasChinese(value?: string) {
  return Boolean(value && /[\u3400-\u9fff]/.test(value))
}

function isFirstCheckAction(value: string): value is FirstCheckScanAction {
  return firstCheckScanActions.includes(value as FirstCheckScanAction)
}

export function isPeriodicScanAction(value: string): value is PeriodicScanAction {
  return periodicScanActions.includes(value as PeriodicScanAction)
}

export function isChangeScanAction(value: string): value is ChangeScanAction {
  return changeScanActions.includes(value as ChangeScanAction)
}

export function normalizeFirstCheckInboxRow(
  row: FirstCheckScanInboxItem,
  statusName: (value?: string) => string
): UnifiedScanInboxItem | undefined {
  const action = String(row.scanAction || '')
  if (!isFirstCheckAction(action)) return undefined
  const allowedActions = normalizedActionCodes(row.allowedActions)
  if (!row.scanned && !isUnifiedScanActionAllowed({ scanAction: action, allowedActions })) {
    return undefined
  }
  return {
    ...row,
    id: ['firstcheck', row.orderId, row.lineNo || 0, action, row.scanCode || row.orderNo || ''].join('-'),
    businessType: 'firstcheck',
    sourceType: row.sourceType || 'FIRST_CHECK',
    sourceLabel: '\u9996\u68c0',
    businessId: row.orderId,
    currentNodeName: hasChinese(row.currentNodeName) ? row.currentNodeName : statusName(row.scanStatus),
    scanAction: action,
    allowedActions
  }
}

export function normalizePeriodicInboxRow(row: PeriodicScanInboxItem): UnifiedScanInboxItem | undefined {
  const action = String(row.scanAction || '')
  if (!isPeriodicScanAction(action)) return undefined
  const allowedActions = normalizedActionCodes(row.allowedActions)
  if (!row.scanned && !isUnifiedScanActionAllowed({ scanAction: action, allowedActions })) {
    return undefined
  }
  const normalizedTaskType = String(row.taskType || row.sourceType || '').trim().toLowerCase()
  const beforeUse = normalizedTaskType === 'before_use'
  const sourceType = String(row.sourceType || (beforeUse ? 'BEFORE_USE' : 'PERIODIC'))
    .trim()
    .toUpperCase()
  return {
    ...row,
    id: ['periodic', row.taskId, action, row.scanCode || row.deviceCode || row.taskNo || ''].join('-'),
    businessType: 'periodic',
    sourceType,
    sourceLabel: beforeUse ? '\u7528\u524d\u68c0\u5b9a' : '\u5468\u68c0',
    businessId: row.planId,
    orderNo: row.taskNo,
    taskId: row.taskId,
    currentNodeName: row.currentNodeName || (row.scanned ? '\u5df2\u626b\u7801' : '-'),
    scanAction: action,
    allowedActions
  }
}

export function normalizeChangeInboxRow(row: ChangeScanInboxItem): UnifiedScanInboxItem | undefined {
  const action = String(row.scanAction || '')
  if (!isChangeScanAction(action)) return undefined
  const allowedActions = normalizedActionCodes(row.allowedActions)
  if (!row.scanned && !isUnifiedScanActionAllowed({ scanAction: action, allowedActions })) {
    return undefined
  }
  return {
    ...row,
    id: ['change', row.orderId, row.itemId, action, row.scanCode || row.deviceCode || row.orderNo || ''].join('-'),
    businessType: 'change',
    sourceType: 'CHANGE',
    sourceLabel: '\u72b6\u6001\u53d8\u66f4',
    businessId: row.orderId,
    orderId: row.orderId,
    itemId: row.itemId,
    taskId: row.taskId,
    rowVersion: row.rowVersion,
    deviceId: row.deviceId,
    currentNodeName: row.currentNodeName || (row.scanned ? '\u5df2\u626b\u7801' : changeNodeNameByAction[action]),
    scanAction: action,
    allowedActions
  }
}
