import { periodicNodeName, periodicStatusName } from '@/api/periodicContract'
import type { PeriodicTaskVO } from '@/types/periodic'
import type {
  BusinessScanRecordQuery,
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
  const node = String(task.currentNode || '')
  if (node === 'transfer_verifier') return 'periodic-verifier-receive'
  if (node === 'send_out_return') return 'periodic-send-out-return'
  if (node === 'send_out') {
    return task.physicalStatus === 'wait_sendout_return_receive'
      ? 'periodic-send-out-return'
      : 'periodic-external-send-out'
  }
  return undefined
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
