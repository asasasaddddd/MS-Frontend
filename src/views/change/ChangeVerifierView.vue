<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import { getChangeOrderDetail, verifierHandleChange } from '@/api/change'
import { listWorkflowTasks } from '@/api/workflow'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import { useRoleTodoSummary } from '@/composables/useRoleTodoSummary'
import { useSessionStore } from '@/stores/session'
import type { ChangeOrderVO, ChangeVerifierHandleRequest } from '@/types/change'
import type { WorkflowTask } from '@/types/workflow'
import {
  CHANGE_VERIFY_ACTION,
  changeTagColor,
  changeNodeName,
  changeTypeName,
  display,
  formatDateTime,
  hasChangeAction,
  resolveItemSnapshot,
  type ChangeTaskRow
} from '@/views/change/changeDisplayModel'
import ChangeVerifierHandleDialog from '@/views/change/components/ChangeVerifierHandleDialog.vue'
import ChangeHistoryPanel from '@/views/change/components/ChangeHistoryPanel.vue'
import { isPendingWorkflowTask, matchesBusinessType } from '@/workflows/metrologyWorkflow'

const route = useRoute()
const session = useSessionStore()
const loading = ref(false)
const rows = ref<ChangeTaskRow[]>([])
const keyword = ref('')
const sourceFilter = ref('all')
const detailOpen = ref(false)
const activeOrder = ref<ChangeOrderVO | null>(null)
const submitting = ref(false)
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
  ? { businessType: 'CHANGE', scopeType: 'order' as const, scopeId: routeOrderId.value }
  : { businessType: 'CHANGE' })
const {
  summary: changeFlowSummary,
  loading: summaryLoading,
  error: summaryError,
  refresh: refreshSummary
} = useRoleTodoSummary({
  identityKey: workflowIdentity,
  query: summaryScope,
  immediate: false
})

const sourceOptions = [
  { label: '来源流程筛选', value: 'all' },
  { label: '启用', value: 'enable' },
  { label: '管理类别调整', value: 'category' },
  { label: '检定周期调整', value: 'cycle' },
  { label: '用前检定', value: 'precheck' },
  { label: '非正常报废', value: 'scrap' },
  { label: '封存', value: 'seal' }
]

const columns = [
  { title: '来源流程', key: 'changeType', width: 140 },
  { title: '当前节点', key: 'nodeName', width: 140 },
  { title: '计量编号', key: 'deviceCode', width: 150 },
  { title: '设备名称', key: 'deviceName', width: 150 },
  { title: '规格型号', key: 'modelSpec', width: 150 },
  { title: '出厂编号', key: 'factoryCode', width: 150 },
  { title: '使用部门', key: 'deptName', width: 150 },
  { title: '类别', key: 'category', width: 100 },
  { title: '申请时间', key: 'applyTime', width: 150 },
  { title: '操作', key: 'action', fixed: 'right', width: 100 }
]

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const snapshot = snapshotOf(row.order)
    const matchesSource = sourceFilter.value === 'all' || row.order.changeType === sourceFilter.value
    const matchesKeyword =
      !text ||
      [snapshot.deviceCode, snapshot.deviceName, row.order.orderNo]
        .filter(Boolean)
        .some((value) => String(value).includes(text))
    return matchesSource && matchesKeyword
  })
})

function resetFilter() {
  sourceFilter.value = 'all'
  keyword.value = ''
}

function toRow(task: WorkflowTask, order: ChangeOrderVO): ChangeTaskRow {
  const actionableOrder: ChangeOrderVO = {
    ...order,
    taskId: task.taskId,
    rowVersion: task.rowVersion,
    allowedActions: [...task.allowedActions]
  }
  return {
    key: String(task.businessId),
    taskId: task.taskId,
    rowVersion: task.rowVersion,
    allowedActions: [...task.allowedActions],
    nodeCode: task.nodeCode,
    nodeName: task.nodeName,
    order: actionableOrder
  }
}

async function loadRows() {
  loading.value = true
  const summaryPromise = refreshSummary().catch(() => undefined)
  const [taskResult] = await Promise.allSettled([listWorkflowTasks('CHANGE')])

  if (taskResult.status === 'fulfilled') {
    const tasks = taskResult.value.filter(
      (task) => isPendingWorkflowTask(task) && matchesBusinessType(task.businessType, 'change')
    )
    const details = await Promise.allSettled(
      tasks.map(async (task) => ({
        task,
        order: await getChangeOrderDetail(task.businessId)
      }))
    )
    rows.value = details
      .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: ChangeOrderVO }> => item.status === 'fulfilled')
      .map((item) => toRow(item.value.task, item.value.order))
    const targetOrderId = route.query.orderId ? String(route.query.orderId) : ''
    const targetRow = targetOrderId ? rows.value.find((row) => String(row.order.id) === targetOrderId) : undefined
    if (targetRow) openDetail(targetRow)
  } else {
    rows.value = []
    message.error(taskResult.reason instanceof Error ? taskResult.reason.message : '检定员状态变更待办加载失败')
  }
  loading.value = false
  await summaryPromise
}

