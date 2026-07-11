<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import {
  DeleteOutlined,
  ExportOutlined,
  PlusOutlined,
  PrinterOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { cancelCostRecord, createManualCostRecord, getCostSummary, listCostRecords, updateCostRecord } from '@/api/cost'
import { useSessionStore } from '@/stores/session'
import type { CostManualCreateRequest, CostRecordVO, CostSummaryVO } from '@/types/cost'
import {
  amountNumber,
  buildCostCsv,
  costKindColor,
  costPageBreadcrumb,
  costPageTabs,
  costPageTitle,
  costStatusColor,
  costStatusName,
  display,
  filterCostRows,
  formatDate,
  formatMoney,
  groupCostSummary,
  rowCode,
  rowName,
  rowQuantity,
  rowUnitPrice,
  sourceTypeName,
  sumCost,
  type CostFilterState,
  type CostPageMode
} from '@/views/cost/costDisplayModel'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()

const loading = ref(false)
const saving = ref(false)
const activeMode = ref<CostPageMode>(resolveMode())
const rows = ref<CostRecordVO[]>([])
const backendSummary = ref<CostSummaryVO>()
const selectedRowKeys = ref<Array<string | number>>([])
const amountDrafts = reactive<Record<string, number>>({})
const dirtyAmountIds = ref<string[]>([])
const manualOpen = ref(false)
const manualSubmitting = ref(false)

const manualForm = reactive<CostManualCreateRequest>({
  costType: 'other',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
  currency: 'CNY',
  occurredAt: new Date().toISOString().slice(0, 10),
  remark: ''
})

const filters = reactive<CostFilterState>(createFilterState(sourceForMode(activeMode.value)))
const otherFilters = reactive<CostFilterState>(createFilterState('OTHER'))

const pageTitle = computed(() => costPageTitle(activeMode.value))
const breadcrumb = computed(() => costPageBreadcrumb(activeMode.value))
const userLabel = computed(() => session.user?.employeeName || session.user?.employeeId || '当前用户')

const modeRows = computed(() => {
  if (activeMode.value === 'periodic') return rows.value.filter((row) => row.sourceType === 'PERIODIC')
  if (activeMode.value === 'product') return rows.value.filter((row) => row.sourceType === 'PRODUCT_SUPPORT')
  return rows.value
})

const mainRows = computed(() => filterCostRows(modeRows.value, filters))
const otherRows = computed(() =>
  filterCostRows(
    rows.value.filter((row) => row.sourceType === 'OTHER' || String(row.costType || '').toLowerCase() === 'other'),
    otherFilters
  )
)

const selectionPool = computed(() => (activeMode.value === 'periodic' ? [...mainRows.value, ...otherRows.value] : mainRows.value))

const selectedRows = computed(() => {
  const keys = new Set(selectedRowKeys.value.map(String))
  return selectionPool.value.filter((row) => keys.has(String(row.id)))
})

const summary = computed(() => {
  const targetRows = activeMode.value === 'periodic' ? [...mainRows.value, ...otherRows.value] : mainRows.value
  const server = backendSummary.value
  if (server) {
    return {
      total: Number(server.totalAmount || 0),
      count: Number(server.totalCount || 0),
      groups: (server.bySource || []).map((item) => ({
        label: item.name || item.code || '-',
        amount: Number(item.amount || 0),
        count: Number(item.count || 0)
      }))
    }
  }
  return {
    total: sumCost(targetRows),
    count: targetRows.length,
    groups: groupCostSummary(activeMode.value === 'history' ? targetRows : targetRows)
  }
})

const columns = computed(() => {
  if (activeMode.value === 'product') {
    return [
      { title: '序号', key: 'index', width: 70 },
      { title: '项目号', key: 'projectNo', width: 150 },
      { title: '产品名称', key: 'name', width: 180 },
      { title: '抽检数量', key: 'quantity', width: 110 },
      { title: '含税单价', key: 'unitPrice', width: 130 },
      { title: '含税总价', key: 'amountInput', width: 150 },
      { title: '检定时间', key: 'occurredAt', width: 140 },
      { title: '状态', key: 'costStatus', width: 110 }
    ]
  }
  if (activeMode.value === 'history') {
    return [
      { title: '序号', key: 'index', width: 70 },
      { title: '费用种类', key: 'sourceType', width: 130 },
      { title: '编号', key: 'code', width: 150 },
      { title: '名称', key: 'name', width: 160 },
      { title: '规格/型号', key: 'modelSpec', width: 150 },
      { title: '部门/项目', key: 'deptName', width: 150 },
      { title: '检定日期', key: 'occurredAt', width: 130 },
      { title: '数量', key: 'quantity', width: 80 },
      { title: '单价', key: 'unitPrice', width: 110 },
      { title: '金额', key: 'amount', width: 120 },
      { title: '状态', key: 'costStatus', width: 110 }
    ]
  }
  return [
    { title: '序号', key: 'index', width: 70 },
    { title: '来源流程', key: 'sourceType', width: 130 },
    { title: '计量编号', key: 'code', width: 160 },
    { title: '设备名称', key: 'name', width: 160 },
    { title: '规格型号', key: 'modelSpec', width: 160 },
    { title: '使用部门', key: 'deptName', width: 150 },
    { title: '检定日期', key: 'occurredAt', width: 130 },
    { title: '单价', key: 'amountInput', width: 140 },
    { title: '状态', key: 'costStatus', width: 110 }
  ]
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: Array<string | number>) => {
    selectedRowKeys.value = keys
  }
}))

