<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { getFirstCheckDetail } from '@/api/firstcheck'
import { listWorkflowTasks } from '@/api/workflow'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import { buildWorkflowTaskSummary } from '@/components/workflow/workflowTaskSummary'
import type { FirstCheckAdminRow, FirstCheckOrder } from '@/types/firstcheck'
import type { FlowSummary } from '@/types/flowSummary'
import type { WorkflowTask } from '@/types/workflow'
import { getWorkflowNodeName, isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import FirstCheckCategoryDialog from '@/views/firstcheck/components/FirstCheckCategoryDialog.vue'
import FirstCheckHistoryPanel from '@/views/firstcheck/components/FirstCheckHistoryPanel.vue'

type StatusFilter = 'all' | 'manager_classify' | 'manager_revise'

const route = useRoute()
const loading = ref(false)
/** 后端按当前管理员角色待办范围生成的首检流程汇总快照。 */
const firstCheckFlowSummary = ref<FlowSummary | null>(null)
/** 统一汇总接口的加载状态，与待办表加载状态分别传给各自组件。 */
const summaryLoading = ref(false)
const rows = ref<FirstCheckAdminRow[]>([])
const statusFilter = ref<StatusFilter>('all')
const keyword = ref('')
const detailOpen = ref(false)
const categoryOpen = ref(false)
const activeRow = ref<FirstCheckAdminRow>()
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

const statusOptions = [
  { label: '当前状态筛选', value: 'all' },
  { label: '待分类', value: 'manager_classify' },
  { label: '退回待修改', value: 'manager_revise' }
]

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const order = row.order
    const matchesStatus =
      statusFilter.value === 'all' ||
      row.nodeCode === statusFilter.value
    const matchesKeyword =
      !text ||
      (order.orderNo || '').includes(text) ||
      (order.deviceName || '').includes(text) ||
      (order.materialCode || '').includes(text)
    return matchesStatus && matchesKeyword
  })
})

const columns = [
  { title: '当前状态', dataIndex: 'statusLabel', key: 'statusLabel', width: 120 },
  { title: '首检编号', dataIndex: ['order', 'orderNo'], key: 'orderNo', width: 160 },
  { title: '申请时间', dataIndex: ['order', 'applyTime'], key: 'applyTime', width: 180 },
  { title: '设备名称', dataIndex: ['order', 'deviceName'], key: 'deviceName', width: 150 },
  { title: '数量', dataIndex: ['order', 'quantity'], key: 'quantity', width: 86 },
  { title: '物料编码', dataIndex: ['order', 'materialCode'], key: 'materialCode', width: 150 },
  { title: '物料描述', dataIndex: ['order', 'materialName'], key: 'materialName', width: 180 },
  { title: '使用部门', dataIndex: ['order', 'applyDeptName'], key: 'applyDeptName', width: 150 },
  { title: '操作', key: 'action', fixed: 'right', width: 100 }
]

function normalizeDateTime(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function resolveStatus(task: WorkflowTask, order: FirstCheckOrder): Pick<FirstCheckAdminRow, 'statusLabel' | 'statusColor'> {
  const nodeCode = task.nodeCode || order.currentNodeCode || order.currentNode
  const statusText = `${order.status || ''}${order.statusDesc || ''}${order.currentNodeName || ''}`

  if (/退回|驳回|reject|return/i.test(statusText)) {
    return { statusLabel: '退回待修改', statusColor: 'red' }
  }
  if (nodeCode === 'manager_classify') return { statusLabel: '待分类', statusColor: 'orange' }
  if (nodeCode === 'manager_revise') return { statusLabel: '退回待修改', statusColor: 'red' }
  return { statusLabel: getWorkflowNodeName('firstcheck', nodeCode, order.currentNodeName || '待处理'), statusColor: 'orange' }
}

function toRow(task: WorkflowTask, order: FirstCheckOrder): FirstCheckAdminRow {
  const nodeCode = task.nodeCode || order.currentNodeCode || order.currentNode || ''
  const status = resolveStatus(task, order)
  return {
    key: String(task.businessId),
    taskId: task.taskId,
    taskRowVersion: task.rowVersion,
    allowedActions: task.allowedActions,
    nodeCode,
    nodeName: task.nodeName || order.currentNodeName || getWorkflowNodeName('firstcheck', nodeCode),
    order,
    ...status
  }
}

function resetFilter() {
  statusFilter.value = 'all'
  keyword.value = ''
}

function openDetail(row: FirstCheckAdminRow) {
  activeRow.value = row
  if (row.allowedActions.includes('SUBMIT') || row.allowedActions.includes('RESUBMIT')) {
    categoryOpen.value = true
    return
  }
  detailOpen.value = true
}

/**
 * 读取当前管理员可处理的工作流任务及其首检单详情。
 *
 * 工作流任务仍是待办范围和操作权限的唯一来源；详情失败的任务不会生成替代行。
 *
 * @returns 已成功取得真实首检详情的管理员待办行。
 * @throws {ApiError} 工作流任务列表请求失败时抛出。
 */
async function fetchTaskRows(): Promise<{ rows: FirstCheckAdminRow[]; tasks: WorkflowTask[] }> {
  const tasks = await listWorkflowTasks('FIRST_CHECK')
  const adminNodeSet = new Set<string>(workflowNodeGroups.firstcheck.admin)
  const firstCheckTasks = tasks.filter((task) => {
    const pending = isPendingWorkflowTask(task)
    return pending && matchesBusinessType(task.businessType, 'firstcheck') && adminNodeSet.has(task.nodeCode) && matchesRouteOrder(task)
  })

  const details = await Promise.allSettled(
    firstCheckTasks.map(async (task) => ({
      task,
      order: await getFirstCheckDetail(task.businessId, task.taskId)
    }))
  )

  const taskRows = details
    .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: FirstCheckOrder }> => item.status === 'fulfilled')
    .map((item) => toRow(item.value.task, item.value.order))
  return { rows: taskRows, tasks: firstCheckTasks }
}

