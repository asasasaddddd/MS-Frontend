import { request } from '@/api/request'
import { getClientRuntime } from '@/platform/pdaClient'
import {
  externalSendOutPeriodic,
  managerTakeBackPeriodic,
  sendOutReturnPeriodic,
  verifierReceivePeriodic
} from '@/api/periodic'
import type {
  ChangeScanInboxItem,
  ChangeScanRequest,
  FirstCheckScanInboxItem,
  FirstCheckScanRequest,
  PeriodicScanInboxItem,
  ScanRecord,
  UnifiedScanInboxItem,
  UnifiedScanSubmitRequest
} from '@/types/scan'
import {
  isUnifiedScanActionAllowed,
  normalizeChangeInboxRow,
  normalizeFirstCheckInboxRow,
  normalizePeriodicInboxRow
} from '@/views/scan/scanModel'

export type {
  ChangeScanAction,
  ChangeScanInboxItem,
  ChangeScanRequest,
  FirstCheckScanAction,
  FirstCheckScanInboxItem,
  FirstCheckScanRequest,
  PeriodicScanAction,
  PeriodicScanInboxItem,
  ScanEntityId,
  ScanRecord,
  UnifiedScanAction,
  UnifiedScanBusinessType,
  UnifiedScanInboxItem,
  UnifiedScanSubmitRequest
} from '@/types/scan'
export { isUnifiedScanActionAllowed }

export function firstCheckScanStatusName(value?: string) {
  const map: Record<string, string> = {
    wait_receive: '\u5f85\u63a5\u6536',
    received: '\u5df2\u63a5\u6536',
    wait_sendout: '\u5f85\u5916\u59d4\u9001\u51fa',
    sent_out: '\u5df2\u5916\u59d4\u9001\u51fa',
    wait_sendout_return: '\u5f85\u5916\u59d4\u9001\u56de',
    sendout_returned: '\u5916\u59d4\u5df2\u9001\u56de',
    wait_take_back: '\u5f85\u53d6\u56de',
    taken_back: '\u5df2\u53d6\u56de'
  }
  return value ? map[value] || '\u672a\u77e5\u72b6\u6001' : '-'
}

export function scanActionName(value?: string) {
  const map: Record<string, string> = {
    receive: '\u63a5\u6536',
    sendout: '\u5916\u59d4\u9001\u51fa',
    'sendout-return': '\u5916\u59d4\u9001\u56de',
    'take-back': '\u53d6\u56de',
    'periodic-verifier-receive': '\u68c0\u5b9a\u5458\u626b\u7801\u63a5\u6536',
    'periodic-external-send-out': '\u5916\u59d4\u9001\u51fa',
    'periodic-send-out-return': '\u5916\u59d4\u9001\u56de',
    'periodic-manager-take-back': '\u7ba1\u7406\u5458\u53d6\u56de',
    'change-verifier-receive': '\u68c0\u5b9a\u5458\u626b\u7801\u63a5\u6536',
    'change-external-send-out': '\u5916\u59d4\u9001\u51fa',
    'change-send-out-return': '\u5916\u59d4\u9001\u56de',
    'change-manager-take-back': '\u7ba1\u7406\u5458\u53d6\u56de',
    'change-scrap-inbound': '\u62a5\u5e9f\u5b9e\u7269\u5165\u5e93',
    'change-transfer-receive': '\u8f6c\u79fb\u63a5\u6536'
  }
  return value ? map[value] || '\u672a\u77e5\u64cd\u4f5c' : '-'
}

export const firstCheckScanActionName = scanActionName

function buildScanRequest(input: FirstCheckScanRequest): FirstCheckScanRequest {
  const scanCode = input.scanCode.trim()
  const client = getClientRuntime()
  return {
    ...input,
    scanCode,
    scanContent: input.scanContent || scanCode,
    scanLocation: input.scanLocation || '\u73b0\u573a\u626b\u7801',
    clientType: input.clientType || client.clientType,
    terminalCode: input.terminalCode || client.terminalCode
  }
}

