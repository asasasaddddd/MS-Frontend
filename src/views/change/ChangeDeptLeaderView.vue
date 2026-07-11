<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { approveChange, getChangeOrderDetail, rejectChange } from '@/api/change'
import { listWorkflowTasks } from '@/api/workflow'
import { useSessionStore } from '@/stores/session'
import type { ChangeOrderVO } from '@/types/change'
import type { WorkflowTask } from '@/types/workflow'
import {
  changeStatusName,
  changeTagColor,
  changeTypeName,
  display,
  formatDateTime,
  normalizeChangeType,
  statusTagColor,
  type ChangeTaskRow
} from '@/views/change/changeDisplayModel'
import ChangeApprovalDialog from '@/views/change/components/ChangeApprovalDialog.vue'
import { isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'

const session = useSessionStore()
const loading = ref(false)
const submitting = ref(false)
const rows = ref<ChangeTaskRow[]>([])
const selectedRowKeys = ref<string[]>([])
const keyword = ref('')
const approvalOpen = ref(false)
const activeOrders = ref<ChangeOrderVO[]>([])

const pageTitle = computed(() => (session.user?.roleCode === 'MEASURE_LEADER' ? '计量领导待办' : '主管领导待办'))
const roleText = computed(() => `${session.user?.roleName || pageTitle.value} · ${session.user?.employeeName || session.user?.employeeId || '-'}`)

const columns = [
  { title: '申请编号', key: 'orderNo', width: 170 },
  { title: '申请时间', key: 'applyTime', width: 160 },
  { title: '数量', key: 'itemCount', width: 86 },
  { title: '变更流程', key: 'changeType', width: 140 },
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

const metrics = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    todoCount: rows.value.length,
    todayCount: rows.value.filter((row) => String(row.order.applyTime || '').slice(0, 10) === today).length
  }
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
      selectedRows.value.length > 0 &&
      !selectedRowKeys.value.includes(record.key) &&
      normalizeChangeType(record.order.changeType) !== selectedChangeType.value
  })
}))

function resetFilter() {
  keyword.value = ''
}

function rowKey(row: ChangeTaskRow) {
  return row.key
}

function toRow(task: WorkflowTask, order: ChangeOrderVO): ChangeTaskRow {
  return {
    key: String(task.businessId),
    taskId: task.id,
    nodeCode: task.nodeCode,
    nodeName: task.nodeName,
    order
  }
}

async function loadRows() {
  loading.value = true
  selectedRowKeys.value = []
  try {
    const nodeSet = new Set<string>(workflowNodeGroups.change.approval)
    const tasks = (await listWorkflowTasks()).filter(
      (task) => isPendingWorkflowTask(task) && matchesBusinessType(task.businessType, 'change') && nodeSet.has(task.nodeCode)
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
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '状态变更待办加载失败')
  } finally {
    loading.value = false
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
  activeOrders.value = targetRows.map((row) => row.order)
  approvalOpen.value = true
}

function openDetail(row: ChangeTaskRow) {
  openApproval([row])
}

async function approveOrder(order: ChangeOrderVO, opinion = '同意') {
  await approveChange({ orderId: order.id, opinion })
}

async function rejectOrder(order: ChangeOrderVO, reason = '退回修改') {
  await rejectChange({ orderId: order.id, reason })
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

onMounted(loadRows)
</script>

<template>
  <section class="change-approval-page">
    <div class="summary-line">
      <a-card class="metric" :bordered="false">
        <span>状态变更待办</span>
        <strong>{{ metrics.todoCount }}项</strong>
      </a-card>
      <a-card class="metric" :bordered="false">
        <span>今日新增</span>
        <strong>{{ metrics.todayCount }}项</strong>
      </a-card>
      <div class="role-pill">{{ roleText }}</div>
    </div>

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
        :scroll="{ x: 940 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'orderNo'">{{ display(record.order.orderNo) }}</template>
          <template v-else-if="column.key === 'applyTime'">{{ formatDateTime(record.order.applyTime) }}</template>
          <template v-else-if="column.key === 'itemCount'">{{ display(record.order.itemCount || record.order.items?.length) }}</template>
          <template v-else-if="column.key === 'changeType'">
            <a-tag :class="['tag', changeTagColor(record.order.changeType)]">{{ changeTypeName(record.order.changeType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'status'">
            <a-tag :class="['tag', statusTagColor(record.order.status)]">{{ changeStatusName(record.order.status) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" class="button-link" @click="openDetail(record)">处理</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

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

.summary-line {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.metric {
  width: 140px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.metric :deep(.ant-card-body) {
  padding: 12px 16px;
}

.metric span {
  color: #667085;
  font-size: 13px;
}

.metric strong {
  display: block;
  margin-top: 4px;
  color: #172033;
  font-size: 22px;
  line-height: 1.2;
}

.role-pill {
  display: flex;
  align-items: center;
  padding: 0 14px;
  border: 1px solid #b7d3ff;
  border-radius: 8px;
  background: #eef5ff;
  color: #175cd3;
  font-weight: 700;
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
  .summary-line,
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
