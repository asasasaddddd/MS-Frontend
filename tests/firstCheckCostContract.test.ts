import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const typeSource = readFileSync(new URL('../src/types/firstcheck.ts', import.meta.url), 'utf8')
const dialogSource = readFileSync(
  new URL('../src/views/firstcheck/components/FirstCheckVerifyDialog.vue', import.meta.url),
  'utf8'
)

assert.equal(typeSource.includes('verificationUnitPrice'), true)
assert.equal(typeSource.includes('selfCost'), false)
assert.equal(typeSource.includes('sendoutCost'), false)
assert.equal(dialogSource.includes('v-model:value="form.verificationUnitPrice"'), true)
assert.equal(dialogSource.includes('单台检定费用（元）'), true)
assert.equal(dialogSource.includes(':precision="2"'), true)
assert.equal(dialogSource.includes('form.selfCost'), false)
assert.equal(dialogSource.includes('form.sendoutCost'), false)
