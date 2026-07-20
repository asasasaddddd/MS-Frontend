<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import QRCode from 'qrcode'
import {
  downloadLabelPdf,
  listPrintedLabels,
  listSupplierFirstCheckPrintedLabels,
  listSupplierFirstCheckUnprintedLabels,
  listUnprintedLabels,
  printLabelRecord
} from '@/api/label'
import { useSessionStore } from '@/stores/session'
import {
  getSelectedLabelRows,
  labelVerificationMethodName,
  labelRowKey,
  type LabelRowKey
} from '@/views/label/labelPrintModel'
import type { LabelPrintRecord } from '@/types/label'

const props = defineProps<{
  mode: 'pending' | 'printed'
}>()

type SourceFlow = 'all' | 'FIRST_CHECK' | 'PERIODIC' | 'BEFORE_USE' | 'CHANGE' | 'SAMPLING'

const route = useRoute()
const router = useRouter()
const session = useSessionStore()
const loading = ref(false)
const printing = ref(false)
const rows = ref<LabelPrintRecord[]>([])
const selectedRowKeys = ref<LabelRowKey[]>([])
const previewOpen = ref(false)
const previewRows = ref<LabelPrintRecord[]>([])
const qrCodeMap = ref<Record<LabelRowKey, string>>({})
const routeFocused = ref(false)
const filters = reactive({
  deviceCode: '',
  sourceType: 'all' as SourceFlow,
  verificationType: 'all',
  isCommon: 'all'
})

const isSupplier = computed(() => session.user?.roleCode === 'SUPPLIER')
const title = computed(() => {
  if (isSupplier.value) return props.mode === 'pending' ? '临时首检标签' : '已打印临时首检标签'
  return props.mode === 'pending' ? '打印标签' : '已打印标签'
})
const tableTitle = computed(() => (props.mode === 'pending' ? '待打印标签明细' : '已打印标签明细'))

const columns = computed(() => {
  if (isSupplier.value) {
    return [
      { title: '序号', key: 'index', width: 70 },
      { title: '首检编号', key: 'orderNo', width: 170 },
      { title: '临时首检码', dataIndex: 'deviceCode', key: 'deviceCode', width: 190 },
      { title: '采购订单号', key: 'purchaseOrderNo', width: 150 },
      { title: '物料编号', key: 'materialCode', width: 130 },
      { title: '物料描述', key: 'materialName', width: 150 },
      { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', width: 150 },
      { title: '数量', key: 'quantity', width: 80 },
      { title: '使用部门', key: 'applyDeptName', width: 130 },
      { title: '申请时间', key: 'applyTime', width: 170 },
      ...(props.mode === 'printed' ? [{ title: '打印次数', dataIndex: 'printCount', key: 'printCount', width: 100 }] : [])
    ]
  }
  const base = [
    { title: '序号', key: 'index', width: 70 },
    { title: '计量编号', dataIndex: 'deviceCode', key: 'deviceCode', width: 150 },
    { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', width: 150 },
    { title: '有效期', dataIndex: 'validUntil', key: 'validUntil', width: 130 },
    { title: '检定日期', dataIndex: 'verificationDate', key: 'verificationDate', width: 130 },
    { title: '检定方式', key: 'verificationType', width: 120 },
    { title: '管理类别', dataIndex: 'manageCategory', key: 'manageCategory', width: 110 },
    { title: '签名人', key: 'signUserName', width: 150 }
  ]
  if (props.mode === 'printed') {
    base.push({ title: '打印次数', dataIndex: 'printCount', key: 'printCount', width: 100 })
  }
  return base
})

const filteredRows = computed(() => {
  const keyword = filters.deviceCode.trim()
  return rows.value.filter((row) => {
    const matchesCode = !keyword || (row.deviceCode || '').includes(keyword)
    const matchesSource = filters.sourceType === 'all' || row.sourceType === filters.sourceType
    const matchesType = filters.verificationType === 'all' || labelVerificationMethodName(row.verificationMethod) === filters.verificationType
    const matchesCommon = filters.isCommon === 'all' || isCommonName(row.isCommon) === filters.isCommon
    return matchesCode && matchesSource && matchesType && matchesCommon
  })
})

const selectedRows = computed(() => getSelectedLabelRows(filteredRows.value, selectedRowKeys.value))

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedRowKeys.value = keys.map(labelRowKey)
  }
}))

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function signatureDisplay(row: LabelPrintRecord) {
  const name = row.signUserName || row.printUserName
  const userId = row.signUserId || row.printUserId
  if (!name && !userId) return '-'
  if (name && userId) return `${name} / ${userId}`
  return String(name || userId)
}