function openDetail(row: ChangeTaskRow) {
  if (!hasChangeAction(row, CHANGE_VERIFY_ACTION)) {
    message.warning('当前任务已无检定处理权限，请刷新后重试')
    return
  }
  activeOrder.value = row.order
  detailOpen.value = true
}

async function handleVerifierSubmit(request: ChangeVerifierHandleRequest) {
  submitting.value = true
  try {
    await verifierHandleChange(request)
    message.success('状态变更检定员处理已提交')
    detailOpen.value = false
    activeOrder.value = null
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态变更检定员处理提交失败')
  } finally {
    submitting.value = false
  }
}

function rowKey(row: ChangeTaskRow) {
  return row.key
}

function snapshotOf(order: ChangeOrderVO) {
  const item = order.items?.[0]
  return item
    ? resolveItemSnapshot(item)
    : {
        deviceCode: undefined,
        deviceName: undefined,
        modelSpec: undefined,
        factoryCode: undefined,
        deptName: undefined
      }
}

onMounted(loadRows)
</script>

<template>
  <section class="change-verifier-page">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="todo" tab="当前待办" />
      <a-tab-pane key="history" tab="已办" />
    </a-tabs>

    <template v-if="activeTab === 'todo'">
    <FlowStatusSummary
      :summary="changeFlowSummary"
      :loading="summaryLoading"
      :error="summaryError"
      title="状态变更流程汇总（当前待办）"
    />

    <a-card class="panel" :bordered="false">
      <template #title>
        <h2>状态变更待办明细</h2>
      </template>

      <div class="task-filter">
        <a-select v-model:value="sourceFilter" class="source-select" :options="sourceOptions" />
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按计量编号、设备名称查询" allow-clear />
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-key="rowKey"
        :scroll="{ x: 1340 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'changeType'">
            <a-tag :class="['tag', changeTagColor(record.order.changeType)]">{{ changeTypeName(record.order.changeType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'nodeName'">{{ record.nodeName || changeNodeName(record.nodeCode) }}</template>
          <template v-else-if="column.key === 'deviceCode'">
            {{ display(snapshotOf(record.order).deviceCode || record.order.items?.[0]?.deviceId) }}
          </template>
          <template v-else-if="column.key === 'deviceName'">{{ display(snapshotOf(record.order).deviceName) }}</template>
          <template v-else-if="column.key === 'modelSpec'">{{ display(snapshotOf(record.order).modelSpec) }}</template>
          <template v-else-if="column.key === 'factoryCode'">{{ display(snapshotOf(record.order).factoryCode) }}</template>
          <template v-else-if="column.key === 'deptName'">{{ display(snapshotOf(record.order).deptName) }}</template>
          <template v-else-if="column.key === 'category'">{{ display(record.order.items?.[0]?.newCategory || record.order.items?.[0]?.oldCategory) }}</template>
          <template v-else-if="column.key === 'applyTime'">{{ formatDateTime(record.order.applyTime) }}</template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="hasChangeAction(record, CHANGE_VERIFY_ACTION)"
              type="link"
              class="button-link"
              @click="openDetail(record)"
            >处理</a-button>
            <span v-else>-</span>
          </template>
        </template>
      </a-table>
    </a-card>
    </template>

    <ChangeHistoryPanel
      v-else
      :order-id="routeOrderId"
    />

    <ChangeVerifierHandleDialog
      v-model:open="detailOpen"
      :order="activeOrder"
      :submitting="submitting"
      @submit="handleVerifierSubmit"
    />
  </section>
</template>

<style scoped>
.change-verifier-page {
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

.source-select {
  width: 180px;
}

.keyword-input {
  width: 280px;
}

.button-link {
  color: #1769e0;
}

.backend-gap {
  margin: 12px 14px 14px;
}

.panel :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.panel :deep(.ant-table-cell) {
  white-space: nowrap;
}

.tag {
  border-radius: 6px;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.tag.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.tag.cyan {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}

@media (max-width: 980px) {
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .source-select,
  .keyword-input {
    width: 100%;
  }
}
</style>
