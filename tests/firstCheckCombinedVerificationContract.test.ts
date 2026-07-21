import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const api = source('../src/api/firstcheck.ts')
const types = source('../src/types/firstcheck.ts')
const dialog = source('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue')
const verifierView = source('../src/views/firstcheck/FirstCheckVerifierView.vue')
const verifierModel = source('../src/views/firstcheck/firstCheckVerifierModel.ts')
const workflow = source('../src/workflows/metrologyWorkflow.ts')

assert.match(api, /device-code-reservations/)
assert.match(api, /verifier-verify-and-assign/)
assert.doesNotMatch(api, /verifier-verify['"]/)
assert.doesNotMatch(api, /preview-device-codes|batch-assign-codes|firstcheck\/assign-code/)

assert.match(types, /interface DeviceCodeReservationRequest/)
assert.match(types, /interface VerifierVerifyAndAssignRequest/)
assert.match(types, /qualifiedDevices: QualifiedFirstCheckDeviceRequest\[\]/)
assert.doesNotMatch(types, /interface AssignCodeRequest|interface BatchAssignCodesRequest|interface DeviceCodePreview/)

assert.match(dialog, /reserveDeviceCodesFirstCheck/)
assert.match(dialog, /verifierVerifyAndAssignFirstCheck/)
assert.match(dialog, /FirstCheckQualifiedDeviceTable/)
assert.match(dialog, /reservationId/)
assert.doesNotMatch(dialog, /verifierVerifyFirstCheck|form\.certificateAttachmentGroupId|form\.factoryCode|form\.verificationDate|form\.validUntil/)

assert.doesNotMatch(verifierView, /FirstCheckAssignCodeDialog|assignOpen|待赋码|assignCount/)
assert.doesNotMatch(verifierModel, /assign_code/)
assert.doesNotMatch(workflow.match(/export const firstCheckNodes:[\s\S]*?\n\]/)?.[0] || '', /assign_code/)
assert.equal(existsSync(new URL('../src/views/firstcheck/components/FirstCheckAssignCodeDialog.vue', import.meta.url)), false)

