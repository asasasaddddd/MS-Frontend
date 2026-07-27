<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { SearchOutlined } from '@ant-design/icons-vue'
import {
  getProductSupportOrder,
  verifierSubmitProductSupport
} from '@/api/productSupport'
import { useRoleTodoSummary } from '@/composables/useRoleTodoSummary'
import { hasWorkflowAction, useWorkflowTask } from '@/composables/useWorkflowTask'
import { useSessionStore } from '@/stores/session'
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import type { ProductSupportEntityId, ProductSupportOrderVO, ProductSupportRatioVO } from '@/types/productSupport'
import {
  display,
  mapProductSupportOrderRow,
  productSupportTagColor,
  toNumber
} from './productSupportDisplayModel'
import type { ProductSupportDisplayRow } from '@/types/productSupport'

type VerifyRatioDraft = {
  ratioId: ProductSupportEntityId
  name: string
  contractQuantity: number
  sampleQuantity: number
  remark?: string
  costNo?: string
  qualifiedQuantity: number
  unqualifiedQuantity: number
  unitPrice?: number
}

const route = useRoute()
const session = useSessionStore()
const workflowIdentity = computed(() => {
  const user = session.user
  return user ? `${user.employeeId}|${user.roleCode}` : ''
})
const {
  todoTasks: workflowTodoTasks,
  participatedTasks: workflowParticipatedTasks,
  refresh: refreshWorkflowTasks,
  loadDetails: loadWorkflowDetails,
  executeTaskAction
} = useWorkflowTask({
  identityKey: workflowIdentity,
  businessType: 'PRODUCT_SUPPORT',
  views: ['todo', 'participated'],
  immediate: false
})
const loading = ref(false)
const historyLoading = ref(false)
const submitting = ref(false)
const tasks = ref<ProductSupportOrderVO[]>([])
const history = ref<ProductSupportOrderVO[]>([])
const activeTab = ref<'pending' | 'history'>(route.query.tab === 'history' ? 'history' : 'pending')
const selectedRowKeys = ref<ProductSupportEntityId[]>([])
const keyword = ref('')
const statusFilter = ref('all')
const currentOrder = ref<ProductSupportOrderVO | null>(null)
const verifyOpen = ref(false)
const attachmentGroupId = ref<ProductSupportEntityId | undefined>()
const ratioDrafts = ref<VerifyRatioDraft[]>([])
const routeOrderId = computed(() => {
  const value = route.query.orderId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})
const summaryScope = computed(() => routeOrderId.value
  ? { businessType: 'PRODUCT_SUPPORT', scopeType: 'order' as const, scopeId: routeOrderId.value }
  : { businessType: 'PRODUCT_SUPPORT' })
const {
  summary: productSupportFlowSummary,
  loading: summaryLoading,
  error: summaryError,
  refresh: refreshSummary
} = useRoleTodoSummary({
  identityKey: workflowIdentity,
  query: summaryScope,
  immediate: false
})

const verifyForm = reactive({
  verificationDate: new Date().toISOString().slice(0, 10),
  opinion: ''
})

const columns = [
  { title: '当前状态', key: 'status', width: 120 },
  { title: '合同号', key: 'contractNo', width: 150 },
  { title: '项目类型', key: 'projectType', width: 110 },
  { title: '设备名称', key: 'primaryName', width: 180 },
  { title: '规格型号', key: 'primaryModelSpec', width: 150 },
  { title: '抽检数量', key: 'sampleQuantity', width: 110 },
  { title: '申请部门', key: 'applyDeptName', width: 150 },
  { title: '操作', key: 'action', fixed: 'right', width: 96 }
]

const ratioColumns = [
  { title: '序号', key: 'index', width: 64 },
  { title: '名称', key: 'name', width: 150 },
  { title: '合同数量', key: 'contractQuantity', width: 92 },
  { title: '抽检数量', key: 'sampleQuantity', width: 92 },
  { title: '备注', key: 'remark', width: 110 },
  { title: '费用编号', key: 'costNo', width: 140 },
  { title: '合格', key: 'qualifiedQuantity', width: 92 },
  { title: '不合格', key: 'unqualifiedQuantity', width: 92 }
]

const rows = computed(() => tasks.value.map(mapProductSupportOrderRow))
const historyRows = computed(() => history.value.map(mapProductSupportOrderRow))

const filteredRows = computed(() => {
  const text = keyword.value.trim()
  return rows.value.filter((row) => {
    const matchesStatus = statusFilter.value === 'all' || row.orderStatus === statusFilter.value || row.currentNode === statusFilter.value
    const matchesKeyword =
      !text ||
      row.contractNo.includes(text) ||
      row.projectNo.includes(text) ||
      row.primaryName.includes(text) ||
      row.applyDeptName.includes(text)
    return matchesStatus && matchesKeyword
  })
})

