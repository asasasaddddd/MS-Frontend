import assert from 'node:assert/strict'

import {
  canOpenFirstCheckVerify,
  firstCheckVerifierAction,
  resolveFirstCheckVerifierStatus
} from '../src/views/firstcheck/firstCheckVerifierModel.ts'

const waitReceiveOrder = {
  currentNodeCode: 'verifier_verify_assign',
  verificationType: 'self_check',
  scanStatus: 'wait_receive'
}

const selfReceivedOrder = {
  currentNodeCode: 'verifier_verify_assign',
  verificationType: 'self_check',
  scanStatus: 'received'
}

const externalWaitReturnOrder = {
  currentNodeCode: 'verifier_verify_assign',
  verificationType: 'external_commission',
  scanStatus: 'wait_sendout_return'
}

const externalReturnedOrder = {
  currentNodeCode: 'verifier_verify_assign',
  verificationType: 'external_commission',
  scanStatus: 'sendout_returned'
}

assert.deepEqual(resolveFirstCheckVerifierStatus(waitReceiveOrder), {
  statusKey: 'wait_receive',
  statusLabel: '待接收',
  statusColor: 'orange'
})
assert.equal(firstCheckVerifierAction(waitReceiveOrder), 'scan_receive')
assert.equal(canOpenFirstCheckVerify(waitReceiveOrder), false)

assert.deepEqual(resolveFirstCheckVerifierStatus(selfReceivedOrder), {
  statusKey: 'verifier_verify_assign',
  statusLabel: '已接收',
  statusColor: 'orange'
})
assert.equal(firstCheckVerifierAction(selfReceivedOrder), 'verify')
assert.equal(canOpenFirstCheckVerify(selfReceivedOrder), true)

assert.deepEqual(resolveFirstCheckVerifierStatus(externalWaitReturnOrder), {
  statusKey: 'wait_sendout_return',
  statusLabel: '待外委送回',
  statusColor: 'blue'
})
assert.equal(firstCheckVerifierAction(externalWaitReturnOrder), 'scan_sendout_return')
assert.equal(canOpenFirstCheckVerify(externalWaitReturnOrder), false)

assert.deepEqual(resolveFirstCheckVerifierStatus(externalReturnedOrder), {
  statusKey: 'verifier_verify_assign',
  statusLabel: '外委已送回',
  statusColor: 'orange'
})
assert.equal(firstCheckVerifierAction(externalReturnedOrder), 'verify')
assert.equal(canOpenFirstCheckVerify(externalReturnedOrder), true)

assert.equal(
  resolveFirstCheckVerifierStatus({ currentNodeCode: 'verifier_receive', scanStatus: 'received' }).statusKey,
  'unknown'
)
