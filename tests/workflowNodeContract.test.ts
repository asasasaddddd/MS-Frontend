import assert from 'node:assert/strict'

import {
  firstCheckNodeCodesByRole,
  getRoleWorkflowNodes,
  getWorkflowNode,
  matchesWorkflowTaskRole,
  workflowNodeGroups
} from '../src/workflows/metrologyWorkflow.ts'

const supplierFillNode = getWorkflowNode('periodic', 'supplier_fill_info')
assert.deepEqual(supplierFillNode?.roles, ['EXTERNAL_OPERATOR'])
assert.equal(supplierFillNode?.name, '外扩人员填写检定信息')

assert.deepEqual(workflowNodeGroups.periodic.externalOperator, ['send_out', 'supplier_fill_info'])
assert.equal(getRoleWorkflowNodes('periodic', 'EXTERNAL_OPERATOR').some((node) => node.code === 'supplier_fill_info'), true)
assert.equal(getRoleWorkflowNodes('periodic', 'VERIFIER_EXTERNAL').some((node) => node.code === 'supplier_fill_info'), false)

const responsibleJudgementNodes = [
  'responsible_second_judge',
  'responsible_third_judge',
  'responsible_fourth_judge'
]
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

assert.deepEqual(workflowNodeGroups.periodic.responsibleEngineer, responsibleJudgementNodes)
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
