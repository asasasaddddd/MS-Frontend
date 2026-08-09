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
assert.equal(labelApiSource.includes('/label/pdf/'), true)
assert.equal(labelViewSource.includes('downloadLabelPdf'), true)
assert.equal(labelViewSource.includes('URL.createObjectURL'), true)
assert.match(labelApiSource, /\/label\/supplier\/firstcheck\/unprinted/)
assert.match(labelApiSource, /\/label\/supplier\/firstcheck\/printed/)
assert.match(labelViewSource, /session\.user\?\.roleCode === 'SUPPLIER'/)
assert.match(labelViewSource, /title:\s*['"]来源事项['"]/)
assert.match(labelViewSource, /column\.key === ['"]sourceLabel['"]/)
assert.match(labelViewSource, />来源事项</)
assert.doesNotMatch(labelViewSource, /来源流程/)
assert.match(labelViewSource, /record\.sourceLabel/)
assert.match(labelViewSource, /record\.sourceDetail\?\.businessNo/)
assert.match(labelViewSource, /row\.sourceDetail\?\.purchaseOrderNo/)
assert.match(labelViewSource, /row\.sourceDetail\?\.hasAttachment \? '有附件' : '无附件'/)
assert.doesNotMatch(labelViewSource, /确认打印并流转/)
assert.match(
  labelViewSource,
  /await printLabelRecord\(row\.id\)[\s\S]*await downloadLabelPdf\(row\.id\)/,
  '必须先登记真实打印并取得最终签名，再下载最新标签PDF'
)

assert.match(
  labelViewSource,
  /const workflowIdentity = computed\(\(\) => \{[\s\S]*employeeId[\s\S]*roleCode[\s\S]*\}\)/,
  '标签列表必须按工号和当前角色建立加载身份'
)
assert.match(
  labelViewSource,
  /watch\(workflowIdentity, \(\) => \{\s*void loadRows\(\)\s*\}, \{ immediate: true \}\)/,
  '切换自检或外委角色后必须重新加载标签条目'
)
assert.doesNotMatch(
  labelViewSource,
  /onMounted\(loadRows\)/,
  '标签列表不能只在首次挂载时加载，避免角色切换继续显示旧角色数据'
)
assert.match(labelViewSource, /let rowLoadGeneration = 0/)
assert.match(labelViewSource, /let rowLoadController: AbortController \| undefined/)
assert.match(
  labelViewSource,
  /generation !== rowLoadGeneration\s*\|\|\s*activeController\.signal\.aborted\s*\|\|\s*workflowIdentity\.value !== requestedIdentity/,
  '旧角色请求返回时不得覆盖当前角色的标签列表'
)
assert.match(labelApiSource, /listUnprintedLabels\(sourceType\?: string, signal\?: AbortSignal\)/)
assert.match(labelApiSource, /listSupplierFirstCheckUnprintedLabels\(signal\?: AbortSignal\)/)
