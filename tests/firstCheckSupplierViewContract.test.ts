import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/firstcheck/FirstCheckSupplierView.vue', import.meta.url), 'utf8')
const categorySource = readFileSync(new URL('../src/views/firstcheck/components/FirstCheckCategoryDialog.vue', import.meta.url), 'utf8')

assert.match(source, /v-model:value="form\.usageScenario"/)
assert.match(source, /usageScenario:\s*form\.usageScenario\.trim\(\)/)
assert.match(source, /supplierName:\s*form\.supplierName\.trim\(\)/)
assert.match(categorySource, /usageScenario:\s*form\.usageScenario\.trim\(\)\s*\|\|\s*undefined/)
