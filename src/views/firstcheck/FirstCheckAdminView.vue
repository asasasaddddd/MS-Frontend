<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { getFirstCheckDetail } from '@/api/firstcheck'
import { listWorkflowTasks } from '@/api/workflow'
import type { FirstCheckAdminRow, FirstCheckOrder } from '@/types/firstcheck'
import type { WorkflowTask } from '@/types/workflow'
import { getWorkflowNodeName, isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import FirstCheckCategoryDialog from '@/views/firstcheck/components/FirstCheckCategoryDialog.vue'

type StatusFilter = 'all' | 'manager_check' | 'returned'

const route = useRoute()
const loading = ref(false)
const rows = ref<FirstCheckAdminRow[]>([])
const statusFilter = ref<StatusFilter>('all')
const keyword = ref('')
const detailOpen = ref(false)
const categoryOpen = ref(false)
const activeRow = ref<FirstCheckAdminRow>()

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
  { label: '待分类', value: 'manager_check' },
  { label: '退回待修改', value: 'returned' }
]

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const order = row.order
    const matchesStatus =
      statusFilter.value === 'all' ||
      (statusFilter.value === 'returned' && row.statusLabel.includes('退回')) ||
      row.nodeCode === statusFilter.value
    const matchesKeyword =
      !text ||
      (order.orderNo || '').includes(text) ||
      (order.deviceName || '').includes(text) ||
      (order.materialCode || '').includes(text)
    return matchesStatus && matchesKeyword
  })
})

const todayKey = computed(() => new Date().toISOString().slice(0, 10))

const metrics = computed(() => {
  const todoCount = rows.value.length
  const todayCount = rows.value.filter((row) => (row.order.applyTime || '').slice(0, 10) === todayKey.value).length
  const categoryCount = rows.value.filter((row) => row.nodeCode === 'manager_check').length
  const returnedCount = rows.value.filter((row) => row.statusLabel.includes('退回')).length
  return { todoCount, todayCount, categoryCount, returnedCount }
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
  if (nodeCode === 'manager_check') return { statusLabel: '待分类', statusColor: 'orange' }
  return { statusLabel: getWorkflowNodeName('firstcheck', nodeCode, order.currentNodeName || '待处理'), statusColor: 'orange' }
}

function toRow(task: WorkflowTask, order: FirstCheckOrder): FirstCheckAdminRow {
  const nodeCode = task.nodeCode || order.currentNodeCode || order.currentNode || ''
  const status = resolveStatus(task, order)
  return {
    key: task.businessId,
    taskId: task.id,
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
  if (row.nodeCode === 'manager_check') {
    categoryOpen.value = true
    return
  }
  detailOpen.value = true
}

async function loadRows() {
  loading.value = true
  try {
    const tasks = await listWorkflowTasks()
    const adminNodeSet = new Set<string>(workflowNodeGroups.firstcheck.admin)
    const firstCheckTasks = tasks.filter((task) => {
      const pending = isPendingWorkflowTask(task)
      return pending && matchesBusinessType(task.businessType, 'firstcheck') && adminNodeSet.has(task.nodeCode) && matchesRouteOrder(task)
    })

    const details = await Promise.allSettled(
      firstCheckTasks.map(async (task) => ({
        task,
        order: await getFirstCheckDetail(task.businessId)
      }))
    )

    rows.value = details
      .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: FirstCheckOrder }> => item.status === 'fulfilled')
      .map((item) => toRow(item.value.task, item.value.order))
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '首检待办加载失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadRows)
</script>

<template>
  <section class="firstcheck-admin-page">
    <div class="summary-line">
      <div class="metric-grid compact">
        <a-card class="metric" :bordered="false">
          <span>首检待办</span>
          <strong>{{ metrics.todoCount }}项</strong>
        </a-card>
        <a-card class="metric" :bordered="false">
          <span>今日新增</span>
          <strong>{{ metrics.todayCount }}项</strong>
        </a-card>
      </div>

      <div class="status-strip">
        <div class="status-check">✓</div>
        <a-tag class="tag orange">待分类 {{ metrics.categoryCount }}</a-tag>
        <a-tag class="tag red">退回待修改 {{ metrics.returnedCount }}</a-tag>
      </div>
    </div>

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

    <FirstCheckCategoryDialog v-model:open="categoryOpen" :order="activeRow?.order" @success="loadRows" />
  </section>
</template>

<style scoped>
.firstcheck-admin-page {
  display: grid;
  gap: 16px;
}

.summary-line {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.metric-grid.compact {
  display: grid;
  grid-template-columns: repeat(2, 140px);
  gap: 14px;
  flex-shrink: 0;
}

.metric {
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
  .summary-line,
  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .metric-grid.compact {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
