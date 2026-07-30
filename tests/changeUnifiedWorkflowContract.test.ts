import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import {
  buildChangeApproveRequest,
  buildChangeRejectRequest,
  buildChangeVerifierHandleRequest
} from '../src/api/changeContract.ts'

const taskIdentity = {
  orderId: '2080000000000000001',
  taskId: '2080000000000000002',
  rowVersion: 7
}

assert.deepEqual(buildChangeApproveRequest({ ...taskIdentity, opinion: '同意' }), {
  ...taskIdentity,
  opinion: '同意'
})
assert.deepEqual(buildChangeRejectRequest({ ...taskIdentity, reason: '资料不完整' }), {
  ...taskIdentity,
  reason: '资料不完整'
})
assert.deepEqual(buildChangeVerifierHandleRequest({
  ...taskIdentity,
  verificationRequired: 1,
  verificationResult: 'qualified'
}), {
  ...taskIdentity,
  verificationRequired: 1,
  verificationResult: 'qualified'
})

const apiSource = readFileSync(new URL('../src/api/change.ts', import.meta.url), 'utf8')
const leaderSource = readFileSync(new URL('../src/views/change/ChangeDeptLeaderView.vue', import.meta.url), 'utf8')
const verifierSource = readFileSync(new URL('../src/views/change/ChangeVerifierView.vue', import.meta.url), 'utf8')
const receiveAdminSource = readFileSync(
  new URL('../src/views/change/components/ChangeReceiveAdminPanel.vue', import.meta.url),
  'utf8'
)
const historySource = readFileSync(
  new URL('../src/views/change/components/ChangeHistoryPanel.vue', import.meta.url),
  'utf8'
)
const verifierModelSource = readFileSync(
  new URL('../src/views/change/changeVerifierDialogModel.ts', import.meta.url),
  'utf8'
)

assert.ok(apiSource.includes('buildChangeRejectRequest(data)'), '驳回接口不得重新组装并丢弃任务身份')
;[leaderSource, verifierSource, receiveAdminSource].forEach((source) => {
  assert.ok(source.includes('rowVersion: task.rowVersion'), '状态变更待办必须保存任务版本')
  assert.ok(source.includes('allowedActions: [...task.allowedActions]'), '状态变更按钮必须消费后端允许操作')
  assert.ok(source.includes("listWorkflowTasks('CHANGE')"), '状态变更页面必须按后端业务类型查询统一待办')
  assert.ok(!source.includes('changeNodeCodesByRole'), '状态变更页面不得按本地角色表二次推导节点权限')
})
assert.ok(leaderSource.includes('CHANGE_APPROVE_ACTION'))
assert.ok(receiveAdminSource.includes('CHANGE_APPROVE_ACTION'))
assert.ok(verifierSource.includes('CHANGE_VERIFY_ACTION'))
assert.ok(!verifierSource.includes('matchesChangeVerifierRole'), '检定员待办不得按本地角色规则二次过滤')
assert.ok(historySource.includes("listWorkflowHistory('CHANGE')"), '状态变更已办必须使用后端业务类型过滤')
assert.ok(!historySource.includes('changeNodeCodesByRole'), '状态变更已办不得按本地角色表二次过滤')
const workflowModelSource = readFileSync(
  new URL('../src/workflows/metrologyWorkflow.ts', import.meta.url),
  'utf8'
)
assert.ok(!workflowModelSource.includes('changeNodeCodesByRole'), '状态变更不得保留本地角色节点授权表')
assert.ok(verifierModelSource.includes('taskId: order.taskId'))
assert.ok(verifierModelSource.includes('rowVersion: order.rowVersion'))
