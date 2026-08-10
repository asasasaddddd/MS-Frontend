<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import { useProductionDictionaries } from '@/composables/useProductionDictionaries'
import { useSessionStore } from '../../../stores/session'
import { displayValue } from '../periodicDisplayModel'
import type { EntityId, PeriodicExceptionChangeSubmitRequest, PeriodicTaskVO } from '../../../types/periodic'
import {
  buildPeriodicExceptionChangeRequest,
  displayCategory,
  maxPeriodicVerificationCycleMonth,
  periodicExceptionActionMeta,
  periodicExceptionActionMetas,
  periodicCycleExtensionOptions,
  type PeriodicExceptionAction,
  type PeriodicExceptionFormState
} from '../periodicExceptionModel'

const props = withDefaults(
  defineProps<{
    open: boolean
    task?: PeriodicTaskVO | null
    tasks?: PeriodicTaskVO[]
    actionType?: PeriodicExceptionAction
    submitting?: boolean
    changeSubmitting?: boolean
  }>(),
  {
    tasks: () => [],
    actionType: 'seal',
    submitting: false,
    changeSubmitting: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  createChange: [payload: PeriodicExceptionChangeSubmitRequest]
}>()

const session = useSessionStore()
const {
  loading: dictionaryLoading,
  positiveVerificationCycleOptions,
  loadProductionDictionaries
} = useProductionDictionaries()

const form = reactive<PeriodicExceptionFormState>({
  actionType: 'seal',
  attachmentGroupId: undefined as EntityId | undefined,
  sealReason: '',
  deferReason: '',
  scrapType: 'damaged',
  scrapReason: '',
  newCycleMonth: undefined,
  adjustmentReason: '',
  remark: ''
})

const meta = computed(() => periodicExceptionActionMeta(form.actionType))
const applyDate = computed(() => new Date().toISOString().slice(0, 10))
const exceptionNodeText = computed(() => meta.value.label)
const tasksToDisplay = computed(() => {
  if (props.tasks.length > 0) return props.tasks
  return props.task ? [props.task] : []
})
const currentMaxCycleMonth = computed(() => maxPeriodicVerificationCycleMonth(tasksToDisplay.value))
const currentCycleText = computed(() => {
  if (currentMaxCycleMonth.value === undefined) return '-'
  return tasksToDisplay.value.length > 1
    ? `本批最长 ${currentMaxCycleMonth.value}个月`
    : `${currentMaxCycleMonth.value}个月`
})
const longerVerificationCycleOptions = computed(() =>
  periodicCycleExtensionOptions(positiveVerificationCycleOptions.value, tasksToDisplay.value)
)
const applicantText = computed(() => {
  const user = session.user
  if (!user) return '-'
  return `${user.employeeId}（${user.employeeName}）`
})

function close() {
  emit('update:open', false)
}

function reset() {
  form.actionType = props.actionType
  form.attachmentGroupId = undefined
  form.sealReason = ''
  form.deferReason = ''
  form.scrapType = 'damaged'
  form.scrapReason = ''
  form.newCycleMonth = undefined
  form.adjustmentReason = ''
  form.remark = ''
}

function createChange() {
  if (tasksToDisplay.value.length === 0) return
  try {
    const payload = buildPeriodicExceptionChangeRequest(tasksToDisplay.value, session.user || undefined, form)
    emit('createChange', payload)
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '周检异常处理信息不完整')
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    reset()
    try {
      await loadProductionDictionaries()
    } catch (error) {
      message.warning(error instanceof Error ? error.message : '检定周期字典加载失败')
    }
  }
)

watch(
  () => props.actionType,
  (action) => {
    if (props.open) form.actionType = action
  }
)

watch(longerVerificationCycleOptions, (options) => {
  if (form.actionType !== 'cycle' || form.newCycleMonth === undefined) return
  const selectedStillAvailable = options.some((option) => Number(option.value) === Number(form.newCycleMonth))
  if (!selectedStillAvailable) form.newCycleMonth = undefined
})
</script>

