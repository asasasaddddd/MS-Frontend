<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import type { AttachmentId } from '@/api/attachment'
import { useProductionDictionaries } from '@/composables/useProductionDictionaries'
import type { ChangeItemSubmitRequest, ChangeSubmitRequest, ChangeType } from '@/types/change'
import type { DeviceVO } from '@/types/device'
import { useSessionStore } from '@/stores/session'
import {
  buildBaseChangeItem,
  categoryTargetOptions,
  changeTypeApplyTitle,
  deviceRowKey,
  display,
  formatCycleMonth,
  normalizeCategory,
  normalizeCategoryCode,
  todayIsoDate
} from '@/views/change/changeDisplayModel'

const props = defineProps<{
  open: boolean
  type?: ChangeType
  devices: DeviceVO[]
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: ChangeSubmitRequest]
}>()

const session = useSessionStore()
const {
  loading: dictionaryLoading,
  positiveVerificationCycleOptions,
  loadProductionDictionaries
} = useProductionDictionaries()

const form = reactive({
  remark: '',
  applyDate: todayIsoDate(),
  applyDateTime: '',
  sealReason: '',
  enableReason: '',
  transferToDeptId: '',
  transferToDeptName: undefined as string | undefined,
  transferReason: '',
  categoryTargets: {} as Record<string, string | undefined>,
  newCycleMonth: undefined as number | undefined,
  adjustmentReason: '',
  scrapType: 'other',
  scrapReason: '',
  verificationReason: '',
  attachmentGroupId: undefined as AttachmentId | undefined
})

const title = computed(() => changeTypeApplyTitle(props.type))
const canSubmit = computed(() => Boolean(props.type) && props.devices.length > 0 && !props.submitting)
const firstDevice = computed(() => props.devices[0])
const currentCategory = computed(() => normalizeCategory(firstDevice.value?.manageCategory))
const currentCycle = computed(() => formatCycleMonth(firstDevice.value?.verificationCycleMonth))
const targetCycle = computed(() => (form.newCycleMonth ? formatCycleMonth(form.newCycleMonth) : ''))
const applyTimeLabel = computed(() => (props.type === 'enable' ? '申请时间' : '申请日期'))
const applyTimeValue = computed(() => (props.type === 'enable' ? form.applyDateTime : form.applyDate))
const selectedDeviceCountText = computed(() => (props.devices.length > 1 ? `已选择 ${props.devices.length} 台设备` : ''))

const transferDeptOptions = [
  { label: '重一', value: '重一' },
  { label: '重二', value: '重二' },
  { label: '质量检验部', value: '质量检验部' },
  { label: '工业透平事业部', value: '工业透平事业部' }
]

const scrapTypeOptions = [
  { label: '丢失', value: 'lost' },
  { label: '损坏', value: 'damaged' },
  { label: '其它', value: 'other' }
]

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    resetForm()
    try {
      await loadProductionDictionaries()
    } catch (error) {
      message.warning(error instanceof Error ? error.message : '检定周期字典加载失败')
    }
  }
)

