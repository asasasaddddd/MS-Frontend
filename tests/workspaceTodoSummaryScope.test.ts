import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import * as workspaceModel from '../src/views/workspaceTodoModel.ts'

const workspace = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')
const model = workspaceModel as Record<string, (...args: any[]) => any>

assert.match(workspace, /useRoleTodoSummary/)
assert.match(workspace, /businessType:\s*selectedWorkflowBusinessType/)
assert.match(workspace, /<FlowStatusSummary/)
assert.match(workspace, /const showWorkspaceTaskSections = computed\(\(\) => shouldShowWorkspaceTaskSections\(roleCode\.value\)\)/)
assert.match(workspace, /user && showWorkspaceTaskSections\.value \? `\$\{user\.employeeId\}\|\$\{user\.roleCode\}` : ''/)
assert.match(
  workspace,
  /identityKey:\s*workflowIdentity/,
  '发起型角色不应触发待办汇总、扫码待办和详情加载'
)
assert.match(
  workspace,
  /<FlowStatusSummary\s+v-if="showWorkspaceTaskSections && route\.path === '\/todo' && activeBucket === 'todo'"/,
  '供应商只保留业务发起入口，不显示待办汇总卡片'
)
assert.match(
  workspace,
  /<a-card v-if="showWorkspaceTaskSections && route\.path === '\/todo'" class="todo-panel"/,
  '供应商只保留业务发起入口，不显示流程任务卡片'
)
assert.doesNotMatch(workspace, /const metrics = computed/)
assert.doesNotMatch(workspace, /todoCountByType|todoDeviceCountByType/)
assert.match(workspace, /planId/)
assert.match(workspace, /orderId/)

assert.equal(typeof model.workspaceTodoBusinessType, 'function')
assert.equal(model.workspaceTodoBusinessType('all'), undefined)
assert.equal(model.workspaceTodoBusinessType('periodic'), 'PERIODIC')
assert.equal(model.workspaceTodoBusinessType('firstcheck'), 'FIRST_CHECK')

assert.equal(typeof model.workspaceTodoTypeFromQuery, 'function')
assert.equal(model.workspaceTodoTypeFromQuery('periodic'), 'periodic')
assert.equal(model.workspaceTodoTypeFromQuery(['change', 'periodic']), 'change')
assert.equal(model.workspaceTodoTypeFromQuery('unsupported'), 'all')
assert.equal(model.workspaceTodoTypeFromQuery('__proto__'), 'all')
assert.equal(model.workspaceTodoTypeFromQuery(undefined), 'all')
assert.equal(typeof model.shouldShowWorkspaceTaskSections, 'function')
assert.equal(model.shouldShowWorkspaceTaskSections('SUPPLIER'), false)
assert.equal(model.shouldShowWorkspaceTaskSections('MEASURE_ADMIN'), true)
assert.match(
  workspace,
  /watch\(\s*\(\) => route\.query\.type[\s\S]*workspaceTodoTypeFromQuery/,
  '铃铛回退到 /todo?type=... 时，总待办必须同步业务类型筛选'
)

assert.equal(typeof model.sumWorkspaceTodoCounts, 'function')
const entries = [
  { type: 'firstcheck', count: 2 },
  { type: 'periodic', count: 10 },
  { type: 'change', count: 1 }
]
assert.equal(model.sumWorkspaceTodoCounts(entries), 13)
assert.equal(model.sumWorkspaceTodoCounts(entries), 13, '条目 badge 数量之和必须等于全局 pending 的 item 数量')
