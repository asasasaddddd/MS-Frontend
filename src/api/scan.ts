import { request } from '@/api/request'
import {
  externalSendOutPeriodic,
  listPeriodicMyHistory,
  listPeriodicMyTasks,
  sendOutReturnPeriodic,
  verifierReceivePeriodic
} from '@/api/periodic'
import type { PeriodicTaskVO } from '@/types/periodic'
import type {
  BusinessScanRecordQuery,
  FirstCheckScanInboxItem,
  FirstCheckScanRequest,
  PeriodicScanAction,
  ScanRecord,
  UnifiedScanAction,
  UnifiedScanInboxItem,
  UnifiedScanSubmitRequest
} from '@/types/scan'
import {
  buildPeriodicScanRecordQuery,
  isPeriodicScanAction,
  normalizePeriodicPendingRow,
  normalizePeriodicScannedRow,
  periodicScanActions,
  resolvePeriodicScanAction
} from '@/views/scan/scanModel'

export type {
  BusinessScanRecordQuery,
  FirstCheckScanAction,
  FirstCheckScanInboxItem,
  FirstCheckScanRequest,
  PeriodicScanAction,
  ScanRecord,
  UnifiedScanAction,
  UnifiedScanBusinessType,
  UnifiedScanInboxItem,
  UnifiedScanSubmitRequest
} from '@/types/scan'
export { buildPeriodicScanRecordQuery, resolvePeriodicScanAction }

export function firstCheckScanStatusName(value?: string) {
  const map: Record<string, string> = {
    wait_receive: '待接收',
    received: '已接收',
    wait_sendout: '待外委送出',
    sent_out: '已外委送出',
    wait_sendout_return: '待外委送回',
    sendout_returned: '外委已送回',
    wait_take_back: '待取回',
    taken_back: '已取回'
  }
  return value ? map[value] || '未知状态' : '-'
}

export function scanActionName(value?: string) {
  const map: Record<string, string> = {
    receive: '接收',
    sendout: '外委送出',
    'sendout-return': '外委送回',
    'take-back': '取回',
    'periodic-verifier-receive': '检定员扫码接收',
    'periodic-external-send-out': '外扩人员接收',
    'periodic-send-out-return': '外委送回'
  }
  return value ? map[value] || '未知操作' : '-'
}

export const firstCheckScanActionName = scanActionName

function buildScanRequest(input: FirstCheckScanRequest): FirstCheckScanRequest {
  const scanCode = input.scanCode.trim()
  return {
    ...input,
    scanCode,
    scanContent: input.scanContent || scanCode,
    scanLocation: input.scanLocation || '现场扫码',
    clientType: input.clientType || 'web',
    terminalCode: input.terminalCode || 'WEB'
  }
}

function normalizeFirstCheckRow(row: FirstCheckScanInboxItem): UnifiedScanInboxItem {
  const action = row.scanAction || ''
  const id = ['firstcheck', row.orderId, row.lineNo || 0, action, row.scanCode || row.deviceCode || row.orderNo || ''].join('-')
  const currentNodeName = row.currentNodeName && /[\u3400-\u9fff]/.test(row.currentNodeName)
    ? row.currentNodeName
    : firstCheckScanStatusName(row.scanStatus)
  return {
    ...row,
    id,
    businessType: 'firstcheck',
    sourceType: row.sourceType || 'FIRST_CHECK',
    sourceLabel: '首检',
    businessId: row.orderId,
    currentNodeName,
    scanAction: action,
    useDeptName: row.useDeptName
  }
}

export function listFirstCheckScanInbox() {
  return request<FirstCheckScanInboxItem[]>({
    url: '/scan/firstcheck/inbox',
    method: 'GET'
  })
}

export function listBusinessScanRecords(params: BusinessScanRecordQuery) {
  return request<ScanRecord[]>({
    url: '/scan/business/records',
    method: 'GET',
    params
  })
}

function uniquePeriodicTasks(...groups: PeriodicTaskVO[][]) {
  const map = new Map<string, PeriodicTaskVO>()
  groups.flat().forEach((task) => map.set(String(task.id), task))
  return Array.from(map.values())
}