function createFilterState(sourceType = 'all'): CostFilterState {
  return {
    sourceType,
    costType: 'all',
    costStatus: 'all',
    deviceCode: '',
    keyword: '',
    startDate: '',
    endDate: ''
  }
}

function resolveMode(): CostPageMode {
  const view = String(route.query.view || '')
  const sourceType = String(route.query.sourceType || '')
  if (view === 'product' || sourceType === 'PRODUCT_SUPPORT') return 'product'
  if (view === 'history') return 'history'
  return 'periodic'
}

function sourceForMode(mode: CostPageMode) {
  if (mode === 'periodic') return 'PERIODIC'
  if (mode === 'product') return 'PRODUCT_SUPPORT'
  return 'all'
}

function applyFilterState(target: CostFilterState, next: CostFilterState) {
  target.sourceType = next.sourceType
  target.costType = next.costType
  target.costStatus = next.costStatus
  target.deviceCode = next.deviceCode
  target.keyword = next.keyword
  target.startDate = next.startDate
  target.endDate = next.endDate
}

function resetFilters() {
  applyFilterState(filters, createFilterState(sourceForMode(activeMode.value)))
}

function resetOtherFilters() {
  applyFilterState(otherFilters, createFilterState('OTHER'))
}

function changeMode(mode: CostPageMode) {
  activeMode.value = mode
  resetFilters()
  resetOtherFilters()
  selectedRowKeys.value = []
  router.replace({ path: route.path, query: { view: mode } })
}

function handleModeChange(value: string | number) {
  changeMode(value as CostPageMode)
}

async function loadRows() {
  loading.value = true
  try {
    const [recordList, summaryResult] = await Promise.all([
      listCostRecords(),
      getCostSummary({
        sourceType: activeMode.value === 'history' ? undefined : sourceForMode(activeMode.value),
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined
      }).catch(() => undefined)
    ])
    rows.value = recordList
    backendSummary.value = summaryResult
    syncDrafts()
    selectedRowKeys.value = selectedRowKeys.value.filter((key) => rows.value.some((row) => String(row.id) === String(key)))
  } catch (error) {
    rows.value = []
    backendSummary.value = undefined
    message.error(error instanceof Error ? error.message : '费用列表加载失败')
  } finally {
    loading.value = false
  }
}

function syncDrafts() {
  rows.value.forEach((row) => {
    amountDrafts[String(row.id)] = amountNumber(row.amount)
  })
  dirtyAmountIds.value = dirtyAmountIds.value.filter((id) => rows.value.some((row) => String(row.id) === id))
}

function draftAmount(row: CostRecordVO) {
  const key = String(row.id)
  return amountDrafts[key] ?? amountNumber(row.amount)
}