const selectedOrders = computed(() => {
  const keys = new Set(selectedRowKeys.value.map(String))
  return tasks.value.filter((order) => keys.has(String(order.id)))
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  getCheckboxProps: (row: ProductSupportDisplayRow) => {
    const order = tasks.value.find((item) => String(item.id) === String(row.orderId))
    return { disabled: !order || !hasWorkflowAction(order, 'SUBMIT') }
  },
  onChange: (keys: ProductSupportEntityId[]) => {
    selectedRowKeys.value = keys
  }
}))

function resetFilter() {
  keyword.value = ''
  statusFilter.value = 'all'
}

function orderRowKey(row: ProductSupportDisplayRow) {
  return row.orderId
}

function ratioRowKey(row: VerifyRatioDraft) {
  return row.ratioId
}

function ratioDraftFrom(ratio: ProductSupportRatioVO): VerifyRatioDraft {
  const sampleQuantity = ratio.sampleQuantity || 0
  return {
    ratioId: ratio.id,
    name: display(ratio.name),
    contractQuantity: ratio.contractQuantity || 0,
    sampleQuantity,
    remark: ratio.remark,
    costNo: ratio.costNo,
    qualifiedQuantity: ratio.qualifiedQuantity ?? sampleQuantity,
    unqualifiedQuantity: ratio.unqualifiedQuantity ?? 0,
    unitPrice: ratio.unitPrice === undefined ? undefined : toNumber(ratio.unitPrice)
  }
}

let dataLoadId = 0
async function loadRows() {
  const loadId = ++dataLoadId
  loading.value = true
  historyLoading.value = true
  const summaryPromise = refreshSummary().catch(() => undefined)
  try {
    await refreshWorkflowTasks()
    const details = await loadWorkflowDetails(
      [...workflowTodoTasks.value, ...workflowParticipatedTasks.value],
      (task, signal) => getProductSupportOrder(task.businessId, signal)
    )
    if (!details || loadId !== dataLoadId) return
    const detailByWorkflowTaskId = new Map(details.map((order) => [String(order.workflowTaskId), order]))
    tasks.value = workflowTodoTasks.value.flatMap((task) => {
      const detail = detailByWorkflowTaskId.get(String(task.taskId))
      return detail ? [detail as ProductSupportOrderVO] : []
    })
    history.value = workflowParticipatedTasks.value.flatMap((task) => {
      const detail = detailByWorkflowTaskId.get(String(task.taskId))
      return detail ? [detail as ProductSupportOrderVO] : []
    })
    await openOrderFromRoute()
  } catch (error) {
    tasks.value = []
    history.value = []
    message.error(error instanceof Error ? error.message : '产品配套任务加载失败')
  } finally {
    await summaryPromise
    if (loadId === dataLoadId) {
      loading.value = false
      historyLoading.value = false
    }
  }
}

function canProcessOrder(orderId: ProductSupportEntityId) {
  return hasWorkflowAction(tasks.value.find((order) => String(order.id) === String(orderId)), 'SUBMIT')
}

async function openOrder(orderId: ProductSupportEntityId) {
  try {
    const detail = [...tasks.value, ...history.value].find((order) => String(order.id) === String(orderId))
      || await getProductSupportOrder(orderId)
    currentOrder.value = detail
    ratioDrafts.value = (detail.ratios || []).map(ratioDraftFrom)
    attachmentGroupId.value = detail.attachmentGroupId
    verifyForm.verificationDate = detail.verificationDate || detail.inspectionDate || new Date().toISOString().slice(0, 10)
    verifyForm.opinion = ''
    verifyOpen.value = true
  } catch (error) {
    message.error(error instanceof Error ? error.message : '产品配套详情加载失败')
  }
}

async function openSelected() {
  if (selectedOrders.value.length !== 1) {
    message.warning('请选择一条产品配套单进行处理')
    return
  }
  if (!hasWorkflowAction(selectedOrders.value[0], 'SUBMIT')) {
    message.warning('当前任务没有可执行操作，请刷新待办')
    return
  }
  await openOrder(selectedOrders.value[0].id)
}

async function openOrderFromRoute() {
  const orderId = route.query.orderId
  if (!orderId || Array.isArray(orderId)) return
  if (verifyOpen.value && String(currentOrder.value?.id) === orderId) return
  await openOrder(orderId)
}

