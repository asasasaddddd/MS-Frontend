import assert from 'node:assert/strict'

import {
  matchesScanRouteList,
  shouldFocusScanRoute
} from '../src/views/scan/scanRouteModel.ts'

const firstCheckSendout = {
  businessType: 'firstcheck',
  scanAction: 'sendout',
  orderId: '1001'
}
const periodicSendout = {
  businessType: 'periodic',
  scanAction: 'periodic-external-send-out',
  taskId: '2001'
}

assert.equal(matchesScanRouteList(firstCheckSendout, { module: 'firstcheck', action: 'sendout' }), true)
assert.equal(matchesScanRouteList(periodicSendout, { module: 'firstcheck', action: 'sendout' }), false)
assert.equal(matchesScanRouteList(firstCheckSendout, { module: 'firstcheck', action: 'receive' }), false)
assert.equal(shouldFocusScanRoute({ module: 'firstcheck', action: 'sendout', view: 'list' }), false)
assert.equal(shouldFocusScanRoute({ module: 'firstcheck', action: 'sendout' }), false)
assert.equal(shouldFocusScanRoute({ module: 'firstcheck', action: 'sendout', orderId: '1001' }), true)
assert.equal(shouldFocusScanRoute({ module: 'periodic', taskId: '2001' }), true)