/**
 * 并行刷新管理员待办与当前角色待办汇总，并分别处理两路请求结果。
 *
 * 任一路失败只清空其自己的展示数据，避免汇总故障覆盖已成功加载的真实待办。
 */
async function loadRows(): Promise<void> {
  loading.value = true
  summaryLoading.value = true

  try {
    const result = await fetchTaskRows()
    rows.value = result.rows
    firstCheckFlowSummary.value = buildWorkflowTaskSummary(result.tasks, 'FIRST_CHECK')
  } catch (error) {
    rows.value = []
    firstCheckFlowSummary.value = null
    message.error(error instanceof Error ? error.message : '首检待办加载失败')
  }

  loading.value = false
  summaryLoading.value = false
}

onMounted(loadRows)
</script>

<template>
  <section class="firstcheck-admin-page">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="todo" tab="当前待办" />
      <a-tab-pane key="history" tab="已办" />
    </a-tabs>

    <FlowStatusSummary
      :summary="firstCheckFlowSummary"
      :loading="summaryLoading"
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
        <div class="filter-spacer"></div>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :scroll="{ x: 1320 }"
        row-key="key"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'statusLabel'">
            <a-tag :class="['tag', record.statusColor]">{{ record.statusLabel }}</a-tag>
          </template>
          <template v-else-if="column.key === 'applyTime'">
            {{ normalizeDateTime(record.order.applyTime) }}
          </template>
          <template v-else-if="column.key === 'orderNo'">
            {{ display(record.order.orderNo) }}
          </template>
          <template v-else-if="column.key === 'deviceName'">
            {{ display(record.order.deviceName) }}
          </template>
          <template v-else-if="column.key === 'quantity'">
            {{ display(record.order.quantity) }}
          </template>
          <template v-else-if="column.key === 'materialCode'">
            {{ display(record.order.materialCode) }}
          </template>
          <template v-else-if="column.key === 'materialName'">
            {{ display(record.order.materialName) }}
          </template>
          <template v-else-if="column.key === 'applyDeptName'">
            {{ display(record.order.applyDeptName) }}
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" class="button-link" @click="openDetail(record)">处理</a-button>
          </template>
        </template>
      </a-table>
    </a-card>
    </template>

    <FirstCheckHistoryPanel v-else :order-id="routeOrderId" />

    <a-modal v-model:open="detailOpen" title="首检单详情" width="920px" :footer="null">
      <div v-if="activeRow" class="detail-grid">
        <div><span>当前状态</span><strong>{{ activeRow.statusLabel }}</strong></div>
        <div><span>当前节点</span><strong>{{ display(activeRow.nodeName) }}</strong></div>
        <div><span>首检编号</span><strong>{{ display(activeRow.order.orderNo) }}</strong></div>
        <div><span>采购订单</span><strong>{{ display(activeRow.order.purchaseOrderNo) }}</strong></div>
        <div><span>设备名称</span><strong>{{ display(activeRow.order.deviceName) }}</strong></div>
        <div><span>物料编码</span><strong>{{ display(activeRow.order.materialCode) }}</strong></div>
        <div><span>物料描述</span><strong>{{ display(activeRow.order.materialName) }}</strong></div>
        <div><span>数量</span><strong>{{ display(activeRow.order.quantity) }}</strong></div>
        <div><span>型号规格</span><strong>{{ display(activeRow.order.modelSpec) }}</strong></div>
        <div><span>精度等级</span><strong>{{ display(activeRow.order.precisionLevel) }}</strong></div>
        <div><span>使用部门</span><strong>{{ display(activeRow.order.applyDeptName) }}</strong></div>
        <div><span>供应商</span><strong>{{ display(activeRow.order.supplierName) }}</strong></div>
        <div>
          <span>供应商附件</span>
          <AttachmentListButton :group-id="activeRow.order.attachmentGroupId" title="供应商申请附件" size="small" />
        </div>
        <div>
          <span>检定证书</span>
          <AttachmentListButton :group-id="activeRow.order.certificateAttachmentGroupId" title="检定证书/报告附件" size="small" />
        </div>
      </div>
    </a-modal>

    <FirstCheckCategoryDialog
      v-model:open="categoryOpen"
      :order="activeRow?.order"
      :task-id="activeRow?.taskId"
      :task-row-version="activeRow?.taskRowVersion"
      :allowed-actions="activeRow?.allowedActions || []"
      @success="loadRows"
    />
  </section>
</template>

<style scoped>
.firstcheck-admin-page {
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

.filter-spacer {
  flex: 1;
  min-width: 0;
}

.confirmer-select {
  width: 180px;
}

.button-link {
  height: 32px;
  padding: 0 12px;
  color: #1769e0;
}

.tag {
  height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-size: 12px;
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

.panel :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.panel :deep(.ant-table-cell) {
  white-space: nowrap;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid #e5eaf1;
  border-right: 0;
  border-bottom: 0;
}

.detail-grid > div {
  min-height: 72px;
  padding: 14px 12px;
  border-right: 1px solid #e5eaf1;
  border-bottom: 1px solid #e5eaf1;
}

.detail-grid span {
  display: block;
  margin-bottom: 8px;
  color: #667085;
  font-size: 12px;
}

.detail-grid strong {
  color: #172033;
  font-size: 16px;
}

@media (max-width: 980px) {
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .status-select,
  .keyword-input,
  .confirmer-select {
    width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
