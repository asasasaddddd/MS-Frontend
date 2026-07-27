<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { getFirstCheckDetail } from '@/api/firstcheck'
import { listWorkflowTasks } from '@/api/workflow'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import { useRoleTodoSummary } from '@/composables/useRoleTodoSummary'
import { useSessionStore } from '@/stores/session'
import type { FirstCheckOrder } from '@/types/firstcheck'
import type { WorkflowTask } from '@/types/workflow'
import { isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'
import FirstCheckEngineerDialog from '@/views/firstcheck/components/FirstCheckEngineerDialog.vue'
import FirstCheckHistoryPanel from '@/views/firstcheck/components/FirstCheckHistoryPanel.vue'

interface EngineerRow {
  key: string
  taskId: string | number
  taskRowVersion: string | number
  allowedActions: string[]
  nodeCode: string
  order: FirstCheckOrder
}

const route = useRoute()
const session = useSessionStore()
const loading = ref(false)
const rows = ref<EngineerRow[]>([])
const statusFilter = ref('all')
const keyword = ref('')
const engineerOpen = ref(false)
const activeRow = ref<EngineerRow>()
const activeTab = ref(route.query.tab === 'history' ? 'history' : 'todo')

const routeOrderId = computed(() => {
  const value = route.query.orderId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})
const workflowIdentity = computed(() => {
  const user = session.user
  return user ? `${user.employeeId}|${user.roleCode}` : ''
})
const summaryScope = computed(() => routeOrderId.value
  ? { businessType: 'FIRST_CHECK', scopeType: 'order' as const, scopeId: routeOrderId.value }
  : { businessType: 'FIRST_CHECK' })
const {
  summary: firstCheckFlowSummary,
  loading: summaryLoading,
  error: summaryError,
  refresh: refreshSummary
} = useRoleTodoSummary({
  identityKey: workflowIdentity,
  query: summaryScope,
  immediate: false
})

function matchesRouteOrder(task: WorkflowTask) {
  const orderId = routeOrderId.value
  return !orderId || String(task.businessId) === orderId
}

const statusOptions = [
  { label: '当前状态筛选', value: 'all' },
  { label: '待确认', value: 'engineer_route' },
  { label: '退回待修改', value: 'returned' }
]

const columns = [
  { title: '首检编号', dataIndex: ['order', 'orderNo'], key: 'orderNo', width: 160 },
  { title: '申请时间', dataIndex: ['order', 'applyTime'], key: 'applyTime', width: 180 },
  { title: '设备名称', dataIndex: ['order', 'deviceName'], key: 'deviceName', width: 150 },
  { title: '数量', dataIndex: ['order', 'quantity'], key: 'quantity', width: 86 },
  { title: '物料编码', dataIndex: ['order', 'materialCode'], key: 'materialCode', width: 150 },
  { title: '物料描述', dataIndex: ['order', 'materialName'], key: 'materialName', width: 190 },
  { title: '使用部门', dataIndex: ['order', 'applyDeptName'], key: 'applyDeptName', width: 150 },
  { title: '操作', key: 'action', fixed: 'right', width: 100 }
]

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const order = row.order
    const matchesStatus = statusFilter.value === 'all' || row.nodeCode === statusFilter.value
    const matchesKeyword =
      !text ||
      (order.orderNo || '').includes(text) ||
      (order.deviceName || '').includes(text) ||
      (order.materialCode || '').includes(text)
    return matchesStatus && matchesKeyword
  })
})

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function normalizeDateTime(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function resetFilter() {
  statusFilter.value = 'all'
  keyword.value = ''
}

function openEngineer(row: EngineerRow) {
  activeRow.value = row
  engineerOpen.value = true
}

/**
 * 读取当前责任工程师可处理的工作流任务及其首检单详情。
 *
 * 工作流任务仍是待办范围和确认按钮权限的唯一来源；详情失败的任务不会生成替代行。
 *
 * @returns 已成功取得真实首检详情的责任工程师待办行。
 * @throws {ApiError} 工作流任务列表请求失败时抛出。
 */
async function fetchTaskRows(): Promise<{ rows: EngineerRow[]; tasks: WorkflowTask[] }> {
  const tasks = await listWorkflowTasks('FIRST_CHECK')
  const engineerNodeSet = new Set<string>(workflowNodeGroups.firstcheck.engineer)
  const firstCheckTasks = tasks.filter((task) => {
    const pending = isPendingWorkflowTask(task)
    return pending && matchesBusinessType(task.businessType, 'firstcheck') && engineerNodeSet.has(task.nodeCode) && matchesRouteOrder(task)
  })

  const details = await Promise.allSettled(
    firstCheckTasks.map(async (task) => ({
      task,
      order: await getFirstCheckDetail(task.businessId, task.taskId)
    }))
  )

  const taskRows = details
    .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: FirstCheckOrder }> => item.status === 'fulfilled')
    .map((item) => ({
      key: String(item.value.task.businessId),
      taskId: item.value.task.taskId,
      taskRowVersion: item.value.task.rowVersion,
      allowedActions: item.value.task.allowedActions,
      nodeCode: item.value.task.nodeCode,
      order: item.value.order
    }))
  return { rows: taskRows, tasks: firstCheckTasks }
}