async function listPeriodicScannedRows(tasks: PeriodicTaskVO[], actions: PeriodicScanAction[]) {
  const queries = tasks.flatMap((task) => actions.map((action) => ({
    task,
    action,
    params: buildPeriodicScanRecordQuery(task, action)
  }))).filter((item): item is { task: PeriodicTaskVO; action: PeriodicScanAction; params: BusinessScanRecordQuery } => Boolean(item.params))

  const results = await Promise.allSettled(queries.map(async ({ task, action, params }) => {
    const records = await listBusinessScanRecords(params)
    return records[0] ? normalizePeriodicScannedRow(task, action, records[0]) : null
  }))

  return results.flatMap((result) => result.status === 'fulfilled' && result.value ? [result.value] : [])
}

export async function listUnifiedScanInbox(actions?: UnifiedScanAction[]) {
  const requestedPeriodicActions = actions === undefined
    ? periodicScanActions
    : actions.map(String).filter(isPeriodicScanAction)
  const historyRequest = requestedPeriodicActions.length ? listPeriodicMyHistory() : Promise.resolve([])
  const [firstCheckResult, periodicResult, periodicHistoryResult] = await Promise.allSettled([
    listFirstCheckScanInbox(),
    listPeriodicMyTasks(),
    historyRequest
  ])
  const rows: UnifiedScanInboxItem[] = []

  if (firstCheckResult.status === 'fulfilled') {
    rows.push(...firstCheckResult.value.map(normalizeFirstCheckRow))
  }

  if (periodicResult.status === 'fulfilled') {
    rows.push(...periodicResult.value.map(normalizePeriodicPendingRow).filter((row): row is UnifiedScanInboxItem => Boolean(row)))
  }

  const periodicTasks = uniquePeriodicTasks(
    periodicResult.status === 'fulfilled' ? periodicResult.value : [],
    periodicHistoryResult.status === 'fulfilled' ? periodicHistoryResult.value : []
  )
  if (requestedPeriodicActions.length && periodicTasks.length) {
    rows.push(...await listPeriodicScannedRows(periodicTasks, requestedPeriodicActions))
  }

  if (
    firstCheckResult.status === 'rejected' &&
    periodicResult.status === 'rejected' &&
    periodicHistoryResult.status === 'rejected'
  ) {
    throw firstCheckResult.reason
  }

  const rowMap = new Map<string, UnifiedScanInboxItem>()
  rows.forEach((row) => rowMap.set(row.id, row))
  return Array.from(rowMap.values())
}

export function sendoutFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({
    url: '/scan/firstcheck/sendout',
    method: 'POST',
    data: buildScanRequest(data)
  })
}

export function receiveFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({
    url: '/scan/firstcheck/receive',
    method: 'POST',
    data: buildScanRequest(data)
  })
}

export function returnFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({
    url: '/scan/firstcheck/sendout-return',
    method: 'POST',
    data: buildScanRequest(data)
  })
}

export function takeBackFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({
    url: '/scan/firstcheck/take-back',
    method: 'POST',
    data: buildScanRequest(data)
  })
}

export function submitFirstCheckScan(action: string, data: FirstCheckScanRequest) {
  if (action === 'receive') return receiveFirstCheckDevice(data)
  if (action === 'sendout') return sendoutFirstCheckDevice(data)
  if (action === 'sendout-return') return returnFirstCheckDevice(data)
  if (action === 'take-back') return takeBackFirstCheckDevice(data)
  return Promise.reject(new Error(`当前首检任务状态无法扫码：${scanActionName(action)}，请刷新待办后重试`))
}

export function submitUnifiedScan(row: UnifiedScanInboxItem, payload: UnifiedScanSubmitRequest) {
  if (row.businessType === 'firstcheck') {
    if (!row.orderId) return Promise.reject(new Error('缺少首检单ID'))
    return submitFirstCheckScan(row.scanAction, {
      orderId: row.orderId,
      scanCode: payload.scanCode,
      opinion: payload.opinion
    })
  }

  if (row.businessType === 'periodic') {
    if (!row.taskId) return Promise.reject(new Error('缺少周检任务ID'))
    const requestPayload = {
      taskId: row.taskId,
      scanCode: payload.scanCode,
      opinion: payload.opinion
    }
    if (row.scanAction === 'periodic-verifier-receive') return verifierReceivePeriodic(requestPayload)
    if (row.scanAction === 'periodic-external-send-out') return externalSendOutPeriodic(requestPayload)
    if (row.scanAction === 'periodic-send-out-return') return sendOutReturnPeriodic(requestPayload)
    return Promise.reject(new Error(`当前周检任务状态无法扫码：${scanActionName(row.scanAction)}，请刷新待办后重试`))
  }

  return Promise.reject(new Error(`当前任务无法进入扫码：${row.sourceLabel || row.businessType}，请刷新待办后重试`))
}