function sourceTypeName(value?: string) {
  const map: Record<string, string> = {
    FIRST_CHECK: '首检',
    PERIODIC: '周检',
    BEFORE_USE: '用前检定',
    CHANGE: '状态变更',
    SAMPLING: '抽检'
  }
  return value ? map[value] || value : '-'
}

function labelTypeName(value?: string) {
  const normalized = String(value || '').toUpperCase()
  if (normalized === 'TEMPORARY_FIRST_CHECK') return '首检临时标签'
  if (normalized === 'SEALED') return '封存标签'
  return '合格标签'
}

function isCommonName(value?: number) {
  if (value === 1) return '是'
  if (value === 0) return '否'
  return '-'
}

function resetFilter() {
  filters.deviceCode = ''
  filters.sourceType = 'all'
  filters.verificationType = 'all'
  filters.isCommon = 'all'
}

function qrSeed(row: LabelPrintRecord) {
  return row.qrCodeData || row.deviceCode || String(row.id)
}

function getTableRowKey(row: LabelPrintRecord) {
  return labelRowKey(row.id)
}

async function buildQrCodes(targets: LabelPrintRecord[]) {
  const entries = await Promise.all(
    targets.map(async (row) => {
      try {
        const dataUrl = await QRCode.toDataURL(qrSeed(row), {
          width: 112,
          margin: 1,
          errorCorrectionLevel: 'M'
        })
        return [labelRowKey(row.id), dataUrl] as const
      } catch {
        return [labelRowKey(row.id), ''] as const
      }
    })
  )
  qrCodeMap.value = Object.fromEntries(entries)
}

async function openPreview(row?: LabelPrintRecord) {
  const targets = row ? [row] : selectedRows.value
  if (targets.length === 0) {
    message.warning('请选择标签明细')
    return
  }
  previewRows.value = targets
  await buildQrCodes(targets)
  previewOpen.value = true
}

function saveLabelPdf(blob: Blob, row: LabelPrintRecord) {
  if (blob.size === 0) {
    throw new Error('后端生成的标签 PDF 为空')
  }

  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = objectUrl
  link.download = `label-${String(row.deviceCode || row.id).replace(/[\\/:*?"<>|]/g, '-')}.pdf`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
}

async function printRows(targets: LabelPrintRecord[]) {
  for (const row of targets) {
    const pdf = await downloadLabelPdf(row.id)
    saveLabelPdf(pdf, row)
    await printLabelRecord(row.id)
  }
  return true
}

async function confirmPrint() {
  if (previewRows.value.length === 0) return
  printing.value = true
  try {
    const allSucceeded = await printRows(previewRows.value)
    await loadRows()
    if (allSucceeded) {
      message.success('标签打印完成')
      previewOpen.value = false
      selectedRowKeys.value = []
    }
  } catch (error) {
    message.error(error instanceof Error ? error.message : '标签打印失败')
  } finally {
    printing.value = false
  }
}

async function loadRows() {
  loading.value = true
  try {
    if (isSupplier.value) {
      rows.value = props.mode === 'pending'
        ? await listSupplierFirstCheckUnprintedLabels()
        : await listSupplierFirstCheckPrintedLabels()
    } else {
      rows.value = props.mode === 'pending' ? await listUnprintedLabels() : await listPrintedLabels()
    }
    selectedRowKeys.value = selectedRowKeys.value.filter((key) => rows.value.some((row) => labelRowKey(row.id) === key))
    await focusRouteTarget()
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '标签列表加载失败')
  } finally {
    loading.value = false
  }
}

function queryValue(key: string) {
  const value = route.query[key]
  return Array.isArray(value) ? value[0] : value
}

function rowMatchesRoute(row: LabelPrintRecord) {
  const sourceType = queryValue('sourceType')
  const sourceId = queryValue('sourceId')
  const recordId = queryValue('recordId')
  if (recordId && String(row.id) !== recordId) return false
  if (sourceType && row.sourceType !== sourceType) return false
  if (sourceId && String(row.sourceId || '') !== sourceId) return false
  return Boolean(sourceType || sourceId || recordId)
}

async function focusRouteTarget() {
  if (routeFocused.value) return
  if (!queryValue('sourceType') && !queryValue('sourceId') && !queryValue('recordId')) return

  routeFocused.value = true
  await nextTick()
  const sourceType = queryValue('sourceType')
  if (sourceType && ['FIRST_CHECK', 'PERIODIC', 'BEFORE_USE', 'CHANGE', 'SAMPLING'].includes(sourceType)) {
    filters.sourceType = sourceType as SourceFlow
  }
  const targetRows = rows.value.filter(rowMatchesRoute)
  if (targetRows.length === 0) {
    message.warning('当前标签页没有找到该待打印标签，请确认流程节点和标签是否已生成')
    return
  }
  previewRows.value = targetRows
  selectedRowKeys.value = targetRows.map((row) => labelRowKey(row.id))
  await buildQrCodes(targetRows)
  previewOpen.value = true
  await router.replace({ path: route.path, query: { mode: props.mode } })
}

