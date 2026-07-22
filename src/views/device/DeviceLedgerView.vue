<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import {
  ClockCircleOutlined,
  CloseOutlined,
  CheckOutlined,
  DatabaseOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileOutlined,
  SaveOutlined,
  SearchOutlined
} from '@ant-design/icons-vue'
import { attachmentDownloadUrl, listAttachmentsByCaseId } from '@/api/attachment'
import {
  getBusinessCaseDetail,
  getDeviceByCode,
  listDeviceBusinessEvents,
  listDevicePage,
  updateDeviceLedger,
  updateDeviceStorageLocation
} from '@/api/device'
import { useSessionStore } from '@/stores/session'
import type {
  AttachmentCaseGroupVO,
  BusinessCaseDetailVO,
  CaseAttachmentFileVO,
  DeviceBusinessEventVO,
  DeviceLedgerUpdateRequest,
  DevicePageQuery,
  DeviceVO
} from '@/types/device'
import DeviceLedgerEditForm from '@/views/device/DeviceLedgerEditForm.vue'
import {
  deviceCategoryColor,
  deviceCategoryText,
  deviceStatusColor,
  deviceStatusText,
  displayValue,
  formatCycle,
  formatDate,
  mapDeviceLedgerRow,
  type DeviceLedgerRow,
  verificationMethodText
} from '@/views/device/deviceLedgerModel'
import {
  mapBusinessEventRow,
  mapBusinessFlowRow,
  mapCaseAttachmentSection
} from '@/views/device/deviceBusinessHistoryModel'

type SearchField =
  | 'deviceCode'
  | 'deviceName'
  | 'manageCategory'
  | 'modelSpec'
  | 'factoryCode'
  | 'deviceStatus'
  | 'verificationCycleMonth'
  | 'validUntil'
  | 'lastVerificationDate'
  | 'deptName'
  | 'manufacturer'
  | 'verificationMethod'

interface MeasurementRow {
  theoretical: string
  measured: string
  fillTime: string
}

const loading = ref(false)
const detailLoading = ref(false)
const historyLoading = ref(false)
const caseLoading = ref(false)
const devices = ref<DeviceVO[]>([])
const activeDevice = ref<DeviceVO>()
const businessEvents = ref<DeviceBusinessEventVO[]>([])
const activeCase = ref<BusinessCaseDetailVO>()
const caseAttachments = ref<AttachmentCaseGroupVO[]>([])
const selectedRowKeys = ref<Array<string | number>>([])
const detailOpen = ref(false)
const historyOpen = ref(false)
const caseDetailOpen = ref(false)
const dataCatalogOpen = ref(false)
const exportMode = ref<'basic' | 'detail'>('basic')
const measurementRows = ref<MeasurementRow[]>([])
const editMode = ref(false)
const savingLedger = ref(false)
const editFormRef = ref<{ submit: () => void }>()
const editingStorageLocation = ref(false)
const storageLocationValue = ref('')
const savingStorageLocation = ref(false)
const session = useSessionStore()

const query = reactive({
  searchField: 'deviceCode' as SearchField,
  keyword: '',
  current: 1,
  size: 10,
  total: 0
})

const searchFields: Array<{ label: string; value: SearchField }> = [
  { label: '计量编号', value: 'deviceCode' },
  { label: '设备名称', value: 'deviceName' },
  { label: '管理类别', value: 'manageCategory' },
  { label: '规格型号', value: 'modelSpec' },
  { label: '出厂编号', value: 'factoryCode' },
  { label: '设备状态', value: 'deviceStatus' },
  { label: '检定周期', value: 'verificationCycleMonth' },
  { label: '有效期', value: 'validUntil' },
  { label: '检定日期', value: 'lastVerificationDate' },
  { label: '使用部门', value: 'deptName' },
  { label: '生产厂家', value: 'manufacturer' },
  { label: '检定方式', value: 'verificationMethod' }
]

const columns = [
  { title: '计量编号', key: 'deviceCode', width: 190, fixed: 'left' },
  { title: '设备名称', key: 'deviceName', width: 170 },
  { title: '管理类别', key: 'categoryText', width: 100 },
  { title: '规格型号', key: 'modelSpec', width: 160 },
  { title: '出厂编号', key: 'factoryCode', width: 150 },
  { title: '设备状态', key: 'statusText', width: 110 },
  { title: '检定周期', key: 'cycleText', width: 110 },
  { title: '有效期', key: 'validUntil', width: 125 },
  { title: '检定日期', key: 'lastVerificationDate', width: 125 },
  { title: '使用部门', key: 'deptName', width: 160 },
  { title: '生产厂家', key: 'manufacturer', width: 160 },
  { title: '检定方式', key: 'methodText', width: 110 },
  { title: '查看详情', key: 'detail', width: 110, fixed: 'right' },
  { title: '履历', key: 'history', width: 90, fixed: 'right' }
]

