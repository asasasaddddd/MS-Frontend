import { periodicNodeName, periodicStatusName } from '@/api/periodicContract'
import type { PeriodicTaskVO } from '@/types/periodic'
import type {
  BusinessScanRecordQuery,
  FirstCheckScanAction,
  PeriodicScanAction,
  PeriodicScanScene,
  ScanRecord,
  UnifiedScanInboxItem
} from '@/types/scan'

export const periodicScanActions: PeriodicScanAction[] = [
  'periodic-verifier-receive',
  'periodic-external-send-out',
  'periodic-send-out-return'
]

const firstCheckScanActionByCode: Readonly<Record<string, FirstCheckScanAction>> = {
  RECEIVE: 'receive',
  SEND_OUT: 'sendout',
  SEND_OUT_RETURN: 'sendout-return',
  TAKE_BACK: 'take-back'
}

const periodicScanActionByCode: Readonly<Record<string, PeriodicScanAction>> = {
  RECEIVE: 'periodic-verifier-receive',
  SEND_OUT: 'periodic-external-send-out',
  SEND_OUT_RETURN: 'periodic-send-out-return'
}

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
  return Array.from(new Set((actions || []).map((action) => String(action).trim().toUpperCase()).filter(Boolean)))
}

export function firstCheckScanActionCodesFromCodes(actions?: readonly string[]) {
  return normalizedActionCodes(actions).filter((code) => Boolean(firstCheckScanActionByCode[code]))
}

export function firstCheckScanActionFromCodes(actions?: readonly string[]) {
  return firstCheckScanActionCodesFromCodes(actions).map((code) => firstCheckScanActionByCode[code]).find(Boolean)
}

export function periodicScanActionsFromCodes(actions?: readonly string[]) {
  return normalizedActionCodes(actions).flatMap((code) => {
    const action = periodicScanActionByCode[code]
    return action ? [action] : []
  })
}

export function scanActionCode(action: string) {
  return scanCodeByAction[action]
}

export function isUnifiedScanActionAllowed(row: Pick<UnifiedScanInboxItem, 'scanAction' | 'allowedActions'>) {
  const code = scanActionCode(String(row.scanAction))
  return Boolean(code && normalizedActionCodes(row.allowedActions).includes(code))
}

const periodicScanSceneByAction: Record<PeriodicScanAction, PeriodicScanScene> = {
  'periodic-verifier-receive': 'periodic_receive',
  'periodic-external-send-out': 'periodic_send_out',
  'periodic-send-out-return': 'periodic_send_out_return'
}

function hasEntityId(value: unknown): value is string | number {
  return value !== undefined && value !== null && value !== ''
}

function hasChinese(value?: string) {
  return Boolean(value && /[\u3400-\u9fff]/.test(value))
}

function periodicSource(task: PeriodicTaskVO) {
  if (task.taskType === 'before_use') {
    return { sourceType: 'BEFORE_USE', sourceLabel: '用前检定' }
  }
  return { sourceType: 'PERIODIC', sourceLabel: '周检' }
}

function periodicTaskStatusName(task: PeriodicTaskVO) {
  if (hasChinese(task.taskStatusName)) return task.taskStatusName
  const name = periodicStatusName(task.taskStatus)
  return name === task.taskStatus ? '未知状态' : name
}

function periodicTaskNodeName(task: PeriodicTaskVO, action: PeriodicScanAction) {
  if (action === 'periodic-verifier-receive') return '待扫码接收'
  if (action === 'periodic-send-out-return') return '外委送回'
  if (hasChinese(task.currentNodeName)) return task.currentNodeName
  const name = periodicNodeName(task.currentNode)
  return name === task.currentNode ? '未知状态' : name
}

function periodicRowId(task: PeriodicTaskVO, action: PeriodicScanAction) {
  return ['periodic', task.id, action, task.deviceCode || task.taskNo || ''].join('-')
}

function periodicRowBase(task: PeriodicTaskVO, action: PeriodicScanAction): UnifiedScanInboxItem {
  const source = periodicSource(task)
  return {
    id: periodicRowId(task, action),
    businessType: 'periodic',
    sourceType: source.sourceType,
    sourceLabel: source.sourceLabel,
    businessId: task.planId,
    taskId: task.id,
    orderNo: task.taskNo,
    taskNo: task.taskNo,
    currentNode: String(task.currentNode || ''),
    currentNodeName: periodicTaskNodeName(task, action),
    scanStatus: periodicTaskStatusName(task),
    scanAction: action,
    allowedActions: [...(task.allowedActions || [])],
    scanCode: task.deviceCode,
    deviceCode: task.deviceCode,
    deviceName: task.deviceName,
    materialCode: task.materialCode,
    useDeptName: task.deptName,
    applyTime: task.transferTime || task.receiveTime || task.requiredFinishTime,
    scanned: false
  }
}

export function isPeriodicScanAction(value: string): value is PeriodicScanAction {
  return periodicScanActions.includes(value as PeriodicScanAction)
}

export function resolvePeriodicScanAction(task: PeriodicTaskVO): PeriodicScanAction | undefined {
  return periodicScanActionsFromCodes(task.allowedActions)[0]
}

export function buildPeriodicScanRecordQuery(
  task: PeriodicTaskVO,
  action: PeriodicScanAction
): BusinessScanRecordQuery | null {
  if (!hasEntityId(task.planId) || !hasEntityId(task.id)) return null
  return {
    businessType: task.taskType === 'before_use' ? 'before_use' : 'periodic',
    businessId: task.planId,
    businessItemId: task.id,
    scanScene: periodicScanSceneByAction[action]
  }
}

export function normalizePeriodicPendingRow(task: PeriodicTaskVO): UnifiedScanInboxItem | null {
  const action = resolvePeriodicScanAction(task)
  return action ? periodicRowBase(task, action) : null
}

export function normalizePeriodicPendingRows(task: PeriodicTaskVO): UnifiedScanInboxItem[] {
  return periodicScanActionsFromCodes(task.allowedActions).map((action) => periodicRowBase(task, action))
}

export function normalizePeriodicScannedRow(
  task: PeriodicTaskVO,
  action: PeriodicScanAction,
  record: ScanRecord
): UnifiedScanInboxItem {
  return {
    ...periodicRowBase(task, action),
    currentNodeName: '已扫码',
    scanStatus: '已扫码',
    scanCode: record.scanCode || task.deviceCode,
    deviceCode: record.deviceCode || task.deviceCode,
    applyTime: record.scanTime || task.transferTime || task.receiveTime || task.requiredFinishTime,
    scanned: true,
    scanTime: record.scanTime
  }
}
