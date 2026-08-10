import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  parsePeriodicNodeCode,
  periodicEndpoint,
  periodicNodeName
} from '../src/api/periodicContract.ts'
import { buildPeriodicExceptionChangeRequest } from '../src/views/periodic/periodicExceptionModel.ts'

const apiSource = readFileSync(new URL('../src/api/periodic.ts', import.meta.url), 'utf8')
const contractSource = readFileSync(new URL('../src/api/periodicContract.ts', import.meta.url), 'utf8')
const typeSource = readFileSync(new URL('../src/types/periodic.ts', import.meta.url), 'utf8')
const storeSource = readFileSync(new URL('../src/stores/periodic.ts', import.meta.url), 'utf8')
const workspaceSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicTaskWorkspace.vue', import.meta.url),
  'utf8'
)
const detailSource = readFileSync(
  new URL('../src/views/periodic/components/PeriodicDetailDialog.vue', import.meta.url),
  'utf8'
)
const todoSource = readFileSync(new URL('../src/views/WorkspaceTodoView.vue', import.meta.url), 'utf8')
const todoAdapterSource = readFileSync(
  new URL('../src/views/workspaceTodoAdapters.ts', import.meta.url),
  'utf8'
)
const displayModelSource = readFileSync(
  new URL('../src/views/periodic/periodicDisplayModel.ts', import.meta.url),
  'utf8'
)
const exceptionModelSource = readFileSync(
  new URL('../src/views/periodic/periodicExceptionModel.ts', import.meta.url),
  'utf8'
)
const workflowDefinitionSource = readFileSync(
  new URL('../src/workflows/metrologyWorkflow.ts', import.meta.url),
  'utf8'
)

