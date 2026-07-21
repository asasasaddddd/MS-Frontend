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

const responsibleSecondJudgeNode = getWorkflowNode('periodic', 'responsible_second_judge')
assert.deepEqual(responsibleSecondJudgeNode?.roles, ['RESPONSIBLE_ENGINEER'])

const externalThirdJudgeNode = getWorkflowNode('periodic', 'external_third_judge')
assert.deepEqual(externalThirdJudgeNode?.roles, ['VERIFIER_EXTERNAL'])

assert.deepEqual(firstCheckNodeCodesByRole.MEASURE_ADMIN, ['manager_check'])
assert.equal(matchesWorkflowTaskRole({ nodeCode: 'manager_check' }, 'firstcheck', 'MEASURE_ADMIN'), true)
assert.equal(matchesWorkflowTaskRole({ nodeCode: 'verifier_verify' }, 'firstcheck', 'MEASURE_ADMIN'), false)
assert.equal(matchesWorkflowTaskRole({ nodeCode: 'verifier_verify' }, 'firstcheck', 'VERIFIER_SELF'), true)
