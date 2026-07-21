<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import type { DeviceLedgerUpdateRequest, DeviceVO } from '@/types/device'

const props = defineProps<{
  device?: DeviceVO
}>()

const emit = defineEmits<{
  submit: [payload: DeviceLedgerUpdateRequest]
}>()

const form = reactive<DeviceLedgerUpdateRequest>({
  deviceName: ''
})

const deviceUsageOptions = [
  { label: '工艺控制', value: '工艺控制' },
  { label: '质量检验', value: '质量检验' },
  { label: '试验验证', value: '试验验证' }
]

const subjectCategoryOptions = [
  { label: '长度', value: '长度' },
  { label: '热学', value: '热学' },
  { label: '力学', value: '力学' },
  { label: '电磁', value: '电磁' }
]

const subjectSubCategoryOptions = [
  { label: '温度 010101', value: '010101' },
  { label: '压力 020101', value: '020101' },
  { label: '电压 040101', value: '040101' },
  { label: '卡尺 050102', value: '050102' }
]

const yesNoOptions = [
  { label: '否', value: 0 },
  { label: '是', value: 1 }
]

const standardDeviceOptions = [
  { label: '否', value: '否' },
  { label: '是', value: '是' }
]

const confirmIntervalOptions = [
  { label: '周期检定', value: '周期检定' },
  { label: '一次检定', value: '一次检定' }
]

const verificationCycleOptions = [
  { label: '6', value: 6 },
  { label: '12', value: 12 },
  { label: '24', value: 24 }
]

const verificationMethodOptions = [
  { label: '自检', value: 'self' },
  { label: '外委', value: 'send_out' }
]

function dateValue(value?: string) {
  return value ? String(value).slice(0, 10) : undefined
}

function normalizeVerificationMethod(value?: string) {
  const text = String(value || '').trim()
  if (!text) return undefined
  if (text === 'self' || text.includes('自检')) return 'self'
  if (text === 'send_out' || /外委|外送/.test(text)) return 'send_out'
  return text
}

function normalizeSubjectSubCategory(value?: string) {
  if (!value) return undefined
  const matchedCode = value.match(/\d{6}/)?.[0]
  return matchedCode || value
}

function withCurrentOption<T extends string | number>(
  options: Array<{ label: string; value: T }>,
  current?: T
) {
  if (current === undefined || current === null || current === '' || options.some((option) => option.value === current)) {
    return options
  }
  return [{ label: String(current), value: current }, ...options]
}

const currentDeviceUsageOptions = computed(() => withCurrentOption(deviceUsageOptions, form.deviceUsage))
const currentSubjectCategoryOptions = computed(() => withCurrentOption(subjectCategoryOptions, form.subjectCategory))
const currentSubjectSubCategoryOptions = computed(() => withCurrentOption(subjectSubCategoryOptions, form.subjectSubCategory))
const currentCycleOptions = computed(() => withCurrentOption(verificationCycleOptions, form.verificationCycleMonth))

function reset(device?: DeviceVO) {
  Object.assign(form, {
    deviceName: device?.deviceName || '',
    deviceAlias: device?.deviceAlias || '',
    materialCode: device?.materialCode || '',
    materialName: device?.materialName || '',
    purchaseOrderNo: device?.purchaseOrderNo || '',
    supplierCode: device?.supplierCode || '',
    supplierName: device?.supplierName || '',
    usageScenario: device?.usageScenario || '',
    modelSpec: device?.modelSpec || '',
    deviceUsage: device?.deviceUsage,
    measureRange: device?.measureRange || '',
    resolution: device?.resolution || '',
    accuracyLevel: device?.accuracyLevel || device?.accuracy || '',
    allowedError: device?.allowedError || '',
    manufacturer: device?.manufacturer || '',
    factoryCode: device?.factoryCode || '',
    factoryDate: dateValue(device?.factoryDate),
    subjectCategory: device?.subjectCategory,
    subjectSubCategory: normalizeSubjectSubCategory(device?.subjectSubCategory),
    isMandatory: device?.isMandatory,
    isCommon: device?.isCommon,
    standardDevice: device?.standardDevice || undefined,
    confirmInterval: device?.confirmInterval || undefined,
    specialProject: device?.specialProject || '',
    verificationMethod: normalizeVerificationMethod(device?.verificationMethod),
    verificationCycleMonth: device?.verificationCycleMonth,
    lastVerificationDate: dateValue(device?.lastVerificationDate),
    validUntil: dateValue(device?.validUntil),
    technicalStatus: device?.technicalStatus || '',
    storageLocation: device?.storageLocation || '',
    remark: device?.remark || ''
  })
}

function submit() {
  form.deviceName = form.deviceName.trim()
  if (!form.deviceName) {
    message.warning('请填写设备名称')
    return
  }
  emit('submit', { ...form })
}

watch(() => props.device, reset, { immediate: true })

defineExpose({ submit })
</script>