const rows = computed(() => {
  const today = new Date().toISOString().slice(0, 10)
  return devices.value.map((device) => mapDeviceLedgerRow(device, today))
})
const historyRows = computed(() => businessEvents.value.map(mapBusinessEventRow))
const caseFlowRows = computed(() => (activeCase.value?.timeline || []).map(mapBusinessFlowRow))
const attachmentSections = computed(() => caseAttachments.value.map(mapCaseAttachmentSection))
const selectedRow = computed(() => rows.value.find((row) => row.key === String(selectedRowKeys.value[0])))
const canOpenSelectedHistory = computed(() => selectedRowKeys.value.length === 1)
const canEditLedger = computed(() => session.user?.roleCode === 'SUPER_ADMIN')
const canEditStorageLocation = computed(() => {
  const user = session.user
  const device = activeDevice.value
  if (!user || user.roleCode !== 'MEASURE_ADMIN' || !device) return false
  const sameDepartment = Boolean(user.deptId && device.deptId && user.deptId === device.deptId)
  return user.employeeId === device.measureManagerId || sameDepartment
})
const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: Array<string | number>) => {
    selectedRowKeys.value = keys
  }
}))

function yesNoText(value?: number) {
  if (value === 1) return '是'
  if (value === 0) return '否'
  return '-'
}

function personText(name?: string, employeeId?: string) {
  if (!name && !employeeId) return '-'
  if (!employeeId) return displayValue(name)
  return displayValue(name) + '（' + employeeId + '）'
}

function verificationCostText(device: DeviceVO) {
  const value = device.verificationCost
  return value === undefined || value === null || value === '' ? '-' : String(value)
}

const detailFields = computed(() => {
  const device = activeDevice.value
  if (!device) return []
  return [
    { label: '计量编号', value: displayValue(device.deviceCode) },
    { label: '设备名称', value: displayValue(device.deviceName) },
    { label: '规格型号', value: displayValue(device.modelSpec) },
    { label: '供应商名称', value: displayValue(device.supplierName) },
    { label: '设备使用场景', value: displayValue(device.usageScenario) },
    { label: '设备用途', value: displayValue(device.deviceUsage) },
    { label: '测量范围', value: displayValue(device.measureRange) },
    { label: '分度值', value: displayValue(device.resolution) },
    { label: '准确度等级', value: displayValue(device.accuracyLevel || device.accuracy) },
    { label: '允许误差', value: displayValue(device.allowedError) },
    { label: '生产厂家', value: displayValue(device.manufacturer) },
    { label: '出厂日期', value: formatDate(device.factoryDate) },
    { label: '学科大类', value: displayValue(device.subjectCategory) },
    { label: '学科小类', value: displayValue(device.subjectSubCategory) },
    { label: '设备状态', value: deviceStatusText(device.deviceStatus), tag: deviceStatusColor(device.deviceStatus) },
    { label: '是否强检', value: yesNoText(device.isMandatory) },
    { label: '标准器', value: displayValue(device.standardDevice) },
    { label: '确认间隔', value: displayValue(device.confirmInterval) },
    { label: '专用项目', value: displayValue(device.specialProject) },
    { label: '检定周期', value: formatCycle(device.verificationCycleMonth) },
    { label: '检定方式', value: verificationMethodText(device.verificationMethod) },
    { label: '管理类别', value: deviceCategoryText(device.manageCategory), tag: deviceCategoryColor(device.manageCategory) },
    { label: '是否通用设备', value: yesNoText(device.isCommon) },
    { label: '检测费用（元）', value: verificationCostText(device) },
    { label: '采购费用（元）', value: displayValue(device.purchaseCost) },
    { label: '使用部门', value: displayValue(device.deptName) },
    { key: 'storageLocation', label: '存储位置', value: displayValue(device.storageLocation) },
    { label: '计量检定员', value: personText(device.verifierName, device.verifierId) },
    { label: '计量管理员', value: personText(device.measureManagerName, device.measureManagerId) },
    { label: '计量确认员', value: personText(device.confirmEngineerName, device.confirmEngineerId) }
  ]
})

