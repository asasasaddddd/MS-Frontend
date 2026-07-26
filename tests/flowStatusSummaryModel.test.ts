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
    { metricCode: 'completed', countUnit: 'device', value: 99 },
    { metricCode: 'today_new', countUnit: 'order', value: 1 },
    { metricCode: 'pending', countUnit: 'order', value: 6 }
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
      stageCounts: { completed: 1, admin_exception_route: 5 }
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
    { metricCode: 'pending', label: '当前角色待办', value: 6, countUnitLabel: '单' },
    { metricCode: 'today_new', label: '今日新增', value: 1, countUnitLabel: '单' }
  ],
  '公共组件顶部只能展示后端返回的当前角色待办和今日新增，不能混入模块自定义指标'
)

assert.equal(
  viewModel.pendingDimension?.dimensionCode,
  'business',
  '同时存在多个维度时应优先平铺后端业务节点，不能要求用户切换分块'
)
assert.deepEqual(
  viewModel.pendingDimension?.stages.map(({ stageCode, count }) => ({ stageCode, count })),
  [
    { stageCode: 'admin_exception_route', count: 5 },
    { stageCode: 'completed', count: 1 }
  ]
)

const workflowFallbackSummary: FlowSummary = {
  ...summary,
  dimensions: [
    {
      dimensionCode: 'workflow',
      countUnit: 'order',
      totalCount: 2,
      unknownCount: 0,
      stageCounts: { dept_leader_approve: 2 }
    },
    {
      dimensionCode: 'physical',
      countUnit: 'device',
      totalCount: 2,
      unknownCount: 0,
      stageCounts: { wait_verifier_receive: 2 }
    }
  ]
}

assert.equal(
  buildFlowStatusViewModel(workflowFallbackSummary).pendingDimension?.dimensionCode,
  'workflow',
  '没有业务维度时应回退展示工作流待办节点'
)

const summaryWithUnregisteredStage: FlowSummary = {
  ...summary,
  dimensions: [
    {
      dimensionCode: 'business',
      countUnit: 'order',
      totalCount: 2,
      unknownCount: 0,
      stageCounts: { admin_exception_route: 1, backend_new_node: 1 }
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

const numericStringSummary = {
  ...summary,
  overview: [{ metricCode: 'pending', countUnit: 'order', value: '5' as unknown as number }],
  dimensions: [
    {
      dimensionCode: 'business' as const,
      countUnit: 'order' as const,
      totalCount: '5' as unknown as number,
      unknownCount: '0' as unknown as number,
      stageCounts: {
        manager_classify: '0' as unknown as number,
        verifier_verify_assign: '4' as unknown as number,
        completed: '1' as unknown as number
      }
    }
  ]
}

assert.deepEqual(
  validateFlowSummary(numericStringSummary),
  [],
  '数据库聚合值以数字字符串返回时仍应按数值校验，不能发生字符串拼接'
)
assert.equal(buildFlowStatusViewModel(numericStringSummary).overview[0]?.value, 5)
assert.equal(buildFlowStatusViewModel(numericStringSummary).dimensions[0]?.totalCount, 5)
assert.equal(buildFlowStatusViewModel(numericStringSummary).dimensions[0]?.stages[0]?.count, 4)

const detailStatusSummary: FlowSummary = {
  ...summary,
  overview: [
    { metricCode: 'pending', countUnit: 'order', value: 6 },
    { metricCode: 'today_new', countUnit: 'order', value: 2 }
  ],
  dimensions: [
    {
      dimensionCode: 'business',
      countUnit: 'order',
      totalCount: 6,
      unknownCount: 0,
      stageCounts: { manager_classify: 3, manager_revise: 3 }
    }
  ]
}

assert.deepEqual(
  buildFlowStatusViewModel(detailStatusSummary).pendingDimension?.stages.map(
    ({ stageCode, label, count }) => ({ stageCode, label, count })
  ),
  [
    { stageCode: 'manager_classify', label: '待分类', count: 3 },
    { stageCode: 'manager_revise', label: '退回待修改', count: 3 }
  ],
  '统一汇总必须按下方待办明细状态分别计数，不能只按相同工作流节点合并'
)

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
const changeApplySource = readFileSync(
  new URL('../src/views/change/ChangeApplyView.vue', import.meta.url),
  'utf8'
)
const changeHistorySource = readFileSync(
  new URL('../src/views/change/components/ChangeHistoryPanel.vue', import.meta.url),
  'utf8'
)
const changeTodoSources = [
  '../src/views/change/ChangeVerifierView.vue',
  '../src/views/change/ChangeDeptLeaderView.vue',
  '../src/views/change/components/ChangeReceiveAdminPanel.vue'
].map((source) => readFileSync(new URL(source, import.meta.url), 'utf8'))

assert.match(componentSource, /summary\??:\s*FlowSummary\s*\|\s*null/)
assert.doesNotMatch(componentSource, /tasks\??\s*:/)
assert.match(componentSource, /<a-alert/)
assert.match(componentSource, /countUnitLabel/)
assert.match(componentSource, /summary-line/)
assert.match(componentSource, /viewModel\.pendingDimension/)
assert.match(componentSource, /当前待办状态/)
assert.match(componentSource, /v-for="stage in viewModel\.pendingDimension\.stages"/)
assert.doesNotMatch(componentSource, /dimension-quick-links/)
assert.doesNotMatch(componentSource, /dimensionGroups/)
assert.doesNotMatch(componentSource, /activeGroupCode/)
assert.doesNotMatch(componentSource, /selectDimension/)
assert.doesNotMatch(componentSource, /业务流程|实物交接|标签状态/)
assert.doesNotMatch(componentSource, /@click\.stop/)
assert.doesNotMatch(componentSource, /v-show=/)
assert.doesNotMatch(componentSource, /<h2>\{\{ title \}\}<\/h2>/)
assert.doesNotMatch(componentSource, /setInterval|setTimeout/)
assert.match(apiSource, /\/periodic\/plans\/\$\{encodeURIComponent\(String\(planId\)\)\}\/summary/)
assert.doesNotMatch(changeApplySource, /FlowStatusSummary|getChangeFlowSummary/)
assert.doesNotMatch(changeHistorySource, /FlowStatusSummary|getChangeFlowSummary/)
changeTodoSources.forEach((source) => {
  assert.match(source, /FlowStatusSummary/)
  assert.match(source, /getChangeFlowSummary\('pending'\)/)
})

const productionContractSummary: FlowSummary = {
  businessType: 'CHANGE',
  scope: 'pending',
  snapshotAt: '2026-07-22T11:00:00',
  overview: [
    { metricCode: 'pending', countUnit: 'order', value: 2 },
    { metricCode: 'today_new', countUnit: 'order', value: 1 }
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
assert.equal(productionContractView.overview[0]?.label, '当前角色待办')
assert.equal(productionContractView.overview[1]?.label, '今日新增')
assert.equal(productionContractView.pendingDimension?.dimensionCode, 'workflow')
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
      stageCounts: { admin_exception_route: 1, external_uncommon_fill: 1 }
    }
  ]
}

assert.deepEqual(
  buildFlowStatusViewModel(periodicNodeSummary).dimensions[0]?.stages.map(
    ({ stageCode, label }) => ({ stageCode, label })
  ),
  [
    { stageCode: 'admin_exception_route', label: '待异常分流' },
    { stageCode: 'external_uncommon_fill', label: '待外委检定员填写否通用设备信息' }
  ]
)