function validateSubmit() {
  if (!currentOrder.value) return '未选择产品配套单'
  if (!verifyForm.verificationDate) return '请选择检定日期'
  if (ratioDrafts.value.length === 0) return '缺少抽检比例明细'
  const invalid = ratioDrafts.value.find((row) => {
    const qualified = Number(row.qualifiedQuantity)
    const unqualified = Number(row.unqualifiedQuantity)
    return qualified < 0 || unqualified < 0 || qualified + unqualified !== Number(row.sampleQuantity)
  })
  if (invalid) return `请确认 ${invalid.name} 的合格与不合格数量合计等于抽检数量`
  return ''
}

async function submitVerify() {
  const error = validateSubmit()
  if (error || !currentOrder.value) {
    message.warning(error)
    return
  }
  submitting.value = true
  try {
    const order = currentOrder.value
    if (order.workflowTaskId === undefined || order.rowVersion === undefined) {
      throw new Error('工作流任务上下文已失效，请刷新待办')
    }
    const result = await executeTaskAction(order.workflowTaskId, () => verifierSubmitProductSupport({
      orderId: order.id,
      taskId: order.workflowTaskId!,
      rowVersion: order.rowVersion!,
      verificationDate: verifyForm.verificationDate,
      attachmentGroupId: attachmentGroupId.value,
      opinion: verifyForm.opinion,
      ratioResults: ratioDrafts.value.map((row) => ({
        ratioId: row.ratioId,
        costNo: row.costNo,
        qualifiedQuantity: Number(row.qualifiedQuantity),
        unqualifiedQuantity: Number(row.unqualifiedQuantity),
        unitPrice: row.unitPrice
      }))
    }), {
      notifyAlreadyHandled: (notice) => message.warning(notice),
      refresh: loadRows
    })
    if (result.status === 'already-handled') return
    message.success('产品配套检定信息已提交')
    verifyOpen.value = false
    selectedRowKeys.value = []
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '产品配套检定信息提交失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => route.query.orderId,
  () => {
    void Promise.all([openOrderFromRoute(), refreshSummary().catch(() => undefined)])
  }
)

watch(workflowIdentity, () => {
  void loadRows()
}, { immediate: true })
</script>

<template>
  <section class="product-support-verifier-page">
    <FlowStatusSummary
      :summary="productSupportFlowSummary"
      :loading="summaryLoading"
      :error="summaryError"
      title="产品配套流程汇总"
    />

    <a-card class="panel" :bordered="false">
      <template #title><h2>产品配套明细</h2></template>
      <template #extra>
        <a-button type="primary" @click="openSelected">批量处理</a-button>
      </template>
      <div class="task-filter">
        <a-select
          v-model:value="statusFilter"
          class="filter-control"
          :options="[
            { label: '当前状态筛选', value: 'all' },
            { label: '待处理', value: 'pending' },
            { label: '已完成', value: 'completed' }
          ]"
        />
        <a-input v-model:value="keyword" class="keyword-input" placeholder="按合同号、设备名称查询" allow-clear />
        <a-button type="primary" @click="loadRows"><SearchOutlined />查询</a-button>
        <a-button @click="resetFilter">重置</a-button>
      </div>

      <a-tabs v-model:active-key="activeTab" class="data-tabs">
        <a-tab-pane key="pending" tab="当前待办">
          <a-table
            :columns="columns"
            :data-source="filteredRows"
            :loading="loading"
            :pagination="{ pageSize: 10, showSizeChanger: false }"
            :row-key="orderRowKey"
            :row-selection="rowSelection"
            :scroll="{ x: 1200 }"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :class="['tag', productSupportTagColor(record.currentNode || record.orderStatus)]">{{ record.orderStatusName }}</a-tag>
              </template>
              <template v-else-if="column.key === 'action'">
                <a-button v-if="canProcessOrder(record.orderId)" type="link" class="link-btn" @click="openOrder(record.orderId)">处理</a-button>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
        <a-tab-pane key="history" tab="参与记录">
          <a-table
            :columns="columns.filter((item) => item.key !== 'action')"
            :data-source="historyRows"
            :loading="historyLoading"
            :pagination="{ pageSize: 10, showSizeChanger: false }"
            :row-key="orderRowKey"
            :scroll="{ x: 1080 }"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :class="['tag', productSupportTagColor(record.currentNode || record.orderStatus)]">{{ record.orderStatusName }}</a-tag>
              </template>
            </template>
          </a-table>
        </a-tab-pane>
      </a-tabs>
    </a-card>

    <a-modal
      v-model:open="verifyOpen"
      width="820px"
      wrap-class-name="product-support-verify-dialog"
      :footer="null"
    >
      <template #title>
        <div class="verify-modal-header">
          <h1>产品配套检定信息填写</h1>
          <div class="verify-modal-actions">
            <a-button @click="verifyOpen = false">取消</a-button>
            <a-button type="primary" :loading="submitting" @click="submitVerify">提交</a-button>
          </div>
        </div>
      </template>
      <div v-if="currentOrder" class="verify-modal">
        <section class="modal-section">
          <h3>产品基本信息</h3>
          <div class="info-grid">
            <label><span>合同号</span><a-input :value="display(currentOrder.contractNo)" readonly /></label>
            <label><span>项目号</span><a-input :value="display(currentOrder.projectNo)" readonly /></label>
            <label><span>项目类型</span><a-input :value="display(currentOrder.projectType)" readonly /></label>
            <label><span>送检时间</span><a-input v-model:value="verifyForm.verificationDate" type="date" /></label>
            <label><span>供方</span><a-input :value="display(currentOrder.supplierName)" readonly /></label>
            <label><span>申请部门</span><a-input :value="display(currentOrder.applyDeptName)" readonly /></label>
          </div>
        </section>

        <section class="modal-section">
          <h3>抽检比例</h3>
          <a-table
            :columns="ratioColumns"
            :data-source="ratioDrafts"
            :pagination="false"
            :row-key="ratioRowKey"
            :scroll="{ x: 980 }"
            size="small"
          >
            <template #bodyCell="{ column, record, index }">
              <template v-if="column.key === 'index'">{{ index + 1 }}</template>
              <template v-else-if="column.key === 'name'">{{ record.name }}</template>
              <template v-else-if="column.key === 'contractQuantity'">{{ record.contractQuantity }}</template>
              <template v-else-if="column.key === 'sampleQuantity'">{{ record.sampleQuantity }}</template>
              <template v-else-if="column.key === 'remark'">{{ display(record.remark) }}</template>
              <template v-else-if="column.key === 'costNo'"><a-input v-model:value="record.costNo" /></template>
              <template v-else-if="column.key === 'qualifiedQuantity'">
                <a-input-number v-model:value="record.qualifiedQuantity" :min="0" :max="record.sampleQuantity" />
              </template>
              <template v-else-if="column.key === 'unqualifiedQuantity'">
                <a-input-number v-model:value="record.unqualifiedQuantity" :min="0" :max="record.sampleQuantity" />
              </template>
            </template>
          </a-table>
        </section>
      </div>
    </a-modal>
  </section>
