import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { register } from 'node:module'

import {
  resetWorkflowRequestDouble,
  setWorkflowRequestHandler,
  workflowRequestCalls
} from './workflowTaskDoubles.ts'

register('./workflowTaskLoader.mjs', import.meta.url)

const composableUrl = new URL('../src/composables/useWorkflowTask.ts', import.meta.url)
assert.ok(existsSync(composableUrl), '缺少统一工作流任务 composable：useWorkflowTask.ts')

const workflowApi = await import('../src/api/workflow.ts')
const workflowTask = await import('../src/composables/useWorkflowTask.ts')

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve
    reject = nextReject
  })
  return { promise, resolve, reject }
}

function workflowRow(overrides: Record<string, unknown> = {}) {
  return {
    taskId: '2090000000000000001',
    processInstanceId: '2090000000000000000',
    businessType: 'PERIODIC',
    businessId: '2089000000000000001',
    nodeCode: 'self_verify',
    nodeName: '自检检定',
    operationCode: 'SUBMIT',
    requiredRoleCode: 'VERIFIER_SELF',
    permissionCode: 'PERIODIC_SELF_VERIFY_SUBMIT',
    taskStatus: 'pending',
    rowVersion: 3,
    allowedActions: ['SUBMIT'],
    ...overrides
  }
}

resetWorkflowRequestDouble()
setWorkflowRequestHandler((config) => {
  if (String(config.url).includes('/timeline')) {
    return [{
      id: '2090000000000000100',
      taskId: '2090000000000000001',
      businessItemId: '2089000000000000001',
      eventKind: 'TASK_COMPLETED',
      eventKindName: '任务完成',
      nodeCode: 'self_verify',
      nodeName: '自检检定',
      actionCode: 'SUBMIT',
      actionName: '提交',
      nextNodeCode: 'completed',
      nextNodeName: '已完成',
      operatorId: 'U00108405',
      operatorName: '检定员',
      opinion: '合格',
      resultCode: 'QUALIFIED_TO_COMPLETE',
      resultName: '合格完成',
      snapshotJson: '{"result":"qualified"}',
      operatedAt: '2026-07-26T09:30:00'
    }]
  }
  if (String(config.url).includes('/tasks/')) return workflowRow()
  return { records: [workflowRow()], total: 1, current: 1, size: 200 }
})

const abortController = new AbortController()
for (const view of ['todo', 'handled', 'participated', 'department'] as const) {
  const page = await workflowApi.queryWorkflowTasks(
    { view, businessType: 'PERIODIC', current: 1, size: 50 },
    abortController.signal
  )
  assert.equal(page.records[0]?.allowedActions[0], 'SUBMIT')
}
await workflowApi.getWorkflowTask('2090000000000000001', abortController.signal)
const timeline = await workflowApi.getWorkflowTimeline('2090000000000000000', abortController.signal)

assert.deepEqual(
  workflowRequestCalls.slice(0, 4).map((call) => call.params?.view),
  ['todo', 'handled', 'participated', 'department'],
  '四类工作台视图必须使用同一个统一任务接口'
)
assert.equal(workflowRequestCalls[0]?.url, '/workflow/tasks')
assert.equal(workflowRequestCalls[0]?.signal, abortController.signal)
assert.equal(workflowRequestCalls[4]?.url, '/workflow/tasks/2090000000000000001')
assert.equal(workflowRequestCalls[5]?.url, '/workflow/processes/2090000000000000000/timeline')
assert.equal(timeline[0]?.businessItemId, '2089000000000000001')

const mappedTimeline = workflowTask.mapWorkflowTimelineEntry({
  id: '2090000000000000100',
  taskId: 2090000000000000001n.toString(),
  businessItemId: '2089000000000000001',
  eventKind: 'TASK_COMPLETED',
  eventKindName: '任务完成',
  nodeCode: 'self_verify',
  nodeName: '自检检定',
  actionCode: 'SUBMIT',
  actionName: '提交',
  nextNodeCode: 'completed',
  nextNodeName: '已完成',
  operatorId: 'U00108405',
  operatorName: '检定员',
  opinion: '合格',
  resultCode: 'QUALIFIED_TO_COMPLETE',
  resultName: '合格完成',
  snapshotJson: '{"result":"qualified"}',
  operatedAt: '2026-07-26T09:30:00'
})
assert.deepEqual(mappedTimeline, timeline[0], 'timeline 必须按后端平铺字段原样映射')

assert.equal(workflowTask.hasWorkflowAction(workflowRow(), 'SUBMIT'), true)
assert.equal(workflowTask.hasWorkflowAction(workflowRow(), 'APPROVE'), false)
const boundDetail = workflowTask.bindWorkflowTask({ name: 'detail' }, workflowRow())
assert.equal(boundDetail.workflowTaskId, '2090000000000000001')
assert.equal(boundDetail.rowVersion, 3)
assert.deepEqual(boundDetail.allowedActions, ['SUBMIT'])
assert.equal(
  workflowTask.hasWorkflowAction({ ...workflowRow(), nodeCode: 'completed', allowedActions: [] }, 'SUBMIT'),
  false,
  '节点、中文状态或角色不得替代 allowedActions 授权按钮'
)

