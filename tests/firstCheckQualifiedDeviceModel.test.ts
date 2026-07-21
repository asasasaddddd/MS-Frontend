import assert from 'node:assert/strict'

import {
  applyDeviceCodeReservation,
  calculateQualifiedDeviceValidUntil,
  invalidateDeviceCodeReservation,
  resizeQualifiedDeviceRows
} from '../src/views/firstcheck/firstCheckQualifiedDeviceModel.ts'

const initial = resizeQualifiedDeviceRows([], 2, '2026-07-21', '周期检定', 12)
assert.equal(initial.length, 2)
assert.notEqual(initial[0], initial[1])

initial[0]!.factoryCode = 'SN-001'
initial[0]!.verificationDate = '2026-07-31'
initial[1]!.factoryCode = 'SN-002'
assert.equal(initial[1]!.factoryCode, 'SN-002')
assert.notEqual(initial[0]!.factoryCode, initial[1]!.factoryCode)

const grown = resizeQualifiedDeviceRows(initial, 3, '2026-08-01', '周期检定', 6)
assert.equal(grown.length, 3)
assert.equal(grown[0]!.factoryCode, 'SN-001')
assert.equal(grown[1]!.factoryCode, 'SN-002')
assert.equal(grown[2]!.verificationDate, '2026-08-01')
assert.notEqual(grown[2], grown[1])

const reserved = applyDeviceCodeReservation(grown, ['0501020007', '0501020008', '0501020009'])
assert.deepEqual(reserved.map((row) => row.deviceCode), ['0501020007', '0501020008', '0501020009'])
assert.deepEqual(invalidateDeviceCodeReservation(reserved).map((row) => row.deviceCode), ['', '', ''])

assert.equal(calculateQualifiedDeviceValidUntil('2026-01-31', '周期检定', 1), '2026-02-27')
assert.equal(calculateQualifiedDeviceValidUntil('2026-07-21', '周期检定', 12), '2027-07-20')
assert.equal(calculateQualifiedDeviceValidUntil('2026-07-21', '一次检定', undefined), '')
assert.equal(calculateQualifiedDeviceValidUntil('', '周期检定', 12), '')