function updateAmountDraft(row: CostRecordVO, value: number | string | null) {
  const key = String(row.id)
  amountDrafts[key] = amountNumber(value ?? 0)
  if (!dirtyAmountIds.value.includes(key)) {
    dirtyAmountIds.value = [...dirtyAmountIds.value, key]
  }
}

function dirtyRowsIn(targetRows: CostRecordVO[]) {
  const ids = new Set(dirtyAmountIds.value)
  return targetRows.filter((row) => ids.has(String(row.id)))
}

async function saveDirtyAmounts(targetRows: CostRecordVO[]) {
  const target = dirtyRowsIn(targetRows)
  if (target.length === 0) {
    message.warning('没有需要保存的费用金额')
    return
  }
  saving.value = true
  try {
    await Promise.all(
      target.map((row) =>
        updateCostRecord({
          recordId: row.id,
          amount: draftAmount(row),
          quantity: rowQuantity(row),
          unitPrice: draftAmount(row) / rowQuantity(row),
          currency: row.currency || 'CNY',
          occurredAt: row.occurredAt ? String(row.occurredAt).replace('T', ' ').slice(0, 19) : undefined,
          remark: row.remark
        })
      )
    )
    message.success(`已保存 ${target.length} 条费用`)
    dirtyAmountIds.value = dirtyAmountIds.value.filter((id) => !target.some((row) => String(row.id) === id))
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '费用保存失败')
  } finally {
    saving.value = false
  }
}

function cancelSelected() {
  if (selectedRows.value.length === 0) {
    message.warning('请选择费用记录')
    return
  }
  Modal.confirm({
    title: '取消费用记录',
    content: `确认取消已选 ${selectedRows.value.length} 条费用记录？`,
    okText: '确认取消',
    cancelText: '关闭',
    okButtonProps: { danger: true },
    async onOk() {
      await Promise.all(selectedRows.value.map((row) => cancelCostRecord({ recordId: row.id, reason: '页面取消费用' })))
      message.success('费用记录已取消')
      selectedRowKeys.value = []
      await loadRows()
    }
  })
}

function openManualDialog() {
  manualForm.deviceCode = ''
  manualForm.deviceName = ''
  manualForm.modelSpec = ''
  manualForm.deptId = session.user?.deptId
  manualForm.deptName = session.user?.deptName
  manualForm.costType = 'other'
  manualForm.quantity = 1
  manualForm.unitPrice = 0
  manualForm.amount = 0
  manualForm.currency = 'CNY'
  manualForm.occurredAt = new Date().toISOString().slice(0, 10)
  manualForm.remark = ''
  manualOpen.value = true
}

async function submitManualCost() {
  if (Number(manualForm.amount || 0) < 0) {
    message.warning('费用金额不能小于0')
    return
  }
  if (Number(manualForm.quantity || 0) < 1) {
    message.warning('费用数量必须大于0')
    return
  }
  if (Number(manualForm.unitPrice || 0) < 0) {
    message.warning('费用单价不能小于0')
    return
  }
  manualSubmitting.value = true
  try {
    await createManualCostRecord({
      ...manualForm,
      occurredAt: manualForm.occurredAt ? `${manualForm.occurredAt}T00:00:00` : undefined
    })
    message.success('其他费用已登记')
    manualOpen.value = false
    await loadRows()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '其他费用登记失败')
  } finally {
    manualSubmitting.value = false
  }
}