export function listFirstCheckScanInbox(signal?: AbortSignal) {
  return request<FirstCheckScanInboxItem[]>({
    url: '/scan/firstcheck/inbox',
    method: 'GET',
    ...(signal ? { signal } : {})
  })
}

export function listPeriodicScanInbox(signal?: AbortSignal) {
  return request<PeriodicScanInboxItem[]>({
    url: '/periodic/scan/inbox',
    method: 'GET',
    ...(signal ? { signal } : {})
  })
}

export function listChangeScanInbox(signal?: AbortSignal) {
  return request<ChangeScanInboxItem[]>({
    url: '/change/scan-inbox',
    method: 'GET',
    ...(signal ? { signal } : {})
  })
}

export async function listUnifiedScanInbox(signal?: AbortSignal) {
  const [firstCheckResult, periodicResult, changeResult] = await Promise.allSettled([
    listFirstCheckScanInbox(signal),
    listPeriodicScanInbox(signal),
    listChangeScanInbox(signal)
  ])
  if (
    firstCheckResult.status === 'rejected'
    && periodicResult.status === 'rejected'
    && changeResult.status === 'rejected'
  ) {
    throw firstCheckResult.reason
  }
  const rows: UnifiedScanInboxItem[] = []
  if (firstCheckResult.status === 'fulfilled') {
    rows.push(...firstCheckResult.value.flatMap((row) => {
      const normalized = normalizeFirstCheckInboxRow(row, firstCheckScanStatusName)
      return normalized ? [normalized] : []
    }))
  }
  if (periodicResult.status === 'fulfilled') {
    rows.push(...periodicResult.value.flatMap((row) => {
      const normalized = normalizePeriodicInboxRow(row)
      return normalized ? [normalized] : []
    }))
  }
  if (changeResult.status === 'fulfilled') {
    rows.push(...changeResult.value.flatMap((row) => {
      const normalized = normalizeChangeInboxRow(row)
      return normalized ? [normalized] : []
    }))
  }
  const uniqueRows = new Map<string, UnifiedScanInboxItem>()
  rows.forEach((row) => uniqueRows.set(row.id, row))
  return Array.from(uniqueRows.values())
}

export function sendoutFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({ url: '/scan/firstcheck/sendout', method: 'POST', data: buildScanRequest(data) })
}

export function receiveFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({ url: '/scan/firstcheck/receive', method: 'POST', data: buildScanRequest(data) })
}

export function returnFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({ url: '/scan/firstcheck/sendout-return', method: 'POST', data: buildScanRequest(data) })
}

export function takeBackFirstCheckDevice(data: FirstCheckScanRequest) {
  return request<ScanRecord>({ url: '/scan/firstcheck/take-back', method: 'POST', data: buildScanRequest(data) })
}

function buildChangeScanRequest(input: ChangeScanRequest): ChangeScanRequest {
  const scanCode = input.scanCode.trim()
  return {
    ...input,
    scanCode,
    scanContent: input.scanContent || scanCode,
    scanLocation: input.scanLocation || '\u73b0\u573a\u626b\u7801'
  }
}

export function verifierReceiveChangeDevice(data: ChangeScanRequest) {
  return request<void>({ url: '/change/verifier-receive', method: 'POST', data: buildChangeScanRequest(data) })
}

export function externalSendOutChangeDevice(data: ChangeScanRequest) {
  return request<void>({ url: '/change/external-send-out', method: 'POST', data: buildChangeScanRequest(data) })
}

export function sendOutReturnChangeDevice(data: ChangeScanRequest) {
  return request<void>({ url: '/change/send-out-return', method: 'POST', data: buildChangeScanRequest(data) })
}

export function managerTakeBackChangeDevice(data: ChangeScanRequest) {
  return request<void>({ url: '/change/manager-take-back', method: 'POST', data: buildChangeScanRequest(data) })
}

