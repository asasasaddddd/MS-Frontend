<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { batchDeptLeaderApproveFirstCheck, getFirstCheckDetail } from '@/api/firstcheck'
import { getFirstCheckFlowSummary } from '@/api/flowSummary'
import { listWorkflowTasks } from '@/api/workflow'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import type { FirstCheckOrder } from '@/types/firstcheck'
import type { FlowSummary } from '@/types/flowSummary'
import type { WorkflowTask } from '@/types/workflow'
import { isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'
import FirstCheckLeaderDialog from '@/views/firstcheck/components/FirstCheckLeaderDialog.vue'
import FirstCheckHistoryPanel from '@/views/firstcheck/components/FirstCheckHistoryPanel.vue'

interface LeaderRow {
  key: string
  taskId: string | number
  nodeCode: string
  order: FirstCheckOrder
}

const route = useRoute()
const loading = ref(false)
/** 后端按当前主管领导参与范围生成的首检流程汇总快照。 */
const firstCheckFlowSummary = ref<FlowSummary | null>(null)
/** 统一汇总接口的加载状态，与待办表加载状态分别传给各自组件。 */
const summaryLoading = ref(false)
const submitting = ref(false)
const rows = ref<LeaderRow[]>([])
const selectedRowKeys = ref<string[]>([])
const keyword = ref('')
const leaderOpen = ref(false)
const activeRow = ref<LeaderRow>()
const activeTab = ref(route.query.tab === 'history' ? 'history' : 'todo')

const routeOrderId = computed(() => {
  const value = route.query.orderId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})

function matchesRouteOrder(task: WorkflowTask) {
  const orderId = routeOrderId.value
  return !orderId || String(task.businessId) === orderId
}

const columns = [
  { title: '首检编号', dataIndex: ['order', 'orderNo'], key: 'orderNo', width: 160 },
  { title: '申请时间', dataIndex: ['order', 'applyTime'], key: 'applyTime', width: 180 },
  { title: '设备名称', dataIndex: ['order', 'deviceName'], key: 'deviceName', width: 150 },
  { title: '物料编码', dataIndex: ['order', 'materialCode'], key: 'materialCode', width: 150 },
  { title: '物料描述', dataIndex: ['order', 'materialName'], key: 'materialName', width: 190 },
  { title: '数量', dataIndex: ['order', 'quantity'], key: 'quantity', width: 86 },
  { title: '管理类别', dataIndex: ['order', 'requestedCategory'], key: 'requestedCategory', width: 120 },
  { title: '操作', key: 'action', fixed: 'right', width: 100 }
]

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const order = row.order
    return !text || (order.orderNo || '').includes(text) || (order.deviceName || '').includes(text)
  })
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  }
}))

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function normalizeDateTime(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function resetFilter() {
  keyword.value = ''
}

function openLeader(row: LeaderRow) {
  activeRow.value = row
  leaderOpen.value = true
}

/**
 * 读取当前主管领导可审批的工作流任务及其首检单详情。
 *
 * 工作流任务仍是待办范围和批量审批权限的唯一来源；详情失败的任务不会生成替代行。
 *
 * @returns 已成功取得真实首检详情的主管领导待办行。
 * @throws {ApiError} 工作流任务列表请求失败时抛出。
 */
async function fetchTaskRows(): Promise<LeaderRow[]> {
  const tasks = await listWorkflowTasks()
  const leaderNodeSet = new Set<string>(workflowNodeGroups.firstcheck.leader)
  const firstCheckTasks = tasks.filter((task) => {
    const pending = isPendingWorkflowTask(task)
    return pending && matchesBusinessType(task.businessType, 'firstcheck') && leaderNodeSet.has(task.nodeCode) && matchesRouteOrder(task)
  })

  const details = await Promise.allSettled(
    firstCheckTasks.map(async (task) => ({
      task,
      order: await getFirstCheckDetail(task.businessId)
    }))
  )

  return details
    .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: FirstCheckOrder }> => item.status === 'fulfilled')
    .map((item) => ({
      key: String(item.value.task.businessId),
      taskId: item.value.task.id,
      nodeCode: item.value.task.nodeCode,
      order: item.value.order
    }))
}

/**
 * 并行刷新主管领导待办与参与流程汇总，并分别处理两路请求结果。
 *
 * 任一路失败只清空其自己的展示数据，避免汇总故障覆盖已成功加载的真实待办。
 */
