import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')

assert.match(source, /listWorkflowHistory/)
assert.match(source, /listPeriodicMyHistory/)
assert.match(source, /listSamplingMyHistory/)
assert.match(source, /listProductSupportMyHistory/)
assert.match(source, /tab="我的待办"/)
assert.match(source, /tab="我的已办"/)
assert.match(source, /tab:\s*'history'/)
