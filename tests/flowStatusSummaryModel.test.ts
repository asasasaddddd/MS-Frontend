import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import type { FlowSummary } from '../src/types/flowSummary.ts'
import {
  buildFlowStatusViewModel,
  validateFlowSummary
} from '../src/components/workflow/flowStatusDefinitions.ts'

const summary: FlowSummary = {
  businessType: 'periodic',
  scope: 'plan:2079830500997668866',
  snapshotAt: '2026-07-22T10:30:00',
  overview: [
    { metricCode: 'total', countUnit: 'device', value: 6 },
    { metricCode: 'completed', countUnit: 'device', value: 1 }
  ],
  dimensions: [
    {
      dimensionCode: 'result',
      countUnit: 'device',
      totalCount: 6,
      unknownCount: 1,
      stageCounts: { qualified: 3, pending: 2 }
    },
    {
      dimensionCode: 'physical',
      countUnit: 'device',
      totalCount: 6,
      unknownCount: 0,
      stageCounts: {
        wait_sendout_return_receive: 2,
        wait_external_receive: 3,
        verifier_received: 1
      }
    },
    {
      dimensionCode: 'business',
      countUnit: 'device',
      totalCount: 6,
      unknownCount: 0,
      stageCounts: { completed: 1, plan_confirm: 5 }
    },
    {
      dimensionCode: 'label',
      countUnit: 'device',
      totalCount: 6,
      unknownCount: 0,
      stageCounts: { printed: 1, pending: 5 }
    }
  ]
}

const viewModel = buildFlowStatusViewModel(summary)

assert.deepEqual(
  viewModel.dimensions.map((dimension) => dimension.dimensionCode),
  ['business', 'physical', 'label', 'result'],
  '四个状态维度必须按统一配置排序，不能受后端数组顺序影响'
)

const physicalDimension = viewModel.dimensions.find(
  (dimension) => dimension.dimensionCode === 'physical'
)
assert.ok(physicalDimension)
assert.equal(physicalDimension.countUnitLabel, '台')
assert.equal(physicalDimension.totalCount, 6)
assert.deepEqual(
  physicalDimension.stages.map(({ stageCode, label, count }) => ({ stageCode, label, count })),
  [
    { stageCode: 'verifier_received', label: '检定员已接收', count: 1 },
    { stageCode: 'wait_external_receive', label: '待送出', count: 3 },
    { stageCode: 'wait_sendout_return_receive', label: '待送回', count: 2 }
  ],
  '待送出和待送回必须使用后端物理状态分别显示，不能合并或推断'
)

const resultDimension = viewModel.dimensions.find(
  (dimension) => dimension.dimensionCode === 'result'
)
assert.ok(resultDimension)
assert.equal(resultDimension.unknownCount, 1)
assert.equal(resultDimension.hasWarning, true)

assert.deepEqual(
  viewModel.overview.map(({ metricCode, label, value, countUnitLabel }) => ({
    metricCode,
    label,
    value,
    countUnitLabel
  })),
  [
    { metricCode: 'total', label: '总数', value: 6, countUnitLabel: '台' },
    { metricCode: 'completed', label: '已完成', value: 1, countUnitLabel: '台' }
  ]
)

const summaryWithUnregisteredStage: FlowSummary = {
  ...summary,
  dimensions: [
    {
      dimensionCode: 'business',
      countUnit: 'order',
      totalCount: 2,
      unknownCount: 0,
      stageCounts: { plan_confirm: 1, backend_new_node: 1 }
    }
  ]
}

const unknownStageView = buildFlowStatusViewModel(summaryWithUnregisteredStage)
const unregisteredStage = unknownStageView.dimensions[0]?.stages.find(
  (stage) => stage.stageCode === 'backend_new_node'
)
assert.ok(unregisteredStage)
assert.equal(unregisteredStage.label, '未知状态（backend_new_node）')
assert.equal(unregisteredStage.tone, 'error')
assert.equal(unknownStageView.dimensions[0]?.hasWarning, true)

assert.deepEqual(validateFlowSummary(summary), [])

const invalidSummary: FlowSummary = {
  ...summary,
  dimensions: [
    {
      dimensionCode: 'label',
      countUnit: 'device',
      totalCount: 8,
      unknownCount: 1,
      stageCounts: { pending: 2, printed: 3 }
    }
  ]
}

