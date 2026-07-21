<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import {
  listUnifiedScanInbox,
  scanActionName,
  submitUnifiedScan
} from '@/api/scan'
import type { UnifiedScanAction, UnifiedScanInboxItem } from '@/types/scan'
import { roleNameMap } from '@/types/common'
import { useSessionStore } from '@/stores/session'
import {
  matchesScanRouteList,
  shouldFocusScanRoute,
  type ScanRouteQuery
} from '@/views/scan/scanRouteModel'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()

const loading = ref(false)
const submitting = ref(false)
const rows = ref<UnifiedScanInboxItem[]>([])
const keywordCode = ref('')
const keywordName = ref('')
const nodeFilter = ref('all')
const bucket = ref<'pending' | 'scanned'>('pending')
const scanOpen = ref(false)
const failOpen = ref(false)
const activeRow = ref<UnifiedScanInboxItem>()
const routeFocused = ref(false)

const scanForm = reactive({
  scanCode: '',
  opinion: ''
})

const failInfo = reactive({
  code: '',
  deviceName: '',
  message: ''
})

const roleCode = computed(() => session.user?.roleCode || '')
const roleLabel = computed(() => {
  if (roleCode.value === 'EXTERNAL_OPERATOR') return `外扩人员 · ${session.user?.employeeName || session.user?.employeeId || '-'}`
  const name = roleNameMap[roleCode.value] || session.user?.roleName || roleCode.value || '-'
  return `${name} · ${session.user?.employeeName || session.user?.employeeId || '-'}`
})

const roleConfig = computed(() => {
  const commonVerifierActions: UnifiedScanAction[] = ['receive', 'sendout-return', 'periodic-verifier-receive']

  if (roleCode.value === 'MEASURE_ADMIN') {
    return {
      actions: ['take-back'],
      codeLabel: '计量编号',
      placeholder: '请扫描或输入计量编号',
      opinion: '扫码处理完成'
    }
  }

  if (roleCode.value === 'EXTERNAL_OPERATOR') {
    return {
      actions: ['sendout', 'periodic-external-send-out'],
      codeLabel: '扫码编号',
      placeholder: '请扫描或输入设备计量编号/首检临时码',
      opinion: '外扩人员扫码接收'
    }
  }

  if (roleCode.value === 'VERIFIER_EXTERNAL') {
    return {
      actions: [...commonVerifierActions, 'periodic-send-out-return'],
      codeLabel: '扫码编号',
      placeholder: '请扫描或输入计量编号/首检临时码',
      opinion: '外委检定员扫码处理'
    }
  }

  if (roleCode.value === 'VERIFIER_SELF' || roleCode.value === 'VERIFIER') {
    return {
      actions: commonVerifierActions,
      codeLabel: '扫码编号',
      placeholder: '请扫描或输入计量编号/首检临时码',
      opinion: '检定员扫码处理'
    }
  }

  return {
    actions: [] as UnifiedScanAction[],
    codeLabel: '扫码编号',
    placeholder: '当前角色暂无可扫码节点',
    opinion: ''
  }
})

const actionSet = computed(() => new Set(roleConfig.value.actions.map(String)))
const roleRows = computed(() => rows.value.filter((row) => actionSet.value.has(String(row.scanAction))))
const routeQuery = computed<ScanRouteQuery>(() => ({
  module: queryValue('module'),
  businessType: queryValue('businessType'),
  action: queryValue('action'),
  taskId: queryValue('taskId'),
  orderId: queryValue('orderId'),
  view: queryValue('view')
}))
const routeRows = computed(() => roleRows.value.filter((row) => matchesScanRouteList(row, routeQuery.value)))

const filteredAllRows = computed(() => {
  const code = keywordCode.value.trim()
  const name = keywordName.value.trim()
  return routeRows.value.filter((row) => {
    const displayCode = row.deviceCode || row.scanCode || row.taskNo || row.orderNo || ''
    const nodeName = row.currentNodeName || row.scanStatus || ''
    const matchesCode = !code || displayCode.includes(code) || (row.orderNo || '').includes(code) || (row.taskNo || '').includes(code)
    const matchesName = !name || (row.deviceName || '').includes(name)
    const matchesNode = nodeFilter.value === 'all' || row.currentNode === nodeFilter.value || nodeName === nodeFilter.value
    return matchesCode && matchesName && matchesNode
  })
})

