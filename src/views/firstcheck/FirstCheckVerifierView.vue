<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getFirstCheckDetail } from '@/api/firstcheck'
import { listWorkflowTasks } from '@/api/workflow'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import { buildWorkflowTaskSummary } from '@/components/workflow/workflowTaskSummary'
import type { FirstCheckOrder } from '@/types/firstcheck'
import type { FlowSummary } from '@/types/flowSummary'
import type { WorkflowTask } from '@/types/workflow'
import { useSessionStore } from '@/stores/session'
import { isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'
import FirstCheckHistoryPanel from '@/views/firstcheck/components/FirstCheckHistoryPanel.vue'
import FirstCheckVerifyDialog from '@/views/firstcheck/components/FirstCheckVerifyDialog.vue'
import {
  canOpenFirstCheckVerify,
  firstCheckVerifierAction,
  resolveFirstCheckVerifierStatus,
  type FirstCheckVerifierStatusKey
} from '@/views/firstcheck/firstCheckVerifierModel'

type StatusColor = 'orange' | 'blue' | 'red' | 'green' | 'cyan' | 'default'
type StatusFilter = 'all' | FirstCheckVerifierStatusKey

interface VerifierRow {
  key: string
  taskId: string | number
  taskRowVersion: string | number
  allowedActions: string[]
  nodeCode: string
  nodeName?: string
  statusKey: FirstCheckVerifierStatusKey
  statusLabel: string
  statusColor: StatusColor
  order: FirstCheckOrder
}

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const loading = ref(false)
/** 后端按当前检定员角色待办范围生成的首检流程汇总快照。 */
const firstCheckFlowSummary = ref<FlowSummary | null>(null)
/** 统一汇总接口的加载状态，与待办表加载状态分别传给各自组件。 */
const summaryLoading = ref(false)
const actionLoading = ref(false)
const rows = ref<VerifierRow[]>([])
const selectedRowKeys = ref<string[]>([])
const statusFilter = ref<StatusFilter>('all')
const keyword = ref('')
const verifyOpen = ref(false)
const activeRow = ref<VerifierRow>()
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
  { label: '待接收', value: 'wait_receive' },
  { label: '已接收', value: 'verifier_verify_assign' },
  { label: '待外委送出', value: 'wait_sendout' },
  { label: '已外委送出', value: 'sent_out' },
  { label: '待外委送回', value: 'wait_sendout_return' },
]

const columns = [
  { title: '当前状态', dataIndex: 'statusLabel', key: 'statusLabel', width: 120 },
  { title: '首检编号', dataIndex: ['order', 'orderNo'], key: 'orderNo', width: 160 },
  { title: '申请时间', dataIndex: ['order', 'applyTime'], key: 'applyTime', width: 180 },
  { title: '设备名称', dataIndex: ['order', 'deviceName'], key: 'deviceName', width: 150 },
  { title: '数量', dataIndex: ['order', 'quantity'], key: 'quantity', width: 86 },
  { title: '物料编码', dataIndex: ['order', 'materialCode'], key: 'materialCode', width: 150 },
  { title: '物料描述', dataIndex: ['order', 'materialName'], key: 'materialName', width: 190 },
  { title: '使用部门', dataIndex: ['order', 'applyDeptName'], key: 'applyDeptName', width: 150 },
  { title: '检定方式', dataIndex: ['order', 'verificationType'], key: 'verificationType', width: 110 },
  { title: '是否通用设备', dataIndex: ['order', 'isCommon'], key: 'isCommon', width: 130 },
  { title: '上传附件', key: 'attachment', width: 110 },
  { title: '操作', key: 'action', fixed: 'right', width: 110 }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(String)
  }
}))

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const order = row.order
    const matchesStatus = statusFilter.value === 'all' || row.statusKey === statusFilter.value
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

function verificationTypeText(value?: string) {
  if (value === 'self_check') return '自检'
  if (value === 'external_commission') return '外委'
  return display(value)
}

function commonText(value?: number) {
  if (value === 1) return '是'
  if (value === 0) return '否'
  return '-'
}

function statusSource(task: WorkflowTask, order: FirstCheckOrder) {
  return {
    nodeCode: task.nodeCode || order.currentNodeCode || order.currentNode || '',
    currentNodeCode: order.currentNodeCode,
    currentNode: order.currentNode,
    currentNodeName: order.currentNodeName,
    taskNodeName: task.nodeName,
    verificationType: order.verificationType,
    scanStatus: order.scanStatus
  }
}

function toRow(task: WorkflowTask, order: FirstCheckOrder): VerifierRow {
  const nodeCode = task.nodeCode || order.currentNodeCode || order.currentNode || ''
  const status = resolveFirstCheckVerifierStatus(statusSource(task, order))
  return {
    key: String(task.businessId || order.id),
    taskId: task.taskId,
    taskRowVersion: task.rowVersion,
    allowedActions: task.allowedActions,
    nodeCode,
    nodeName: task.nodeName || order.currentNodeName,
    order,
    ...status
  }
}

