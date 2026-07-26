import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { register } from 'node:module'

import {
  resetScanTestDoubles,
  scanRequestCalls,
  setPeriodicHistory,
  setPeriodicTasks,
  setScanRequestHandler
} from './scanTestDoubles.ts'

register('./scanLoader.mjs', import.meta.url)
const scan = await import('../src/api/scan.ts')

assert.equal(typeof scan.listBusinessScanRecords, 'function')
assert.equal(typeof scan.buildPeriodicScanRecordQuery, 'function')
assert.equal(typeof scan.resolvePeriodicScanAction, 'function')

const waitReturnTask = {
  id: '2073579908903317505',
  planId: '2073579908903317500',
  taskNo: 'ZJ2026070001',
  deviceCode: 'JL20240000104',
  deviceName: '压力变送器',
  currentNode: 'send_out',
  currentNodeName: '外委送出',
  physicalStatus: 'wait_sendout_return_receive',
  taskStatus: 'wait_scan',
  taskType: 'periodic'
}

assert.equal(scan.resolvePeriodicScanAction(waitReturnTask), 'periodic-send-out-return')
assert.equal(
  scan.resolvePeriodicScanAction({ ...waitReturnTask, physicalStatus: 'wait_external_receive' }),
  'periodic-external-send-out'
)
assert.equal(
  scan.resolvePeriodicScanAction({
    ...waitReturnTask,
    currentNode: 'plan_confirm',
    taskStatus: 'pending',
    physicalStatus: 'wait_verifier_receive'
  }),
  'periodic-verifier-receive'
)
assert.equal(
  scan.resolvePeriodicScanAction({
    ...waitReturnTask,
    currentNode: 'plan_confirm',
    taskStatus: 'wait_scan',
    physicalStatus: 'wait_verifier_receive'
  }),
  undefined
)
assert.equal(
  scan.resolvePeriodicScanAction({
    ...waitReturnTask,
    currentNode: 'transfer_verifier',
    taskStatus: 'pending',
    physicalStatus: 'wait_verifier_receive'
  }),
  undefined
)

const dualEntryTask = {
  ...waitReturnTask,
  currentNode: 'plan_confirm',
  currentNodeName: '待实物交接',
  taskStatus: 'pending',
  physicalStatus: 'wait_verifier_receive'
}

resetScanTestDoubles()
setPeriodicTasks([dualEntryTask])
setScanRequestHandler(() => [])
const receiveRows = await scan.listUnifiedScanInbox(['periodic-verifier-receive'])
assert.equal(receiveRows.length, 1)
assert.equal(receiveRows[0]?.currentNodeName, '待扫码接收')

assert.deepEqual(scan.buildPeriodicScanRecordQuery(waitReturnTask, 'periodic-send-out-return'), {
  businessType: 'periodic',
  businessId: '2073579908903317500',
  businessItemId: '2073579908903317505',
  scanScene: 'periodic_send_out_return'
})
assert.equal(
  scan.buildPeriodicScanRecordQuery(waitReturnTask, 'periodic-verifier-receive')?.scanScene,
  'periodic_receive'
)
assert.equal(
  scan.buildPeriodicScanRecordQuery(waitReturnTask, 'periodic-external-send-out')?.scanScene,
  'periodic_send_out'
)
assert.equal(
  scan.buildPeriodicScanRecordQuery({ ...waitReturnTask, taskType: 'before_use' }, 'periodic-verifier-receive')
    ?.businessType,
  'before_use'
)

resetScanTestDoubles()
setScanRequestHandler(() => [])
await scan.listBusinessScanRecords({
  businessType: 'periodic',
  businessId: '2073579908903317500',
  businessItemId: '2073579908903317505',
  scanScene: 'periodic_send_out_return'
})
assert.deepEqual(scanRequestCalls[0], {
  url: '/scan/business/records',
  method: 'GET',
  params: {
    businessType: 'periodic',
    businessId: '2073579908903317500',
    businessItemId: '2073579908903317505',
    scanScene: 'periodic_send_out_return'
  }
})