<template>
  <a-modal :open="open" width="960px" :footer="null" :closable="false" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 周检异常</div>
          <strong>{{ meta.title }}</strong>
        </div>
        <a-button @click="close">关闭</a-button>
      </div>
    </template>

    <div class="form-page">
      <section class="panel modal-section">
        <div class="panel-header">
          <h2>已选器具</h2>
        </div>
        <div v-if="tasksToDisplay.length" class="selected-device-list">
          <div v-for="item in tasksToDisplay" :key="item.id" class="selected-device-item">
            <strong>{{ displayValue(item.deviceCode) }} / {{ displayValue(item.deviceName) }}</strong>
            <span>
              规格型号：{{ displayValue(item.modelSpec) }}；出厂编号：{{ displayValue(item.factoryCode) }}；使用部门：{{
                displayValue(item.deptName)
              }}
            </span>
            <span>
              类别：{{ displayCategory(item.manageCategory) }}；检定周期：{{
                item.verificationCycleMonth ? `${item.verificationCycleMonth}个月` : '-'
              }}；有效日期：{{ displayValue(item.validUntil) }}
            </span>
          </div>
        </div>
        <div v-else class="selected-device-item empty">
          <strong>未选择器具</strong>
          <span>请先在清单中选择需要处理的周检设备</span>
        </div>
      </section>

      <section class="panel modal-section">
        <div class="panel-header">
          <h2>{{ meta.sectionTitle }}</h2>
        </div>
        <div class="form-grid cols-4">
          <label>
            <span>申请人</span>
            <a-input :value="applicantText" readonly />
          </label>
          <label>
            <span>申请时间</span>
            <a-input :value="applyDate" readonly />
          </label>
          <label>
            <span>当前节点</span>
            <a-input :value="exceptionNodeText" readonly />
          </label>

          <template v-if="form.actionType === 'seal'">
            <label class="span-4">
              <span>封存原因 <b>*</b></span>
              <a-textarea v-model:value="form.sealReason" placeholder="请填写设备封存原因" :rows="4" />
            </label>
          </template>

          <template v-if="form.actionType === 'defer'">
            <label>
              <span>原有效期</span>
              <a-input :value="displayValue(task?.validUntil)" readonly />
            </label>
            <label class="span-4">
              <span>缓检原因 <b>*</b></span>
              <a-textarea v-model:value="form.deferReason" placeholder="填写缓检原因" :rows="4" />
            </label>
          </template>

          <template v-if="form.actionType === 'scrap'">
            <label>
              <span>报废类型 <b>*</b></span>
              <a-select
                v-model:value="form.scrapType"
                :options="[
                  { label: '损坏', value: 'damaged' },
                  { label: '丢失', value: 'lost' },
                  { label: '其它', value: 'other' }
                ]"
              />
            </label>
            <label class="span-4">
              <span>报废原因 <b>*</b></span>
              <a-textarea v-model:value="form.scrapReason" placeholder="请填写报废原因及具体情况说明" :rows="4" />
            </label>
          </template>

          <template v-if="form.actionType === 'category'">
            <label>
              <span>调整前</span>
              <a-input :value="displayCategory(task?.manageCategory)" readonly />
            </label>
            <label>
              <span>调整后 <b>*</b></span>
              <a-input value="C类" readonly />
            </label>
            <label class="span-4">
              <span>调整原因 <b>*</b></span>
              <a-textarea v-model:value="form.adjustmentReason" placeholder="填写管理类别调整原因" :rows="4" />
            </label>
          </template>

          <template v-if="form.actionType === 'cycle'">
            <label>
              <span>调整前</span>
              <a-input :value="currentCycleText" readonly />
            </label>
            <label>
              <span>调整后 <b>*</b></span>
              <a-select
                v-model:value="form.newCycleMonth"
                placeholder="请选择调整后周期"
                :loading="dictionaryLoading"
                :options="longerVerificationCycleOptions"
                not-found-content="暂无比当前周期更长的选项"
              />
            </label>
            <label class="span-4">
              <span>调整原因 <b>*</b></span>
              <a-textarea v-model:value="form.adjustmentReason" placeholder="填写检定周期调整原因" :rows="4" />
            </label>
          </template>

          <label class="span-4">
            <span>附件</span>
            <div class="upload-row">
              <AttachmentUploadButton
                v-model="form.attachmentGroupId"
                business-type="CHANGE_APPLY"
                remark="周检异常处理附件"
                button-text="上传文件"
              />
              <span>支持 pdf、doc、jpg，最多 10MB；附件会随周检异常处理流程流转</span>
            </div>
          </label>
        </div>
      </section>

      <div class="panel-actions">
        <a-button @click="close">取消</a-button>
        <a-button type="primary" :loading="changeSubmitting || submitting" :disabled="tasksToDisplay.length === 0" @click="createChange">
          确认提交
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-breadcrumb {
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 400;
}

.form-page {
  max-height: 74vh;
  display: grid;
  gap: 14px;
  overflow: auto;
  padding: 2px;
  background: #f3f5f8;
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

.selected-device-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  padding: 12px 14px;
}

.selected-device-item {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #d3dae6;
  border-radius: 8px;
  background: #fbfcfe;
}

.selected-device-item strong {
  color: #172033;
  font-size: 14px;
}

.selected-device-item span {
  color: #667085;
  font-size: 12px;
}

.selected-device-item.empty {
  margin: 12px 14px;
  border-style: dashed;
}

.form-grid {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.span-4 {
  grid-column: span 4;
}

.form-grid label {
  min-width: 0;
}

.form-grid span {
  display: block;
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
}

.form-grid b {
  color: #e53e3e;
  font-weight: 700;
}

.upload-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.upload-row span {
  margin: 0;
  color: #98a2b3;
}

.panel-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 0 2px;
}

.created-alert {
  margin: 12px 14px 0;
}

@media (max-width: 920px) {
  .dialog-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .cols-4 {
    grid-template-columns: 1fr;
  }

  .span-4 {
    grid-column: span 1;
  }

  .selected-device-list {
    grid-template-columns: 1fr;
  }
}
</style>