function normalizeMethodKeyword(keyword: string) {
  if (/自检|现场/.test(keyword)) return 'self'
  if (/外委|外送|送检/.test(keyword)) return 'send_out'
  return keyword
}

function buildQueryParams(current = query.current, size = query.size): DevicePageQuery | null {
  const params: DevicePageQuery = { current, size }
  const keyword = query.keyword.trim()
  if (!keyword) return params

  if (query.searchField === 'verificationCycleMonth') {
    const cycle = Number(keyword.replace(/[^\d]/g, ''))
    if (!Number.isInteger(cycle) || cycle <= 0) {
      message.warning('检定周期请输入正整数，例如 12')
      return null
    }
    params.verificationCycleMonth = cycle
  } else if (query.searchField === 'validUntil' || query.searchField === 'lastVerificationDate') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(keyword)) {
      message.warning('日期请按 YYYY-MM-DD 输入')
      return null
    }
    params[query.searchField] = keyword
  } else if (query.searchField === 'verificationMethod') {
    params.verificationMethod = normalizeMethodKeyword(keyword)
  } else {
    params[query.searchField] = keyword as never
  }
  return params
}

async function loadDevices() {
  const params = buildQueryParams()
  if (!params) return
  loading.value = true
  try {
    const result = await listDevicePage(params)
    devices.value = result.records || []
    query.total = Number(result.total || 0)
    selectedRowKeys.value = []
  } catch (error) {
    devices.value = []
    query.total = 0
    message.error(error instanceof Error ? error.message : '计量台账加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.current = 1
  loadDevices()
}

function resetFilter() {
  query.searchField = 'deviceCode'
  query.keyword = ''
  query.current = 1
  loadDevices()
}

function handlePageChange(page: number, size: number) {
  query.current = page
  query.size = size
  loadDevices()
}

async function resolveFullDevice(row: DeviceLedgerRow) {
  activeDevice.value = row.source
  if (!row.source.deviceCode) return
  detailLoading.value = true
  try {
    activeDevice.value = await getDeviceByCode(row.source.deviceCode)
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '设备详情加载失败，已显示列表数据')
  } finally {
    detailLoading.value = false
  }
}

function startEdit() {
  if (!canEditLedger.value || !activeDevice.value) return
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
}

function startStorageLocationEdit() {
  if (!canEditStorageLocation.value || !activeDevice.value) return
  storageLocationValue.value = activeDevice.value.storageLocation || ''
  editingStorageLocation.value = true
}

function cancelStorageLocationEdit() {
  editingStorageLocation.value = false
  storageLocationValue.value = ''
}

async function saveStorageLocation() {
  const device = activeDevice.value
  const storageLocation = storageLocationValue.value.trim()
  if (!device?.id) return
  if (!storageLocation) {
    message.warning('请填写存储位置')
    return
  }

  savingStorageLocation.value = true
  try {
    await updateDeviceStorageLocation(device.id, { storageLocation })
    const refreshed = device.deviceCode ? await getDeviceByCode(device.deviceCode) : undefined
    if (refreshed) {
      activeDevice.value = refreshed
      const index = devices.value.findIndex((item) => item.id === refreshed.id)
      if (index >= 0) devices.value.splice(index, 1, refreshed)
    }
    cancelStorageLocationEdit()
    message.success('存储位置已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '存储位置保存失败')
  } finally {
    savingStorageLocation.value = false
  }
}

async function saveLedger(payload: DeviceLedgerUpdateRequest) {
  const device = activeDevice.value
  if (!device?.id) return
  savingLedger.value = true
  try {
    await updateDeviceLedger(device.id, payload)
    const refreshed = device.deviceCode ? await getDeviceByCode(device.deviceCode) : undefined
    if (refreshed) {
      activeDevice.value = refreshed
      const index = devices.value.findIndex((item) => item.id === refreshed.id)
      if (index >= 0) devices.value.splice(index, 1, refreshed)
    }
    editMode.value = false
    message.success('台账已保存')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '台账保存失败')
  } finally {
    savingLedger.value = false
  }
}

async function loadBusinessEvents(deviceCode?: string) {
  if (!deviceCode) return
  historyLoading.value = true
  businessEvents.value = []
  try {
    businessEvents.value = await listDeviceBusinessEvents(deviceCode)
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '设备履历加载失败')
  } finally {
    historyLoading.value = false
  }
}

