import assert from 'node:assert/strict'

import { parseScanContent } from '../src/views/scan/scanCodeParser.ts'

assert.deepEqual(parseScanContent(' 0414000014\r\n'), {
  raw: ' 0414000014\r\n',
  normalizedCode: '0414000014'
})

assert.equal(parseScanContent('{"deviceCode":"0414000014"}').normalizedCode, '0414000014')
assert.equal(
  parseScanContent('{"scanCode":"SCAN-2","deviceCode":"DEVICE-1"}').normalizedCode,
  'DEVICE-1'
)
assert.equal(
  parseScanContent('{"temporaryCode":"TEMP-3","taskNo":"TASK-4"}').normalizedCode,
  'TEMP-3'
)
assert.equal(parseScanContent('{bad-json').normalizedCode, '{bad-json')
assert.equal(
  parseScanContent('https://meter.example.com/device?deviceCode=0414000014').normalizedCode,
  '0414000014'
)
assert.equal(
  parseScanContent('https://meter.example.com/device?taskNo=TASK-5&orderNo=ORDER-6').normalizedCode,
  'TASK-5'
)
assert.equal(
  parseScanContent('https://meter.example.com/scan/0414000014').normalizedCode,
  '0414000014'
)
assert.equal(parseScanContent('javascript:alert(1)').normalizedCode, 'javascript:alert(1)')
assert.deepEqual(parseScanContent(''), { raw: '', normalizedCode: '' })

console.log('PDA scan content parser tests passed')