const pendingRows = computed(() => filteredAllRows.value.filter((row) => !row.scanned))
const scannedRows = computed(() => filteredAllRows.value.filter((row) => row.scanned))
const visibleRows = computed(() => (bucket.value === 'pending' ? pendingRows.value : scannedRows.value))
const todayKey = computed(() => new Date().toISOString().slice(0, 10))
const todayCount = computed(() => routeRows.value.filter((row) => (row.applyTime || row.scanTime || '').slice(0, 10) === todayKey.value).length)

const columns = [
  { title: '来源事项', key: 'sourceType', width: 110 },
  { title: '当前节点', key: 'currentNodeName', width: 150 },
  { title: '扫码动作', key: 'scanAction', width: 150 },
  { title: '计量编号/单号', key: 'deviceCode', width: 190 },
  { title: '设备名称', key: 'deviceName', width: 180 },
  { title: '使用部门', key: 'useDeptName', width: 160 },
  { title: '操作', key: 'action', fixed: 'right', width: 100 }
]

const nodeOptions = computed(() => {
  const set = new Set<string>(['all'])
  routeRows.value.forEach((row) => {
    const node = row.currentNodeName || row.currentNode || row.scanStatus
    if (node && node !== '-') set.add(node)
  })
  return Array.from(set).map((value) => ({
    value,
    label: value === 'all' ? '全部' : value
  }))
})

function queryValue(key: string): string | undefined {
  const value = route.query[key]
  const normalized = Array.isArray(value) ? value[0] : value
  return typeof normalized === 'string' && normalized ? normalized : undefined
}

function rowMatchesRoute(row: UnifiedScanInboxItem) {
  const taskId = queryValue('taskId')
  const orderId = queryValue('orderId')
  if (!matchesScanRouteList(row, routeQuery.value)) return false
  if (taskId && String(row.taskId || '') !== taskId) return false
  if (orderId && String(row.orderId || '') !== orderId) return false
  return Boolean(taskId || orderId)
}

function scanRowKey(row: UnifiedScanInboxItem) {
  return row.id
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function displayCode(row: UnifiedScanInboxItem) {
  return row.deviceCode || row.scanCode || row.taskNo || row.orderNo || '-'
}

function scanHint(row?: UnifiedScanInboxItem) {
  if (!row) return ''
  if (row.businessType === 'periodic') return '周检扫码统一扫描设备计量编号。扫码成功后，流程会自动进入下一节点。'
  if (row.scanAction === 'take-back') return '首检赋码后取回：请扫描单台合格设备的计量编号。'
  return '首检赋码前流转：请扫描首检临时码、首检单号或后端允许的临时编码。'
}

function statusClass(row: UnifiedScanInboxItem) {
  if (row.scanned) return 'green'
  if (String(row.scanAction).includes('return')) return 'blue'
  if (String(row.scanAction).includes('take-back')) return 'green'
  return 'orange'
}

function resetFilter() {
  keywordCode.value = ''
  keywordName.value = ''
  nodeFilter.value = 'all'
}

function openScan(row?: UnifiedScanInboxItem) {
  const target = row || pendingRows.value[0]
  if (!target) {
    message.info('当前没有待扫码设备')
    return
  }
  if (target.scanned) {
    message.info('该设备已扫码')
    return
  }
  activeRow.value = target
  scanForm.scanCode = target.scanCode || target.deviceCode || target.taskNo || target.orderNo || ''
  scanForm.opinion = roleConfig.value.opinion
  scanOpen.value = true
}

function showFailure(error: unknown) {
  failInfo.code = scanForm.scanCode || activeRow.value?.scanCode || activeRow.value?.deviceCode || ''
  failInfo.deviceName = activeRow.value?.deviceName || '-'
  failInfo.message = error instanceof Error ? error.message : '该设备不在扫码范围内'
  failOpen.value = true
}

async function focusRouteTarget() {
  if (routeFocused.value) return
  if (!shouldFocusScanRoute(routeQuery.value)) return

  routeFocused.value = true
  await nextTick()
  const target = routeRows.value.find(rowMatchesRoute)
  if (!target) {
    message.warning('当前扫码页没有找到该待扫码任务，请确认登录角色和流程节点')
    return
  }
  bucket.value = 'pending'
  openScan(target)
}

async function loadRows() {
  loading.value = true
  try {
    rows.value = await listUnifiedScanInbox(roleConfig.value.actions)
    await focusRouteTarget()
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '扫码待办加载失败')
  } finally {
    loading.value = false
  }
}

