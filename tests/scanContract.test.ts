import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'

import {
  resetScanTestDoubles,
  scanRequestCalls,
  setScanRequestHandler,
  workflowQueryCalls
} from './scanTestDoubles.ts'

register('./scanLoader.mjs', import.meta.url)
const scan = await import('../src/api/scan.ts')
const largeFirstCheckOrderId = '9007199254740993123'

const firstCheckRows = [
  {
    orderId: largeFirstCheckOrderId,
    orderNo: 'FC-1001',
    scanAction: 'receive',
    scanStatus: 'wait_receive',
    allowedActions: ['RECEIVE'],
    scanned: false
  },
  {
    orderId: 1002,
    orderNo: 'FC-1002',
    scanAction: 'sendout',
    scanStatus: 'wait_sendout',
    allowedActions: ['SEND_OUT'],
    scanned: false
  },
  {
    orderId: 1003,
    orderNo: 'FC-1003',
    scanAction: 'sendout-return',
    scanStatus: 'wait_sendout_return',
    allowedActions: ['SEND_OUT_RETURN'],
    scanned: false
  },
  {
    orderId: 1004,
    orderNo: 'FC-1004',
    scanAction: 'take-back',
    scanStatus: 'wait_take_back',
    allowedActions: ['TAKE_BACK'],
    scanned: false
  },
  {
    orderId: 1005,
    orderNo: 'FC-1005',
    scanAction: 'receive',
    scanStatus: 'wait_receive',
    scanned: false
  },
  {
    orderId: 1006,
    orderNo: 'FC-1006',
    scanAction: 'take-back',
    scanStatus: 'taken_back',
    allowedActions: [],
    scanned: true,
    scanTime: '2026-07-26T09:30:00'
  },
  {
    orderId: 1007,
    orderNo: 'FC-1007',
    scanAction: 'receive',
    scanStatus: 'wait_receive',
    allowedActions: ['receive'],
    scanned: false
  },
  {
    orderId: 1008,
    orderNo: 'FC-1008',
    scanAction: 'receive',
    scanStatus: 'wait_receive',
    allowedActions: [' RECEIVE '],
    scanned: false
  },
  {
    orderId: 1009,
    orderNo: 'FC-1009',
    scanAction: 'receive',
    scanStatus: 'received',
    allowedActions: [' receive ', 'RECEIVE'],
    scanned: true,
    scanTime: '2026-07-26T09:45:00'
  }
]

