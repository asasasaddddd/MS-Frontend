import type {
  FirstCheckScanAction,
  FirstCheckScanInboxItem,
  PeriodicScanAction,
  PeriodicScanInboxItem,
  UnifiedScanInboxItem
} from '@/types/scan'

export const periodicScanActions: PeriodicScanAction[] = [
  'periodic-verifier-receive',
  'periodic-external-send-out',
  'periodic-send-out-return'
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
  'periodic-send-out-return': 'SEND_OUT_RETURN'
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
  const beforeUse = row.taskType === 'before_use'
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