async function submitScan() {
  const row = activeRow.value
  if (!row) return
  if (!scanForm.scanCode.trim()) {
    message.warning('请输入扫码内容')
    return
  }
  if (!actionSet.value.has(String(row.scanAction))) {
    message.warning(`当前身份不能处理 ${scanActionName(row.scanAction)} 节点`)
    return
  }

  submitting.value = true
  try {
    await submitUnifiedScan(row, {
      scanCode: scanForm.scanCode,
      opinion: scanForm.opinion
    })
    message.success(`${scanActionName(row.scanAction)}扫码成功`)
    scanOpen.value = false
    const listQuery = queryValue('view') === 'list'
      ? {
          module: queryValue('module'),
          businessType: queryValue('businessType'),
          action: queryValue('action'),
          view: 'list'
        }
      : undefined
    await router.replace({ path: route.path, query: listQuery })
    await loadRows()
  } catch (error) {
    showFailure(error)
  } finally {
    submitting.value = false
  }
}

onMounted(loadRows)
</script>

<template>
  <section class="device-scan-page">
    <div class="metric-row">
      <a-card class="metric-card" :bordered="false">
        <span>总待扫码</span>
        <strong>{{ pendingRows.length }} 台</strong>
      </a-card>
      <a-card class="metric-card" :bordered="false">
        <span>今日新增</span>
        <strong>{{ todayCount }} 台</strong>
      </a-card>
    </div>

    <a-card class="panel" :bordered="false">
      <template #title><h2>筛选方案</h2></template>
      <div class="filter-section">
        <label>
          <span>{{ roleConfig.codeLabel }}</span>
          <a-input v-model:value="keywordCode" placeholder="请输入编号" allow-clear />
        </label>
        <label>
          <span>名称</span>
          <a-input v-model:value="keywordName" placeholder="请输入设备名称" allow-clear />
        </label>
        <label>
          <span>当前节点</span>
          <a-select v-model:value="nodeFilter" :options="nodeOptions" />
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
          <h2>待扫码设备明细</h2>
          <div class="scan-toolbar">
            <a-segmented
              v-model:value="bucket"
              :options="[
                { label: `待扫码 ${pendingRows.length}`, value: 'pending' },
                { label: `已扫码 ${scannedRows.length}`, value: 'scanned' }
              ]"
            />
            <span>扫码核对成功：<strong>{{ scannedRows.length }}</strong> 台</span>
            <a-button class="scan-btn" @click="openScan()">扫码</a-button>
          </div>
        </div>
      </template>

      <a-table
        :columns="columns"
        :data-source="visibleRows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :scroll="{ x: 1080 }"
        :row-key="scanRowKey"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sourceType'">{{ record.sourceLabel }}</template>
          <template v-else-if="column.key === 'currentNodeName'">
            <a-tag :class="['tag', statusClass(record)]">
              {{ record.currentNodeName || record.scanStatus || '-' }}
            </a-tag>
          </template>
          <template v-else-if="column.key === 'scanAction'">{{ scanActionName(record.scanAction) }}</template>
          <template v-else-if="column.key === 'deviceCode'">{{ displayCode(record) }}</template>
          <template v-else-if="column.key === 'deviceName'">{{ display(record.deviceName) }}</template>
          <template v-else-if="column.key === 'useDeptName'">{{ display(record.useDeptName) }}</template>
          <template v-else-if="column.key === 'action'">
            <a-button v-if="!record.scanned" type="link" class="code-link" @click="openScan(record)">扫码</a-button>
            <span v-else class="muted">已扫码</span>
          </template>
        </template>
      </a-table>
    </a-card>

    <a-modal v-model:open="scanOpen" title="扫码" width="560px" :footer="null" :destroy-on-close="true">
      <div v-if="activeRow" class="scan-dialog">
        <a-alert type="info" :message="scanHint(activeRow)" show-icon />
        <div class="scan-info">
          <div><span>来源事项</span><strong>{{ activeRow.sourceLabel }}</strong></div>
          <div><span>当前节点</span><strong>{{ activeRow.currentNodeName || activeRow.scanStatus || '-' }}</strong></div>
          <div><span>扫码动作</span><strong>{{ scanActionName(activeRow.scanAction) }}</strong></div>
          <div><span>编号</span><strong>{{ displayCode(activeRow) }}</strong></div>
          <div><span>设备名称</span><strong>{{ display(activeRow.deviceName) }}</strong></div>
          <div><span>使用部门</span><strong>{{ display(activeRow.useDeptName) }}</strong></div>
          <div><span>操作角色</span><strong>{{ roleLabel }}</strong></div>
        </div>
        <label class="scan-input">
          <span>扫码内容</span>
          <a-input v-model:value="scanForm.scanCode" :placeholder="roleConfig.placeholder" />
        </label>
        <label class="scan-input">
          <span>操作意见</span>
          <a-textarea v-model:value="scanForm.opinion" :rows="2" />
        </label>
        <div class="dialog-actions">
          <a-button @click="scanOpen = false">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="submitScan">确认扫码</a-button>
        </div>
      </div>
    </a-modal>

    <a-modal v-model:open="failOpen" title="扫码失败" width="420px" :footer="null">
      <div class="fail-body">
        <div><span>编号：</span><strong>{{ display(failInfo.code) }}</strong></div>
        <div><span>设备名称：</span><strong>{{ display(failInfo.deviceName) }}</strong></div>
        <div class="error-msg">报错信息：{{ failInfo.message || '该设备不在扫码范围内' }}</div>
        <div class="dialog-actions">
          <a-button type="primary" @click="failOpen = false">知道了</a-button>
        </div>
      </div>
    </a-modal>
  </section>
