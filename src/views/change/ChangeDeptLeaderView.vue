<script setup lang="ts">
import { computed, onScopeDispose, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { useRoute } from 'vue-router'
import { approveChange, getChangeOrderDetail, rejectChange } from '@/api/change'
import { listWorkflowTasks } from '@/api/workflow'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import { useRoleTodoSummary } from '@/composables/useRoleTodoSummary'
import { useSessionStore } from '@/stores/session'
import type { ChangeOrderVO } from '@/types/change'
import type { WorkflowTask } from '@/types/workflow'
import {
  CHANGE_APPROVE_ACTION,
  changeNodeName,
  changeStatusName,
  changeTagColor,
  changeTypeName,
  display,
  formatDateTime,
  hasChangeAction,
  normalizeChangeType,
  statusTagColor,
  type ChangeTaskRow
} from '@/views/change/changeDisplayModel'
import ChangeApprovalDialog from '@/views/change/components/ChangeApprovalDialog.vue'
import ChangeHistoryPanel from '@/views/change/components/ChangeHistoryPanel.vue'
import { isPendingWorkflowTask, matchesBusinessType } from '@/workflows/metrologyWorkflow'

const route = useRoute()
const session = useSessionStore()
const loading = ref(false)
const submitting = ref(false)
const rows = ref<ChangeTaskRow[]>([])
const selectedRowKeys = ref<string[]>([])
const keyword = ref('')
const approvalOpen = ref(false)
const activeOrders = ref<ChangeOrderVO[]>([])
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
let rowLoadGeneration = 0
let rowLoadController: AbortController | undefined

const columns = [
  { title: '申请编号', key: 'orderNo', width: 170 },
  { title: '申请时间', key: 'applyTime', width: 160 },
  { title: '数量', key: 'itemCount', width: 86 },
  { title: '变更流程', key: 'changeType', width: 140 },
  { title: '当前节点', key: 'nodeName', width: 160 },
  { title: '当前状态', key: 'status', width: 120 },
  { title: '操作', key: 'action', fixed: 'right', width: 100 }
]

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const order = row.order
    return (
      !text ||
      [order.orderNo, changeTypeName(order.changeType), order.reason]
        .filter(Boolean)
        .some((value) => String(value).includes(text))
    )
  })
})

const selectedRows = computed(() => rows.value.filter((row) => selectedRowKeys.value.includes(row.key)))
const selectedChangeType = computed(() => normalizeChangeType(selectedRows.value[0]?.order.changeType))

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  },
  getCheckboxProps: (record: ChangeTaskRow) => ({
    disabled:
      !hasChangeAction(record, CHANGE_APPROVE_ACTION) ||
      (selectedRows.value.length > 0 &&
        !selectedRowKeys.value.includes(record.key) &&
        normalizeChangeType(record.order.changeType) !== selectedChangeType.value)
  })
}))

function resetFilter() {
  keyword.value = ''
}

function rowKey(row: ChangeTaskRow) {
  return row.key
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

function isCurrentRowLoad(
  generation: number,
  requestedIdentity: string,
  activeController: AbortController
) {
  return !(
    generation !== rowLoadGeneration || activeController.signal.aborted || workflowIdentity.value !== requestedIdentity
  )
}

async function loadRows() {
  const requestedIdentity = workflowIdentity.value
  const generation = ++rowLoadGeneration
  rowLoadController?.abort()
  const activeController = new AbortController()
  rowLoadController = activeController
  loading.value = true
  rows.value = []
  selectedRowKeys.value = []
  approvalOpen.value = false
  activeOrders.value = []
  const summaryPromise = refreshSummary().catch(() => undefined)
  try {
    const [taskResult] = await Promise.allSettled([
      listWorkflowTasks('CHANGE', activeController.signal)
    ])
    if (!isCurrentRowLoad(generation, requestedIdentity, activeController)) return

    if (taskResult.status === 'fulfilled') {
      const tasks = taskResult.value.filter(
        (task) => isPendingWorkflowTask(task) && matchesBusinessType(task.businessType, 'change')
      )
      const details = await Promise.allSettled(
        tasks.map(async (task) => ({
          task,
          order: await getChangeOrderDetail(task.businessId, activeController.signal)
        }))
      )
      if (!isCurrentRowLoad(generation, requestedIdentity, activeController)) return
      rows.value = details
        .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: ChangeOrderVO }> => item.status === 'fulfilled')
        .map((item) => toRow(item.value.task, item.value.order))
      const targetOrderId = route.query.orderId ? String(route.query.orderId) : ''
      const targetRow = targetOrderId ? rows.value.find((row) => String(row.order.id) === targetOrderId) : undefined
      if (targetRow) openDetail(targetRow)
    } else {
      rows.value = []
      message.error(taskResult.reason instanceof Error ? taskResult.reason.message : '状态变更待办加载失败')
    }
  } finally {
    await summaryPromise
    if (generation === rowLoadGeneration) {
      loading.value = false
      rowLoadController = undefined
    }
  }
}

