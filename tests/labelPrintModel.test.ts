import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  labelVerificationMethodName,
  getSelectedLabelRecordIds,
  getSelectedLabelRows
} from '../src/views/label/labelPrintModel.ts'

const firstCheckRow = {
  id: '2070143016618696705',
  deviceCode: 'JL-2026-000001',
  sourceType: 'FIRST_CHECK',
  sourceId: '2070143016618696705'
}

const changeRow = {
  id: '2070143016618696711',
  deviceCode: 'JL-2026-000002',
  sourceType: 'CHANGE',
  sourceId: '2070143016618696710'
}

const rows = [firstCheckRow, changeRow]
const selectedKeys = ['2070143016618696705', '2070143016618696711']

assert.deepEqual(getSelectedLabelRows(rows, ['2070143016618696705']), [firstCheckRow])
assert.deepEqual(getSelectedLabelRecordIds(rows, selectedKeys), [
  '2070143016618696705',
  '2070143016618696711'
])
assert.equal(typeof getSelectedLabelRecordIds(rows, selectedKeys)[0], 'string')

assert.equal(labelVerificationMethodName('self'), '自检')
assert.equal(labelVerificationMethodName('send_out'), '外委')
assert.equal(labelVerificationMethodName(undefined), '-')

const labelApiSource = readFileSync(new URL('../src/api/label.ts', import.meta.url), 'utf8')
const labelViewSource = readFileSync(
  new URL('../src/views/label/components/LabelListPanel.vue', import.meta.url),
  'utf8'
)

assert.equal(labelApiSource.includes('verificationMethodName'), false)
assert.equal(labelApiSource.includes('verificationTypeName'), false)
assert.equal(labelViewSource.includes('row.verificationMethodName'), false)
assert.equal(labelViewSource.includes('row.verificationTypeName'), false)