function resetForm() {
  const now = new Date()
  form.remark = ''
  form.applyDate = todayIsoDate()
  form.applyDateTime = `${todayIsoDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  form.sealReason = ''
  form.enableReason = ''
  form.transferToDeptId = ''
  form.transferToDeptName = undefined
  form.transferReason = ''
  form.categoryTargets = Object.fromEntries(props.devices.map((device) => [deviceRowKey(device), undefined]))
  form.newCycleMonth = undefined
  form.adjustmentReason = ''
  form.scrapType = 'other'
  form.scrapReason = ''
  form.verificationReason = ''
  form.attachmentGroupId = undefined
}

function close() {
  emit('update:open', false)
}

function required(value: unknown, text: string) {
  if (value === undefined || value === null || String(value).trim() === '') {
    message.warning(text)
    return false
  }
  return true
}

function buildItem(device: DeviceVO): ChangeItemSubmitRequest | null {
  if (!props.type) return null
  if (props.type === 'seal') {
    return buildBaseChangeItem(device, {
      newStatus: 'sealed',
      sealReason: form.sealReason,
      remark: form.remark
    })
  }
  if (props.type === 'enable') {
    return buildBaseChangeItem(device, {
      newStatus: 'pending_enable',
      enableReason: form.enableReason,
      remark: form.remark
    })
  }
  if (props.type === 'transfer') {
    return buildBaseChangeItem(device, {
      transferToDeptId: form.transferToDeptId || form.transferToDeptName,
      transferToDeptName: form.transferToDeptName,
      transferReason: form.transferReason,
      remark: form.remark
    })
  }
  if (props.type === 'category') {
    return buildBaseChangeItem(device, {
      newCategory: normalizeCategoryCode(form.categoryTargets[deviceRowKey(device)]),
      adjustmentReason: form.adjustmentReason,
      remark: form.remark
    })
  }
  if (props.type === 'cycle') {
    return buildBaseChangeItem(device, {
      newCycleMonth: form.newCycleMonth,
      adjustmentReason: form.adjustmentReason,
      remark: form.remark
    })
  }
  if (props.type === 'scrap') {
    return buildBaseChangeItem(device, {
      newStatus: 'scrapped',
      scrapType: form.scrapType,
      scrapReason: form.scrapReason,
      remark: form.remark
    })
  }
  if (props.type === 'precheck') {
    return buildBaseChangeItem(device, {
      verificationReason: form.verificationReason,
      precheckRequired: 1,
      sendOutRequired: 0,
      remark: form.remark
    })
  }
  return null
}

function validate() {
  if (!props.type) return false
  if (props.devices.length === 0) {
    message.warning('请先选择设备')
    return false
  }
  if (props.type === 'seal') return required(form.sealReason, '请填写封存原因')
  if (props.type === 'enable') return required(form.enableReason, '请填写启用原因')
  if (props.type === 'transfer') {
    return required(form.transferToDeptName, '请选择接收单位') && required(form.transferReason, '请填写转移原因')
  }
  if (props.type === 'category') {
    for (const device of props.devices) {
      const target = form.categoryTargets[deviceRowKey(device)]
      if (!target) {
        message.warning(`请选择设备 ${device.deviceCode || '-'} 的调整后管理类别`)
        return false
      }
      if (normalizeCategoryCode(target) === normalizeCategoryCode(device.manageCategory)) {
        message.warning(`设备 ${device.deviceCode || '-'} 的目标类别不能与原类别相同`)
        return false
      }
    }
    return true
  }
  if (props.type === 'cycle') {
    return required(form.newCycleMonth, '请选择调整后检定周期') && required(form.adjustmentReason, '请填写检定周期调整原因')
  }
  if (props.type === 'scrap') return required(form.scrapReason, '请填写报废原因')
  if (props.type === 'precheck') return required(form.verificationReason, '请填写用前检定原因')
  return true
}

function submit() {
  if (!validate() || !props.type) return
  const items = props.devices.map(buildItem).filter((item): item is ChangeItemSubmitRequest => Boolean(item))
  emit('submit', {
    changeType: props.type,
    applyDeptId: session.user?.deptId,
    applyDeptName: session.user?.deptName,
    reason: resolvePrimaryReason(),
    remark: form.remark,
    attachmentGroupId: form.attachmentGroupId,
    items
  })
}

function resolvePrimaryReason() {
  if (props.type === 'seal') return form.sealReason
  if (props.type === 'enable') return form.enableReason
  if (props.type === 'transfer') return form.transferReason
  if (props.type === 'category') return `逐台调整${props.devices.length}台设备的管理类别`
  if (props.type === 'cycle') return `检定周期调整为${targetCycle.value}`
  if (props.type === 'scrap') return form.scrapReason
  if (props.type === 'precheck') return form.verificationReason
  return ''
}
</script>

<template>
  <a-modal
    :open="open"
    width="576px"
    :footer="null"
    :closable="false"
    :mask-closable="false"
    centered
    wrap-class-name="change-apply-modal-wrap"
    @cancel="close"
  >
    <section class="apply-dialog">
      <header class="apply-header">
        <div>
          <h2>{{ title }}</h2>
          <span v-if="selectedDeviceCountText">{{ selectedDeviceCountText }}</span>
        </div>
        <div class="header-actions">
          <a-button size="large" @click="close">取消</a-button>
          <a-button size="large" type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">提交</a-button>
        </div>
      </header>

      <main class="apply-body">
        <div v-if="type === 'cycle'" class="current-strip">
          <span>当前周期：</span>
          <strong>{{ currentCycle }}</strong>
          <em>→</em>
          <span>调整为：</span>
          <strong v-if="targetCycle">{{ targetCycle }}</strong>
        </div>

        <div v-if="type === 'category'" class="current-strip">
          <span>当前类别：</span>
          <strong class="pill">{{ currentCategory }}</strong>
          <em>→</em>
          <span>请逐台选择调整后类别</span>
        </div>

        <a-form layout="vertical" class="prototype-form">
          <template v-if="type === 'cycle'">
            <a-form-item label="调整后检定周期" required>
              <a-select
                v-model:value="form.newCycleMonth"
                size="large"
                placeholder="请选择调整后周期"
                :loading="dictionaryLoading"
                :options="positiveVerificationCycleOptions"
              />
              <p class="field-help">如选项中没有所需周期，请在调整原因中注明</p>
            </a-form-item>
            <a-form-item label="调整原因" required>
              <a-textarea v-model:value="form.adjustmentReason" placeholder="请填写检定周期调整原因" :rows="4" />
            </a-form-item>
          </template>

          <template v-if="type === 'category'">
            <a-form-item label="设备管理类别调整" required>
              <div class="category-device-list">
                <div v-for="device in devices" :key="deviceRowKey(device)" class="category-device-row">
                  <div class="category-device-info">
                    <strong>{{ display(device.deviceCode) }} / {{ display(device.deviceName) }}</strong>
                    <span>原类别：{{ normalizeCategory(device.manageCategory) }}</span>
                  </div>
                  <a-select
                    v-model:value="form.categoryTargets[deviceRowKey(device)]"
                    size="large"
                    :options="categoryTargetOptions(device.manageCategory)"
                    placeholder="请选择目标类别"
                  />
                </div>
              </div>
            </a-form-item>
          </template>

          <template v-if="type === 'scrap'">
            <a-form-item label="报废类型">
              <div class="segmented">
                <button
                  v-for="item in scrapTypeOptions"
                  :key="item.value"
                  type="button"
                  :class="{ active: form.scrapType === item.value }"
                  @click="form.scrapType = item.value"
                >
                  {{ item.label }}
                </button>
              </div>
            </a-form-item>
            <div class="divider"></div>
            <a-form-item label="报废原因" required>
              <a-textarea v-model:value="form.scrapReason" placeholder="请说明非正常报废的具体情况" :rows="4" />
            </a-form-item>
          </template>

          <template v-if="type === 'seal'">
            <a-form-item label="封存原因" required>
              <a-textarea v-model:value="form.sealReason" placeholder="请填写设备封存原因" :rows="4" />
            </a-form-item>
          </template>

          <template v-if="type === 'enable'">
            <a-form-item label="启用原因" required>
              <a-textarea v-model:value="form.enableReason" placeholder="请填写设备启用原因及说明" :rows="4" />
            </a-form-item>
          </template>

          <template v-if="type === 'transfer'">
            <a-form-item label="接收单位" required>
              <a-select v-model:value="form.transferToDeptName" size="large" :options="transferDeptOptions" placeholder="请选择接收单位" />
            </a-form-item>
            <a-form-item label="转移原因" required>
              <a-textarea v-model:value="form.transferReason" placeholder="请填写设备转移原因" :rows="4" />
            </a-form-item>
          </template>

          <template v-if="type === 'precheck'">
            <a-form-item label="检定原因" required>
              <a-textarea v-model:value="form.verificationReason" placeholder="请填写需要用前检定的原因说明" :rows="4" />
            </a-form-item>
          </template>

          <a-form-item :label="applyTimeLabel">
            <a-input :value="applyTimeValue" size="large" readonly />
          </a-form-item>

          <a-form-item label="附件">
            <div class="attachment-row">
              <AttachmentUploadButton
                v-model="form.attachmentGroupId"
                business-type="CHANGE_APPLY"
                remark="状态变更申请附件"
                button-text="上传文件"
              />
              <span>支持 pdf、doc、jpg，最多 10MB</span>
            </div>
          </a-form-item>
        </a-form>
      </main>
    </section>
  </a-modal>
</template>

<style scoped>
.apply-dialog {
  overflow: hidden;
  border-radius: 14px;
  background: #ffffff;
}

.apply-header {
  min-height: 76px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px 16px;
  border-bottom: 1px solid #e3e8f0;
  background: #ffffff;
}

.apply-header h2 {
  margin: 0;
  color: #071633;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
}

.apply-header span {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 13px;
}

.header-actions {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
}

.header-actions :deep(.ant-btn) {
  height: 40px;
  min-width: 66px;
  border-radius: 8px;
  font-size: 16px;
}

.header-actions :deep(.ant-btn-primary) {
  background: #1769e0;
}

.apply-body {
  padding: 24px;
  background: #f4f7fb;
}

.current-strip {
  width: fit-content;
  max-width: 100%;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 9px 14px;
  border-radius: 8px;
  background: #eef3fb;
  color: #2c3d5c;
  font-size: 15px;
}

.current-strip strong {
  color: #1769e0;
  font-weight: 800;
}

.current-strip .pill {
  min-width: 44px;
  padding: 2px 10px;
  border-radius: 5px;
  background: #1f66d6;
  color: #ffffff;
  text-align: center;
}

.current-strip em {
  color: #7b8798;
  font-style: normal;
}

.prototype-form {
  display: grid;
  gap: 2px;
}

.prototype-form :deep(.ant-form-item) {
  margin-bottom: 18px;
}

.prototype-form :deep(.ant-form-item-label) {
  padding-bottom: 8px;
}

.prototype-form :deep(.ant-form-item-label > label) {
  height: auto;
  color: #10203f;
  font-size: 15px;
  font-weight: 500;
}

.prototype-form :deep(.ant-form-item-required::before) {
  color: #e5484d !important;
}

.prototype-form :deep(.ant-input),
.prototype-form :deep(.ant-select-selector),
.prototype-form :deep(.ant-input-affix-wrapper) {
  border-color: #cfd7e3 !important;
  border-radius: 7px !important;
  color: #22324d;
  font-size: 15px;
  box-shadow: none !important;
}

.prototype-form :deep(.ant-select-selector) {
  min-height: 45px;
  align-items: center;
}

.prototype-form :deep(textarea.ant-input) {
  min-height: 98px;
  padding: 12px;
  resize: none;
}

.prototype-form :deep(.ant-input[readonly]) {
  background: #f8fbff;
  color: #4b5b76;
}

.category-device-list {
  display: grid;
  gap: 10px;
}

.category-device-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 180px;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #d8e0eb;
  border-radius: 8px;
  background: #ffffff;
}

.category-device-info {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.category-device-info strong {
  overflow: hidden;
  color: #10203f;
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-device-info span {
  color: #667085;
  font-size: 13px;
}

.field-help {
  margin: 10px 0 0;
  color: #98a2b3;
  font-size: 14px;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.segmented button {
  height: 56px;
  border: 1px solid #cfd7e3;
  border-radius: 9px;
  background: #ffffff;
  color: #52627d;
  font-size: 18px;
  cursor: pointer;
  transition: border-color 0.15s ease, background 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}

.segmented button.active {
  border-color: #1769e0;
  background: #1f66d6;
  color: #ffffff;
  box-shadow: 0 0 0 2px rgba(23, 105, 224, 0.16);
}

.divider {
  height: 1px;
  margin: 6px 0 24px;
  background: #dfe5ee;
}

.attachment-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.attachment-row :deep(.ant-btn) {
  height: 40px;
  border-color: #cfd7e3;
  border-radius: 7px;
  color: #10203f;
  font-size: 15px;
}

.attachment-row > span {
  color: #98a2b3;
  font-size: 14px;
}

:global(.change-apply-modal-wrap .ant-modal-content) {
  overflow: hidden;
  padding: 0;
  border-radius: 14px;
  background: transparent;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.22);
}

@media (max-width: 640px) {
  .apply-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .segmented {
    grid-template-columns: 1fr;
  }

  .category-device-row {
    grid-template-columns: 1fr;
  }
}
</style>
