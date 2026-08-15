import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workspace = readFileSync(
  new URL('../src/views/WorkspaceTodoView.vue', import.meta.url),
  'utf8'
)

assert.doesNotMatch(workspace, /const firstCheckTodoEntries|sumMyPendingItems/)
const historyStart = workspace.indexOf('const firstCheckHistoryEntries')
const historyEnd = workspace.indexOf('const changeHistoryEntries')

assert.ok(historyStart >= 0, 'first-check history entries must remain')
assert.ok(historyEnd > historyStart, 'first-check history boundary must remain stable')
const historyBlock = workspace.slice(historyStart, historyEnd)

assert.match(historyBlock, /filterTasksWithLoadedDetails/)
assert.match(historyBlock, /key:\s*`firstcheck-\$\{orderId\}`/)
assert.match(historyBlock, /query:\s*\{\s*orderId,\s*tab:\s*'history'\s*\}/)
assert.doesNotMatch(historyBlock, /todoContainersFor|myPendingItemCount/)