function assertSameChangeType(targetRows: ChangeTaskRow[]) {
  const types = new Set(targetRows.map((row) => normalizeChangeType(row.order.changeType)))
  return types.size <= 1
}

function openApproval(targetRows: ChangeTaskRow[]) {
  if (targetRows.length === 0) {
    message.warning('请选择需要处理的状态变更单')
    return
  }
  if (!assertSameChangeType(targetRows)) {
    message.warning('只能同时选择相同变更类型的状态变更单')
    return
  }
  if (targetRows.some((row) => !hasChangeAction(row, CHANGE_APPROVE_ACTION))) {
    message.warning('当前任务已无审批权限，请刷新后重试')
    return
  }
  activeOrders.value = targetRows.map((row) => row.order)
  approvalOpen.value = true
}

function openDetail(row: ChangeTaskRow) {
  openApproval([row])
}

async function approveOrder(order: ChangeOrderVO, opinion = '同意') {
  if (order.taskId === undefined || order.rowVersion === undefined) {
    throw new Error('状态变更任务身份不完整，请刷新后重试')
  }
  await approveChange({
    orderId: order.id,
    taskId: order.taskId,
    rowVersion: order.rowVersion,
    opinion
  })
}

async function rejectOrder(order: ChangeOrderVO, reason = '退回修改') {
  if (order.taskId === undefined || order.rowVersion === undefined) {
    throw new Error('状态变更任务身份不完整，请刷新后重试')
  }
  await rejectChange({
    orderId: order.id,
    taskId: order.taskId,
    rowVersion: order.rowVersion,
    reason
  })
}

async function handleApprove(opinion: string) {
  if (activeOrders.value.length === 0) return
  submitting.value = true
  try {
    await Promise.all(activeOrders.value.map((order) => approveOrder(order, opinion)))
    message.success(`已同意 ${activeOrders.value.length} 条状态变更单`)
    approvalOpen.value = false
    activeOrders.value = []
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '审批失败')
  } finally {
    submitting.value = false
  }
}

async function handleReject(reason: string) {
  if (activeOrders.value.length === 0) return
  submitting.value = true
  try {
    await Promise.all(activeOrders.value.map((order) => rejectOrder(order, reason)))
    message.success(`已退回 ${activeOrders.value.length} 条状态变更单`)
    approvalOpen.value = false
    activeOrders.value = []
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '退回失败')
  } finally {
    submitting.value = false
  }
}

function batchApprove() {
  openApproval(selectedRows.value)
}

function batchReject() {
  openApproval(selectedRows.value)
}

watch(workflowIdentity, () => {
  void loadRows()
}, { immediate: true })

onScopeDispose(() => {
  rowLoadGeneration += 1
  rowLoadController?.abort()
  rowLoadController = undefined
})
</script>

<template>
  <section class="change-approval-page">
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
        <h2>状态变更明细</h2>
      </template>

      <div class="task-filter">
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按申请编号、设备名称查询" allow-clear />
        <a-button type="primary">查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
        <div class="filter-spacer"></div>
        <a-button danger :disabled="selectedRows.length === 0" :loading="submitting" @click="batchReject">退回</a-button>
        <a-button type="primary" :disabled="selectedRows.length === 0" :loading="submitting" @click="batchApprove">同意</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-key="rowKey"
        :row-selection="rowSelection"
        :scroll="{ x: 1100 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderNo'">{{ display(record.order.orderNo) }}</template>
          <template v-else-if="column.key === 'applyTime'">{{ formatDateTime(record.order.applyTime) }}</template>
          <template v-else-if="column.key === 'itemCount'">{{ display(record.order.itemCount || record.order.items?.length) }}</template>
          <template v-else-if="column.key === 'changeType'">
            <a-tag :class="['tag', changeTagColor(record.order.changeType)]">{{ changeTypeName(record.order.changeType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'nodeName'">{{ record.nodeName || changeNodeName(record.nodeCode) }}</template>
          <template v-else-if="column.key === 'status'">
            <a-tag :class="['tag', statusTagColor(record.order.status)]">{{ changeStatusName(record.order.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button
              v-if="hasChangeAction(record, CHANGE_APPROVE_ACTION)"
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

    <ChangeApprovalDialog
      v-model:open="approvalOpen"
      :orders="activeOrders"
      :submitting="submitting"
      @approve="handleApprove"
      @reject="handleReject"
    />
  </section>
</template>

<style scoped>
.change-approval-page {
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
  width: 300px;
}

.filter-spacer {
  flex: 1;
  min-width: 0;
}

.button-link {
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

@media (max-width: 900px) {
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .keyword-input {
    width: 100%;
  }
}
</style>