async function loadRows(): Promise<void> {
  loading.value = true
  summaryLoading.value = true
  selectedRowKeys.value = []

  const [taskResult, summaryResult] = await Promise.allSettled([
    fetchTaskRows(),
    getFirstCheckFlowSummary()
  ])

  if (taskResult.status === 'fulfilled') {
    rows.value = taskResult.value
  } else {
    rows.value = []
    message.error(taskResult.reason instanceof Error ? taskResult.reason.message : '主管领导首检待办加载失败')
  }

  if (summaryResult.status === 'fulfilled') {
    firstCheckFlowSummary.value = summaryResult.value
  } else {
    firstCheckFlowSummary.value = null
    message.error(summaryResult.reason instanceof Error ? summaryResult.reason.message : '首检参与流程汇总加载失败')
  }

  loading.value = false
  summaryLoading.value = false
}

async function submitBatchApprove() {
  if (selectedRowKeys.value.length === 0) {
    message.warning('请选择需要同意的首检单')
    return
  }
  submitting.value = true
  try {
    const result = await batchDeptLeaderApproveFirstCheck({
      orderIds: selectedRowKeys.value,
      opinion: '主管领导批量审批同意'
    })
    const failedCount = result.failedItems?.length || 0
    if (failedCount > 0) {
      message.warning(`已同意 ${result.successCount || 0} 条，失败 ${failedCount} 条`)
    } else {
      message.success(`已同意 ${result.successCount || selectedRowKeys.value.length} 条首检单`)
    }
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '批量同意失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadRows)
</script>

<template>
  <section class="firstcheck-leader-page">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="todo" tab="当前待办" />
      <a-tab-pane key="history" tab="已办" />
    </a-tabs>

    <FlowStatusSummary
      :summary="firstCheckFlowSummary"
      :loading="summaryLoading"
      title="首检参与流程汇总"
      empty-text="暂无首检参与流程汇总"
    />

    <template v-if="activeTab === 'todo'">
    <a-card class="panel" :bordered="false">
      <template #title>
        <h2>首检明细</h2>
      </template>

      <div class="task-filter">
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按首检编号、设备名称查询" allow-clear />
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
        <div class="filter-spacer"></div>
        <a-button type="primary" :loading="submitting" :disabled="selectedRowKeys.length === 0" @click="submitBatchApprove">
          同意{{ selectedRowKeys.length ? ` (${selectedRowKeys.length})` : '' }}
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-selection="rowSelection"
        :scroll="{ x: 1230 }"
        row-key="key"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'applyTime'">{{ normalizeDateTime(record.order.applyTime) }}</template>
          <template v-else-if="column.key === 'requestedCategory'">
            <a-tag class="tag blue">{{ display(record.order.requestedCategory) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" class="button-link" @click="openLeader(record)">处理</a-button>
          </template>
          <template v-else-if="column.key === 'orderNo'">{{ display(record.order.orderNo) }}</template>
          <template v-else-if="column.key === 'deviceName'">{{ display(record.order.deviceName) }}</template>
          <template v-else-if="column.key === 'materialCode'">{{ display(record.order.materialCode) }}</template>
          <template v-else-if="column.key === 'materialName'">{{ display(record.order.materialName) }}</template>
          <template v-else-if="column.key === 'quantity'">{{ display(record.order.quantity) }}</template>
        </template>
      </a-table>
    </a-card>
    </template>

    <FirstCheckHistoryPanel v-else role-code="DEPT_LEADER" :order-id="routeOrderId" />

    <FirstCheckLeaderDialog v-model:open="leaderOpen" :order="activeRow?.order" @success="loadRows" />
  </section>
</template>

<style scoped>
.firstcheck-leader-page {
  display: grid;
  gap: 16px;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel :deep(.ant-card-head) {
  min-height: 49px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel :deep(.ant-card-body) {
  padding: 0;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.task-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.keyword-input {
  width: 260px;
}

.filter-spacer {
  flex: 1;
  min-width: 0;
}

.button-link {
  height: 32px;
  padding: 0 12px;
  color: #1769e0;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.panel :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.panel :deep(.ant-table-cell) {
  white-space: nowrap;
}

@media (max-width: 980px) {
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .metric,
  .keyword-input {
    width: 100%;
  }
}
</style>