const periodicRows = [
  {
    taskId: '2001',
    planId: '1000',
    taskNo: 'ZJ-2001',
    taskType: 'periodic',
    scanAction: 'periodic-verifier-receive',
    scanScene: 'periodic_receive',
    scanStatus: 'wait_verifier_receive',
    allowedActions: ['RECEIVE'],
    scanned: false
  },
  {
    taskId: '2002',
    planId: '1000',
    taskNo: 'ZJ-2002',
    taskType: 'periodic',
    scanAction: 'periodic-external-send-out',
    scanScene: 'periodic_send_out',
    scanStatus: 'wait_external_receive',
    allowedActions: ['SEND_OUT'],
    scanned: false
  },
  {
    taskId: '2003',
    planId: '1000',
    taskNo: 'ZJ-2003',
    taskType: 'periodic',
    scanAction: 'periodic-send-out-return',
    scanScene: 'periodic_send_out_return',
    scanStatus: 'wait_sendout_return_receive',
    allowedActions: ['SEND_OUT_RETURN'],
    scanned: false
  },
  {
    taskId: '2004',
    planId: '1000',
    taskNo: 'ZJ-2004',
    taskType: 'periodic',
    scanAction: 'periodic-send-out-return',
    scanScene: 'periodic_send_out_return',
    scanStatus: 'wait_sendout_return_receive',
    allowedActions: [],
    scanned: false
  },
  {
    taskId: '2005',
    planId: '1000',
    taskNo: 'ZJ-2005',
    taskType: 'periodic',
    sourceType: 'periodic',
    scanAction: 'periodic-verifier-receive',
    scanScene: 'periodic_receive',
    scanStatus: 'verifier_received',
    allowedActions: [],
    scanned: true,
    scanTime: '2026-07-26T10:30:00'
  },
  {
    taskId: '2006',
    planId: '1000',
    taskNo: 'ZJ-2006',
    taskType: 'periodic',
    scanAction: 'periodic-manager-take-back',
    scanScene: 'periodic_take_back',
    scanStatus: 'wait_manager_take_back',
    allowedActions: ['TAKE_BACK'],
    scanned: false
  },
  {
    taskId: '2007',
    planId: '1001',
    taskNo: 'YQ-2007',
    taskType: 'before_use',
    sourceType: 'BEFORE_USE',
    scanAction: 'periodic-verifier-receive',
    scanScene: 'periodic_receive',
    scanStatus: 'wait_verifier_receive',
    allowedActions: ['RECEIVE'],
    scanned: false
  },
  {
    taskId: '2008',
    planId: '1001',
    taskNo: 'YQ-2008',
    taskType: 'before_use',
    sourceType: 'BEFORE_USE',
    scanAction: 'periodic-external-send-out',
    scanScene: 'periodic_send_out',
    scanStatus: 'wait_external_receive',
    allowedActions: ['SEND_OUT'],
    scanned: false
  },
  {
    taskId: '2009',
    planId: '1001',
    taskNo: 'YQ-2009',
    sourceType: 'BEFORE_USE',
    scanAction: 'periodic-manager-take-back',
    scanScene: 'periodic_take_back',
    scanStatus: 'wait_manager_take_back',
    allowedActions: ['TAKE_BACK'],
    scanned: false
  }
]

const changeRows = [
  {
    orderId: '3001',
    itemId: '3101',
    orderNo: 'BG-3001',
    changeType: 'category',
    scanStatus: 'pending',
    scanAction: 'change-verifier-receive',
    scanScene: 'change_receive',
    scanCode: 'JL-3001',
    deviceId: '3201',
    deviceCode: 'JL-3001',
    deviceName: '\u72b6\u6001\u53d8\u66f4\u8bbe\u59071',
    allowedActions: ['RECEIVE'],
    scanned: false
  },
  {
    orderId: '3002',
    itemId: '3102',
    orderNo: 'BG-3002',
    changeType: 'cycle',
    currentNodeName: '\u5f85\u5916\u59d4\u9001\u51fa',
    scanStatus: 'pending',
    scanAction: 'change-external-send-out',
    scanScene: 'change_send_out',
    scanCode: 'JL-3002',
    deviceId: '3202',
    deviceCode: 'JL-3002',
    deviceName: '\u72b6\u6001\u53d8\u66f4\u8bbe\u59072',
    allowedActions: ['SEND_OUT'],
    scanned: false
  },
  {
    orderId: '3003',
    itemId: '3103',
    orderNo: 'BG-3003',
    changeType: 'category',
    currentNodeName: '\u5f85\u5916\u59d4\u9001\u56de',
    scanStatus: 'pending',
    scanAction: 'change-send-out-return',
    scanScene: 'change_send_out_return',
    scanCode: 'JL-3003',
    deviceId: '3203',
    deviceCode: 'JL-3003',
    deviceName: '\u72b6\u6001\u53d8\u66f4\u8bbe\u59073',
    allowedActions: ['SEND_OUT_RETURN'],
    scanned: false
  },
  {
    orderId: '3004',
    itemId: '3104',
    orderNo: 'BG-3004',
    changeType: 'cycle',
    currentNodeName: '\u5f85\u7ba1\u7406\u5458\u53d6\u56de',
    scanStatus: 'pending',
    scanAction: 'change-manager-take-back',
    scanScene: 'change_take_back',
    scanCode: 'JL-3004',
    deviceId: '3204',
    deviceCode: 'JL-3004',
    deviceName: '\u72b6\u6001\u53d8\u66f4\u8bbe\u59074',
    allowedActions: ['TAKE_BACK'],
    scanned: false
  },
  {
    orderId: '3005',
    itemId: '3105',
    taskId: '3305',
    rowVersion: '5',
    orderNo: 'BG-3005',
    changeType: 'transfer',
    currentNodeName: '\u5f85\u63a5\u6536\u90e8\u95e8\u7ba1\u7406\u5458\u626b\u7801',
    scanStatus: 'pending',
    scanAction: 'change-transfer-receive',
    scanScene: 'change_transfer_receive',
    scanCode: 'JL-3005',
    deviceId: '3205',
    deviceCode: 'JL-3005',
    deviceName: '\u72b6\u6001\u53d8\u66f4\u8bbe\u59075',
    allowedActions: ['TRANSFER_RECEIVE'],
    scanned: false
  },
  {
    orderId: '3006',
    itemId: '3106',
    orderNo: 'BG-3006',
    changeType: 'scrap',
    currentNodeName: '\u5f85\u62a5\u5e9f\u5b9e\u7269\u5165\u5e93',
    scanStatus: 'pending',
    scanAction: 'change-scrap-inbound',
    scanScene: 'change_scrap_inbound',
    scanCode: 'JL-3006',
    deviceId: '3206',
    deviceCode: 'JL-3006',
    deviceName: '\u72b6\u6001\u53d8\u66f4\u8bbe\u59076',
    allowedActions: ['SCRAP_INBOUND'],
    scanned: false
  }
]

