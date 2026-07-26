import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')

assert.match(source, /useWorkflowTask/)
assert.match(source, /views:\s*\['todo',\s*'handled'\]/)
assert.match(source, /handledTasks:\s*workflowHistoryTasks/)
assert.doesNotMatch(source, /listPeriodicMyHistory|listSamplingMyHistory|listProductSupportMyHistory/)
assert.match(source, /tab="我的待办"/)
assert.match(source, /tab="我的已办"/)
assert.match(source, /tab:\s*'history'/)