export function scrapInboundChangeDevice(data: ChangeScanRequest) {
  return request<void>({ url: '/change/scrap-inbound', method: 'POST', data: buildChangeScanRequest(data) })
}

export function transferReceiveChangeDevice(data: ChangeScanRequest) {
  return request<void>({ url: '/change/transfer-receive', method: 'POST', data: buildChangeScanRequest(data) })
}

export function submitFirstCheckScan(action: string, data: FirstCheckScanRequest) {
  if (action === 'receive') return receiveFirstCheckDevice(data)
  if (action === 'sendout') return sendoutFirstCheckDevice(data)
  if (action === 'sendout-return') return returnFirstCheckDevice(data)
  if (action === 'take-back') return takeBackFirstCheckDevice(data)
  return Promise.reject(new Error(`Unsupported first-check scan action: ${action}`))
}

export function submitUnifiedScan(row: UnifiedScanInboxItem, payload: UnifiedScanSubmitRequest) {
  if (!isUnifiedScanActionAllowed(row)) {
    return Promise.reject(new Error(`Physical action is not authorized: ${row.scanAction}`))
  }
  if (row.businessType === 'firstcheck') {
    if (!row.orderId) return Promise.reject(new Error('Missing first-check order ID'))
    return submitFirstCheckScan(row.scanAction, {
      orderId: row.orderId,
      scanCode: payload.scanCode,
      scanContent: payload.scanContent,
      opinion: payload.opinion
    })
  }
  if (row.businessType === 'periodic') {
    if (!row.taskId) return Promise.reject(new Error('Missing periodic task ID'))
    const requestPayload = {
      taskId: row.taskId,
      scanCode: payload.scanCode,
      scanContent: payload.scanContent,
      opinion: payload.opinion
    }
    if (row.scanAction === 'periodic-verifier-receive') return verifierReceivePeriodic(requestPayload)
    if (row.scanAction === 'periodic-external-send-out') return externalSendOutPeriodic(requestPayload)
    if (row.scanAction === 'periodic-send-out-return') return sendOutReturnPeriodic(requestPayload)
    if (row.scanAction === 'periodic-manager-take-back') return managerTakeBackPeriodic(requestPayload)
    return Promise.reject(new Error(`Unsupported periodic scan action: ${row.scanAction}`))
  }
  if (row.businessType === 'change') {
    if (row.orderId === undefined || row.orderId === null) {
      return Promise.reject(new Error('Missing change order ID'))
    }
    if (row.itemId === undefined || row.itemId === null) {
      return Promise.reject(new Error('Missing change item ID'))
    }
    if (row.deviceId === undefined || row.deviceId === null) {
      return Promise.reject(new Error('Missing change device ID'))
    }
    const requestPayload: ChangeScanRequest = {
      orderId: row.orderId,
      itemId: row.itemId,
      deviceId: row.deviceId,
      taskId: row.taskId,
      rowVersion: row.rowVersion,
      scanCode: payload.scanCode,
      scanContent: payload.scanContent,
      opinion: payload.opinion
    }
    if (row.scanAction === 'change-verifier-receive') return verifierReceiveChangeDevice(requestPayload)
    if (row.scanAction === 'change-external-send-out') return externalSendOutChangeDevice(requestPayload)
    if (row.scanAction === 'change-send-out-return') return sendOutReturnChangeDevice(requestPayload)
    if (row.scanAction === 'change-manager-take-back') return managerTakeBackChangeDevice(requestPayload)
    if (row.scanAction === 'change-scrap-inbound') return scrapInboundChangeDevice(requestPayload)
    if (row.scanAction === 'change-transfer-receive') return transferReceiveChangeDevice(requestPayload)
    return Promise.reject(new Error(`Unsupported change scan action: ${row.scanAction}`))
  }
  return Promise.reject(new Error(`Unsupported scan business type: ${row.businessType}`))
}
