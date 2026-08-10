<script setup lang="ts">
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import AttachmentUploadButton from '../../../components/AttachmentUploadButton.vue'
import { displayValue } from '../periodicDisplayModel'
import type { EntityId, PeriodicSupplierFillInfoRequest, PeriodicTaskVO, PeriodicVerificationResult } from '../../../types/periodic'

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
  submit: [payload: PeriodicSupplierFillInfoRequest]
}>()

const form = reactive({
  verificationDate: '',
  result: 'qualified' as PeriodicVerificationResult,
  verificationUnit: '',
  certificateNo: '',
  certificateAttachmentGroupId: undefined as EntityId | undefined,
  recordAttachmentGroupId: undefined as EntityId | undefined,
  opinion: '外扩检定信息已填写'
})

function today() {
  return new Date().toISOString().slice(0, 10)
}

function close() {
  emit('update:open', false)
}

function submit() {
  if (!props.task) return
  if (props.task.workflowTaskId === undefined || props.task.rowVersion === undefined) {
    message.warning('工作流任务上下文已失效，请刷新待办')
    return
  }
  emit('submit', {
    periodicTaskId: props.task.id,
    taskId: props.task.workflowTaskId,
    rowVersion: props.task.rowVersion,
    verificationDate: form.verificationDate,
    result: form.result,
    verificationUnit: form.verificationUnit || undefined,
    certificateNo: form.certificateNo || undefined,
    certificateAttachmentGroupId: form.certificateAttachmentGroupId,
    recordAttachmentGroupId: form.recordAttachmentGroupId,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.verificationDate = today()
    form.result = 'qualified'
    form.verificationUnit = ''
    form.certificateNo = ''
    form.certificateAttachmentGroupId = undefined
    form.recordAttachmentGroupId = undefined
    form.opinion = '外扩检定信息已填写'
  }
)
</script>

<template>
  <a-modal :open="open" width="900px" :footer="null" :closable="false" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 外扩检定</div>
          <strong>外扩人员周检填写检定信息</strong>
        </div>
        <div class="dialog-title-actions">
          <a-button @click="close">取消</a-button>
          <a-button type="primary" :loading="submitting" @click="submit">提交</a-button>
        </div>
      </div>
    </template>

    <div class="form-page">
      <section class="panel">
        <div class="panel-header">
          <h2>设备基础信息</h2>
          <a-tag class="tag blue">通用设备检定信息</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>计量编号</span><a-input :value="displayValue(task?.deviceCode)" readonly /></label>
          <label><span>设备名称</span><a-input :value="displayValue(task?.deviceName)" readonly /></label>
          <label><span>规格型号</span><a-input :value="displayValue(task?.modelSpec)" readonly /></label>
          <label><span>出厂编号</span><a-input :value="displayValue(task?.factoryCode)" readonly /></label>
          <label><span>生产厂商</span><a-input :value="displayValue(task?.manufacturer)" readonly /></label>
          <label><span>使用部门</span><a-input :value="displayValue(task?.deptName)" readonly /></label>
          <label><span>检定周期</span><a-input :value="task?.verificationCycleMonth ? `${task.verificationCycleMonth}个月` : '-'" readonly /></label>
          <label><span>当前有效期</span><a-input :value="displayValue(task?.validUntil)" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>检定信息</h2>
          <a-tag class="tag orange">外扩人员填写</a-tag>
        </div>
        <div class="form-grid cols-4">
          <label><span>检定日期</span><a-input v-model:value="form.verificationDate" type="date" /></label>
          <label><span>检定单位</span><a-input v-model:value="form.verificationUnit" placeholder="填写外扩检定单位" /></label>
          <label><span>证书编号</span><a-input v-model:value="form.certificateNo" placeholder="填写证书编号" /></label>
          <label>
            <span>检定结果</span>
            <a-select
              v-model:value="form.result"
              :options="[
                { label: '合格', value: 'qualified' },
                { label: '不合格', value: 'unqualified' }
              ]"
            />
          </label>
          <label class="span-4">
            <span>检定意见</span>
            <a-textarea v-model:value="form.opinion" :rows="3" />
          </label>
          <div class="span-4 attachment-group-row">
            <div>
              <span>证书/报告附件</span>
              <AttachmentUploadButton
                v-model="form.certificateAttachmentGroupId"
                business-type="PERIODIC_CERTIFICATE"
                :business-id="task?.id"
                remark="周检外扩通用设备证书附件"
                button-text="上传证书"
              />
            </div>
            <div>
              <span>检定记录附件</span>
              <AttachmentUploadButton
                v-model="form.recordAttachmentGroupId"
                business-type="PERIODIC_RECORD"
                :business-id="task?.id"
                remark="周检外扩通用设备检定记录附件"
                button-text="上传记录"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.dialog-title,
.dialog-title-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.dialog-title {
  justify-content: space-between;
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

.span-4 {
  grid-column: span 4;
}

.readonly-area :deep(.ant-input) {
  color: #344054;
  background: #f9fafb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-group-row {
  padding: 10px 12px;
  border: 1px dashed #d3dae6;
  border-radius: 6px;
  background: #fbfcfe;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.attachment-group-row > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
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

@media (max-width: 900px) {
  .dialog-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-grid.cols-4,
  .attachment-group-row {
    grid-template-columns: 1fr;
  }

  .span-4 {
    grid-column: span 1;
  }
}
</style>