async function openCaseDetail(caseId: string | number) {
  const deviceId = activeDevice.value?.id
  if (!deviceId) {
    message.error('当前设备缺少主键，无法加载设备履历附件')
    return
  }
  caseDetailOpen.value = true
  caseLoading.value = true
  activeCase.value = undefined
  caseAttachments.value = []
  try {
    const [detail, attachments] = await Promise.all([
      getBusinessCaseDetail(caseId),
      listAttachmentsByCaseId(caseId, deviceId)
    ])
    activeCase.value = detail
    caseAttachments.value = attachments
  } catch (error) {
    message.error(error instanceof Error ? error.message : '业务案例详情加载失败')
  } finally {
    caseLoading.value = false
  }
}

async function openDetail(row: DeviceLedgerRow) {
  editMode.value = false
  cancelStorageLocationEdit()
  detailOpen.value = true
  await resolveFullDevice(row)
}

async function openHistory(row: DeviceLedgerRow) {
  historyOpen.value = true
  await resolveFullDevice(row)
  await loadBusinessEvents(activeDevice.value?.deviceCode)
}

function openSelectedHistory() {
  if (selectedRow.value) openHistory(selectedRow.value)
}

function openDataCatalog() {
  measurementRows.value = []
  dataCatalogOpen.value = true
}

function downloadAttachment(attachment: CaseAttachmentFileVO) {
  window.open(attachmentDownloadUrl(attachment.id), '_blank', 'noopener,noreferrer')
}

