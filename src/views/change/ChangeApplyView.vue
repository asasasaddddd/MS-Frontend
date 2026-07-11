<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { submitChange } from '@/api/change'
import { listDevicePage } from '@/api/device'
import { useSessionStore } from '@/stores/session'
import type { ChangeSubmitRequest, ChangeType } from '@/types/change'
import type { DeviceVO } from '@/types/device'
import {
  changeTypeMetas,
  deviceRowKey,
  deviceStatusName,
  display,
  formatDate
} from '@/views/change/changeDisplayModel'
import ChangeApplyDialog from '@/views/change/components/ChangeApplyDialog.vue'

const session = useSessionStore()

const loading = ref(false)
const submitting = ref(false)
const devices = ref<DeviceVO[]>([])
const selectedLedgerKeys = ref<string[]>([])
const selectedDevices = ref<DeviceVO[]>([])
const activeType = ref<ChangeType>()
const dialogOpen = ref(false)

const query = reactive({
  keyword: '',
  current: 1,
  size: 10,
  total: 0
})

const ledgerColumns = [
  { title: '设备编号', key: 'deviceCode', width: 150 },
  { title: '设备名称', key: 'deviceName', width: 150 },
  { title: '规格型号', key: 'modelSpec', width: 150 },
  { title: '使用部门', key: 'deptName', width: 150 },
  { title: '当前状态', key: 'deviceStatus', width: 120 },
  { title: '最近校准日期', key: 'lastVerificationDate', width: 140 }
]

const selectedColumns = [
  { title: '设备编号', key: 'deviceCode', width: 150 },
  { title: '设备名称', key: 'deviceName', width: 150 },
  { title: '规格型号', key: 'modelSpec', width: 150 },
  { title: '当前状态', key: 'deviceStatus', width: 120 },
  { title: '操作', key: 'action', width: 90 }
]

const ledgerRowSelection = computed(() => ({
  selectedRowKeys: selectedLedgerKeys.value,
  onChange: (keys: (string | number)[]) => {
    selectedLedgerKeys.value = keys.map(String)
  }
}))

const selectedCountText = computed(() => `数量：${selectedDevices.value.length}`)
const tableCountText = computed(() => `数量：${query.total}`)

function resetFilter() {
  query.keyword = ''
  query.current = 1
  loadDevices()
}

function tableRowKey(record: DeviceVO) {
  return deviceRowKey(record)
}

function removeDevice(key: string) {
  selectedDevices.value = selectedDevices.value.filter((item) => tableRowKey(item) !== key)
}

function clearSelected() {
  selectedDevices.value = []
}

function selectCheckedDevices() {
  const keySet = new Set(selectedLedgerKeys.value)
  const next = [...selectedDevices.value]
  const existing = new Set(next.map(tableRowKey))
  devices.value.forEach((device) => {
    const key = tableRowKey(device)
    if (keySet.has(key) && !existing.has(key)) {
      next.push(device)
      existing.add(key)
    }
  })
  if (next.length === selectedDevices.value.length) {
    message.warning('请先勾选需要选择的设备')
    return
  }
  selectedDevices.value = next
  selectedLedgerKeys.value = []
}

function openDialog(type: ChangeType) {
  if (selectedDevices.value.length === 0) {
    message.warning('请先添加要操作的设备')
    return
  }
  activeType.value = type
  dialogOpen.value = true
}

async function handleSubmit(payload: ChangeSubmitRequest) {
  submitting.value = true
  try {
    await submitChange(payload)
    message.success('状态变更申请已提交')
    dialogOpen.value = false
    clearSelected()
    await loadDevices()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '状态变更申请提交失败')
  } finally {
    submitting.value = false
  }
}

async function loadDevices() {
  loading.value = true
  try {
    const keyword = query.keyword.trim()
    const codeLike = /^[A-Za-z0-9._-]+$/.test(keyword)
    const result = await listDevicePage({
      current: query.current,
      size: query.size,
      deptName: session.user?.deptName || undefined,
      deviceCode: codeLike ? keyword || undefined : undefined,
      deviceName: !codeLike ? keyword || undefined : undefined
    })
    devices.value = result.records || []
    query.total = Number(result.total || 0)
  } catch (error) {
    devices.value = []
    query.total = 0
    message.error(error instanceof Error ? error.message : '设备台账加载失败')
  } finally {
    loading.value = false
  }
}

function handlePageChange(page: number, size: number) {
  query.current = page
  query.size = size
  loadDevices()
}

onMounted(() => {
  loadDevices()
})
</script>