resetScanTestDoubles()
setScanRequestHandler((config) => {
  if (config.url === '/scan/firstcheck/inbox') return firstCheckRows
  if (config.url === '/periodic/scan/inbox') return periodicRows
  if (config.url === '/change/scan-inbox') return changeRows
  if (config.url === '/scan/firstcheck/receive' && config.method === 'POST') return {}
  if (config.url === '/periodic/manager-take-back' && config.method === 'POST') return undefined
  if (String(config.url).startsWith('/change/') && config.method === 'POST') return undefined
  throw new Error(`unexpected request: ${String(config.url)}`)
})

const controller = new AbortController()
const rows = await scan.listUnifiedScanInbox(controller.signal)

assert.equal(workflowQueryCalls.length, 0)
assert.equal(scanRequestCalls.some((call) => call.url === '/workflow/tasks'), false)
assert.equal(scanRequestCalls.some((call) => call.url === '/scan/business/records'), false)
assert.deepEqual(
  scanRequestCalls.map((call) => call.url).sort(),
  ['/change/scan-inbox', '/periodic/scan/inbox', '/scan/firstcheck/inbox']
)
assert.equal(scanRequestCalls.every((call) => call.signal === controller.signal), true)

assert.deepEqual(
  rows.filter((row) => !row.scanned).map((row) => row.scanAction),
  [
    'receive',
    'sendout',
    'sendout-return',
    'take-back',
    'periodic-verifier-receive',
    'periodic-external-send-out',
    'periodic-send-out-return',
    'periodic-manager-take-back',
    'periodic-verifier-receive',
    'periodic-external-send-out',
    'periodic-manager-take-back',
    'change-verifier-receive',
    'change-external-send-out',
    'change-send-out-return',
    'change-manager-take-back',
    'change-transfer-receive',
    'change-scrap-inbound'
  ]
)
assert.equal(rows.some((row) => row.orderId === 1005), false)
assert.equal(rows.some((row) => row.orderId === 1007), false)
assert.equal(rows.some((row) => row.orderId === 1008), false)
assert.equal(rows.some((row) => row.taskId === '2004'), false)