function exportRows(targetRows: CostRecordVO[], filename: string) {
  const csv = `\uFEFF${buildCostCsv(targetRows)}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${filename}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function printHistory() {
  window.print()
}

function selectedCountIn(targetRows: CostRecordVO[]) {
  const keys = new Set(selectedRowKeys.value.map(String))
  return targetRows.filter((row) => keys.has(String(row.id))).length
}

watch(
  () => route.query,
  () => {
    activeMode.value = resolveMode()
    resetFilters()
    resetOtherFilters()
  }
)

onMounted(loadRows)
</script>

<template>
  <section class="cost-page">
    <div class="cost-page-head">
      <div>
        <div class="breadcrumb">{{ breadcrumb }}</div>
        <h1>{{ pageTitle }}</h1>
      </div>
      <div class="head-actions">
        <a-tag class="role-tag" color="blue">检定员：{{ userLabel }}</a-tag>
        <a-segmented
          :value="activeMode"
          :options="costPageTabs.map((item) => ({ label: item.label, value: item.key }))"
          @change="handleModeChange"
        />
      </div>
    </div>

    <a-card class="panel summary-panel" :bordered="false">
      <template #title><h2>费用概览</h2></template>
      <div class="summary-row">
        <div class="summary-item">
          <span>{{ activeMode === 'history' ? '总笔数' : '数量' }}</span>
          <strong>{{ summary.count }} {{ activeMode === 'history' ? '笔' : '台' }}</strong>
        </div>
        <div class="summary-item">
          <span>{{ activeMode === 'history' ? '总费用' : '费用' }}</span>
          <strong>{{ formatMoney(summary.total) }}</strong>
        </div>
        <template v-if="activeMode === 'history'">
          <div v-for="item in summary.groups.slice(0, 5)" :key="item.label" class="summary-item compact">
            <span>{{ item.label }}</span>
            <strong>{{ formatMoney(item.amount) }}</strong>
          </div>
        </template>
      </div>
    </a-card>

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <div class="title-with-filter">
            <h2>
              <template v-if="activeMode === 'periodic'">周检设备清单</template>
              <template v-else-if="activeMode === 'product'">产品配套费用明细</template>
              <template v-else>费用明细</template>
            </h2>
            <div class="inline-filters">
              <a-select
                v-if="activeMode === 'history'"
                v-model:value="filters.sourceType"
                class="filter-control"
                :options="[
                  { label: '全部', value: 'all' },
                  { label: '周检费用', value: 'PERIODIC' },
                  { label: '产品配套费用', value: 'PRODUCT_SUPPORT' },
                  { label: '其他费用', value: 'OTHER' },
                  { label: '状态变更费用', value: 'CHANGE' },
                  { label: '首检费用', value: 'FIRST_CHECK' }
                ]"
              />
              <a-select
                v-if="activeMode === 'periodic'"
                v-model:value="filters.sourceType"
                class="filter-control"
                :options="[
                  { label: '来源流程', value: 'all' },
                  { label: '周检费用', value: 'PERIODIC' },
                  { label: '首检费用', value: 'FIRST_CHECK' },
                  { label: '状态变更费用', value: 'CHANGE' }
                ]"
              />
              <a-input
                v-model:value="filters.deviceCode"
                class="filter-control"
                :placeholder="activeMode === 'product' ? '项目号' : '计量编号'"
                allow-clear
              />
              <a-input
                v-if="activeMode === 'product'"
                v-model:value="filters.keyword"
                class="filter-control"
                placeholder="名称"
                allow-clear
              />
              <template v-if="activeMode !== 'product'">
                <a-input v-model:value="filters.startDate" class="date-control" type="date" />
                <span class="range-separator">~</span>
                <a-input v-model:value="filters.endDate" class="date-control" type="date" />
              </template>
              <a-button type="primary" @click="loadRows"><SearchOutlined />查询</a-button>
              <a-button @click="resetFilters"><ReloadOutlined />重置</a-button>
            </div>
          </div>
          <div class="panel-actions">
            <template v-if="activeMode === 'history'">
              <a-button @click="printHistory"><PrinterOutlined />重新打印</a-button>
              <a-button @click="exportRows(mainRows, pageTitle)"><ExportOutlined />导出</a-button>
            </template>
            <template v-else>
              <a-button type="primary" :loading="saving" @click="saveDirtyAmounts(mainRows)"><SaveOutlined />保存费用</a-button>
              <a-button danger :disabled="selectedRows.length === 0" @click="cancelSelected"><DeleteOutlined />删除</a-button>
              <a-button @click="exportRows(mainRows, pageTitle)"><ExportOutlined />导出</a-button>
            </template>
            <span>共 <strong>{{ mainRows.length }}</strong> 项</span>
            <span v-if="activeMode !== 'history'">已选 <strong>{{ selectedCountIn(mainRows) }}</strong> 项</span>
          </div>
        </div>
      </template>

      <a-table
        :columns="columns"
        :data-source="mainRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-key="(row: CostRecordVO) => row.id"
        :row-selection="rowSelection"
        :scroll="{ x: activeMode === 'history' ? 1280 : 1040 }"
        size="middle"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'sourceType'">
            <a-tag :class="['tag', costKindColor(record)]">{{ sourceTypeName(record.sourceType) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'projectNo'">{{ rowCode(record) }}</template>
          <template v-else-if="column.key === 'code'">{{ rowCode(record) }}</template>
          <template v-else-if="column.key === 'name'">{{ rowName(record) }}</template>
          <template v-else-if="column.key === 'modelSpec'">{{ display(record.modelSpec) }}</template>
          <template v-else-if="column.key === 'deptName'">{{ display(record.deptName || record.sourceId) }}</template>
          <template v-else-if="column.key === 'quantity'">{{ rowQuantity(record) }}</template>
          <template v-else-if="column.key === 'unitPrice'">{{ formatMoney(rowUnitPrice(record), record.currency) }}</template>
          <template v-else-if="column.key === 'amount'">{{ formatMoney(record.amount, record.currency) }}</template>
          <template v-else-if="column.key === 'amountInput'">
            <a-input-number
              :value="draftAmount(record)"
              :min="0"
              :precision="2"
              class="amount-input"
              @change="updateAmountDraft(record, $event)"
            />
          </template>
          <template v-else-if="column.key === 'occurredAt'">{{ formatDate(record.occurredAt) }}</template>
          <template v-else-if="column.key === 'costStatus'">
            <a-tag :class="['tag', costStatusColor(record.costStatus)]">{{ costStatusName(record.costStatus) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-card v-if="activeMode === 'periodic'" class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <div class="title-with-filter">
            <h2>其他费用登记</h2>
            <div class="inline-filters">
              <a-input v-model:value="otherFilters.deviceCode" class="filter-control wide" placeholder="请输入计量编号" allow-clear />
              <a-button type="primary" @click="loadRows"><SearchOutlined />查询</a-button>
              <a-button @click="resetOtherFilters"><ReloadOutlined />重置</a-button>
            </div>
          </div>
          <div class="panel-actions">
            <a-button type="primary" @click="openManualDialog"><PlusOutlined />新增费用</a-button>
            <a-button type="primary" :loading="saving" @click="saveDirtyAmounts(otherRows)"><SaveOutlined />保存费用</a-button>
            <a-button danger :disabled="selectedRows.length === 0" @click="cancelSelected"><DeleteOutlined />删除</a-button>
            <a-button @click="exportRows(otherRows, '其他费用登记')"><ExportOutlined />导出</a-button>
            <span>共 <strong>{{ otherRows.length }}</strong> 项</span>
            <span>已选 <strong>{{ selectedCountIn(otherRows) }}</strong> 项</span>
          </div>
        </div>
      </template>
      <a-table
        :columns="[
          { title: '序号', key: 'index', width: 70 },
          { title: '计量编号', key: 'code', width: 160 },
          { title: '设备名称', key: 'name', width: 160 },
          { title: '规格型号', key: 'modelSpec', width: 160 },
          { title: '使用部门', key: 'deptName', width: 150 },
          { title: '检定日期', key: 'occurredAt', width: 130 },
          { title: '单价', key: 'amountInput', width: 140 },
          { title: '状态', key: 'costStatus', width: 110 }
        ]"
        :data-source="otherRows"
        :loading="loading"
        :pagination="{ pageSize: 6, showSizeChanger: false }"
        :row-key="(row: CostRecordVO) => row.id"
        :row-selection="rowSelection"
        :scroll="{ x: 980, y: 260 }"
        size="middle"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'code'">{{ rowCode(record) }}</template>
          <template v-else-if="column.key === 'name'">{{ rowName(record) }}</template>
          <template v-else-if="column.key === 'modelSpec'">{{ display(record.modelSpec) }}</template>
          <template v-else-if="column.key === 'deptName'">{{ display(record.deptName) }}</template>
          <template v-else-if="column.key === 'occurredAt'">{{ formatDate(record.occurredAt) }}</template>
          <template v-else-if="column.key === 'amountInput'">
            <a-input-number
              :value="draftAmount(record)"
              :min="0"
              :precision="2"
              class="amount-input"
              @change="updateAmountDraft(record, $event)"
            />
          </template>
          <template v-else-if="column.key === 'costStatus'">
            <a-tag :class="['tag', costStatusColor(record.costStatus)]">{{ costStatusName(record.costStatus) }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal
      v-model:open="manualOpen"
      title="其他费用登记"
      :confirm-loading="manualSubmitting"
      ok-text="确认提交"
      cancel-text="关闭"
      :width="620"
      @ok="submitManualCost"
    >
      <a-form layout="vertical" class="manual-cost-form">
        <a-row :gutter="14">
          <a-col :span="12">
            <a-form-item label="计量编号">
              <a-input v-model:value="manualForm.deviceCode" placeholder="请输入计量编号" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="设备名称">
              <a-input v-model:value="manualForm.deviceName" placeholder="请输入设备名称" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="规格型号">
              <a-input v-model:value="manualForm.modelSpec" placeholder="请输入规格型号" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="使用部门">
              <a-input v-model:value="manualForm.deptName" placeholder="请输入使用部门" allow-clear />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="费用类型" required>
              <a-select
                v-model:value="manualForm.costType"
                :options="[
                  { label: '其他费用', value: 'other' },
                  { label: '维修费用', value: 'repair' },
                  { label: '采购费用', value: 'purchase' }
                ]"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="发生日期">
              <a-input v-model:value="manualForm.occurredAt" type="date" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="费用金额" required>
              <a-input-number v-model:value="manualForm.amount" :min="0" :precision="2" class="full-input" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="数量">
              <a-input-number v-model:value="manualForm.quantity" :min="1" :precision="0" class="full-input" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="单价">
              <a-input-number v-model:value="manualForm.unitPrice" :min="0" :precision="2" class="full-input" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="币种">
              <a-input v-model:value="manualForm.currency" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="manualForm.remark" :rows="3" placeholder="请输入费用说明" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </section>
</template>

<style scoped>
.cost-page {
  display: grid;
  gap: 16px;
}

.cost-page-head {
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 2px;
}

.breadcrumb {
  color: #667085;
  font-size: 13px;
}

.cost-page-head h1 {
  margin: 6px 0 0;
  color: #172033;
  font-size: 24px;
  font-weight: 800;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.role-tag {
  height: 30px;
  display: inline-flex;
  align-items: center;
  margin: 0;
  border-radius: 999px;
  font-weight: 600;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
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
  white-space: nowrap;
}

.summary-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
  padding: 14px;
}

.summary-item {
  min-width: 124px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item.compact {
  min-width: 132px;
}

.summary-item span,
.panel-actions {
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.summary-item strong {
  color: #172033;
  font-size: 22px;
  font-weight: 800;
}

.panel-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title-with-filter {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.inline-filters,
.panel-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-control {
  width: 140px;
}

.filter-control.wide {
  width: 180px;
}

.date-control {
  width: 132px;
}

.range-separator {
  color: #667085;
  font-size: 12px;
}

.amount-input {
  width: 112px;
}

.full-input {
  width: 100%;
}

.panel :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.panel :deep(.ant-table-tbody > tr > td) {
  color: #172033;
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

.tag.green {
  border-color: #abefc6;
  background: #ecfdf3;
  color: #067647;
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

.tag.purple {
  border-color: #d9d6fe;
  background: #f4f3ff;
  color: #5925dc;
}

@media (max-width: 1180px) {
  .cost-page-head,
  .panel-title,
  .title-with-filter {
    align-items: stretch;
    flex-direction: column;
  }

  .head-actions,
  .panel-actions,
  .inline-filters {
    align-items: stretch;
  }

  .filter-control,
  .filter-control.wide,
  .date-control {
    width: 100%;
  }
}
</style>
