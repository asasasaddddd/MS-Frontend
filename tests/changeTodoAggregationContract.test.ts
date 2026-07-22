import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workspace = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')

const todoStart = workspace.indexOf('const changeTodoEntries')
const historyStart = workspace.indexOf('const changeHistoryEntries')
const historyEnd = workspace.indexOf('function derivePeriodicPlanLabel')

assert.ok(todoStart >= 0, '缺少状态变更当前待办构造逻辑')
assert.ok(historyStart > todoStart, '缺少状态变更已办构造逻辑')
assert.ok(historyEnd > historyStart, '无法确定状态变更已办代码边界')

const todoBlock = workspace.slice(todoStart, historyStart)
const historyBlock = workspace.slice(historyStart, historyEnd)

assert.match(todoBlock, /key:\s*'change-todo-summary'/)
assert.match(todoBlock, /title:\s*'状态变更'/)
assert.match(todoBlock, /当前共\s*\$\{tasks\.length\}\s*张状态变更单待处理/)
assert.match(todoBlock, /count:\s*tasks\.length/)
assert.doesNotMatch(todoBlock, /key:\s*`change-\$\{orderId\}`/)
assert.doesNotMatch(todoBlock, /query:\s*\{\s*orderId/)

assert.match(historyBlock, /key:\s*`change-\$\{orderId\}`/)
assert.match(historyBlock, /query:\s*\{\s*orderId,\s*tab:\s*'history'\s*\}/)