const firstCheckHistory = rows.find((row) => row.orderId === 1006)
assert.equal(firstCheckHistory?.scanned, true)
assert.deepEqual(firstCheckHistory?.allowedActions, [])
assert.equal(firstCheckHistory?.scanTime, '2026-07-26T09:30:00')

const malformedActionHistory = rows.find((row) => row.orderId === 1009)
assert.equal(malformedActionHistory?.scanned, true)
assert.deepEqual(malformedActionHistory?.allowedActions, [' receive ', 'RECEIVE'])

const periodicHistory = rows.find((row) => row.taskId === '2005')
assert.equal(periodicHistory?.scanned, true)
assert.deepEqual(periodicHistory?.allowedActions, [])
assert.equal(periodicHistory?.scanTime, '2026-07-26T10:30:00')
assert.equal(periodicHistory?.sourceType, 'PERIODIC')

const beforeUseRows = rows.filter((row) => row.sourceType === 'BEFORE_USE')
assert.deepEqual(beforeUseRows.map((row) => row.taskId), ['2007', '2008', '2009'])
assert.equal(beforeUseRows.every((row) => row.sourceLabel === '用前检定'), true)
assert.equal(beforeUseRows.some((row) => row.scanAction === 'periodic-manager-take-back'), true)
assert.equal(scan.scanActionName('periodic-external-send-out'), '外委送出')

const periodicTakeBack = rows.find((row) => row.taskId === '2006')!
assert.equal(periodicTakeBack.scanAction, 'periodic-manager-take-back')
assert.equal(periodicTakeBack.scanScene, 'periodic_take_back')
await scan.submitUnifiedScan(periodicTakeBack, { scanCode: 'JL-2006', opinion: 'taken back' })
const periodicTakeBackSubmit = scanRequestCalls.find(
  (call) => call.url === '/periodic/manager-take-back'
)
assert.equal(periodicTakeBackSubmit?.data.taskId, '2006')
assert.equal(periodicTakeBackSubmit?.data.scanCode, 'JL-2006')
assert.equal(periodicTakeBackSubmit?.data.scanContent, 'JL-2006')

const normalizedChangeRows = rows.filter((row) => row.businessType === 'change')
assert.deepEqual(
  normalizedChangeRows.map((row) => row.scanAction),
  [
    'change-verifier-receive',
    'change-external-send-out',
    'change-send-out-return',
    'change-manager-take-back',
    'change-transfer-receive',
    'change-scrap-inbound'
  ]
)
assert.equal(normalizedChangeRows.every((row) => row.sourceType === 'CHANGE'), true)
assert.equal(normalizedChangeRows.every((row) => row.sourceLabel === '\u72b6\u6001\u53d8\u66f4'), true)
assert.equal(normalizedChangeRows[0]?.currentNodeName, '\u5f85\u68c0\u5b9a\u5458\u63a5\u6536')
assert.deepEqual(
  normalizedChangeRows.map((row) => [row.orderId, row.itemId, row.deviceId]),
  changeRows.map((row) => [row.orderId, row.itemId, row.deviceId])
)

for (const row of normalizedChangeRows) {
  await scan.submitUnifiedScan(row, {
    scanCode: ` ${row.deviceCode} `,
    opinion: 'physical handover'
  })
}
const changeSubmitCalls = scanRequestCalls.filter(
  (call) => String(call.url).startsWith('/change/') && call.method === 'POST'
)
assert.deepEqual(
  changeSubmitCalls.map((call) => call.url),
  [
    '/change/verifier-receive',
    '/change/external-send-out',
    '/change/send-out-return',
    '/change/manager-take-back',
    '/change/transfer-receive',
    '/change/scrap-inbound'
  ]
)
assert.deepEqual(
  changeSubmitCalls.map((call) => [call.data.orderId, call.data.itemId, call.data.deviceId]),
  changeRows.map((row) => [row.orderId, row.itemId, row.deviceId])
)
assert.equal(changeSubmitCalls.every((call) => call.data.scanCode === call.data.scanCode.trim()), true)
const transferReceiveCall = changeSubmitCalls.find((call) => call.url === '/change/transfer-receive')
assert.deepEqual(
  [transferReceiveCall?.data.taskId, transferReceiveCall?.data.rowVersion],
  ['3305', '5']
)
assert.equal(scan.scanActionName('change-transfer-receive'), '转移接收')
assert.equal(scan.scanActionName('change-scrap-inbound'), '报废实物入库')