</template>

<style scoped>
.device-scan-page {
  display: grid;
  gap: 16px;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.metric-card,
.panel {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.metric-card :deep(.ant-card-body) {
  padding: 14px 16px;
}

.metric-card span {
  color: #667085;
  font-size: 12px;
}

.metric-card strong {
  display: block;
  margin-top: 6px;
  color: #172033;
  font-size: 24px;
}

.panel {
  overflow: hidden;
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

.filter-section label,
.scan-input {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-section label {
  width: 190px;
}

.filter-section span,
.scan-input span {
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.filter-actions,
.panel-title,
.scan-toolbar,
.dialog-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.panel-title {
  justify-content: space-between;
}

.scan-toolbar span {
  color: #667085;
  font-size: 13px;
  font-weight: 400;
}

.scan-toolbar strong {
  color: #027a48;
  font-size: 15px;
}

.scan-btn {
  border-color: #027a48;
  background: #ecfdf3;
  color: #027a48;
}

.code-link {
  height: 28px;
  padding: 0;
  color: #1769e0;
}

.muted {
  color: #98a2b3;
}

.tag {
  border-radius: 6px;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.tag.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.panel :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.scan-dialog,
.fail-body {
  display: grid;
  gap: 14px;
}

.scan-info {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  border: 1px solid #e5eaf1;
  border-right: 0;
  border-bottom: 0;
}

.scan-info > div {
  padding: 12px;
  border-right: 1px solid #e5eaf1;
  border-bottom: 1px solid #e5eaf1;
}

.scan-info span {
  display: block;
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
}

.scan-info strong {
  color: #172033;
}

.dialog-actions {
  justify-content: flex-end;
}

.fail-body span {
  color: #667085;
}

.error-msg {
  padding: 10px 12px;
  border-radius: 6px;
  background: #fef2f2;
  color: #b42318;
  font-weight: 600;
}

@media (max-width: 900px) {
  .metric-row,
  .scan-info {
    grid-template-columns: 1fr;
  }

  .filter-section,
  .panel-title,
  .scan-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .filter-section label {
    width: 100%;
  }
}
</style>