</template>

<style scoped>
.product-support-verifier-page {
  display: grid;
  gap: 16px;
}

.panel {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel {
  overflow: hidden;
}

.panel :deep(.ant-card-head) {
  min-height: 52px;
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

.filter-control {
  width: 180px;
}

.keyword-input {
  width: 260px;
}

.data-tabs {
  padding: 0 14px 14px;
}

.link-btn {
  padding: 0;
  color: #1769e0;
}

.tag {
  border-radius: 999px;
  font-weight: 600;
}

.tag.blue {
  border-color: #b2ddff;
  background: #eff8ff;
  color: #175cd3;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.tag.green {
  border-color: #abefc6;
  background: #ecfdf3;
  color: #067647;
}

.tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.verify-modal {
  display: grid;
  gap: 20px;
  max-height: calc(90vh - 66px);
  padding: 20px;
  overflow-y: auto;
}

.verify-modal-header,
.verify-modal-actions {
  display: flex;
  align-items: center;
}

.verify-modal-header {
  justify-content: space-between;
  gap: 20px;
}

.verify-modal-header h1 {
  margin: 0;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}

.verify-modal-actions {
  gap: 8px;
}

.modal-section {
  margin-bottom: 0;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e9f0;
}

.modal-section h3 {
  margin: 0 0 12px;
  color: #344054;
  font-size: 14px;
  font-weight: 700;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.info-grid label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.info-grid span {
  color: #667085;
  font-size: 12px;
}

.verify-modal :deep(.ant-input),
.verify-modal :deep(.ant-input-number),
.verify-modal :deep(.ant-input-number-input) {
  min-height: 34px;
  border-radius: 6px;
  font-size: 13px;
}

:global(.product-support-verify-dialog .ant-modal-content) {
  overflow: hidden;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

:global(.product-support-verify-dialog .ant-modal-header) {
  margin: 0;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e5e9f0;
}

:global(.product-support-verify-dialog .ant-modal-close) {
  display: none;
}

:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

@media (max-width: 980px) {
  .info-grid {
    grid-template-columns: 1fr;
  }

  .task-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-control,
  .keyword-input {
    width: 100%;
  }
}
</style>
