import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function source(path: string) {
  return readFileSync(new URL(path, import.meta.url), 'utf8')
}

const apiSource = source('../src/api/flowSummary.ts')
const verifierViewSource = source('../src/views/product-support/ProductSupportVerifierView.vue')
const warehouseViewSource = source('../src/views/product-support/ProductSupportWarehouseView.vue')
const displayModelSource = source('../src/views/product-support/productSupportDisplayModel.ts')

assert.match(apiSource, /function getProductSupportTaskFlowSummary/)
assert.match(apiSource, /url:\s*['"]\/product-support\/my-tasks\/summary['"]/)

assert.match(verifierViewSource, /FlowStatusSummary/)
assert.match(verifierViewSource, /getProductSupportTaskFlowSummary/)
assert.match(verifierViewSource, /Promise\.allSettled/)
assert.match(verifierViewSource, /taskResult\.status === 'fulfilled'/)
assert.match(verifierViewSource, /summaryResult\.status === 'fulfilled'/)
assert.match(verifierViewSource, /title="产品配套流程汇总"/)
assert.doesNotMatch(verifierViewSource, /buildProductSupportSummary/)
assert.doesNotMatch(verifierViewSource, /已接收\s*0|外委送出\s*0|外委送回\s*0/)
assert.doesNotMatch(verifierViewSource, /physicalStatus|externalStatus|scanStatus|labelStatus/)
assert.doesNotMatch(verifierViewSource, /setInterval|setTimeout/)

assert.doesNotMatch(displayModelSource, /ProductSupportSummary/)
assert.doesNotMatch(displayModelSource, /function buildProductSupportSummary/)
assert.doesNotMatch(warehouseViewSource, /FlowStatusSummary|getProductSupportTaskFlowSummary/)