function quoteCsv(value: unknown) {
  const text = value === null || value === undefined ? '' : String(value)
  return '"' + text.replace(/"/g, '""') + '"'
}

function downloadCsv(fileName: string, headers: string[], exportRows: Array<Array<unknown>>) {
  const content = [headers, ...exportRows].map((row) => row.map(quoteCsv).join(',')).join('\r\n')
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8' })
  const anchor = document.createElement('a')
  anchor.href = URL.createObjectURL(blob)
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(anchor.href)
}

async function exportLedger() {
  const params = buildQueryParams(1, Math.max(query.total, query.size, 1))
  if (!params) return
  try {
    const result = await listDevicePage(params)
    const exportDevices = result.records || []
    const basicHeaders = ['计量编号', '设备名称', '管理类别', '规格型号', '出厂编号', '设备状态', '检定周期', '有效期', '检定日期', '使用部门', '生产厂家', '检定方式']
    const basicRows = exportDevices.map((device) => [
      device.deviceCode, device.deviceName, deviceCategoryText(device.manageCategory), device.modelSpec,
      device.factoryCode, deviceStatusText(device.deviceStatus), formatCycle(device.verificationCycleMonth),
      formatDate(device.validUntil), formatDate(device.lastVerificationDate), device.deptName,
      device.manufacturer, verificationMethodText(device.verificationMethod)
    ])
    const dateText = new Date().toISOString().slice(0, 10)
    if (exportMode.value === 'basic') {
      downloadCsv('计量台账_' + dateText + '.csv', basicHeaders, basicRows)
    } else {
      const detailHeaders = [
        ...basicHeaders, '供应商名称', '设备使用场景', '设备用途', '测量范围', '分度值', '准确度等级', '允许误差', '出厂日期',
        '学科大类', '学科小类', '是否强检', '标准器', '确认间隔', '专用项目',
        '是否通用设备', '检测费用（元）', '采购费用（元）', '存储位置',
        '计量检定员', '计量管理员', '计量确认员', '数据目录', '附件'
      ]
      const detailRows = exportDevices.map((device, index) => [
        ...basicRows[index], device.supplierName, device.usageScenario, device.deviceUsage, device.measureRange, device.resolution,
        device.accuracyLevel || device.accuracy, device.allowedError, formatDate(device.factoryDate),
        device.subjectCategory, device.subjectSubCategory, yesNoText(device.isMandatory),
        device.standardDevice, device.confirmInterval, device.specialProject, yesNoText(device.isCommon),
        verificationCostText(device), device.purchaseCost, device.storageLocation,
        personText(device.verifierName, device.verifierId),
        personText(device.measureManagerName, device.measureManagerId),
        personText(device.confirmEngineerName, device.confirmEngineerId), '', ''
      ])
      downloadCsv('计量台账详情_' + dateText + '.csv', detailHeaders, detailRows)
    }
    message.success('已导出 ' + exportDevices.length + ' 条记录')
  } catch (error) {
    message.error(error instanceof Error ? error.message : '导出失败')
  }
}

onMounted(loadDevices)
</script>

<template>
  <section class="ledger-page">
    <section class="panel">
      <div class="panel-header"><h2>搜索条件</h2></div>
      <div class="toolbar">
        <div class="field-group">
          <label>字段筛选</label>
          <a-select v-model:value="query.searchField" class="field-select" :options="searchFields" />
        </div>
        <div class="field-group keyword-field">
          <label>关键词</label>
          <a-input v-model:value="query.keyword" placeholder="输入关键字模糊查询" allow-clear @press-enter="handleSearch" />
        </div>
        <div class="toolbar-actions">
          <a-button type="primary" @click="handleSearch"><SearchOutlined />查询</a-button>
          <a-button @click="resetFilter">重置</a-button>
        </div>
      </div>
    </section>

    <section class="panel ledger-panel">
      <div class="panel-header">
        <h2>计量台账明细</h2>
        <div class="panel-actions">
          <a-select v-model:value="exportMode" class="export-mode">
            <a-select-option value="basic">导出</a-select-option>
            <a-select-option value="detail">详情导出</a-select-option>
          </a-select>
          <a-button class="export-button" @click="exportLedger"><DownloadOutlined />导出</a-button>
          <a-button :disabled="!canOpenSelectedHistory" @click="openSelectedHistory"><ClockCircleOutlined />履历</a-button>
        </div>
      </div>

      <a-table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :row-selection="rowSelection"
        :pagination="{
          current: query.current,
          pageSize: query.size,
          total: query.total,
          showSizeChanger: false,
          showTotal: (total: number) => '共 ' + total + ' 条记录',
          onChange: handlePageChange
        }"
        :scroll="{ x: 1945 }"
        row-key="key"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'deviceCode'">
            <a class="ledger-link" @click="openDetail(record)">{{ record.deviceCode }}</a>
          </template>
          <template v-else-if="column.key === 'deviceName'">
            <strong class="cell-ellipsis" :title="record.deviceName">{{ record.deviceName }}</strong>
          </template>
          <template v-else-if="['modelSpec', 'factoryCode', 'deptName', 'manufacturer'].includes(String(column.key))">
            <span class="cell-ellipsis" :title="record[column.key]">{{ record[column.key] }}</span>
          </template>
          <template v-else-if="column.key === 'categoryText'">
            <a-tag :class="['ledger-tag', record.categoryColor]">{{ record.categoryText }}</a-tag>
          </template>
          <template v-else-if="column.key === 'statusText'">
            <a-tag :class="['ledger-tag', record.statusColor]">{{ record.statusText }}</a-tag>
          </template>
          <template v-else-if="column.key === 'validUntil'">
            <span :class="{ overdue: record.overdue }">{{ record.nextVerificationDate }}</span>
          </template>
          <template v-else-if="column.key === 'lastVerificationDate'">{{ record.lastVerificationDate }}</template>
          <template v-else-if="column.key === 'cycleText'">{{ record.cycleText }}</template>
          <template v-else-if="column.key === 'methodText'">{{ record.methodText }}</template>
          <template v-else-if="column.key === 'detail'">
            <a class="ledger-link" @click="openDetail(record)"><EyeOutlined />查看详情</a>
          </template>
          <template v-else-if="column.key === 'history'">
            <a class="ledger-link" @click="openHistory(record)">履历</a>
          </template>
        </template>
      </a-table>
    </section>

    <a-drawer
      v-model:open="detailOpen"
      :width="editMode ? 860 : 600"
      placement="right"
      class="ledger-drawer"
      @close="cancelEdit"
    >
      <template #title>
        <span class="drawer-title"><EyeOutlined />{{ editMode ? '编辑设备台账' : '设备详情' }}</span>
      </template>
      <template #extra>
        <a-space v-if="canEditLedger && activeDevice">
          <a-button v-if="!editMode" @click="startEdit"><EditOutlined />编辑</a-button>
          <template v-else>
            <a-button :disabled="savingLedger" @click="cancelEdit"><CloseOutlined />取消</a-button>
            <a-button type="primary" :loading="savingLedger" @click="editFormRef?.submit()"><SaveOutlined />保存台账</a-button>
          </template>
        </a-space>
      </template>
      <a-spin :spinning="detailLoading">
        <DeviceLedgerEditForm
          v-if="activeDevice && editMode"
          ref="editFormRef"
          :device="activeDevice"
          @submit="saveLedger"
        />
        <div v-else-if="activeDevice" class="detail-grid">
          <div v-for="field in detailFields" :key="field.label" class="detail-field">
            <label>{{ field.label }}</label>
            <div class="detail-value">
              <template v-if="field.key === 'storageLocation' && canEditStorageLocation">
                <div v-if="editingStorageLocation" class="storage-location-editor">
                  <a-input
                    v-model:value="storageLocationValue"
                    class="storage-location-input"
                    :maxlength="128"
                    placeholder="请输入存储位置"
                    @pressEnter="saveStorageLocation"
                  />
                  <a-tooltip title="保存存储位置">
                    <a-button
                      type="primary"
                      size="small"
                      :loading="savingStorageLocation"
                      aria-label="保存存储位置"
                      @click="saveStorageLocation"
                    >
                      <CheckOutlined />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip title="取消修改">
                    <a-button
                      size="small"
                      :disabled="savingStorageLocation"
                      aria-label="取消修改存储位置"
                      @click="cancelStorageLocationEdit"
                    >
                      <CloseOutlined />
                    </a-button>
                  </a-tooltip>
                </div>
                <div v-else class="storage-location-display">
                  <span>{{ field.value }}</span>
                  <a-tooltip title="修改存储位置">
                    <a-button type="text" size="small" aria-label="修改存储位置" @click="startStorageLocationEdit">
                      <EditOutlined />
                    </a-button>
                  </a-tooltip>
                </div>
              </template>
              <a-tag v-else-if="field.tag" :class="['ledger-tag', field.tag]">{{ field.value }}</a-tag>
              <span v-else>{{ field.value }}</span>
            </div>
          </div>
          <div class="detail-field full">
            <label>数据目录</label>
            <div class="detail-value link-value" @click="openDataCatalog"><DatabaseOutlined />查看数据目录</div>
          </div>
        </div>
      </a-spin>
    </a-drawer>

    <a-drawer v-model:open="historyOpen" :width="600" placement="right" class="ledger-drawer">
      <template #title><span class="drawer-title"><ClockCircleOutlined />设备履历</span></template>
      <a-spin :spinning="detailLoading || historyLoading">
        <template v-if="activeDevice">
          <div class="history-device-summary">
            <div>
              <strong>{{ displayValue(activeDevice.deviceName) }}</strong>
              <a-tag class="ledger-tag blue">{{ displayValue(activeDevice.deviceCode) }}</a-tag>
            </div>
            <span>规格型号：{{ displayValue(activeDevice.modelSpec) }}&ensp;|&ensp;使用部门：{{ displayValue(activeDevice.deptName) }}</span>
          </div>
          <h3>业务履历</h3>
          <a-timeline v-if="historyRows.length" class="history-timeline">
            <a-timeline-item v-for="item in historyRows" :key="item.key" :color="item.color === 'default' ? 'gray' : item.color">
              <div class="timeline-card timeline-card-link" @click="openCaseDetail(item.caseId)">
                <div class="timeline-card-header">
                  <strong>{{ item.title }}</strong>
                  <a-tag :class="['ledger-tag', item.color]">{{ item.statusText }}</a-tag>
                </div>
                <div class="timeline-meta">
                  <span>{{ item.dateText }}</span>
                  <span>{{ item.typeText }}</span>
                </div>
                <p>业务单号：{{ item.businessNo }}</p>
                <p>当前节点：{{ item.currentNodeText }}</p>
                <p v-if="item.resultText !== '-'">处理结果：{{ item.resultText }}</p>
              </div>
            </a-timeline-item>
          </a-timeline>
          <a-empty v-else description="暂无业务履历" />
        </template>
      </a-spin>
    </a-drawer>

    <a-modal v-model:open="caseDetailOpen" :footer="null" :width="1040" class="case-detail-modal">
      <template #title>
        <span class="drawer-title"><ClockCircleOutlined />业务流程详情</span>
      </template>
      <a-spin :spinning="caseLoading">
        <template v-if="activeCase">
          <section class="case-summary-grid">
            <div><label>业务类型</label><strong>{{ activeCase.businessTypeName || activeCase.businessType || '-' }}</strong></div>
            <div><label>业务单号</label><strong>{{ activeCase.businessNo || '-' }}</strong></div>
            <div><label>当前状态</label><strong>{{ activeCase.statusName || activeCase.statusCode || '-' }}</strong></div>
            <div><label>当前节点</label><strong>{{ activeCase.currentNodeName || activeCase.currentNodeCode || '-' }}</strong></div>
            <div><label>处理结果</label><strong>{{ activeCase.resultName || activeCase.resultCode || '-' }}</strong></div>
            <div><label>开始时间</label><strong>{{ activeCase.startedAt ? activeCase.startedAt.replace('T', ' ').slice(0, 16) : '-' }}</strong></div>
          </section>

          <section class="case-section">
            <h3>流程轨迹与审批意见</h3>
            <a-timeline v-if="caseFlowRows.length" class="history-timeline">
              <a-timeline-item v-for="flow in caseFlowRows" :key="flow.key" :color="flow.color === 'default' ? 'gray' : flow.color">
                <div class="timeline-card">
                  <div class="timeline-card-header">
                    <strong>{{ flow.nodeText }}</strong>
                    <a-tag :class="['ledger-tag', flow.color]">{{ flow.kindText }}</a-tag>
                  </div>
                  <div class="timeline-meta">
                    <span>{{ flow.dateText }}</span>
                    <span>操作人：{{ flow.operatorText }}</span>
                    <span>动作：{{ flow.actionText }}</span>
                    <span v-if="flow.nextNodeText !== '-'">下一节点：{{ flow.nextNodeText }}</span>
                  </div>
                  <p v-if="flow.opinion !== '-'">审批意见：{{ flow.opinion }}</p>
                  <p v-if="flow.resultText !== '-'">处理结果：{{ flow.resultText }}</p>
                </div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else description="暂无流程轨迹" />
          </section>

          <section class="case-section">
            <h3>流程附件</h3>
            <div v-if="attachmentSections.length" class="attachment-groups">
              <article v-for="section in attachmentSections" :key="section.key" class="attachment-group">
                <div class="attachment-group-header">
                  <strong>{{ section.purposeText }}</strong>
                  <span>{{ section.scopeText }} · {{ section.statusText }}</span>
                </div>
                <div v-if="section.files.length" class="attachment-file-list">
                  <a v-for="attachment in section.files" :key="attachment.id" @click="downloadAttachment(attachment)">
                    <FileOutlined />
                    <span>{{ attachment.fileName || attachment.id }}</span>
                    <small>{{ attachment.uploaderName || attachment.uploaderId || '-' }}</small>
                  </a>
                </div>
                <a-empty v-else :image="false" description="附件组内暂无文件" />
              </article>
            </div>
            <a-empty v-else description="暂无流程附件" />
          </section>
        </template>
      </a-spin>
    </a-modal>

    <a-modal v-model:open="dataCatalogOpen" :footer="null" :width="680">
      <template #title><span class="drawer-title"><DatabaseOutlined />数据目录 · {{ displayValue(activeDevice?.deviceName) }}</span></template>
      <div class="catalog-device-code">计量编号：<strong>{{ displayValue(activeDevice?.deviceCode) }}</strong></div>
      <a-table v-if="measurementRows.length" :data-source="measurementRows" :pagination="false" size="small" row-key="theoretical">
        <a-table-column title="序号" :width="70">
          <template #default="{ index }">{{ index + 1 }}</template>
        </a-table-column>
        <a-table-column title="理论值" data-index="theoretical" />
        <a-table-column title="实测值" data-index="measured" />
        <a-table-column title="填写时间" data-index="fillTime" />
      </a-table>
      <a-empty v-else description="暂无测量数据" />
    </a-modal>
  </section>