onMounted(loadRows)
</script>

<template>
  <section class="label-page">
    <a-card class="panel" :bordered="false">
      <template #title><h2>筛选条件</h2></template>
      <div class="filter-section">
        <label>
          <span>{{ isSupplier ? '临时首检码' : '计量编号' }}</span>
          <a-input v-model:value="filters.deviceCode" :placeholder="isSupplier ? '请输入临时首检码' : '请输入计量编号'" allow-clear />
        </label>
        <label v-if="!isSupplier">
          <span>来源流程</span>
          <a-select
            v-model:value="filters.sourceType"
            :options="[
              { label: '全部', value: 'all' },
              { label: '首检', value: 'FIRST_CHECK' },
              { label: '周检', value: 'PERIODIC' },
              { label: '用前检定', value: 'BEFORE_USE' },
              { label: '状态变更', value: 'CHANGE' },
              { label: '抽检', value: 'SAMPLING' }
            ]"
          />
        </label>
        <label v-if="!isSupplier">
          <span>检定方式</span>
          <a-select
            v-model:value="filters.verificationType"
            :options="[
              { label: '全部', value: 'all' },
              { label: '自检', value: '自检' },
              { label: '外委', value: '外委' }
            ]"
          />
        </label>
        <label v-if="!isSupplier">
          <span>是否通用</span>
          <a-select
            v-model:value="filters.isCommon"
            :options="[
              { label: '全部', value: 'all' },
              { label: '是', value: '是' },
              { label: '否', value: '否' }
            ]"
          />
        </label>
        <div class="filter-actions">
          <a-button type="primary">查询</a-button>
          <a-button @click="resetFilter">重置</a-button>
          <a-button :loading="loading" @click="loadRows">刷新</a-button>
        </div>
      </div>
    </a-card>

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>{{ tableTitle }}</h2>
          <div class="panel-actions">
            <a-tag class="tag orange">共 {{ filteredRows.length }} 项</a-tag>
            <a-button type="primary" :disabled="selectedRows.length === 0" @click="openPreview()">打印</a-button>
          </div>
        </div>
      </template>

      <a-table
        :columns="columns"
        :data-source="filteredRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-selection="rowSelection"
        :scroll="{ x: isSupplier ? 1420 : mode === 'printed' ? 1120 : 1020 }"
        :row-key="getTableRowKey"
        size="middle"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'orderNo'">{{ display(record.sourceDetail?.businessNo) }}</template>
          <template v-else-if="column.key === 'deviceCode'">
            <a-button type="link" class="code-link" @click="openPreview(record)">{{ display(record.deviceCode) }}</a-button>
          </template>
          <template v-else-if="column.key === 'purchaseOrderNo'">{{ display(record.sourceDetail?.purchaseOrderNo) }}</template>
          <template v-else-if="column.key === 'materialCode'">{{ display(record.sourceDetail?.materialCode) }}</template>
          <template v-else-if="column.key === 'materialName'">{{ display(record.sourceDetail?.materialName) }}</template>
          <template v-else-if="column.key === 'deviceName'">{{ display(record.deviceName) }}</template>
          <template v-else-if="column.key === 'quantity'">{{ display(record.sourceDetail?.quantity) }}</template>
          <template v-else-if="column.key === 'applyDeptName'">{{ display(record.sourceDetail?.applyDeptName) }}</template>
          <template v-else-if="column.key === 'applyTime'">{{ display(record.sourceDetail?.applyTime) }}</template>
          <template v-else-if="column.key === 'validUntil'">{{ display(record.validUntil) }}</template>
          <template v-else-if="column.key === 'verificationDate'">{{ display(record.verificationDate) }}</template>
          <template v-else-if="column.key === 'verificationType'">{{ labelVerificationMethodName(record.verificationMethod) }}</template>
          <template v-else-if="column.key === 'manageCategory'">{{ display(record.manageCategory) }}</template>
          <template v-else-if="column.key === 'signUserName'">{{ signatureDisplay(record) }}</template>
          <template v-else-if="column.key === 'printCount'">{{ record.printCount || 0 }}</template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="previewOpen" :title="title" width="980px" :footer="null" :destroy-on-close="true">
      <div class="label-preview-grid">
        <div v-for="row in previewRows" :key="labelRowKey(row.id)" class="label-card">
          <div class="label-main">
            <div>
              <div class="label-kind">{{ labelTypeName(row.labelType) }}</div>
              <div class="device-code">{{ display(row.deviceCode) }}</div>
            </div>
            <div class="qr-box" :aria-label="`二维码 ${display(row.deviceCode)}`">
              <img v-if="qrCodeMap[labelRowKey(row.id)]" :src="qrCodeMap[labelRowKey(row.id)]" alt="二维码" />
              <span v-else>二维码</span>
            </div>
          </div>
          <div class="label-fields">
            <template v-if="isSupplier">
              <span>首检编号：{{ display(row.sourceDetail?.businessNo) }}</span>
              <span>临时首检码：{{ display(row.deviceCode) }}</span>
              <span>采购订单号：{{ display(row.sourceDetail?.purchaseOrderNo) }}</span>
              <span>物料编号：{{ display(row.sourceDetail?.materialCode) }}</span>
              <span>物料描述：{{ display(row.sourceDetail?.materialName) }}</span>
              <span>设备名称：{{ display(row.sourceDetail?.deviceName) }}</span>
              <span>规格型号：{{ display(row.sourceDetail?.modelSpec) }}</span>
              <span>数量：{{ display(row.sourceDetail?.quantity) }}</span>
              <span>使用部门：{{ display(row.sourceDetail?.applyDeptName) }}</span>
              <span>供应商名称：{{ display(row.sourceDetail?.supplierName) }}</span>
              <span>申请人：{{ display(row.sourceDetail?.applicantName) }} / {{ display(row.sourceDetail?.applicantId) }}</span>
              <span>申请时间：{{ display(row.sourceDetail?.applyTime) }}</span>
              <span>附件：{{ row.sourceDetail?.hasAttachment ? '有附件' : '无附件' }}</span>
              <span>备注：{{ display(row.sourceDetail?.remark) }}</span>
            </template>
            <template v-else>
              <span>设备名称：{{ display(row.deviceName) }}</span>
              <span>来源流程：{{ sourceTypeName(row.sourceType) }}</span>
              <span>标签类型：{{ labelTypeName(row.labelType) }}</span>
              <span>检定方式：{{ labelVerificationMethodName(row.verificationMethod) }}</span>
              <span>管理类别：{{ display(row.manageCategory) }}</span>
              <span>是否通用：{{ isCommonName(row.isCommon) }}</span>
              <span>有效期：{{ display(row.validUntil || row.sealDate) }}</span>
              <span>检定日期：{{ display(row.verificationDate) }}</span>
              <span>签名人：{{ signatureDisplay(row) }}</span>
            </template>
            <span v-if="mode === 'printed'">打印次数：{{ row.printCount || 0 }}</span>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <a-button @click="previewOpen = false">关闭</a-button>
        <a-button type="primary" :loading="printing" @click="confirmPrint">
          {{ mode === 'pending' ? '确认打印' : '再次打印' }}
        </a-button>
      </div>
    </a-modal>
  </section>
