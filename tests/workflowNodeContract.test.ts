import assert from 'node:assert/strict'

import {
  firstCheckNodeCodesByRole,
  getRoleWorkflowNodes,
  getWorkflowNode,
  matchesWorkflowTaskRole,
  workflowNodeGroups
} from '../src/workflows/metrologyWorkflow.ts'

const supplierFillNode = getWorkflowNode('periodic', 'external_common_fill')
assert.deepEqual(supplierFillNode?.roles, ['EXTERNAL_OPERATOR'])
assert.equal(supplierFillNode?.name, '外扩账号填写通用设备检定信息')
assert.equal(supplierFillNode?.api, 'POST /api/periodic/external-common-fill')

assert.deepEqual(workflowNodeGroups.periodic.externalOperator, ['external_common_fill'])
assert.equal(getRoleWorkflowNodes('periodic', 'EXTERNAL_OPERATOR').some((node) => node.code === 'external_common_fill'), true)
assert.equal(getRoleWorkflowNodes('periodic', 'VERIFIER_EXTERNAL').some((node) => node.code === 'external_common_fill'), false)
assert.deepEqual(getWorkflowNode('periodic', 'system_issue')?.roles, [])
assert.deepEqual(workflowNodeGroups.periodic.admin, [
  'admin_exception_route',
  'manager_forward_confirm',
  'admin_take_back'
])
assert.deepEqual(workflowNodeGroups.periodic.selfVerifier, ['self_verify'])

const responsibleJudgementNodes = [
  'responsible_second_judge',
  'responsible_third_judge',
  'responsible_fourth_judge'
]
const responsibleScrapNodes = [
  ['responsible_scrap_confirm', 'POST /api/periodic/responsible-scrap-confirm'],
  ['responsible_scrap_tracking_decision', 'POST /api/periodic/responsible-scrap-tracking-decision']
] as const
for (const [nodeCode, api] of responsibleScrapNodes) {
  const node = getWorkflowNode('periodic', nodeCode)
  assert.deepEqual(node?.roles, ['RESPONSIBLE_ENGINEER'])
  assert.equal(node?.api, api)
}
for (const nodeCode of responsibleJudgementNodes) {
  const node = getWorkflowNode('periodic', nodeCode)
  assert.deepEqual(node?.roles, ['RESPONSIBLE_ENGINEER'])
  assert.equal(node?.api, 'POST /api/periodic/judgements')
}

const verifierJudgementNodes = ['verifier_second_judge', 'verifier_third_judge']
for (const nodeCode of verifierJudgementNodes) {
  const node = getWorkflowNode('periodic', nodeCode)
  assert.deepEqual(node?.roles, ['VERIFIER_EXTERNAL'])
  assert.equal(node?.api, 'POST /api/periodic/judgements')
}

const verifierScrapDisposalNode = getWorkflowNode('periodic', 'verifier_scrap_disposal')
assert.deepEqual(verifierScrapDisposalNode?.roles, ['VERIFIER_EXTERNAL'])
assert.equal(verifierScrapDisposalNode?.api, 'POST /api/periodic/scrap-disposal')

assert.equal(getWorkflowNode('periodic', 'external_third_judge'), undefined)

assert.deepEqual(workflowNodeGroups.periodic.responsibleEngineer, [
  ...responsibleScrapNodes.map(([nodeCode]) => nodeCode),
  ...responsibleJudgementNodes
])
assert.equal(
  ['verifier_second_judge', 'verifier_third_judge', 'verifier_scrap_disposal'].every((nodeCode) =>
    workflowNodeGroups.periodic.externalVerifier.includes(nodeCode)
  ),
  true
)

assert.deepEqual(firstCheckNodeCodesByRole.MEASURE_ADMIN, ['manager_classify', 'manager_revise'])
assert.equal(
  matchesWorkflowTaskRole({ nodeCode: 'manager_classify', requiredRoleCode: 'MEASURE_ADMIN' }, 'firstcheck', 'MEASURE_ADMIN'),
  true
)
assert.equal(
  matchesWorkflowTaskRole({ nodeCode: 'verifier_verify_assign', requiredRoleCode: 'VERIFIER_SELF' }, 'firstcheck', 'MEASURE_ADMIN'),
  false
)
assert.equal(
  matchesWorkflowTaskRole({ nodeCode: 'verifier_verify_assign', requiredRoleCode: 'VERIFIER_SELF' }, 'firstcheck', 'VERIFIER_SELF'),
  true
)
assert.equal(
  matchesWorkflowTaskRole({ nodeCode: 'verifier_handle', requiredRoleCode: 'VERIFIER_EXTERNAL' }, 'change', 'VERIFIER_SELF'),
  false
)
