import assert from 'node:assert/strict'

import {
  deviceLedgerDataColumns,
  deviceCategoryText,
  deviceStatusText,
  formatCycle,
  isDeviceOverdue,
  mapDeviceLedgerRow,
  matchesDeviceStatus,
  normalizeDeviceStatus,
  verificationMethodText
} from '../src/views/device/deviceLedgerModel.ts'
import type { DeviceVO } from '../src/types/device.ts'

const device: DeviceVO = {
  id: '2070143016618696705',
  deviceCode: 'NEW-123',
  deviceName: '123',
  modelSpec: '',
  factoryCode: 'SN-001',
  manufacturer: '未知',
  deptName: '质检部',
  manageCategory: 'A',
  deviceStatus: 'in_use',
  verificationMethod: 'self',
  verificationCycleMonth: 12,
  lastVerificationDate: '2026-06-25',
  nextVerificationDate: '2026-06-30',
  validUntil: '2026-06-30',
  isMandatory: 0
}

assert.deepEqual(
  deviceLedgerDataColumns.map((column) => column.key),
  [
    'deviceCode',
    'deviceName',
    'categoryText',
    'modelSpec',
    'factoryCode',
    'statusText',
    'cycleText',
    'validUntil',
    'lastVerificationDate',
    'deptName',
    'manufacturer',
    'methodText'
  ],
  '设备台账数据列必须由共享模型统一维护'
)

assert.equal(deviceCategoryText('A'), 'A类')
assert.equal(deviceCategoryText('B类'), 'B类')
assert.equal(deviceStatusText('in_use'), '在用')
assert.equal(deviceStatusText('sealed'), '封存')
assert.equal(normalizeDeviceStatus('在用'), 'in_use')
assert.equal(normalizeDeviceStatus('repairing'), 'repair')
assert.equal(matchesDeviceStatus('在用', 'in_use'), true)
assert.equal(matchesDeviceStatus('封存', 'in_use'), false)
assert.equal(matchesDeviceStatus('在用', 'all'), true)
assert.equal(verificationMethodText('self'), '自检')
assert.equal(verificationMethodText('external_commission'), '外委')
assert.equal(formatCycle(12), '12个月')
assert.equal(isDeviceOverdue({ ...device, validUntil: '2026-06-30' }, '2026-07-01'), true)
assert.equal(isDeviceOverdue({ ...device, nextVerificationDate: '2026-07-31', validUntil: '2026-07-31' }, '2026-07-01'), false)

const row = mapDeviceLedgerRow(device, '2026-07-01')
assert.equal(row.key, '2070143016618696705')
assert.equal(row.deviceCode, 'NEW-123')
assert.equal(row.factoryCode, 'SN-001')
assert.equal(row.manufacturer, '未知')
assert.equal(row.categoryText, 'A类')
assert.equal(row.statusText, '在用')
assert.equal(row.cycleText, '12个月')
assert.equal(row.overdue, true)
assert.equal(row.mandatoryText, '否')

const periodicRow = mapDeviceLedgerRow({
  ...device,
  verificationStatus: 'periodic_check',
  sourceType: 'periodic',
  sourceOrderId: '2001'
})
assert.equal(periodicRow.statusText, '周检中')
assert.equal(periodicRow.statusColor, 'blue')