/**
 * 并行刷新责任工程师待办与当前角色待办汇总，并分别处理两路请求结果。
 *
 * 任一路失败只清空其自己的展示数据，避免汇总故障覆盖已成功加载的真实待办。
 */
async function loadRows(): Promise<void> {
  loading.value = true
  const summaryPromise = refreshSummary().catch(() => undefined)

  try {
    const result = await fetchTaskRows()
    rows.value = result.rows
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '责任工程师首检待办加载失败')
  }

  loading.value = false
  await summaryPromise
}

onMounted(loadRows)
</script>

<template>
  <section class="firstcheck-engineer-page">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="todo" tab="当前待办" />
      <a-tab-pane key="history" tab="已办" />
    </a-tabs>

    <FlowStatusSummary
      :summary="firstCheckFlowSummary"
      :loading="summaryLoading"
      :error="summaryError"
      title="首检当前角色待办汇总"
      empty-text="暂无首检当前角色待办汇总"
    />

    <template v-if="activeTab === 'todo'">
    <a-card class="panel" :bordered="false">
      <template #title>
        <h2>首检明细</h2>
      </template>

      <div class="task-filter">
        <a-select v-model:value="statusFilter" class="status-select" :options="statusOptions" />
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按首检编号、设备名称查询" allow-clear />
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :scroll="{ x: 1220 }"
        row-key="key"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'applyTime'">{{ normalizeDateTime(record.order.applyTime) }}</template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" class="button-link" @click="openEngineer(record)">处理</a-button>
          </template>
          <template v-else-if="column.key === 'orderNo'">{{ display(record.order.orderNo) }}</template>
          <template v-else-if="column.key === 'deviceName'">{{ display(record.order.deviceName) }}</template>
          <template v-else-if="column.key === 'quantity'">{{ display(record.order.quantity) }}</template>
          <template v-else-if="column.key === 'materialCode'">{{ display(record.order.materialCode) }}</template>
          <template v-else-if="column.key === 'materialName'">{{ display(record.order.materialName) }}</template>
          <template v-else-if="column.key === 'applyDeptName'">{{ display(record.order.applyDeptName) }}</template>
        </template>
      </a-table>
    </a-card>
    </template>

    <FirstCheckHistoryPanel v-else :order-id="routeOrderId" />

    <FirstCheckEngineerDialog
      v-model:open="engineerOpen"
      :order="activeRow?.order"
      :task-id="activeRow?.taskId"
      :task-row-version="activeRow?.taskRowVersion"
      :allowed-actions="activeRow?.allowedActions || []"
      @success="loadRows"
    />
  </section>
</template>

<style scoped>
.firstcheck-engineer-page {
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

.status-select {
  width: 180px;
}

.keyword-input {
  width: 260px;
}

.button-link {
  height: 32px;
  padding: 0 12px;
  color: #1769e0;
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
  .status-select,
  .keyword-input {
    width: 100%;
  }
}
</style>
