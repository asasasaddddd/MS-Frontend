import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const deviceApi = readFileSync(new URL('../src/api/device.ts', import.meta.url), 'utf8')
const attachmentApi = readFileSync(new URL('../src/api/attachment.ts', import.meta.url), 'utf8')
const ledgerView = readFileSync(new URL('../src/views/device/DeviceLedgerView.vue', import.meta.url), 'utf8')

assert.equal(deviceApi.includes('/devices/${encodeURIComponent(deviceCode)}/business-events'), true)
assert.equal(deviceApi.includes('/business-cases/${encodeURIComponent(String(caseId))}'), true)
assert.equal(deviceApi.includes('/device/${encodeURIComponent(deviceCode)}/history'), false)

assert.equal(attachmentApi.includes('/attachment/cases/${encodeURIComponent(String(caseId))}'), true)
assert.equal(attachmentApi.includes('/devices/${encodeURIComponent(String(deviceId))}'), true)

assert.equal(ledgerView.includes('listDeviceBusinessEvents'), true)
assert.equal(ledgerView.includes('getBusinessCaseDetail'), true)
assert.equal(ledgerView.includes('listAttachmentsByCaseId'), true)
assert.equal(ledgerView.includes('listAttachmentsByCaseId(caseId, deviceId)'), true)
assert.equal(ledgerView.includes('listAttachmentsByGroupId'), false)
assert.equal(ledgerView.includes('{{ item.statusText }}'), true)
assert.equal(ledgerView.includes('>已完成</a-tag>'), false)