<template>
  <section class="change-apply-page">
    <section class="panel selected-panel">
      <div class="panel-header">
        <h2>待变更设备</h2>
        <a-button v-if="selectedDevices.length > 0" @click="clearSelected">取消</a-button>
        <span class="header-spacer"></span>
        <span class="count-text">{{ selectedCountText }}</span>
      </div>

      <div class="selected-body">
        <div class="action-col">
          <p>操作选项</p>
          <a-button
            v-for="item in changeTypeMetas"
            :key="item.value"
            :type="activeType === item.value ? 'primary' : 'default'"
            @click="openDialog(item.value)"
          >
            {{ item.label }}
          </a-button>
        </div>

        <div class="selected-area">
          <a-empty v-if="selectedDevices.length === 0" description="暂无选中设备">
            <template #description>
              <div class="empty-copy">
                <p>暂无选中设备</p>
                <span>请从下方设备台账中勾选设备后点击“选择”</span>
              </div>
            </template>
          </a-empty>
          <div v-else class="selected-table-wrap">
            <p class="sub-title">已选设备</p>
            <a-table
              :columns="selectedColumns"
              :data-source="selectedDevices"
              :pagination="false"
              :scroll="{ x: 660 }"
              :row-key="tableRowKey"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'deviceCode'">{{ display(record.deviceCode) }}</template>
                <template v-else-if="column.key === 'deviceName'">{{ display(record.deviceName) }}</template>
                <template v-else-if="column.key === 'modelSpec'">{{ display(record.modelSpec) }}</template>
                <template v-else-if="column.key === 'deviceStatus'">
                  <a-tag class="tag green">{{ deviceStatusName(record.deviceStatus) }}</a-tag>
                </template>
                <template v-else-if="column.key === 'action'">
                  <a-button type="link" danger @click="removeDevice(tableRowKey(record))">移除</a-button>
                </template>
              </template>
            </a-table>
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-header ledger-header">
        <h2>本部门计量设备台账</h2>
        <a-input v-model:value="query.keyword" class="keyword-input" placeholder="模糊查询" allow-clear @pressEnter="loadDevices" />
        <a-button @click="loadDevices">搜索</a-button>
        <a-button @click="resetFilter">重置</a-button>
        <a-button type="primary" @click="selectCheckedDevices">选择</a-button>
        <span class="header-spacer"></span>
        <span class="count-text">{{ tableCountText }}</span>
      </div>

      <a-table
        :columns="ledgerColumns"
        :data-source="devices"
        :loading="loading"
        :pagination="{
          current: query.current,
          pageSize: query.size,
          total: query.total,
          showSizeChanger: true,
          onChange: handlePageChange
        }"
        :row-key="tableRowKey"
        :row-selection="ledgerRowSelection"
        :scroll="{ x: 900 }"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'deviceCode'">{{ display(record.deviceCode) }}</template>
          <template v-else-if="column.key === 'deviceName'">{{ display(record.deviceName) }}</template>
          <template v-else-if="column.key === 'modelSpec'">{{ display(record.modelSpec) }}</template>
          <template v-else-if="column.key === 'deptName'">{{ display(record.deptName) }}</template>
          <template v-else-if="column.key === 'deviceStatus'">
            <a-tag :class="['tag', record.deviceStatus === 'sealed' ? 'red' : 'green']">{{ deviceStatusName(record.deviceStatus) }}</a-tag>
          </template>
          <template v-else-if="column.key === 'lastVerificationDate'">{{ formatDate(record.lastVerificationDate) }}</template>
        </template>
      </a-table>
    </section>

    <ChangeApplyDialog
      v-model:open="dialogOpen"
      :type="activeType"
      :devices="selectedDevices"
      :submitting="submitting"
      @submit="handleSubmit"
    />
  </section>
</template>

<style scoped>
.change-apply-page {
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
  min-height: 50px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
  background: #ffffff;
}

.panel-header h2 {
  margin: 0 6px 0 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.header-spacer {
  flex: 1;
  min-width: 0;
}

.count-text {
  color: #667085;
  font-size: 13px;
}

.selected-body {
  display: flex;
  min-height: 184px;
}

.action-col {
  width: 150px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 14px;
  border-right: 1px solid #e5eaf1;
}

.action-col p,
.sub-title {
  margin: 0;
  color: #344054;
  font-size: 13px;
  font-weight: 700;
}

.action-col p {
  padding-bottom: 4px;
}

.selected-area {
  min-width: 0;
  flex: 1;
  padding: 14px;
}

.empty-copy p {
  margin: 0 0 4px;
  color: #667085;
}

.empty-copy span {
  color: #98a2b3;
  font-size: 12px;
}

.selected-table-wrap {
  display: grid;
  gap: 10px;
}

.ledger-header {
  flex-wrap: wrap;
  padding-block: 8px;
}

.keyword-input {
  width: 190px;
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

@media (max-width: 860px) {
  .selected-body {
    flex-direction: column;
  }

  .action-col {
    width: auto;
    border-right: 0;
    border-bottom: 1px solid #e5eaf1;
  }

  .keyword-input {
    width: 100%;
  }
}
</style>