assert.match(
  apiSource,
  /function getPeriodicTask\(periodicTaskId: EntityId, workflowTaskId: EntityId, signal\?: AbortSignal\)/
)
assert.match(
  apiSource,
  /periodicEndpoint\('taskDetail', periodicTaskId\)[\s\S]*params:\s*\{\s*taskId:\s*workflowTaskId\s*\}/
)
assert.match(storeSource, /fetchTask\(periodicTaskId: EntityId, workflowTaskId: EntityId\)/)
assert.match(storeSource, /getPeriodicTask\(periodicTaskId, workflowTaskId\)/)
assert.doesNotMatch(apiSource, /getPeriodicPlan|listPeriodicPlanTasks/)
assert.doesNotMatch(contractSource, /planDetail|planTasks/)
assert.doesNotMatch(storeSource, /currentPlan|planTasks|fetchPlan/)
assert.doesNotMatch(typeSource, /interface PeriodicPlanVO/)
assert.match(workspaceSource, /getPeriodicTask\(task\.businessId, task\.taskId, signal\)/)
assert.match(workspaceSource, /getPeriodicTask\(task\.id, task\.workflowTaskId/)
assert.match(workspaceSource, /function normalizePeriodicActiveTab/)
assert.match(workspaceSource, /watch\(\s*\(\)\s*=>\s*route\.query\.tab/)
assert.match(workspaceSource, /action === 'scan-receive'/)
assert.match(workspaceSource, /action === 'scan-take-back'/)
assert.match(workspaceSource, /action:\s*'periodic-manager-take-back'/)
assert.match(workspaceSource, /mergePeriodicTaskPhysicalActions/)
assert.doesNotMatch(workspaceSource, /function toPhysicalPeriodicTask/)
assert.match(detailSource, /row\.physicalStatusName/)
assert.match(todoSource, /loadTodoModuleDetail/)
assert.match(todoAdapterSource, /getPeriodicTask\(task\.businessId, task\.taskId, signal\)/)
assert.match(todoAdapterSource, /parsePeriodicNodeCode\(detail\.currentNode\)/)
assert.match(todoSource, /mergePeriodicTaskPhysicalActions/)
assert.doesNotMatch(todoSource, /function toPeriodicPhysicalTask/)

const nodeTypeBlock = typeSource.match(
  /export type PeriodicNodeCode =([\s\S]*?)\r?\n\r?\nexport type PeriodicTaskStatus/
)?.[1] || ''
const nodeDisplayBlock = displayModelSource.match(
  /function nodeDisplayName[\s\S]*?const map: Record<string, string> = \{([\s\S]*?)\r?\n\s*\}/
)?.[1] || ''
const authoritativeNodeCodes = [
  'system_issue',
  'admin_exception_route',
  'self_verify',
  'responsible_scrap_confirm',
  'responsible_scrap_tracking_decision',
  'external_common_fill',
  'verifier_second_judge',
  'responsible_second_judge',
  'responsible_third_judge',
  'verifier_third_judge',
  'responsible_fourth_judge',
  'verifier_scrap_disposal',
  'external_uncommon_fill',
  'manager_forward_confirm',
  'confirmer_confirm',
  'admin_take_back'
]
for (const nodeCode of authoritativeNodeCodes) {
  assert.match(nodeTypeBlock, new RegExp(`'${nodeCode}'`))
  assert.match(workflowDefinitionSource, new RegExp(`code: '${nodeCode}'`))
}
for (const oldNodeCode of [
  'plan_issue',
  'plan_confirm',
  'verifier_receive',
  'verification_record',
  'send_out',
  'send_out_return',
  'supplier_fill_info',
  'verifier_fill_info',
  'exception_disposal',
  'completed'
]) {
  assert.doesNotMatch(nodeTypeBlock, new RegExp(`'${oldNodeCode}'`))
  assert.doesNotMatch(nodeDisplayBlock, new RegExp(`^\\s*${oldNodeCode}:`, 'm'))
}
assert.match(contractSource, /parsePeriodicNodeCode/)
assert.match(contractSource, /admin_exception_route/)
assert.doesNotMatch(contractSource, /^\s*(?:plan_confirm|verifier_receive|verification_record|supplier_fill_info|verifier_fill_info|exception_disposal):/m)
assert.equal(parsePeriodicNodeCode('admin_take_back'), 'admin_take_back')
assert.equal(parsePeriodicNodeCode('responsible_scrap_confirm'), 'responsible_scrap_confirm')
assert.equal(parsePeriodicNodeCode('responsible_scrap_tracking_decision'), 'responsible_scrap_tracking_decision')
assert.equal(periodicNodeName('admin_take_back'), '管理员取回')
assert.equal(periodicNodeName('responsible_scrap_confirm'), '责任工程师确认正常报废')
assert.equal(periodicNodeName('responsible_scrap_tracking_decision'), '责任工程师判定是否进行不合格追踪')
assert.equal(periodicEndpoint('managerTakeBack'), '/periodic/manager-take-back')
assert.equal(periodicEndpoint('responsibleScrapConfirm'), '/periodic/responsible-scrap-confirm')
assert.equal(periodicEndpoint('responsibleScrapTrackingDecision'), '/periodic/responsible-scrap-tracking-decision')
assert.doesNotMatch(workspaceSource, /String\(task\.currentNode\)\s*===\s*'admin_take_back'/)

assert.doesNotMatch(apiSource, /exceptionDisposePeriodic|PeriodicExceptionDisposeRequest|exceptionDispose/)
assert.doesNotMatch(typeSource, /PeriodicExceptionDisposeRequest/)
assert.doesNotMatch(exceptionModelSource, /buildPeriodicExceptionDisposeRequest|canDisposePeriodicException/)
assert.doesNotMatch(workspaceSource, /exceptionDisposePeriodic|buildPeriodicExceptionDisposeRequest|canDisposePeriodicException|confirmExceptionDispose/)
assert.match(apiSource, /submitPeriodicExceptionChange\(data: PeriodicExceptionChangeSubmitRequest\)/)
assert.match(typeSource, /interface PeriodicExceptionChangeSubmitRequest/)
assert.match(apiSource, /function managerTakeBackPeriodic\(data: PeriodicScanRequest\)/)
assert.match(apiSource, /periodicEndpoint\('managerTakeBack'\)/)
assert.match(workflowDefinitionSource, /code:\s*'admin_take_back'/)
assert.match(workflowDefinitionSource, /admin:\s*\[[^\]]*'admin_take_back'/s)

const exceptionRequest = buildPeriodicExceptionChangeRequest(
  {
    id: 'P1',
    workflowTaskId: 'W1',
    rowVersion: 7,
    planId: 'PLAN1',
    deviceId: 'D1',
    deviceCode: 'JL-001',
    deptId: 'G10030500',
    deptName: '计量部',
    manageCategory: 'B'
  },
  { employeeId: 'U1', employeeName: '管理员', deptId: 'G10030500', deptName: '计量部' },
  { actionType: 'seal', sealReason: '长期停用' }
)
assert.deepEqual(
  exceptionRequest.items.map((item) => ({
    periodicTaskId: item.periodicTaskId,
    taskId: item.taskId,
    rowVersion: item.rowVersion
  })),
  [{ periodicTaskId: 'P1', taskId: 'W1', rowVersion: 7 }]
)

for (const endpoint of ['/periodic/self-verify', '/periodic/external-common-fill', '/periodic/external-uncommon-fill']) {
  assert.match(contractSource, new RegExp(endpoint.replaceAll('/', '\\/')))
}
