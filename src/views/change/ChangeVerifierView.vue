<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { message } from 'ant-design-vue'
import { getChangeOrderDetail, verifierHandleChange } from '@/api/change'
import { listWorkflowTasks } from '@/api/workflow'
import type { ChangeOrderVO, ChangeVerifierHandleRequest } from '@/types/change'
import type { WorkflowTask } from '@/types/workflow'
import {
  changeTagColor,
  changeTypeName,
  display,
  formatDateTime,
  resolveItemSnapshot,
  type ChangeTaskRow
} from '@/views/change/changeDisplayModel'
import ChangeDetailDialog from '@/views/change/components/ChangeDetailDialog.vue'
import { isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'

const loading = ref(false)
const rows = ref<ChangeTaskRow[]>([])
const keyword = ref('')
const sourceFilter = ref('all')
const detailOpen = ref(false)
const activeOrder = ref<ChangeOrderVO | null>(null)
const submitting = ref(false)

const sourceOptions = [
  { label: '来源流程筛选', value: 'all' },
  { label: '启用', value: 'enable' },
  { label: '管理类别调整', value: 'category' },
  { label: '检定周期调整', value: 'cycle' },
  { label: '用前检定', value: 'precheck' },
  { label: '周检报废退回', value: 'periodic_scrap_return' },
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

const metrics = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return {
    todoCount: rows.value.length,
    todayCount: rows.value.filter((row) => String(row.order.applyTime || '').slice(0, 10) === today).length,
    handleCount: rows.value.filter((row) => row.nodeCode === 'verifier_handle').length
  }
})

function resetFilter() {
  sourceFilter.value = 'all'
  keyword.value = ''
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
  try {
    const nodeSet = new Set<string>(workflowNodeGroups.change.verifier)
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
    message.error(error instanceof Error ? error.message : '检定员状态变更待办加载失败')
  } finally {
    loading.value = false
  }
}

function openDetail(row: ChangeTaskRow) {
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
    <div class="summary-line">
      <a-card class="metric" :bordered="false">
        <span>状态变更待办</span>
        <strong>{{ metrics.todoCount }}项</strong>
      </a-card>
      <a-card class="metric" :bordered="false">
        <span>今日新增</span>
        <strong>{{ metrics.todayCount }}项</strong>
      </a-card>
      <div class="status-strip">
        <div class="status-check">✓</div>
        <a-tag class="tag orange">待检定员处理 {{ metrics.handleCount }}</a-tag>
        <a-tag class="tag blue">通过后完成状态回写</a-tag>
        <a-tag class="tag red">不通过则终止变更单</a-tag>
      </div>
    </div>

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>状态变更待办明细</h2>
          <a-tag class="tag orange">{{ metrics.todoCount }} 项待办</a-tag>
        </div>
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
          <template v-else-if="column.key === 'nodeName'">{{ display(record.nodeName || record.nodeCode) }}</template>
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
            <a-button type="link" class="button-link" @click="openDetail(record)">处理</a-button>
          </template>
        </template>
      </a-table>
    </a-card>

    <ChangeDetailDialog
      v-model:open="detailOpen"
      :order="activeOrder"
      mode="verifier"
      :submitting="submitting"
      @verifier-submit="handleVerifierSubmit"
    />
  </section>
</template>

<style scoped>
.change-verifier-page {
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
  flex-shrink: 0;
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

.status-strip {
  min-width: 0;
  display: flex;
  align-items: center;
  flex: 1;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #d9f3e5;
  border-radius: 8px;
  background: #fbfffd;
  overflow-x: auto;
}

.status-check {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #12b76a;
  color: #ffffff;
  font-size: 13px;
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

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
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
  .summary-line,
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .metric,
  .source-select,
  .keyword-input {
    width: 100%;
  }
}
</style>
