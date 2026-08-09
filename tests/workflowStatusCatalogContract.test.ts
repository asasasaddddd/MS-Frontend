import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { FLOW_STAGE_DEFINITIONS } from '../src/components/workflow/flowStatusDefinitions.ts'
import { changeNodes, workflowNodes } from '../src/workflows/metrologyWorkflow.ts'

const flowStatusSource = readFileSync(
  new URL('../src/components/workflow/flowStatusDefinitions.ts', import.meta.url),
  'utf8'
)

assert.doesNotMatch(
  flowStatusSource,
  /CHANGE_BUSINESS_NODE_DEFINITIONS/,
  '状态汇总不得维护独立的状态变更节点名称表，节点名称必须来自统一工作流目录'
)

const stageDefinitionKeys = new Set(
  FLOW_STAGE_DEFINITIONS.map((definition) => `${definition.dimensionCode}:${definition.stageCode}`)
)

Object.entries(workflowNodes).forEach(([module, nodes]) => {
  nodes.forEach((node) => {
    assert.ok(
      stageDefinitionKeys.has(`workflow:${node.code}`),
      `${module}:${node.code} 必须进入统一 workflow 状态目录`
    )
    if (module !== 'change') {
      assert.ok(
        stageDefinitionKeys.has(`business:${node.code}`),
        `${module}:${node.code} 必须进入统一 business 状态目录`
      )
    }
  })
})

const authoritativeChangeNodeCodes = [
  'admin_submit',
  'manager_revise',
  'dept_leader_approve',
  'measure_leader_review',
  'responsible_engineer_review',
  'receive_dept_leader_confirm',
  'receive_admin_confirm',
  'verifier_handle',
  'manager_forward_confirm',
  'confirmer_confirm',
  'label_print',
  'admin_take_back'
]
assert.deepEqual(
  changeNodes.map((node) => node.code),
  authoritativeChangeNodeCodes,
  '状态变更统一节点目录必须覆盖审批、真实检定、标签打印和管理员取回完整链路'
)

const changeTypes = ['seal', 'enable', 'transfer', 'category', 'cycle', 'scrap', 'precheck', 'defer']
changeTypes.forEach((changeType) => {
  changeNodes.forEach((node) => {
    assert.ok(
      stageDefinitionKeys.has(`business:${changeType}:${node.code}`),
      `${changeType}:${node.code} 必须由统一状态变更节点目录生成`
    )
  })
})

const labelPrintNode = changeNodes.find((node) => node.code === 'label_print')
const categoryLabelPrintDefinition = FLOW_STAGE_DEFINITIONS.find(
  (definition) => definition.dimensionCode === 'business' && definition.stageCode === 'category:label_print'
)
assert.equal(
  categoryLabelPrintDefinition?.label,
  `管理类别调整 · ${labelPrintNode?.summaryLabel || labelPrintNode?.name}`,
  '组合状态名称必须直接消费统一工作流节点展示名称'
)
