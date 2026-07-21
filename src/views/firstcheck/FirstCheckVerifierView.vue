<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getFirstCheckDetail } from '@/api/firstcheck'
import { listWorkflowTasks } from '@/api/workflow'
import type { FirstCheckOrder } from '@/types/firstcheck'
import type { WorkflowTask } from '@/types/workflow'
import { useSessionStore } from '@/stores/session'
import { isPendingWorkflowTask, matchesBusinessType, workflowNodeGroups } from '@/workflows/metrologyWorkflow'
import FirstCheckAssignCodeDialog from '@/views/firstcheck/components/FirstCheckAssignCodeDialog.vue'
import FirstCheckHistoryPanel from '@/views/firstcheck/components/FirstCheckHistoryPanel.vue'
import FirstCheckVerifyDialog from '@/views/firstcheck/components/FirstCheckVerifyDialog.vue'
import {
  canOpenFirstCheckVerify,
  firstCheckVerifierAction,
  matchesFirstCheckVerifierRole,
  resolveFirstCheckVerifierStatus,
  type FirstCheckVerifierStatusKey
} from '@/views/firstcheck/firstCheckVerifierModel'

type StatusColor = 'orange' | 'blue' | 'red' | 'green' | 'cyan' | 'default'
type StatusFilter = 'all' | FirstCheckVerifierStatusKey

interface VerifierRow {
  key: string
  taskId: string
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
const actionLoading = ref(false)
const rows = ref<VerifierRow[]>([])
const selectedRowKeys = ref<string[]>([])
const statusFilter = ref<StatusFilter>('all')
const keyword = ref('')
const verifyOpen = ref(false)
const assignOpen = ref(false)
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
  { label: '已接收', value: 'verifier_verify' },
  { label: '待外委送出', value: 'wait_sendout' },
  { label: '已外委送出', value: 'sent_out' },
  { label: '待外委送回', value: 'wait_sendout_return' },
  { label: '待赋码', value: 'assign_code' },
  { label: '报告待转发', value: 'manager_forward' },
  { label: '报告待确认', value: 'confirmer_confirm' },
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

const todayKey = computed(() => new Date().toISOString().slice(0, 10))

const metrics = computed(() => {
  const countByStatus = (statusKey: FirstCheckVerifierStatusKey) => rows.value.filter((row) => row.statusKey === statusKey).length
  return {
    todoCount: rows.value.length,
    todayCount: rows.value.filter((row) => (row.order.applyTime || '').slice(0, 10) === todayKey.value).length,
    receiveCount: countByStatus('wait_receive'),
    verifyCount: countByStatus('verifier_verify'),
    waitSendoutCount: countByStatus('wait_sendout'),
    sentOutCount: countByStatus('sent_out'),
    returnCount: countByStatus('wait_sendout_return'),
    assignCount: countByStatus('assign_code'),
    managerForwardCount: countByStatus('manager_forward'),
    confirmerCount: countByStatus('confirmer_confirm')
  }
})

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
    taskId: String(task.id),
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

async function loadRows() {
  loading.value = true
  selectedRowKeys.value = []
  try {
    const tasks = await listWorkflowTasks()
    const verifierNodeSet = new Set<string>(workflowNodeGroups.firstcheck.verifier)
    const firstCheckTasks = tasks.filter((task) => {
      const pending = isPendingWorkflowTask(task)
      return pending && matchesBusinessType(task.businessType, 'firstcheck') && verifierNodeSet.has(task.nodeCode) && matchesRouteOrder(task)
    })

    const details = await Promise.allSettled(
      firstCheckTasks.map(async (task) => ({
        task,
        order: await getFirstCheckDetail(task.businessId)
      }))
    )

    rows.value = details
      .filter((item): item is PromiseFulfilledResult<{ task: WorkflowTask; order: FirstCheckOrder }> => item.status === 'fulfilled')
      .filter((item) => matchesFirstCheckVerifierRole(item.value.order, session.user?.roleCode))
      .map((item) => toRow(item.value.task, item.value.order))
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '检定员首检待办加载失败')
  } finally {
    loading.value = false
  }
}

function openVerify(row: VerifierRow) {
  if (!canOpenFirstCheckVerify(rowStatusSource(row))) {
    message.info('实物未完成扫码接收，暂不能填写检定信息')
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
  if (action === 'assign_code') {
    assignOpen.value = true
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

    <template v-if="activeTab === 'todo'">
    <div class="summary-line">
      <a-card class="metric" :bordered="false">
        <span>首检待办</span>
        <strong>{{ metrics.todoCount }}项</strong>
      </a-card>
      <a-card class="metric" :bordered="false">
        <span>今日新增</span>
        <strong>{{ metrics.todayCount }}项</strong>
      </a-card>
      <div class="status-strip">
        <div class="status-check">✓</div>
        <a-tag class="tag orange">待接收 {{ metrics.receiveCount }}</a-tag>
        <a-tag class="tag blue">已接收 {{ metrics.verifyCount }}</a-tag>
        <a-tag class="tag blue">待外委送出 {{ metrics.waitSendoutCount }}</a-tag>
        <a-tag class="tag blue">已外委送出 {{ metrics.sentOutCount }}</a-tag>
        <a-tag class="tag blue">待外委送回 {{ metrics.returnCount }}</a-tag>
        <a-tag class="tag cyan">待赋码 {{ metrics.assignCount }}</a-tag>
        <a-tag class="tag orange">报告待转发 {{ metrics.managerForwardCount }}</a-tag>
        <a-tag class="tag orange">报告待确认 {{ metrics.confirmerCount }}</a-tag>
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
            <a-button v-if="record.statusKey === 'verifier_verify'" size="small" @click="openVerify(record)">上传附件</a-button>
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

    <FirstCheckHistoryPanel
      v-else
      :role-code="session.user?.roleCode || 'VERIFIER_SELF'"
      :order-id="routeOrderId"
    />

    <FirstCheckVerifyDialog
      v-model:open="verifyOpen"
      v-model:submitting="actionLoading"
      :order="activeRow?.order"
      @success="loadRows"
    />
    <FirstCheckAssignCodeDialog v-model:open="assignOpen" :order="activeRow?.order" @success="loadRows" />
  </section>
</template>

<style scoped>
.firstcheck-verifier-page {
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
  flex: 0 0 auto;
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
  flex-wrap: wrap;
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
  .summary-line,
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
