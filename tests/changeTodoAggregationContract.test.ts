import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workspace = readFileSync(
  new URL('../src/views/WorkspaceTodoView.vue', import.meta.url),
  'utf8'
)

assert.doesNotMatch(workspace, /const changeTodoEntries/)
const historyStart = workspace.indexOf('const changeHistoryEntries')
const historyEnd = workspace.indexOf('const periodicPlanPickerIncomplete')

assert.ok(historyStart >= 0, 'status-change history entries must remain')
assert.ok(historyEnd > historyStart, 'status-change history boundary must remain stable')
const historyBlock = workspace.slice(historyStart, historyEnd)

assert.match(historyBlock, /filterTasksWithLoadedDetails/)
assert.match(historyBlock, /key:\s*`change-\$\{orderId\}`/)
assert.match(historyBlock, /query:\s*\{\s*orderId,\s*tab:\s*'history'\s*\}/)
assert.match(historyBlock, /changeTypeName/)