const conflictNotices: string[] = []
let refreshCount = 0
let detailCount = 0
const conflictCoordinator = workflowTask.createWorkflowTaskCoordinator({
  queryTasks: async () => ({ records: [], total: 0, current: 1, size: 20 }),
  getTask: async () => {
    detailCount += 1
    return workflowRow({ handlerId: 'U00109024', handlerName: '王管理员', allowedActions: [] })
  },
  getTimeline: async () => []
})
const conflictResult = await conflictCoordinator.executeTaskAction(
  '2090000000000000001',
  async () => Promise.reject(Object.assign(new Error('TASK_ALREADY_HANDLED'), { code: 409 })),
  {
    notifyAlreadyHandled: (notice: string) => conflictNotices.push(notice),
    refresh: async () => { refreshCount += 1 }
  }
)
assert.equal(conflictResult.status, 'already-handled')
assert.equal(detailCount, 1, '409 后必须二次读取当前任务详情')
assert.equal(refreshCount, 1, '409 后只允许刷新一次')
assert.match(conflictNotices[0] || '', /王管理员/)
assert.match(conflictNotices[0] || '', /U00109024/)

const oldQuery = deferred<{ records: ReturnType<typeof workflowRow>[]; total: number; current: number; size: number }>()
const newQuery = deferred<{ records: ReturnType<typeof workflowRow>[]; total: number; current: number; size: number }>()
const requestedSignals: AbortSignal[] = []
const roleCoordinator = workflowTask.createWorkflowTaskCoordinator({
  queryTasks: (query: { view: string }, signal?: AbortSignal) => {
    assert.ok(signal)
    requestedSignals.push(signal)
    return query.view === 'todo' && requestedSignals.length === 1 ? oldQuery.promise : newQuery.promise
  },
  getTask: async () => workflowRow(),
  getTimeline: async () => []
})

const oldLoad = roleCoordinator.loadViews('U00108405|VERIFIER_SELF', ['todo'])
const newLoad = roleCoordinator.loadViews('U00108405|VERIFIER_EXTERNAL', ['todo'])
assert.equal(requestedSignals[0]?.aborted, true, '切换角色必须主动取消旧请求')
newQuery.resolve({ records: [workflowRow({ requiredRoleCode: 'VERIFIER_EXTERNAL' })], total: 1, current: 1, size: 20 })
const currentResult = await newLoad
oldQuery.resolve({ records: [workflowRow({ requiredRoleCode: 'VERIFIER_SELF' })], total: 1, current: 1, size: 20 })
const staleResult = await oldLoad
assert.equal(currentResult?.todo[0]?.requiredRoleCode, 'VERIFIER_EXTERNAL')
assert.equal(staleResult, null, '即使底层忽略 abort，旧角色响应也必须被丢弃')

function collectSourceFiles(directory: URL): URL[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const child = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory)
    return entry.isDirectory() ? collectSourceFiles(child) : statSync(child).isFile() ? [child] : []
  })
}

const sourceFiles = collectSourceFiles(new URL('../src/', import.meta.url))
const allSource = sourceFiles
  .filter((url) => /\.(?:ts|vue)$/.test(url.pathname))
  .map((url) => readFileSync(url, 'utf8'))
  .join('\n')

for (const legacyApi of [
  'listPeriodicMyTasks',
  'listPeriodicMyHistory',
  'listSamplingMyTasks',
  'listSamplingMyHistory',
  'listProductSupportMyTasks',
  'listProductSupportMyHistory'
]) {
  assert.doesNotMatch(allSource, new RegExp(`\\b${legacyApi}\\b`), `旧模块任务 API 尚未清零：${legacyApi}`)
}
assert.doesNotMatch(allSource, /setInterval\s*\([^)]*(?:workflow|task|todo)|setTimeout\s*\([^)]*(?:workflow|task|todo)/i)

for (const path of [
  '../src/views/WorkspaceTodoView.vue',
  '../src/views/periodic/components/PeriodicTaskWorkspace.vue',
  '../src/views/sampling/components/SamplingTaskWorkspace.vue',
  '../src/views/product-support/ProductSupportVerifierView.vue'
]) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  assert.match(source, /useWorkflowTask/, `${path} 必须复用统一工作流 composable`)
  assert.match(
    source,
    /allowedActions|hasWorkflowAction|resolve(?:Periodic|Sampling)TaskAction/,
    `${path} 必须消费后端 allowedActions`
  )
}

const periodicWorkspace = readFileSync(
  new URL('../src/views/periodic/components/PeriodicTaskWorkspace.vue', import.meta.url),
  'utf8'
)
assert.doesNotMatch(periodicWorkspace, /props\.nodeCodes\.includes/)
assert.doesNotMatch(periodicWorkspace, /canSubmitPeriodicException/)
assert.doesNotMatch(
  periodicWorkspace,
  /hasWorkflowAction\(task, 'SUBMIT_EXCEPTION'\) \|\| hasWorkflowAction\(task, 'SUBMIT'\)/
)
const periodicPermissionGuard = periodicWorkspace.indexOf('const action = resolvePeriodicTaskAction(task)')
const periodicFirstActionBranch = periodicWorkspace.indexOf("if (action === 'submit-exception')")
assert.ok(periodicPermissionGuard > 0 && periodicPermissionGuard < periodicFirstActionBranch)

const workspaceSource = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')
assert.doesNotMatch(workspaceSource, /页面建设中|后续按原型继续补全|暂未实现/)

const workflowTypeSource = readFileSync(new URL('../src/types/workflow.ts', import.meta.url), 'utf8')
for (const field of [
  'id', 'taskId', 'businessItemId', 'eventKind', 'eventKindName', 'nodeCode', 'nodeName',
  'actionCode', 'actionName', 'nextNodeCode', 'nextNodeName', 'operatorId', 'operatorName',
  'opinion', 'resultCode', 'resultName', 'snapshotJson', 'operatedAt'
]) {
  assert.match(workflowTypeSource, new RegExp(`\\b${field}\\??:`), `timeline 类型缺少后端字段：${field}`)
}
assert.doesNotMatch(workflowTypeSource, /sourceNodeCode|targetNodeCode|occurredAt/)
