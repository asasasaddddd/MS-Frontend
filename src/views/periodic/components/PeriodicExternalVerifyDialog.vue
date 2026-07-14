<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import AttachmentListButton from '../../../components/AttachmentListButton.vue'
import AttachmentUploadButton from '../../../components/AttachmentUploadButton.vue'
import { displayValue } from '../periodicDisplayModel'
import type { EntityId, PeriodicTaskVO, PeriodicVerifierFillInfoRequest } from '../../../types/periodic'

const props = withDefaults(
  defineProps<{
    open: boolean
    task?: PeriodicTaskVO | null
    submitting?: boolean
  }>(),
  {
    submitting: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: PeriodicVerifierFillInfoRequest]
}>()

const certificateAttachmentGroupId = ref<EntityId>()
const form = reactive({
  verificationDate: '',
  opinion: ''
})

const verificationMethodDisplay = computed(() => {
  const value = String(props.task?.verificationMethod || '').toLowerCase()
  if (['self', 'self_check', 'internal'].includes(value)) return '自检'
  if (['send_out', 'external', 'external_commission'].includes(value)) return '外委'
  return displayValue(props.task?.verificationMethod)
})

const canSubmit = computed(() => Boolean(props.task && form.verificationDate))

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function close() {
  emit('update:open', false)
}

function submit() {
  if (!props.task || !canSubmit.value) return
  emit('submit', {
    taskId: props.task.id,
    verificationDate: form.verificationDate,
    certificateAttachmentGroupId: certificateAttachmentGroupId.value,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    certificateAttachmentGroupId.value = undefined
    form.verificationDate = today()
    form.opinion = ''
  }
)
</script>

<template>
  <a-modal
    :open="open"
    width="95vw"
    wrap-class-name="periodic-verification-dialog"
    :footer="null"
    :destroy-on-close="true"
    @cancel="close"
  >
    <template #title>
      <div class="dialog-title">
        <div class="dialog-heading">
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / {{ displayValue(task?.deviceCode) }}</div>
          <strong>检定员填写周检信息外委否通用设备</strong>
        </div>
        <div class="dialog-title-actions">
          <a-button @click="close">取消</a-button>
          <a-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">提交</a-button>
        </div>
      </div>
    </template>

    <div class="form-page">
      <section class="panel">
        <div class="panel-header">
          <h2>设备状态基础信息</h2>
          <a-tag class="tag blue">计量编号 {{ displayValue(task?.deviceCode) }}</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>计量编号</span><a-input :value="displayValue(task?.deviceCode)" readonly /></label>
          <label><span>设备名称</span><a-input :value="displayValue(task?.deviceName)" readonly /></label>
          <label><span>生产厂商</span><a-input :value="displayValue(task?.manufacturer)" readonly /></label>
          <label><span>出厂编号</span><a-input :value="displayValue(task?.factoryCode)" readonly /></label>
          <label><span>规格型号</span><a-input :value="displayValue(task?.modelSpec)" readonly /></label>
          <label><span>有效期</span><a-input :value="displayValue(task?.validUntil)" readonly /></label>
          <label><span>检定周期</span><a-input :value="displayValue(task?.verificationCycleMonth)" readonly /></label>
          <label><span>使用部门</span><a-input :value="displayValue(task?.deptName)" readonly /></label>
          <label>
            <span>设备状态</span>
            <a-select
              :value="displayValue(task?.deviceStatusName || task?.deviceStatus)"
              :options="[{ label: displayValue(task?.deviceStatusName || task?.deviceStatus), value: displayValue(task?.deviceStatusName || task?.deviceStatus) }]"
              disabled
            />
          </label>
          <label>
            <span>管理类别</span>
            <a-select
              :value="displayValue(task?.manageCategory)"
              :options="[{ label: displayValue(task?.manageCategory), value: displayValue(task?.manageCategory) }]"
              disabled
            />
          </label>
          <label>
            <span>检定方法</span>
            <a-select
              :value="verificationMethodDisplay"
              :options="[{ label: verificationMethodDisplay, value: verificationMethodDisplay }]"
              disabled
            />
          </label>
          <label><span>学科分类</span><a-input :value="displayValue(task?.subjectCategory)" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>检定人员检定</h2>
          <a-tag class="tag orange">待填写</a-tag>
        </div>
        <div class="form-grid cols-4">
          <label><span>检定时间</span><a-input v-model:value="form.verificationDate" type="date" /></label>
          <label class="span-4"><span>检定意见</span><a-textarea v-model:value="form.opinion" :rows="3" placeholder="填写检定意见" /></label>
          <label>
            <span>上传附件</span>
            <div class="attachment-actions">
              <AttachmentUploadButton
                v-model="certificateAttachmentGroupId"
                business-type="PERIODIC_CERTIFICATE"
                :business-id="task?.id"
                remark="周检外委否通用设备检定附件"
                button-text="上传文件"
                size="small"
              />
              <AttachmentListButton
                :group-id="certificateAttachmentGroupId"
                button-text="查看已上传"
                title="周检外委否通用设备检定附件"
                size="small"
              />
            </div>
          </label>
        </div>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.dialog-title,
.dialog-title-actions,
.attachment-actions {
  display: flex;
  align-items: center;
}

.dialog-title {
  min-width: 0;
  justify-content: space-between;
  gap: 24px;
}

.dialog-heading {
  min-width: 0;
}

.dialog-title strong {
  color: #172033;
  font-size: 20px;
  line-height: 1.35;
}

.dialog-title-actions,
.attachment-actions {
  gap: 8px;
}

.dialog-title-actions {
  flex-shrink: 0;
}

.dialog-breadcrumb {
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 400;
}

.form-page {
  max-height: calc(90vh - 88px);
  display: grid;
  gap: 16px;
  padding: 20px;
  overflow: auto;
  background: #f3f5f8;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel-header {
  min-height: 49px;
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
  font-weight: 700;
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

.form-grid label > span:first-child {
  color: #667085;
  font-size: 12px;
}

.span-4 {
  grid-column: span 4;
}

.readonly-area :deep(.ant-input),
.readonly-area :deep(.ant-select-disabled .ant-select-selector) {
  color: #344054;
  background: #ffffff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-actions {
  flex-wrap: wrap;
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
    gap: 10px;
  }

  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }

  .span-4 {
    grid-column: span 1;
  }
}
</style>
