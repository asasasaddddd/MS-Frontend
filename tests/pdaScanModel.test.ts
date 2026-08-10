import assert from 'node:assert/strict'
import { register } from 'node:module'

import type { UnifiedScanInboxItem } from '../src/types/scan.ts'

register('./scanLoader.mjs', import.meta.url)
const { matchPdaScan } = await import('../src/views/scan/pdaScanModel.ts')

const authorizedRow: UnifiedScanInboxItem = {
  id: 'periodic-1',
  businessType: 'periodic',
  sourceType: 'PERIODIC',
  sourceLabel: '周检',
  taskId: '1001',
  taskNo: 'TASK-1001',
  orderNo: 'ORDER-1001',
  scanAction: 'periodic-verifier-receive',
  allowedActions: ['RECEIVE'],
  scanCode: '0414000014',
  deviceCode: ' 0414000014 ',
  scanned: false
}
const duplicateRow: UnifiedScanInboxItem = {
  ...authorizedRow,
  id: 'periodic-2',
  taskId: '1002'
}

const matched = matchPdaScan('0414000014', [authorizedRow])
assert.equal(matched.kind, 'match')
assert.equal(matched.kind === 'match' ? matched.row.id : '', 'periodic-1')
assert.equal(matchPdaScan('missing', [authorizedRow]).kind, 'none')
assert.equal(matchPdaScan('0414000014', [authorizedRow, duplicateRow]).kind, 'ambiguous')
assert.equal(matchPdaScan('0414000014', [{ ...authorizedRow, scanned: true }]).kind, 'none')
assert.equal(matchPdaScan('0414000014', [{ ...authorizedRow, allowedActions: [] }]).kind, 'none')
assert.equal(matchPdaScan('TASK-1001', [authorizedRow]).kind, 'match')
assert.equal(matchPdaScan('ORDER-1001', [authorizedRow]).kind, 'match')
assert.equal(matchPdaScan(' 0414000014 ', [authorizedRow]).kind, 'match')
assert.equal(matchPdaScan('', [authorizedRow]).kind, 'none')

console.log('PDA deterministic inbox matching tests passed')
