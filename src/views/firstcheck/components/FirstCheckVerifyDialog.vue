<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import {
  releaseDeviceCodeReservationFirstCheck,
  reserveDeviceCodesFirstCheck,
  verifierVerifyAndAssignFirstCheck
} from '@/api/firstcheck'
import { listUsersByDeptAndRole, type SysUserVO } from '@/api/system'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import { useProductionDictionaries } from '@/composables/useProductionDictionaries'
import FirstCheckQualifiedDeviceTable from '@/views/firstcheck/components/FirstCheckQualifiedDeviceTable.vue'
import {
  applyDeviceCodeReservation,
  invalidateDeviceCodeReservation,
  recalculateQualifiedDeviceValidity,
  resizeQualifiedDeviceRows,
  type QualifiedFirstCheckDeviceRow
} from '@/views/firstcheck/firstCheckQualifiedDeviceModel'
import { deriveVerificationResult } from '@/views/firstcheck/firstCheckVerificationResultModel'
import type {
  DeviceCodeReservation,
  FirstCheckOrder,
  VerifierVerifyAndAssignRequest
} from '@/types/firstcheck'
import type { EntityId, RowVersion } from '@/types/common'

const props = defineProps<{
  open: boolean
  order?: FirstCheckOrder
  taskId?: EntityId
  taskRowVersion?: RowVersion
  allowedActions: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const submitting = defineModel<boolean>('submitting', { default: false })
const reserving = ref(false)
const loadingConfirmers = ref(false)
const confirmers = ref<SysUserVO[]>([])
const qualifiedDevices = ref<QualifiedFirstCheckDeviceRow[]>([])
const reservation = ref<DeviceCodeReservation>()
const reservationClock = ref(Date.now())
let reservationTimer: ReturnType<typeof setInterval> | undefined
let resetting = false

const {
  loading: dictionaryLoading,
  deviceUsageOptions,
  positiveVerificationCycleOptions,
  subjectCategoryOptions,
  specialProjectOptions,
  getSubjectSubcategoryOptions,
  loadProductionDictionaries
} = useProductionDictionaries()

const form = reactive({
  qualifiedQuantity: undefined as number | undefined,
  unqualifiedQuantity: 0,
  confirmerId: undefined as string | undefined,
  deviceName: '',
  modelSpec: '',
  deviceUsage: undefined as string | undefined,
  measureRange: '',
  resolution: '',
  precisionLevel: '',
  allowedError: '',
  manufacturer: '',
  subjectCategory: undefined as string | undefined,
  subjectSubcategory: undefined as string | undefined,
  deviceStatus: 'in_use',
  isMandatory: 0,
  standardDevice: '否',
  confirmInterval: '周期检定',
  specialProject: '',
  verificationCycleMonth: 12 as number | undefined,
  storageLocation: '',
  verificationUnitPrice: undefined as number | undefined,
  verificationOpinion: '检定完成',
  opinion: '检定完成'
})

const subjectSubcategoryOptions = computed(() =>
  getSubjectSubcategoryOptions(form.subjectCategory)
)

const isExternalCommission = computed(
  () => props.order?.verificationType === 'external_commission'
)

const requiresConfirmer = computed(
  () => isExternalCommission.value && props.order?.isCommon === 0
)

const confirmerOptions = computed(() =>
  confirmers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId} / ${user.employeeId}`,
    value: user.employeeId
  }))
)

const reservationReady = computed(() => {
  const current = reservation.value
  if (!current?.reservationId || current.deviceCodes.length !== qualifiedDevices.value.length) return false
  const expiresAt = new Date(current.expiresAt).getTime()
  if (!Number.isFinite(expiresAt) || expiresAt <= reservationClock.value) return false
  return qualifiedDevices.value.every(
    (row, index) => row.deviceCode === current.deviceCodes[index]
  )
})

const reservationLabel = computed(() => {
  if (!reservation.value) return '未生成'
  if (!reservationReady.value) return '已失效'
  return `已生成 ${reservation.value.deviceCodes.length} 个`
})

function normalizeSubjectSubcategory(value?: string) {
  if (!value) return undefined
  return value.match(/\d{6}/)?.[0] || value
}

function handleSubjectCategoryChange() {
  form.subjectSubcategory = undefined
}

function today() {
  const value = new Date()
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 10)
}

function close() {
  emit('update:open', false)
}

async function cancel() {
  await releaseReservationIfPresent()
  close()
}

function stopReservationClock() {
  if (reservationTimer) clearInterval(reservationTimer)
  reservationTimer = undefined
}

function startReservationClock() {
  stopReservationClock()
  reservationClock.value = Date.now()
  reservationTimer = setInterval(() => {
    reservationClock.value = Date.now()
  }, 15_000)
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function normalizeDate(value?: string) {
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

function clearReservationLocal() {
  reservation.value = undefined
  qualifiedDevices.value = invalidateDeviceCodeReservation(qualifiedDevices.value)
}

async function releaseReservationIfPresent() {
  const current = reservation.value
  const order = props.order
  clearReservationLocal()
  if (!current?.reservationId
      || !order
      || props.taskId === undefined
      || props.taskRowVersion === undefined) {
    return
  }
  try {
    await releaseDeviceCodeReservationFirstCheck({
      orderId: order.id,
      taskId: props.taskId,
      taskRowVersion: props.taskRowVersion,
      reservationId: current.reservationId
    })
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '旧计量编号预留释放失败，重新生成时将由后端自动替换')
  }
}

function resetForm(order?: FirstCheckOrder) {
  resetting = true
  form.qualifiedQuantity = order?.qualifiedQuantity ?? order?.quantity ?? undefined
  form.unqualifiedQuantity = order?.unqualifiedQuantity ?? 0
  form.confirmerId = order?.confirmerId
  form.deviceName = order?.deviceName || ''
  form.modelSpec = order?.modelSpec || ''
  form.deviceUsage = order?.deviceUsage
  form.measureRange = order?.measureRange || ''
  form.resolution = order?.resolution || ''
  form.precisionLevel = order?.precisionLevel || ''
  form.allowedError = order?.allowedError || ''
  form.manufacturer = order?.manufacturer || ''
  form.subjectCategory = order?.subjectCategory
  form.subjectSubcategory = normalizeSubjectSubcategory(order?.subjectSubcategory)
  form.deviceStatus = order?.deviceStatus === 'sealed' ? 'sealed' : 'in_use'
  form.isMandatory = order?.isMandatory ?? 0
  form.standardDevice = order?.standardDevice === '是' ? '是' : '否'
  form.confirmInterval = order?.confirmInterval === '一次检定' ? '一次检定' : '周期检定'
  form.specialProject = order?.specialProject || ''
  form.verificationCycleMonth = form.confirmInterval === '一次检定'
    ? undefined
    : order?.verificationCycleMonth || 12
  form.storageLocation = order?.storageLocation || ''
  form.verificationUnitPrice = order?.verificationUnitPrice
  form.verificationOpinion = order?.verificationOpinion || '检定完成'
  form.opinion = '检定完成'
  reservation.value = undefined
  qualifiedDevices.value = resizeQualifiedDeviceRows(
    [],
    Number(form.qualifiedQuantity || 0),
    today(),
    form.confirmInterval,
    form.verificationCycleMonth
  )
  resetting = false
}

async function loadConfirmers(order?: FirstCheckOrder) {
  if (!requiresConfirmer.value) {
    confirmers.value = []
    form.confirmerId = undefined
    return
  }
  if (!order?.applyDeptId) {
    confirmers.value = []
    form.confirmerId = undefined
    message.warning('首检单缺少使用部门，无法加载确认员')
    return
  }

  loadingConfirmers.value = true
  try {
    const users = await listUsersByDeptAndRole(order.applyDeptId, 'CONFIRMER')
    confirmers.value = users
    if (form.confirmerId && !users.some((user) => user.employeeId === form.confirmerId)) {
      form.confirmerId = undefined
    }
  } catch (error) {
    confirmers.value = []
    form.confirmerId = undefined
    message.warning(error instanceof Error ? error.message : '确认员列表加载失败')
  } finally {
    loadingConfirmers.value = false
  }
}

async function generateDeviceCodes() {
  const order = props.order
  const qualifiedQuantity = Number(form.qualifiedQuantity || 0)
  if (!order) return
  if (qualifiedQuantity <= 0) {
    message.warning('合格数量必须大于 0')
    return
  }
  if (!/^\d{6}$/.test(form.subjectSubcategory || '')) {
    message.warning('请选择 6 位学科小类编码')
    return
  }
  if (props.taskId === undefined || props.taskRowVersion === undefined) {
    message.warning('任务上下文已失效，请刷新待办后重试')
    return
  }

  reserving.value = true
  try {
    const result = await reserveDeviceCodesFirstCheck({
      orderId: order.id,
      taskId: props.taskId,
      taskRowVersion: props.taskRowVersion,
      subjectSubcategory: form.subjectSubcategory!,
      qualifiedQuantity
    })
    qualifiedDevices.value = applyDeviceCodeReservation(
      qualifiedDevices.value,
      result.deviceCodes
    )
    reservation.value = result
    message.success(`已生成 ${result.deviceCodes.length} 个正式计量编号`)
  } catch (error) {
    clearReservationLocal()
    message.error(error instanceof Error ? error.message : '计量编号生成失败')
  } finally {
    reserving.value = false
  }
}

function optionalText(value: string) {
  const normalized = value.trim()
  return normalized || undefined
}

function buildPayload(order: FirstCheckOrder): VerifierVerifyAndAssignRequest {
  const qualifiedQuantity = Number(form.qualifiedQuantity || 0)
  const unqualifiedQuantity = Number(form.unqualifiedQuantity || 0)
  return {
    orderId: order.id,
    taskId: props.taskId!,
    taskRowVersion: props.taskRowVersion!,
    reservationId: qualifiedQuantity > 0 ? reservation.value?.reservationId : undefined,
    verificationResult: deriveVerificationResult(qualifiedQuantity, unqualifiedQuantity),
    qualifiedQuantity,
    unqualifiedQuantity,
    confirmerId: requiresConfirmer.value ? form.confirmerId : undefined,
    deviceName: optionalText(form.deviceName),
    modelSpec: optionalText(form.modelSpec),
    deviceUsage: form.deviceUsage,
    measureRange: optionalText(form.measureRange),
    resolution: optionalText(form.resolution),
    precisionLevel: optionalText(form.precisionLevel),
    allowedError: optionalText(form.allowedError),
    manufacturer: optionalText(form.manufacturer),
    subjectCategory: form.subjectCategory,
    subjectSubcategory: form.subjectSubcategory,
    deviceStatus: form.deviceStatus,
    isMandatory: form.isMandatory,
    standardDevice: form.standardDevice,
    confirmInterval: form.confirmInterval,
    specialProject: optionalText(form.specialProject),
    verificationCycleMonth: form.confirmInterval === '一次检定'
      ? undefined
      : form.verificationCycleMonth,
    storageLocation: optionalText(form.storageLocation),
    verificationOpinion: optionalText(form.verificationOpinion),
    verificationUnitPrice: isExternalCommission.value
      ? form.verificationUnitPrice
      : undefined,
    opinion: optionalText(form.opinion),
    qualifiedDevices: qualifiedDevices.value.map((row) => ({
      deviceCode: row.deviceCode,
      factoryCode: optionalText(row.factoryCode),
      factoryDate: row.factoryDate || undefined,
      verificationDate: row.verificationDate,
      certificateAttachmentGroupId: row.certificateAttachmentGroupId === undefined
        ? undefined
        : String(row.certificateAttachmentGroupId)
    }))
  }
}

function validateSubmission(order: FirstCheckOrder) {
  const quantity = Number(order.quantity || 0)
  const qualified = Number(form.qualifiedQuantity || 0)
  const unqualified = Number(form.unqualifiedQuantity || 0)
  if (qualified < 0 || qualified + unqualified !== quantity || quantity <= 0) {
    message.warning('合格数量与不合格数量之和必须等于申请数量')
    return false
  }
  if (requiresConfirmer.value && !form.confirmerId) {
    message.warning('外委否通用设备请选择确认员')
    return false
  }
  if (!/^\d{6}$/.test(form.subjectSubcategory || '')) {
    message.warning('请选择 6 位学科小类编码')
    return false
  }
  if (!form.deviceName.trim()) {
    message.warning('请填写设备名称')
    return false
  }
  if (form.confirmInterval !== '一次检定' && !form.verificationCycleMonth) {
    message.warning('周期检定设备请选择检定周期')
    return false
  }
  if (isExternalCommission.value && form.verificationUnitPrice === undefined) {
    message.warning('请填写单台检定费用')
    return false
  }
  if (qualified > 0 && !reservationReady.value) {
    message.warning('请先生成有效的正式计量编号')
    return false
  }
  if (qualifiedDevices.value.some((row) => !row.verificationDate)) {
    message.warning('每台合格设备都必须填写检定日期')
    return false
  }
  return true
}

async function submit() {
  const order = props.order
  if (!order || !validateSubmission(order)) return
  if (props.taskId === undefined || props.taskRowVersion === undefined || !props.allowedActions.includes('SUBMIT')) {
    message.warning('任务上下文已失效，请刷新待办后重试')
    return
  }

  submitting.value = true
  try {
    const assigned = await verifierVerifyAndAssignFirstCheck(buildPayload(order))
    message.success(`检定与赋码已完成，共生成 ${assigned.length} 台设备`)
    emit('success')
    close()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '检定与赋码提交失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      stopReservationClock()
      return
    }
    startReservationClock()
    try {
      await loadProductionDictionaries()
    } catch (error) {
      message.warning(error instanceof Error ? error.message : '生产字典加载失败')
    }
    resetForm(props.order)
    await loadConfirmers(props.order)
  }
)

watch(
  () => form.qualifiedQuantity,
  async (value) => {
    if (resetting) return
    qualifiedDevices.value = resizeQualifiedDeviceRows(
      qualifiedDevices.value,
      Number(value || 0),
      today(),
      form.confirmInterval,
      form.verificationCycleMonth
    )
    await releaseReservationIfPresent()
  }
)

watch(
  () => form.subjectSubcategory,
  async () => {
    if (!resetting) await releaseReservationIfPresent()
  }
)

watch(
  [() => form.confirmInterval, () => form.verificationCycleMonth],
  ([confirmInterval]) => {
    if (resetting) return
    if (confirmInterval === '一次检定') form.verificationCycleMonth = undefined
    qualifiedDevices.value = recalculateQualifiedDeviceValidity(
      qualifiedDevices.value,
      form.confirmInterval,
      form.verificationCycleMonth
    )
  }
)

onUnmounted(stopReservationClock)
</script>

<template>
  <a-modal
    :open="open"
    class="firstcheck-verify-dialog"
    width="95vw"
    :footer="null"
    :closable="false"
    :destroy-on-close="true"
    @cancel="cancel"
  >
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / {{ display(order?.orderNo) }}</div>
          <strong>首次检定表单填写</strong>
        </div>
        <div class="dialog-title-actions">
          <a-button @click="cancel">取消</a-button>
          <a-button type="primary" :loading="submitting" :disabled="Number(form.qualifiedQuantity || 0) > 0 && !reservationReady" @click="submit">
            提交检定并赋码
          </a-button>
        </div>
      </div>
    </template>

    <div class="form-page">
      <section class="panel">
        <div class="panel-header">
          <h2>基本信息</h2>
          <a-tag class="tag blue">申请单 {{ display(order?.orderNo) }}</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>采购订单编号</span><a-input :value="display(order?.purchaseOrderNo)" readonly /></label>
          <label><span>物料编号</span><a-input :value="display(order?.materialCode)" readonly /></label>
          <label><span>物料描述</span><a-input :value="display(order?.materialName)" readonly /></label>
          <label><span>数量</span><a-input :value="`${display(order?.quantity)} 台`" readonly /></label>
          <label><span>使用部门</span><a-input :value="display(order?.applyDeptName)" readonly /></label>
          <label><span>供应商名称</span><a-input :value="display(order?.supplierName)" readonly /></label>
          <label><span>申请时间</span><a-input :value="normalizeDate(order?.applyTime)" readonly /></label>
          <label><span>设备分类</span><a-input :value="display(order?.requestedCategory)" readonly /></label>
          <label class="span-2"><span>使用场景</span><a-input :value="display(order?.usageScenario)" readonly /></label>
          <label><span>检定方式</span><a-input :value="verificationTypeText(order?.verificationType)" readonly /></label>
          <label><span>是否通用设备</span><a-input :value="commonText(order?.isCommon)" readonly /></label>
          <label>
            <span>附件</span>
            <AttachmentListButton :group-id="order?.attachmentGroupId" title="供应商申请附件" />
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>结果判定</h2>
          <a-tag class="tag orange">待填写</a-tag>
        </div>
        <div class="form-grid cols-4">
          <label><span>合格数量</span><a-input-number v-model:value="form.qualifiedQuantity" :min="0" style="width:100%" /></label>
          <label><span>不合格数量</span><a-input-number v-model:value="form.unqualifiedQuantity" :min="0" style="width:100%" /></label>
          <label v-if="requiresConfirmer">
            <span>确认员</span>
            <a-select
              v-model:value="form.confirmerId"
              placeholder="请选择使用部门确认员"
              :loading="loadingConfirmers"
              :options="confirmerOptions"
              show-search
              option-filter-prop="label"
            />
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header"><h2>入库设备信息</h2></div>
        <div class="form-grid cols-4">
          <label><span>设备名称</span><a-input v-model:value="form.deviceName" placeholder="填写设备名称" /></label>
          <label><span>规格型号</span><a-input v-model:value="form.modelSpec" placeholder="填写规格型号" /></label>
          <label>
            <span>设备用途</span>
            <a-select
              v-model:value="form.deviceUsage"
              placeholder="请选择"
              :loading="dictionaryLoading"
              :options="deviceUsageOptions"
            />
          </label>
          <label><span>测量范围</span><a-input v-model:value="form.measureRange" placeholder="填写测量范围" /></label>
          <label><span>分度值</span><a-input v-model:value="form.resolution" placeholder="填写分度值" /></label>
          <label><span>准确度等级</span><a-input v-model:value="form.precisionLevel" placeholder="填写准确度等级" /></label>
          <label><span>允许误差</span><a-input v-model:value="form.allowedError" placeholder="填写允许误差" /></label>
          <label><span>生产厂家</span><a-input v-model:value="form.manufacturer" placeholder="填写生产厂家" /></label>
          <label>
            <span>学科大类</span>
            <a-select
              v-model:value="form.subjectCategory"
              placeholder="请选择"
              :loading="dictionaryLoading"
              :options="subjectCategoryOptions"
              show-search
              option-filter-prop="label"
              @change="handleSubjectCategoryChange"
            />
          </label>
          <label>
            <span>学科小类</span>
            <a-select
              v-model:value="form.subjectSubcategory"
              placeholder="请选择"
              :loading="dictionaryLoading"
              :options="subjectSubcategoryOptions"
              show-search
              option-filter-prop="label"
            />
          </label>
          <label>
            <span>设备状态</span>
            <a-select
              v-model:value="form.deviceStatus"
              :options="[
                { label: '在用', value: 'in_use' },
                { label: '封存', value: 'sealed' }
              ]"
            />
          </label>
          <label>
            <span>是否强检</span>
            <a-select
              v-model:value="form.isMandatory"
              :options="[
                { label: '否', value: 0 },
                { label: '是', value: 1 }
              ]"
            />
          </label>
          <label>
            <span>标准器</span>
            <a-select
              v-model:value="form.standardDevice"
              :options="[
                { label: '否', value: '否' },
                { label: '是', value: '是' }
              ]"
            />
          </label>
          <label>
            <span>确认间隔</span>
            <a-select
              v-model:value="form.confirmInterval"
              :options="[
                { label: '周期检定', value: '周期检定' },
                { label: '一次检定', value: '一次检定' }
              ]"
            />
          </label>
          <label>
            <span>专用项目</span>
            <a-select
              v-model:value="form.specialProject"
              placeholder="请选择"
              :loading="dictionaryLoading"
              :options="specialProjectOptions"
              show-search
              option-filter-prop="label"
            />
          </label>
          <label>
            <span>检定周期</span>
            <a-select
              v-model:value="form.verificationCycleMonth"
              :disabled="form.confirmInterval === '一次检定'"
              :loading="dictionaryLoading"
              :options="positiveVerificationCycleOptions"
            />
          </label>
          <label v-if="isExternalCommission">
            <span>单台检定费用（元）</span>
            <a-input-number
              v-model:value="form.verificationUnitPrice"
              style="width:100%"
              :min="0"
              :precision="2"
              :step="0.01"
              placeholder="填写单台检定费用"
            />
          </label>
          <label><span>使用部门</span><a-input :value="display(order?.applyDeptName)" readonly /></label>
          <label><span>存储位置</span><a-input v-model:value="form.storageLocation" placeholder="填写存储位置" /></label>
          <label class="span-2"><span>检定意见</span><a-textarea v-model:value="form.verificationOpinion" :rows="3" /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>合格设备逐台信息</h2>
            <span class="panel-subtitle">{{ reservationLabel }}</span>
          </div>
          <a-button v-if="Number(form.qualifiedQuantity || 0) > 0" type="primary" ghost :loading="reserving" @click="generateDeviceCodes">
            {{ reservation ? '重新生成计量编号' : '生成计量编号' }}
          </a-button>
        </div>
        <FirstCheckQualifiedDeviceTable
          v-model:rows="qualifiedDevices"
          :order-id="order?.id"
          :confirm-interval="form.confirmInterval"
          :verification-cycle-month="form.verificationCycleMonth"
        />
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.firstcheck-verify-dialog :deep(.ant-modal) {
  max-width: 95vw;
}

.firstcheck-verify-dialog :deep(.ant-modal-content) {
  max-height: 95vh;
  overflow: hidden;
}

.firstcheck-verify-dialog :deep(.ant-modal-body) {
  max-height: calc(95vh - 72px);
  overflow: auto;
  background: #f3f5f8;
}

.dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-title-actions {
  display: flex;
  gap: 8px;
}

.dialog-breadcrumb {
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 400;
}

.form-page {
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
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

.panel-subtitle {
  display: block;
  margin-top: 3px;
  color: #667085;
  font-size: 12px;
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

.span-2 {
  grid-column: span 2;
}

.readonly-area :deep(.ant-input) {
  color: #344054;
  background: #f9fafb;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

@media (max-width: 980px) {
  .dialog-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