const unauthorizedRow = {
  ...rows.find((row) => row.orderId === largeFirstCheckOrderId)!,
  allowedActions: ['SEND_OUT']
}
const callsBeforeUnauthorizedSubmit = scanRequestCalls.length
await assert.rejects(
  scan.submitUnifiedScan(unauthorizedRow, { scanCode: 'FC-1001' }),
  /not authorized|unauthorized|无权|权限/i
)
assert.equal(scanRequestCalls.length, callsBeforeUnauthorizedSubmit)

const largeIdRow = rows.find((row) => row.orderId === largeFirstCheckOrderId)!
await scan.submitUnifiedScan(largeIdRow, { scanCode: ' FC-1001 ' })
const largeIdSubmit = scanRequestCalls.find((call) => call.url === '/scan/firstcheck/receive')
assert.equal(largeIdSubmit?.data.orderId, largeFirstCheckOrderId)
assert.equal(largeIdSubmit?.data.scanCode, 'FC-1001')

const inboxFixtures = new Map([
  ['/scan/firstcheck/inbox', firstCheckRows.slice(0, 1)],
  ['/periodic/scan/inbox', periodicRows.slice(0, 1)],
  ['/change/scan-inbox', changeRows.slice(0, 1)]
])
const businessTypeByInbox = new Map([
  ['/scan/firstcheck/inbox', 'firstcheck'],
  ['/periodic/scan/inbox', 'periodic'],
  ['/change/scan-inbox', 'change']
])
for (const failedUrl of inboxFixtures.keys()) {
  resetScanTestDoubles()
  setScanRequestHandler((config) => {
    if (config.url === failedUrl) throw new Error(`inbox unavailable: ${failedUrl}`)
    return inboxFixtures.get(String(config.url)) || []
  })
  const remainingRows = await scan.listUnifiedScanInbox()
  assert.equal(remainingRows.some((row) => row.businessType === businessTypeByInbox.get(failedUrl)), false)
  assert.equal(new Set(remainingRows.map((row) => row.businessType)).size, 2)
}

const scanSource = readFileSync(new URL('../src/api/scan.ts', import.meta.url), 'utf8')
assert.doesNotMatch(scanSource, /queryWorkflowTasks|\/workflow\/tasks/)
assert.doesNotMatch(scanSource, /getPeriodicTask|listBusinessScanRecords\(/)
assert.match(scanSource, /row\.scanAction === 'periodic-manager-take-back'/)

const scanTypesSource = readFileSync(new URL('../src/types/scan.ts', import.meta.url), 'utf8')
assert.doesNotMatch(scanTypesSource, /orderId\??:\s*number/)
assert.match(scanTypesSource, /orderId:\s*ScanEntityId/)

const scanViewSource = readFileSync(new URL('../src/views/scan/DeviceScanView.vue', import.meta.url), 'utf8')
assert.match(scanViewSource, /listUnifiedScanInbox\(controller\.signal\)/)
assert.match(scanViewSource, /rowsController\?\.abort\(\)/)
assert.match(scanViewSource, /routeRequestKey/)
assert.match(scanViewSource, /watch\(\s*\[workflowIdentity, routeRequestKey\]/)
assert.match(scanViewSource, /onActivated\(/)
assert.doesNotMatch(scanViewSource, /VERIFIER_SELF|VERIFIER_EXTERNAL|MEASURE_ADMIN|EXTERNAL_OPERATOR/)