const scannedHistoryTask = {
  ...waitReturnTask,
  id: '2073579908903317506',
  taskNo: 'ZJ2026070002',
  deviceCode: 'JL20240000105',
  currentNode: 'verifier_fill_info',
  currentNodeName: '外委检定员填写检定信息',
  physicalStatus: 'sendout_return_received',
  taskStatus: 'wait_verify'
}

resetScanTestDoubles()
setPeriodicTasks([waitReturnTask])
setPeriodicHistory([waitReturnTask, scannedHistoryTask])
setScanRequestHandler((config) => {
  if (config.url === '/scan/firstcheck/inbox') return []
  if (
    config.url === '/scan/business/records' &&
    config.params?.businessItemId === scannedHistoryTask.id &&
    config.params?.scanScene === 'periodic_send_out_return'
  ) {
    return [
      {
        scanRecordId: '2073579908903317599',
        businessType: 'periodic',
        businessId: scannedHistoryTask.planId,
        businessItemId: scannedHistoryTask.id,
        scanCode: scannedHistoryTask.deviceCode,
        deviceCode: scannedHistoryTask.deviceCode,
        scanScene: 'periodic_send_out_return',
        operatorId: 'U00108405',
        operatorName: '外委检定员',
        scanTime: '2026-07-13T10:30:00'
      }
    ]
  }
  return []
})

const rows = await scan.listUnifiedScanInbox(['periodic-send-out-return'])
const pendingReturn = rows.find((row) => row.taskId === waitReturnTask.id && !row.scanned)
const restoredReturn = rows.find((row) => row.taskId === scannedHistoryTask.id && row.scanned)

assert.equal(pendingReturn?.scanAction, 'periodic-send-out-return')
assert.equal(pendingReturn?.currentNodeName, '外委送回')
assert.equal(restoredReturn?.scanAction, 'periodic-send-out-return')
assert.equal(restoredReturn?.currentNodeName, '已扫码')
assert.equal(restoredReturn?.scanTime, '2026-07-13T10:30:00')

const recordCalls = scanRequestCalls.filter((call) => call.url === '/scan/business/records')
assert.equal(recordCalls.length, 2)
assert.deepEqual(
  recordCalls.map((call) => call.params),
  [waitReturnTask, scannedHistoryTask].map((task) => ({
    businessType: 'periodic',
    businessId: task.planId,
    businessItemId: task.id,
    scanScene: 'periodic_send_out_return'
  }))
)

resetScanTestDoubles()
setScanRequestHandler((config) => {
  if (config.url === '/scan/firstcheck/inbox') {
    return [
      {
        orderId: 1001,
        orderNo: 'FC2026070001',
        scanAction: 'receive',
        scanStatus: 'received',
        scanned: true,
        scanTime: '2026-07-13T09:00:00'
      }
    ]
  }
  return []
})

const firstCheckRows = await scan.listUnifiedScanInbox(['receive'])
assert.equal(firstCheckRows.length, 1)
assert.equal(firstCheckRows[0]?.businessType, 'firstcheck')
assert.equal(firstCheckRows[0]?.scanned, true)
assert.equal(firstCheckRows[0]?.currentNodeName, '已接收')
assert.equal(scanRequestCalls.some((call) => call.url === '/scan/business/records'), false)

assert.equal(scan.firstCheckScanStatusName('unknown_status'), '未知状态')
assert.equal(scan.scanActionName('unknown_action'), '未知操作')

const scanViewSource = readFileSync(new URL('../src/views/scan/DeviceScanView.vue', import.meta.url), 'utf8')
assert.doesNotMatch(scanViewSource, /recentScannedRows/)
assert.match(scanViewSource, /listUnifiedScanInbox\(roleConfig\.value\.actions, controller\.signal\)/)
assert.match(scanViewSource, /rowsController\?\.abort\(\)/)
assert.match(scanViewSource, /loadId !== rowsLoadId \|\| controller\.signal\.aborted/)
assert.match(scanViewSource, /matchesScanRouteList/)
assert.match(scanViewSource, /shouldFocusScanRoute/)