</template>

<style scoped>
.ledger-page {
  display: grid;
  gap: 16px;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 57px;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel-header h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.toolbar,
.panel-actions,
.field-group,
.toolbar-actions {
  display: flex;
  align-items: center;
}

.toolbar {
  gap: 10px;
  flex-wrap: wrap;
  min-height: 58px;
  padding: 12px 14px;
  background: #fbfcfe;
}

.field-group {
  gap: 6px;
}

.field-group label {
  color: #667085;
  font-size: 12px;
  white-space: nowrap;
}

.field-select {
  width: 130px;
}

.keyword-field :deep(.ant-input-affix-wrapper),
.keyword-field :deep(.ant-input) {
  width: 220px;
}

.toolbar-actions {
  gap: 8px;
  margin-left: auto;
}

.panel-actions {
  gap: 0;
}

.export-mode {
  width: 100px;
}

.export-mode :deep(.ant-select-selector) {
  border-radius: 6px 0 0 6px !important;
}

.export-button {
  margin-right: 8px;
  margin-left: -1px;
  border-radius: 0 6px 6px 0;
}

.ledger-panel :deep(.ant-table-thead > tr > th) {
  height: 42px;
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.ledger-panel :deep(.ant-table-cell) {
  height: 42px;
  padding: 8px 12px;
  white-space: nowrap;
}

.ledger-panel :deep(.ant-table-tbody > tr:hover > td) {
  background: #f9fafb;
}

.ledger-panel :deep(.ant-table-row-selected > td) {
  background: #e8f1ff;
}

.ledger-panel :deep(.ant-pagination) {
  margin: 12px 14px;
}

.cell-ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ledger-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #1769e0;
  white-space: nowrap;
}

.ledger-link:hover {
  color: #1557c2;
}

.ledger-tag {
  min-width: 48px;
  margin-inline-end: 0;
  border-radius: 5px;
  text-align: center;
  font-weight: 600;
}

.ledger-tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.ledger-tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.ledger-tag.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.ledger-tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.ledger-tag.default {
  border-color: #d3dae6;
  background: #f8fafc;
  color: #475467;
}

.overdue {
  color: #b42318;
  font-weight: 700;
}

.drawer-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.detail-field {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.detail-field.full {
  grid-column: 1 / -1;
}

.detail-field label {
  color: #667085;
  font-size: 12px;
}

.detail-value {
  display: flex;
  align-items: center;
  min-height: 36px;
  padding: 8px 10px;
  overflow-wrap: anywhere;
  border: 1px solid #e5eaf1;
  border-radius: 6px;
  background: #f8fafc;
  color: #172033;
}

.link-value {
  gap: 6px;
  color: #1769e0;
  cursor: pointer;
}

.history-device-summary {
  display: grid;
  gap: 7px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #f8fafc;
  color: #667085;
  font-size: 13px;
}

.history-device-summary > div {
  display: flex;
  align-items: center;
  gap: 10px;
}

.history-device-summary strong {
  color: #172033;
  font-size: 16px;
}

.ledger-drawer h3 {
  margin: 0 0 12px;
  color: #667085;
  font-size: 14px;
}

.history-timeline {
  margin-top: 4px;
}

.timeline-card {
  margin-bottom: 8px;
  padding: 12px 14px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #f8fafc;
}

.storage-location-display,
.storage-location-editor {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 6px;
}

.storage-location-display span {
  min-width: 0;
  flex: 1;
  overflow-wrap: anywhere;
}

.storage-location-input {
  min-width: 0;
  flex: 1;
}

.timeline-card-link {
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
}

.timeline-card-link:hover {
  border-color: #91bfff;
  box-shadow: 0 8px 18px rgb(23 105 224 / 10%);
  transform: translateY(-1px);
}

.timeline-card-header,
.timeline-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.timeline-card-header strong {
  color: #172033;
}

.timeline-meta {
  justify-content: flex-start;
  flex-wrap: wrap;
  margin-top: 7px;
  color: #667085;
  font-size: 12px;
}

.timeline-card p {
  margin: 6px 0 0;
  color: #667085;
  line-height: 1.6;
}

.case-detail-modal :deep(.ant-modal-body) {
  max-height: calc(92vh - 116px);
  overflow-y: auto;
}

.case-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  padding: 14px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #f8fafc;
}

.case-summary-grid > div {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.case-summary-grid label,
.attachment-group-header span,
.attachment-file-list small {
  color: #667085;
  font-size: 12px;
}

.case-summary-grid strong {
  overflow-wrap: anywhere;
  color: #172033;
}

.case-section {
  margin-top: 20px;
}

.case-section h3 {
  margin: 0 0 12px;
  color: #172033;
  font-size: 15px;
}

.attachment-groups {
  display: grid;
  gap: 10px;
}

.attachment-group {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.attachment-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  border-bottom: 1px solid #e5eaf1;
  background: #f8fafc;
}

.attachment-file-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 12px;
}

.attachment-file-list a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 9px 10px;
  border: 1px solid #e5eaf1;
  border-radius: 6px;
  color: #1769e0;
}

.attachment-file-list a:hover {
  border-color: #91bfff;
  background: #f6f9ff;
}

.attachment-file-list a span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.catalog-device-code {
  margin-bottom: 14px;
  color: #667085;
}

@media (max-width: 760px) {
  .toolbar-actions {
    width: 100%;
    margin-left: 0;
  }

  .keyword-field,
  .keyword-field :deep(.ant-input-affix-wrapper),
  .keyword-field :deep(.ant-input) {
    flex: 1;
    width: 100%;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .detail-field.full {
    grid-column: auto;
  }

  .case-summary-grid,
  .attachment-file-list {
    grid-template-columns: 1fr;
  }
}
</style>
