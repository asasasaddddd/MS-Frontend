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
  }
]

resetScanTestDoubles()
setScanRequestHandler((config) => {
  if (config.url === '/scan/firstcheck/inbox') return firstCheckRows
  if (config.url === '/periodic/scan/inbox') return periodicRows
  if (config.url === '/scan/firstcheck/receive' && config.method === 'POST') return {}
  throw new Error(`unexpected request: ${String(config.url)}`)
})

const controller = new AbortController()
const rows = await scan.listUnifiedScanInbox(controller.signal)

assert.equal(workflowQueryCalls.length, 0)
assert.equal(scanRequestCalls.some((call) => call.url === '/workflow/tasks'), false)
assert.equal(scanRequestCalls.some((call) => call.url === '/scan/business/records'), false)
assert.deepEqual(
  scanRequestCalls.map((call) => call.url).sort(),
  ['/periodic/scan/inbox', '/scan/firstcheck/inbox']
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
    'periodic-send-out-return'
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

const unauthorizedRow = {
  ...rows.find((row) => row.orderId === largeFirstCheckOrderId)!,
  allowedActions: ['SEND_OUT']
}
await assert.rejects(
  scan.submitUnifiedScan(unauthorizedRow, { scanCode: 'FC-1001' }),
  /not authorized|unauthorized|无权|权限/i
)

const largeIdRow = rows.find((row) => row.orderId === largeFirstCheckOrderId)!
await scan.submitUnifiedScan(largeIdRow, { scanCode: 'FC-1001' })
const largeIdSubmit = scanRequestCalls.find((call) => call.url === '/scan/firstcheck/receive')
assert.equal(largeIdSubmit?.data.orderId, largeFirstCheckOrderId)

const scanSource = readFileSync(new URL('../src/api/scan.ts', import.meta.url), 'utf8')
assert.doesNotMatch(scanSource, /queryWorkflowTasks|\/workflow\/tasks/)
assert.doesNotMatch(scanSource, /getPeriodicTask|listBusinessScanRecords\(/)

const scanTypesSource = readFileSync(new URL('../src/types/scan.ts', import.meta.url), 'utf8')
assert.doesNotMatch(scanTypesSource, /orderId\??:\s*number/)
assert.match(scanTypesSource, /orderId:\s*ScanEntityId/)

const scanViewSource = readFileSync(new URL('../src/views/scan/DeviceScanView.vue', import.meta.url), 'utf8')
assert.match(scanViewSource, /listUnifiedScanInbox\(controller\.signal\)/)
assert.match(scanViewSource, /rowsController\?\.abort\(\)/)
