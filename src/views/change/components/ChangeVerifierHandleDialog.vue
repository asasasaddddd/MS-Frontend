<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { listUsersByDeptAndRole, type SysUserVO } from '@/api/system'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import { useProductionDictionaries } from '@/composables/useProductionDictionaries'
import type { ChangeOrderVO, ChangeVerifierHandleRequest } from '@/types/change'
import {
  buildChangeVerifierHandleRequest,
  changeVerifierReason,
  resolveChangeVerifierDialog,
  validateChangeVerifierForm,
  verifierResultOptions,
  type ChangeVerifierFormState
} from '@/views/change/changeVerifierDialogModel'
import {
  display,
  formatCycleMonth,
  formatDate,
  formatDateTime,
  normalizeCategory,
  resolveItemSnapshot,
  verificationMethodName
} from '@/views/change/changeDisplayModel'

const props = withDefaults(
  defineProps<{
    open: boolean
    order?: ChangeOrderVO | null
    submitting?: boolean
  }>(),
  {
    submitting: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [request: ChangeVerifierHandleRequest]
}>()

const engineers = ref<SysUserVO[]>([])
const engineerLoading = ref(false)
const {
  loading: dictionaryLoading,
  positiveVerificationCycleOptions,
  loadProductionDictionaries
} = useProductionDictionaries()

const form = reactive<ChangeVerifierFormState>({
  reason: '',
  verificationDate: '',
  validUntil: '',
  result: 'qualified',
  responsibleEngineerId: undefined,
  responsibleEngineerName: undefined,
  newCycleMonth: undefined,
  opinion: '',
  certificateAttachmentGroupId: undefined
})

const config = computed(() => resolveChangeVerifierDialog(props.order))
const item = computed(() => props.order?.items?.[0])
const snapshot = computed(() =>
  item.value
    ? resolveItemSnapshot(item.value)
    : {
        deviceCode: undefined,
        deviceName: undefined,
        modelSpec: undefined,
        deptName: undefined,
        factoryCode: undefined
      }
)
const engineerOptions = computed(() =>
  engineers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId}（${user.employeeId}）`,
    value: user.employeeId
  }))
)
const categoryBefore = computed(() => normalizeCategory(item.value?.oldCategory))
const categoryAfter = computed(() => normalizeCategory(item.value?.newCategory))
const cycleBefore = computed(() => formatCycleMonth(item.value?.oldCycleMonth))
const cycleAfter = computed(() => formatCycleMonth(item.value?.newCycleMonth))

function localDate() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calculateValidUntil(dateText: string, cycleMonth?: number) {
  if (!dateText || !cycleMonth) return ''
  const [year, month, day] = dateText.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  date.setDate(1)
  date.setMonth(date.getMonth() + cycleMonth)
  const maxDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, maxDay))
  date.setDate(date.getDate() - 1)
  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')
  return `${nextYear}-${nextMonth}-${nextDay}`
}

function targetCycleMonth() {
  if (config.value.showNewCycle) return form.newCycleMonth
  return item.value?.newCycleMonth || item.value?.oldCycleMonth
}

function syncValidUntil() {
  if (!config.value.showVerification) return
  if (!config.value.validUntilRequired) {
    form.validUntil = ''
    if (!config.value.showNewCycle) form.newCycleMonth = undefined
    return
  }
  form.validUntil = calculateValidUntil(form.verificationDate, targetCycleMonth())
}

function close() {
  emit('update:open', false)
}

function selectEngineer(employeeId?: string) {
  const engineer = engineers.value.find((user) => user.employeeId === employeeId)
  form.responsibleEngineerName = engineer?.employeeName
}

function submit() {
  if (!props.order) return
  const error = validateChangeVerifierForm(config.value, form)
  if (error) {
    message.warning(error)
    return
  }
  emit('submit', buildChangeVerifierHandleRequest(props.order, form))
}

async function loadEngineers() {
  engineers.value = []
  const deptId = item.value?.deptId || props.order?.applyDeptId
  if (!deptId) return
  engineerLoading.value = true
  try {
    const users = await listUsersByDeptAndRole(deptId, 'RESPONSIBLE_ENGINEER')
    const boundId = item.value?.responsibleEngineerId
    const boundUser = boundId
      ? {
          employeeId: boundId,
          employeeName: item.value?.responsibleEngineerName,
          deptId,
          deptName: item.value?.deptName
        }
      : undefined
    engineers.value = boundUser && !users.some((user) => user.employeeId === boundId)
      ? [boundUser, ...users]
      : users
  } catch {
    engineers.value = []
  } finally {
    engineerLoading.value = false
  }
}

watch(
  () => [form.verificationDate, form.newCycleMonth],
  () => syncValidUntil()
)

watch(
  () => form.responsibleEngineerId,
  (employeeId) => selectEngineer(employeeId)
)

watch(
  [() => props.open, () => props.order?.id, () => props.order?.changeType],
  async ([open]) => {
    if (!open) return
    const currentItem = item.value
    form.reason = changeVerifierReason(props.order)
    form.verificationDate = localDate()
    form.result = 'qualified'
    form.responsibleEngineerId = currentItem?.responsibleEngineerId
    form.responsibleEngineerName = currentItem?.responsibleEngineerName
    form.newCycleMonth = config.value.showNewCycle
      ? currentItem?.newCycleMonth || currentItem?.oldCycleMonth
      : undefined
    form.opinion = ''
    form.certificateAttachmentGroupId = currentItem?.certificateAttachmentGroupId
    form.validUntil = config.value.validUntilRequired
      ? currentItem?.newValidUntil || calculateValidUntil(form.verificationDate, targetCycleMonth())
      : ''
    try {
      await loadProductionDictionaries()
    } catch (error) {
      message.warning(error instanceof Error ? error.message : '检定周期字典加载失败')
    }
    await loadEngineers()
  }
)
</script>

<template>
  <a-modal
    :open="open"
    width="820px"
    wrap-class-name="change-verifier-handle-dialog"
    :footer="null"
    :destroy-on-close="true"
    @cancel="close"
  >
    <template #title>
      <div class="modal-header-content">
        <h1>{{ config.title }}</h1>
        <div class="modal-header-actions">
          <a-button @click="close">返回</a-button>
          <a-button type="primary" :loading="submitting" @click="submit">提交</a-button>
        </div>
      </div>
    </template>

    <div v-if="order && item" class="modal-body">
      <section class="modal-section top-section">
        <h3>设备基本信息</h3>
        <div class="info-grid">
          <div class="info-item"><label>计量编号</label><span>{{ display(snapshot.deviceCode || item.deviceId) }}</span></div>
          <div class="info-item"><label>设备名称</label><span>{{ display(snapshot.deviceName) }}</span></div>
          <div class="info-item"><label>规格型号</label><span>{{ display(snapshot.modelSpec) }}</span></div>
          <div class="info-item"><label>管理类别</label><span>{{ normalizeCategory(item.oldCategory || item.newCategory) }}</span></div>
          <div class="info-item"><label>检定方式</label><span>{{ verificationMethodName(item.oldVerificationMethod || item.newVerificationMethod) }}</span></div>
          <div class="info-item"><label>有效期</label><span>{{ formatDate(item.oldValidUntil || item.newValidUntil) }}</span></div>
          <div class="info-item"><label>检定周期</label><span>{{ formatCycleMonth(item.oldCycleMonth || item.newCycleMonth) }}</span></div>
          <div class="info-item"><label>使用部门</label><span>{{ display(snapshot.deptName || order.applyDeptName) }}</span></div>
        </div>
      </section>

      <section class="modal-section">
        <h3>{{ config.sectionTitle }}</h3>

        <div v-if="config.showCategoryTransition" class="form-row">
          <label>管理类别调整</label>
          <div class="transition-row">
            <span :class="['transition-tag', 'category-before']">{{ categoryBefore }}</span>
            <span class="transition-arrow">→</span>
            <span :class="['transition-tag', 'category-after']">{{ categoryAfter }}</span>
          </div>
        </div>

        <div v-if="config.showCycleTransition" class="form-row">
          <label>检定周期调整</label>
          <div class="transition-row">
            <span class="transition-tag cycle-before">{{ cycleBefore }}</span>
            <span class="transition-arrow">→</span>
            <span class="transition-tag cycle-after">{{ cycleAfter }}</span>
          </div>
        </div>

        <div class="form-row">
          <label>{{ config.reasonLabel }} <span class="required">*</span></label>
          <a-textarea v-model:value="form.reason" :rows="3" :placeholder="config.reasonPlaceholder" />
        </div>

        <template v-if="config.showApplicationMeta">
          <div class="form-row">
            <label>申请时间</label>
            <a-input :value="formatDateTime(order.applyTime)" readonly />
          </div>
          <div class="form-row">
            <label>附件</label>
            <div class="upload-area">
              <AttachmentUploadButton
                v-model="form.certificateAttachmentGroupId"
                business-type="CHANGE_VERIFIER"
                :business-id="order.id"
                remark="状态变更检定员处理附件"
                button-text="上传文件"
                size="small"
              />
              <span class="upload-hint">支持 pdf、doc、jpg，最多 10MB</span>
              <AttachmentListButton
                v-if="order.attachmentGroupId"
                :group-id="order.attachmentGroupId"
                button-text="查看申请附件"
                title="状态变更申请附件"
                size="small"
              />
              <AttachmentListButton
                v-if="form.certificateAttachmentGroupId"
                :group-id="form.certificateAttachmentGroupId"
                button-text="查看已上传"
                title="状态变更检定附件"
                size="small"
              />
            </div>
          </div>
        </template>
      </section>

      <section v-if="config.showVerification" class="modal-section">
        <h3>检定信息</h3>
        <div class="form-inline">
          <div class="form-row">
            <label>检定日期 <span class="required">*</span></label>
            <a-input v-model:value="form.verificationDate" type="date" />
          </div>
          <div class="form-row">
            <label>有效期 <span v-if="config.validUntilRequired" class="required">*</span></label>
            <a-input v-model:value="form.validUntil" type="date" :placeholder="config.validUntilRequired ? '' : '一次检定无需填写'" />
          </div>
          <div v-if="config.showNewCycle" class="form-row">
            <label>新检定周期 <span class="required">*</span></label>
            <a-select
              v-model:value="form.newCycleMonth"
              :loading="dictionaryLoading"
              :options="positiveVerificationCycleOptions"
              placeholder="请选择"
            />
          </div>
          <div class="form-row">
            <label>结果判定 <span class="required">*</span></label>
            <a-select v-model:value="form.result" :options="verifierResultOptions" placeholder="请选择" />
          </div>
          <div class="form-row">
            <label>责任工程 <span class="required">*</span></label>
            <a-select
              v-model:value="form.responsibleEngineerId"
              :options="engineerOptions"
              :loading="engineerLoading"
              show-search
              allow-clear
              option-filter-prop="label"
              placeholder="请选择"
            />
          </div>
        </div>
        <div class="form-row approval-row">
          <label>审批意见</label>
          <a-textarea v-model:value="form.opinion" :rows="3" placeholder="请填写审批意见" />
        </div>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.modal-header-content,
.modal-header-actions,
.upload-area,
.transition-row {
  display: flex;
  align-items: center;
}

.modal-header-content {
  justify-content: space-between;
  gap: 20px;
}

.modal-header-content h1 {
  margin: 0;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0;
}

.modal-header-actions,
.upload-area {
  gap: 8px;
}

.modal-body {
  max-height: calc(90vh - 66px);
  padding: 20px;
  overflow-y: auto;
}

.modal-section {
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid #e5e9f0;
}

.modal-section:last-of-type {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: 0;
}

.modal-section.top-section {
  margin-bottom: 16px;
  padding-bottom: 14px;
}

.modal-section h3 {
  margin: 0 0 14px;
  color: #344054;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
}

.top-section h3 {
  margin-bottom: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.info-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-item label {
  margin-bottom: 2px;
  color: #667085;
  font-size: 11px;
}

.info-item span {
  min-height: 32px;
  padding: 6px 8px;
  overflow: hidden;
  border: 1px solid #e5e9f0;
  border-radius: 6px;
  background: #f8fafc;
  color: #172033;
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.form-row {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}

.form-row:last-of-type {
  margin-bottom: 0;
}

.form-row > label {
  color: #344054;
  font-size: 13px;
  font-weight: 500;
}

.required {
  margin-left: 2px;
  color: #e53e3e;
}

.form-inline {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.form-inline .form-row {
  margin-bottom: 0;
}

.approval-row {
  margin-top: 14px;
}

.upload-area {
  min-height: 32px;
  flex-wrap: wrap;
}

.upload-hint {
  color: #9ca3af;
  font-size: 12px;
}

.transition-row {
  min-height: 36px;
  gap: 10px;
}

.transition-tag {
  padding: 5px 12px;
  border: 1px solid;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
}

.category-before,
.cycle-before {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.category-after,
.cycle-after {
  border-color: #f6c997;
  background: #fff7ed;
  color: #e67e22;
}

.transition-arrow {
  color: #9ca3af;
  font-size: 16px;
}

.modal-body :deep(.ant-input),
.modal-body :deep(.ant-select-selector) {
  min-height: 36px !important;
  border-radius: 6px !important;
  font-size: 13px;
}

.modal-body :deep(textarea.ant-input) {
  min-height: 72px !important;
  padding: 8px 10px;
  resize: none;
}

.modal-body :deep(.ant-input:focus),
.modal-body :deep(.ant-select-focused .ant-select-selector) {
  border-color: #175cd3 !important;
  box-shadow: 0 0 0 2px rgba(23, 92, 211, 0.1) !important;
}

:global(.change-verifier-handle-dialog .ant-modal-content) {
  overflow: hidden;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

:global(.change-verifier-handle-dialog .ant-modal-header) {
  margin: 0;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e5e9f0;
}

:global(.change-verifier-handle-dialog .ant-modal-close) {
  display: none;
}

@media (max-width: 760px) {
  .modal-header-content {
    align-items: flex-start;
    flex-direction: column;
    gap: 10px;
  }

  .info-grid,
  .form-inline {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