function rowStatusSource(row: VerifierRow) {
  return {
    nodeCode: row.nodeCode,
    currentNodeCode: row.order.currentNodeCode,
    currentNode: row.order.currentNode,
    currentNodeName: row.order.currentNodeName,
    taskNodeName: row.nodeName,
    verificationType: row.order.verificationType,
    scanStatus: row.order.scanStatus
  }
}

function resetFilter() {
  statusFilter.value = 'all'
  keyword.value = ''
}

/**
 * 读取当前检定员可处理的工作流任务及其首检单详情。
 *
 * 工作流任务和检定员角色匹配仍共同决定待办与操作按钮；详情失败的任务不会生成替代行。
 *
 * @returns 已成功取得真实首检详情且匹配当前检定角色的待办行。
 * @throws {ApiError} 工作流任务列表请求失败时抛出。
 */
async function fetchTaskRows(): Promise<{ rows: VerifierRow[]; tasks: WorkflowTask[] }> {
  const tasks = await listWorkflowTasks('FIRST_CHECK')
  const verifierNodeSet = new Set<string>(workflowNodeGroups.firstcheck.verifier)
  const firstCheckTasks = tasks.filter((task) => {
    const pending = isPendingWorkflowTask(task)
    return pending && matchesBusinessType(task.businessType, 'firstcheck') && verifierNodeSet.has(task.nodeCode) && matchesRouteOrder(task)
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
 * 并行刷新检定员待办与当前角色待办汇总，并分别处理两路请求结果。
 *
 * 任一路失败只清空其自己的展示数据，避免汇总故障覆盖已成功加载的真实待办。
 */
async function loadRows(): Promise<void> {
  loading.value = true
  summaryLoading.value = true
  selectedRowKeys.value = []

  try {
    const result = await fetchTaskRows()
    rows.value = result.rows
    firstCheckFlowSummary.value = buildWorkflowTaskSummary(result.tasks, 'FIRST_CHECK')
  } catch (error) {
    rows.value = []
    firstCheckFlowSummary.value = null
    message.error(error instanceof Error ? error.message : '检定员首检待办加载失败')
  }

  loading.value = false
  summaryLoading.value = false
}

function openVerify(row: VerifierRow) {
  if (!canOpenFirstCheckVerify(rowStatusSource(row))) {
    message.info('实物未完成扫码接收，暂不能填写检定信息')
    return
  }
  if (!row.allowedActions.includes('SUBMIT')) {
    message.info('当前检定任务条件尚未满足，请刷新实物交接状态')
    return
  }
  activeRow.value = row
  verifyOpen.value = true
}

async function handleAction(row: VerifierRow) {
  activeRow.value = row
  const action = firstCheckVerifierAction(rowStatusSource(row))
  if (action === 'scan_receive' || action === 'scan_sendout_return') {
    message.info('当前节点需要先到设备扫码模块接收实物')
    router.push({
      path: '/scan',
      query: {
        module: 'firstcheck',
        orderId: String(row.order.id),
        action: action === 'scan_receive' ? 'receive' : 'sendout-return'
      }
    })
    return
  }
  if (action === 'verify') {
    openVerify(row)
    return
  }
  message.info('当前节点暂不属于检定员可处理动作，请等待流程流转')
}

onMounted(loadRows)
</script>

<template>
  <section class="firstcheck-verifier-page">
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
        <a-button type="primary" disabled>转发管理员</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-selection="rowSelection"
        :scroll="{ x: 1580 }"
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
          <template v-else-if="column.key === 'verificationType'">
            {{ verificationTypeText(record.order.verificationType) }}
          </template>
          <template v-else-if="column.key === 'isCommon'">
            {{ commonText(record.order.isCommon) }}
          </template>
          <template v-else-if="column.key === 'attachment'">
            <a-button v-if="record.statusKey === 'verifier_verify_assign'" size="small" @click="openVerify(record)">上传附件</a-button>
            <span v-else class="muted-text">待填写节点</span>
          </template>
          <template v-else-if="column.key === 'action'">
            <a-button type="link" class="button-link" :loading="actionLoading && activeRow?.key === record.key" @click="handleAction(record)">
              处理
            </a-button>
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

    <FirstCheckVerifyDialog
      v-model:open="verifyOpen"
      v-model:submitting="actionLoading"
      :order="activeRow?.order"
      :task-id="activeRow?.taskId"
      :task-row-version="activeRow?.taskRowVersion"
      :allowed-actions="activeRow?.allowedActions || []"
      @success="loadRows"
    />
  </section>
</template>

<style scoped>
.firstcheck-verifier-page {
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

.button-link {
  height: 32px;
  padding: 0 12px;
  color: #1769e0;
}

.muted-text {
  color: #98a2b3;
  font-size: 12px;
}

.tag {
  height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-size: 12px;
}

.tag.default {
  border-color: #d3dae6;
  background: #f8fafc;
  color: #475467;
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
