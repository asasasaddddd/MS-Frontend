<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { createSamplingPlan, listSamplingEligibleDevices } from '@/api/sampling'
import { useSessionStore } from '@/stores/session'
import type { SamplingEligibleDevice, SamplingEntityId } from '@/types/sampling'
import { display, formatDate } from './samplingDisplayModel'

const session = useSessionStore()
const loading = ref(false)
const submitting = ref(false)
const rows = ref<SamplingEligibleDevice[]>([])
const selectedRowKeys = ref<SamplingEntityId[]>([])

const form = reactive({
  verificationDate: new Date().toISOString().slice(0, 10),
  manageCategory: 'C类',
  deptName: session.user?.deptName || '',
  deptId: session.user?.deptId || '',
  planName: '',
  sampleRule: 'C类物资抽检',
  sampleRate: undefined as number | undefined,
  remark: ''
})

const selectedDevices = computed(() => {
  const keys = new Set(selectedRowKeys.value.map(String))
  return rows.value.filter((row) => row.eligible === true && keys.has(String(row.deviceId)))
})
const dataQualityRows = computed(() => rows.value.filter((row) => row.eligible !== true))

const columns = [
  { title: '序号', key: 'index', width: 70 },
  { title: '计量编号', key: 'deviceCode', width: 160 },
  { title: '设备名称', key: 'deviceName', width: 180 },
  { title: '使用部门', key: 'deptName', width: 180 },
  { title: '有效期', key: 'validUntil', width: 130 },
  { title: '超期年限', key: 'overdueYears', width: 110 },
  { title: '规格型号', key: 'modelSpec', width: 150 },
  { title: '资格状态', key: 'eligible', width: 110 },
  { title: '数据质量', key: 'dataQualityReason', width: 220 }
]

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: SamplingEntityId[]) => {
    selectedRowKeys.value = keys
  },
  getCheckboxProps: (row: SamplingEligibleDevice) => ({
    disabled: row.eligible !== true,
    title: row.eligible !== true ? row.dataQualityReason || '当前设备不满足抽检资格' : undefined
  })
}))

async function loadDevices() {
  loading.value = true
  try {
    rows.value = await listSamplingEligibleDevices(form.deptId || undefined)
    selectedRowKeys.value = selectedRowKeys.value.filter((key) =>
      rows.value.some((row) => row.eligible === true && String(row.deviceId) === String(key))
    )
  } catch (error) {
    rows.value = []
    message.error(error instanceof Error ? error.message : '抽检候选设备加载失败')
  } finally {
    loading.value = false
  }
}

function resetQuery() {
  form.deptName = session.user?.deptName || ''
  selectedRowKeys.value = []
  loadDevices()
}

async function submitPlan() {
  if (!form.verificationDate) {
    message.warning('请选择检定日期')
    return
  }
  if (selectedDevices.value.length === 0) {
    message.warning('请选择需要抽检的C类设备')
    return
  }
  submitting.value = true
  try {
    const planId = await createSamplingPlan({
      planName: form.planName || `C类抽检计划-${form.verificationDate}`,
      sampleRule: form.sampleRule,
      sampleRate: form.sampleRate,
      deptId: form.deptId || session.user?.deptId,
      deptName: form.deptName || session.user?.deptName,
      verificationDate: form.verificationDate,
      planStartDate: form.verificationDate,
      deviceIds: selectedDevices.value.map((device) => device.deviceId),
      remark: form.remark
    })
    message.success(`抽检计划已提交：${planId}`)
    selectedRowKeys.value = []
    await loadDevices()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '抽检计划提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadDevices)
</script>

<template>
  <section class="sampling-planner-page">
    <a-card class="panel" :bordered="false">
      <template #title><h2>抽检计划</h2></template>
      <div class="form-grid cols-4">
        <label><span>检定日期 <b>*</b></span><a-input v-model:value="form.verificationDate" type="date" /></label>
        <label><span>管理类别</span><a-input v-model:value="form.manageCategory" readonly /></label>
        <label><span>使用部门 <b>*</b></span><a-input v-model:value="form.deptName" readonly /></label>
        <label><span>计划名称</span><a-input v-model:value="form.planName" placeholder="默认按日期生成" /></label>
        <label><span>抽检规则</span><a-input v-model:value="form.sampleRule" /></label>
        <label><span>抽检比例</span><a-input-number v-model:value="form.sampleRate" :min="0" :max="100" style="width:100%" /></label>
        <label class="span-2"><span>备注</span><a-input v-model:value="form.remark" placeholder="填写计划备注" /></label>
      </div>
    </a-card>

    <a-card class="panel" :bordered="false">
      <template #title>
        <div class="panel-title">
          <h2>抽检信息详情</h2>
          <span>共 <strong>{{ rows.length }}</strong> 项，已选 <strong>{{ selectedDevices.length }}</strong> 项</span>
        </div>
      </template>
      <div class="table-toolbar">
        <a-button type="primary" @click="loadDevices">查询</a-button>
        <a-button @click="resetQuery">重置</a-button>
        <div class="toolbar-spacer"></div>
        <a-button @click="selectedRowKeys = []">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="submitPlan">提交</a-button>
      </div>
      <a-alert
        v-if="dataQualityRows.length > 0"
        type="warning"
        show-icon
        :message="`发现 ${dataQualityRows.length} 台数据质量异常设备，已禁止勾选`"
        description="请先补齐台账有效期等必要信息，再重新查询抽检资格。"
      />
      <a-table
        :columns="columns"
        :data-source="rows"
        :loading="loading"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :row-key="(row: SamplingEligibleDevice) => row.deviceId"
        :row-selection="rowSelection"
        :scroll="{ x: 1300 }"
        size="middle"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ index + 1 }}</template>
          <template v-else-if="column.key === 'deptName'">{{ display(record.deptName) }}</template>
          <template v-else-if="column.key === 'deviceCode'">{{ display(record.deviceCode) }}</template>
          <template v-else-if="column.key === 'deviceName'">{{ display(record.deviceName) }}</template>
          <template v-else-if="column.key === 'modelSpec'">{{ display(record.modelSpec) }}</template>
          <template v-else-if="column.key === 'validUntil'">{{ formatDate(record.validUntil) }}</template>
          <template v-else-if="column.key === 'overdueYears'">{{ record.overdueYears ?? '-' }}</template>
          <template v-else-if="column.key === 'eligible'">
            <a-tag :color="record.eligible === true ? 'green' : 'orange'">{{ record.eligible === true ? '可抽检' : '不可勾选' }}</a-tag>
          </template>
          <template v-else-if="column.key === 'dataQualityReason'">{{ display(record.dataQualityReason) }}</template>
        </template>
      </a-table>
    </a-card>
  </section>
</template>

<style scoped>
.sampling-planner-page {
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

.panel-title {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.panel-title span {
  color: #667085;
  font-size: 13px;
}

.panel-title strong {
  color: #175cd3;
}

.form-grid {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.form-grid.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-grid span {
  color: #667085;
  font-size: 12px;
}

.form-grid b {
  color: #d92d20;
}

.span-2 {
  grid-column: span 2;
}

.table-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.toolbar-spacer {
  flex: 1;
}

:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

@media (max-width: 980px) {
  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }

  .panel-title,
  .table-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
