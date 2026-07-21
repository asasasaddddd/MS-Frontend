import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')
const todoStart = source.indexOf('const firstCheckTodoEntries')
const historyStart = source.indexOf('const firstCheckHistoryEntries')
const todoSource = source.slice(todoStart, historyStart)

assert.match(todoSource, /uniqueTasksByBusinessId/)
assert.match(todoSource, /key:\s*['"]firstcheck-todo-summary['"]/)
assert.match(todoSource, /title:\s*['"]首次检定['"]/)
assert.match(todoSource, /count:\s*tasks\.length/)
assert.match(todoSource, /当前共\s*\$\{tasks\.length\}\s*张首检单待处理/)
assert.match(todoSource, /view:\s*['"]list['"]/)
assert.doesNotMatch(todoSource, /key:\s*`firstcheck-\$\{orderId\}`/)
assert.doesNotMatch(todoSource, /query:\s*buildFirstCheckQuery/)