<template>
  <div class="ledger-edit-form">
    <section class="edit-section">
      <h3>基础信息</h3>
      <div class="edit-grid">
        <label><span>设备名称</span><a-input v-model:value="form.deviceName" placeholder="填写设备名称" /></label>
        <label><span>设备别名</span><a-input v-model:value="form.deviceAlias" placeholder="填写设备别名" /></label>
        <label><span>物料编号</span><a-input v-model:value="form.materialCode" placeholder="填写物料编号" /></label>
        <label><span>物料名称</span><a-input v-model:value="form.materialName" placeholder="填写物料名称" /></label>
        <label><span>采购订单号</span><a-input v-model:value="form.purchaseOrderNo" placeholder="填写采购订单号" /></label>
        <label><span>供应商编码</span><a-input v-model:value="form.supplierCode" placeholder="填写供应商编码" /></label>
        <label><span>供应商名称</span><a-input v-model:value="form.supplierName" placeholder="填写供应商名称" /></label>
        <label><span>设备使用场景</span><a-input v-model:value="form.usageScenario" placeholder="填写设备使用场景" /></label>
      </div>
    </section>

    <section class="edit-section">
      <h3>设备技术信息</h3>
      <div class="edit-grid">
        <label><span>规格型号</span><a-input v-model:value="form.modelSpec" placeholder="填写规格型号" /></label>
        <label>
          <span>设备用途</span>
          <a-select v-model:value="form.deviceUsage" :options="currentDeviceUsageOptions" placeholder="请选择" allow-clear />
        </label>
        <label><span>测量范围</span><a-input v-model:value="form.measureRange" placeholder="填写测量范围" /></label>
        <label><span>分度值</span><a-input v-model:value="form.resolution" placeholder="填写分度值" /></label>
        <label><span>准确度等级</span><a-input v-model:value="form.accuracyLevel" placeholder="填写准确度等级" /></label>
        <label><span>允许误差</span><a-input v-model:value="form.allowedError" placeholder="填写允许误差" /></label>
        <label><span>生产厂家</span><a-input v-model:value="form.manufacturer" placeholder="填写生产厂家" /></label>
        <label><span>出厂编号</span><a-input v-model:value="form.factoryCode" placeholder="填写出厂编号" /></label>
        <label><span>出厂日期</span><a-input v-model:value="form.factoryDate" type="date" /></label>
      </div>
    </section>

    <section class="edit-section">
      <h3>检定属性</h3>
      <div class="edit-grid">
        <label>
          <span>学科大类</span>
          <a-select v-model:value="form.subjectCategory" :options="currentSubjectCategoryOptions" placeholder="请选择" allow-clear />
        </label>
        <label>
          <span>学科小类</span>
          <a-select v-model:value="form.subjectSubCategory" :options="currentSubjectSubCategoryOptions" placeholder="请选择" allow-clear />
        </label>
        <label><span>是否强检</span><a-select v-model:value="form.isMandatory" :options="yesNoOptions" placeholder="请选择" allow-clear /></label>
        <label><span>标准器</span><a-select v-model:value="form.standardDevice" :options="standardDeviceOptions" placeholder="请选择" allow-clear /></label>
        <label><span>确认间隔</span><a-select v-model:value="form.confirmInterval" :options="confirmIntervalOptions" placeholder="请选择" allow-clear /></label>
        <label><span>专用项目</span><a-input v-model:value="form.specialProject" placeholder="填写专用项目" /></label>
        <label><span>检定周期</span><a-select v-model:value="form.verificationCycleMonth" :options="currentCycleOptions" placeholder="请选择" allow-clear /></label>
        <label><span>检定方式</span><a-select v-model:value="form.verificationMethod" :options="verificationMethodOptions" placeholder="请选择" allow-clear /></label>
        <label><span>是否通用设备</span><a-select v-model:value="form.isCommon" :options="yesNoOptions" placeholder="请选择" allow-clear /></label>
        <label><span>检定日期</span><a-input v-model:value="form.lastVerificationDate" type="date" /></label>
        <label><span>有效期</span><a-input v-model:value="form.validUntil" type="date" /></label>
        <label><span>技术状态</span><a-input v-model:value="form.technicalStatus" placeholder="填写技术状态" /></label>
        <label><span>存储位置</span><a-input v-model:value="form.storageLocation" placeholder="填写存储位置" /></label>
        <label class="full"><span>备注</span><a-textarea v-model:value="form.remark" :rows="3" placeholder="填写备注" /></label>
      </div>
    </section>
  </div>
</template>

<style scoped>
.ledger-edit-form {
  display: grid;
  gap: 20px;
}

.edit-section {
  display: grid;
  gap: 12px;
  padding-bottom: 18px;
  border-bottom: 1px solid #e5eaf1;
}

.edit-section:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.edit-section h3 {
  margin: 0;
  color: #172033;
  font-size: 15px;
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.edit-grid label {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.edit-grid label.full {
  grid-column: 1 / -1;
}

.edit-grid label > span {
  color: #667085;
  font-size: 12px;
}

@media (max-width: 720px) {
  .edit-grid {
    grid-template-columns: 1fr;
  }

  .edit-grid label.full {
    grid-column: auto;
  }
}
</style>
