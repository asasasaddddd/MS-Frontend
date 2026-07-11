import { request } from '@/api/request'
import {
  externalSendOutPeriodic,
  listPeriodicMyTasks,
  managerReceivePeriodic,
  sendOutReturnPeriodic,
  verifierReceivePeriodic
} from '@/api/periodic'
import { periodicNodeName, periodicStatusName } from '@/api/periodicContract'
import type { EntityId, PeriodicTaskVO } from '@/types/periodic'

export type FirstCheckScanAction = 'receive' | 'sendout' | 'sendout-return' | 'take-back'

export type PeriodicScanAction =
  | 'periodic-manager-receive'
  | 'periodic-verifier-receive'
  | 'periodic-external-send-out'
  | 'periodic-send-out-return'

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
  businessId?: EntityId
  orderId?: number
  taskId?: EntityId
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

export interface ScanRecord {
  scanRecordId?: number
  scanNo?: string
  businessType?: string
  businessId?: number
  orderId?: number
  scanCode?: string
  deviceCode?: string
  scanScene?: string
  scanStatus?: string
  operatorId?: string
  operatorName?: string
  scanTime?: string
}

const periodicScanActionByNode: Record<string, PeriodicScanAction> = {
  manager_receive: 'periodic-manager-receive',
  transfer_verifier: 'periodic-verifier-receive',
  send_out_return: 'periodic-send-out-return'
}

function periodicScanAction(task: PeriodicTaskVO): PeriodicScanAction | undefined {
  const node = String(task.currentNode || '')
  if (node === 'send_out') {
    if (task.physicalStatus === 'wait_sendout_return_receive') return 'periodic-send-out-return'
    return 'periodic-external-send-out'
  }
  return periodicScanActionByNode[node]
}

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
  return value ? map[value] || value : '-'
}

export function scanActionName(value?: string) {
  const map: Record<string, string> = {
    receive: '接收',
    sendout: '外委送出',
    'sendout-return': '外委送回',
    'take-back': '取回',
    'periodic-manager-receive': '管理员接收核对',
    'periodic-verifier-receive': '检定员扫码接收',
    'periodic-external-send-out': '外扩人员接收',
    'periodic-send-out-return': '外委送回'
  }
  return value ? map[value] || value : '-'
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
  return {
    ...row,
    id,
    businessType: 'firstcheck',
    sourceType: row.sourceType || 'FIRST_CHECK',
    sourceLabel: '首检',
    businessId: row.orderId,
    currentNodeName: row.currentNodeName || firstCheckScanStatusName(row.scanStatus),
    scanAction: action,
    useDeptName: row.useDeptName
  }
}

function normalizePeriodicRow(task: PeriodicTaskVO): UnifiedScanInboxItem | null {
  const node = String(task.currentNode || '')
  const action = periodicScanAction(task)
  if (!action) return null
  const statusName = task.taskStatusName || periodicStatusName(task.taskStatus)
  return {
    id: ['periodic', task.id, action, task.deviceCode || task.taskNo || ''].join('-'),
    businessType: 'periodic',
    sourceType: 'PERIODIC',
    sourceLabel: '周检',
    businessId: task.planId,
    taskId: task.id,
    orderNo: task.taskNo,
    taskNo: task.taskNo,
    currentNode: node,
    currentNodeName: task.currentNodeName || periodicNodeName(node),
    scanStatus: task.taskStatus || statusName,
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

export function listFirstCheckScanInbox() {
  return request<FirstCheckScanInboxItem[]>({
    url: '/scan/firstcheck/inbox',
    method: 'GET'
  })
}

export async function listUnifiedScanInbox() {
  const [firstCheckResult, periodicResult] = await Promise.allSettled([listFirstCheckScanInbox(), listPeriodicMyTasks()])
  const rows: UnifiedScanInboxItem[] = []

  if (firstCheckResult.status === 'fulfilled') {
    rows.push(...firstCheckResult.value.map(normalizeFirstCheckRow))
  }

  if (periodicResult.status === 'fulfilled') {
    rows.push(...periodicResult.value.map(normalizePeriodicRow).filter((row): row is UnifiedScanInboxItem => Boolean(row)))
  }

  if (firstCheckResult.status === 'rejected' && periodicResult.status === 'rejected') {
    throw firstCheckResult.reason
  }

  return rows
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
    if (row.scanAction === 'periodic-manager-receive') return managerReceivePeriodic(requestPayload)
    if (row.scanAction === 'periodic-verifier-receive') return verifierReceivePeriodic(requestPayload)
    if (row.scanAction === 'periodic-external-send-out') return externalSendOutPeriodic(requestPayload)
    if (row.scanAction === 'periodic-send-out-return') return sendOutReturnPeriodic(requestPayload)
    return Promise.reject(new Error(`当前周检任务状态无法扫码：${scanActionName(row.scanAction)}，请刷新待办后重试`))
  }

  return Promise.reject(new Error(`当前任务无法进入扫码：${row.sourceLabel || row.businessType}，请刷新待办后重试`))
}