const validationIssues = validateFlowSummary(invalidSummary)
assert.equal(validationIssues.length, 1)
assert.match(validationIssues[0]?.message || '', /总数 8/)
assert.match(validationIssues[0]?.message || '', /已分类 5/)
assert.match(validationIssues[0]?.message || '', /未知 1/)

const componentSource = readFileSync(
  new URL('../src/components/workflow/FlowStatusSummary.vue', import.meta.url),
  'utf8'
)
const apiSource = readFileSync(new URL('../src/api/flowSummary.ts', import.meta.url), 'utf8')

assert.match(componentSource, /summary\??:\s*FlowSummary\s*\|\s*null/)
assert.doesNotMatch(componentSource, /tasks\??\s*:/)
assert.match(componentSource, /<a-alert/)
assert.match(componentSource, /countUnitLabel/)
assert.doesNotMatch(componentSource, /setInterval|setTimeout/)
assert.match(apiSource, /\/periodic\/plans\/\$\{encodeURIComponent\(String\(planId\)\)\}\/summary/)

const productionContractSummary: FlowSummary = {
  businessType: 'CHANGE',
  scope: 'pending',
  snapshotAt: '2026-07-22T11:00:00',
  overview: [
    { metricCode: 'total_device', countUnit: 'device', value: 8 },
    { metricCode: 'type:seal', countUnit: 'order', value: 2 }
  ],
  dimensions: [
    {
      dimensionCode: 'workflow',
      countUnit: 'order',
      totalCount: 2,
      unknownCount: 0,
      stageCounts: { 'seal:measure_leader_review': 2 }
    },
    {
      dimensionCode: 'physical',
      countUnit: 'device',
      totalCount: 0,
      unknownCount: 0,
      stageCounts: { none: 0 }
    },
    {
      dimensionCode: 'label',
      countUnit: 'device',
      totalCount: 1,
      unknownCount: 0,
      stageCounts: { not_generated: 1 }
    },
    {
      dimensionCode: 'result',
      countUnit: 'device',
      totalCount: 1,
      unknownCount: 0,
      stageCounts: { limited: 1 }
    }
  ]
}

const productionContractView = buildFlowStatusViewModel(productionContractSummary)
assert.equal(productionContractView.overview[0]?.label, '设备总数')
assert.equal(productionContractView.overview[1]?.label, '封存')
assert.equal(productionContractView.dimensions[0]?.dimensionCode, 'workflow')
assert.equal(productionContractView.dimensions[0]?.label, '工作流节点')
assert.equal(productionContractView.dimensions[0]?.stages[0]?.label, '封存 · 待计量领导审批')
assert.equal(productionContractView.dimensions[1]?.hasWarning, false)
assert.equal(productionContractView.dimensions[2]?.stages[0]?.label, '未生成')
assert.equal(productionContractView.dimensions[3]?.stages[0]?.label, '限用')

const changeResultSummary: FlowSummary = {
  businessType: 'CHANGE',
  scope: 'history',
  snapshotAt: '2026-07-22T12:00:00',
  overview: [],
  dimensions: [
    {
      dimensionCode: 'result',
      countUnit: 'item',
      totalCount: 3,
      unknownCount: 0,
      stageCounts: {
        'verification:qualified': 1,
        'approval:returned': 1,
        'item:processing': 1
      }
    }
  ]
}

assert.deepEqual(
  buildFlowStatusViewModel(changeResultSummary).dimensions[0]?.stages.map(
    ({ stageCode, label }) => ({ stageCode, label })
  ),
  [
    { stageCode: 'verification:qualified', label: '检定合格' },
    { stageCode: 'approval:returned', label: '审批已退回' },
    { stageCode: 'item:processing', label: '明细处理中' }
  ],
  '状态变更结果必须按后端来源前缀映射，不能降级为未知状态'
)

const periodicNodeSummary: FlowSummary = {
  businessType: 'PERIODIC',
  scope: 'plan:1',
  snapshotAt: '2026-07-22T12:00:00',
  overview: [],
  dimensions: [
    {
      dimensionCode: 'business',
      countUnit: 'device',
      totalCount: 2,
      unknownCount: 0,
      stageCounts: { manager_receive: 1, send_out_return: 1 }
    }
  ]
}

assert.deepEqual(
  buildFlowStatusViewModel(periodicNodeSummary).dimensions[0]?.stages.map(
    ({ stageCode, label }) => ({ stageCode, label })
  ),
  [
    { stageCode: 'manager_receive', label: '待管理员接收' },
    { stageCode: 'send_out_return', label: '待外委送回' }
  ]
)