</template>

<style scoped>
.label-page {
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

.filter-section {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px;
}

.filter-section label {
  width: 180px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-section span {
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.filter-actions,
.panel-title,
.panel-actions,
.dialog-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  justify-content: space-between;
}

.panel-actions {
  flex-wrap: wrap;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.code-link {
  height: 28px;
  padding: 0;
  color: #1769e0;
}

.panel :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.label-preview-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  max-height: 62vh;
  overflow: auto;
  padding-right: 4px;
}

.label-card {
  min-height: 210px;
  padding: 14px;
  border: 1px solid #d3dae6;
  border-radius: 8px;
  background: #ffffff;
}

.label-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5eaf1;
}

.label-kind {
  color: #1769e0;
  font-size: 15px;
  font-weight: 800;
}

.device-code {
  margin-top: 6px;
  color: #172033;
  font-size: 20px;
  font-weight: 800;
}

.qr-box {
  width: 98px;
  height: 98px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  padding: 4px;
  border: 1px solid #172033;
  background: #ffffff;
}

.qr-box img {
  width: 88px;
  height: 88px;
  display: block;
}

.qr-box span {
  color: #667085;
  font-size: 12px;
}

.label-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
  margin-top: 12px;
  color: #344054;
  font-size: 13px;
}

.label-fields span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-actions {
  justify-content: flex-end;
  margin-top: 16px;
}

@media (max-width: 900px) {
  .filter-section,
  .panel-title,
  .panel-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-section label {
    width: 100%;
  }

  .label-preview-grid,
  .label-fields {
    grid-template-columns: 1fr;
  }
}
</style>
