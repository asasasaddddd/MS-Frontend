import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')
assert.match(source, /useRoleTodoSummary/)
assert.match(source, /sumMyPendingItems/)
assert.doesNotMatch(source, /listUnifiedScanInbox|getPendingFirstCheckTakeBackRows|scanInboxRows/)
assert.doesNotMatch(source, /todoCountByType|todoDeviceCountByType/)

const todoStart = source.indexOf('const firstCheckTodoEntries')
const historyStart = source.indexOf('const firstCheckHistoryEntries')
const todoSource = source.slice(todoStart, historyStart)

assert.match(todoSource, /todoContainersFor\('firstcheck'\)/)
assert.match(todoSource, /key:\s*['"]firstcheck-todo-summary['"]/)
assert.match(todoSource, /title:\s*['"]首次检定['"]/)
assert.match(todoSource, /count:\s*totalFirstCheckTodoCount/)
assert.match(todoSource, /当前共\s*\$\{taskCount\}\s*张首检单待处理/)
assert.doesNotMatch(todoSource, /另有|待取回.*scan|getPendingFirstCheckTakeBackRows/)
assert.doesNotMatch(todoSource, /filterTasksWithLoadedDetails/)
assert.match(todoSource, /view:\s*['"]list['"]/)
assert.doesNotMatch(todoSource, /key:\s*`firstcheck-\$\{orderId\}`/)
assert.doesNotMatch(todoSource, /query:\s*buildFirstCheckQuery/)
