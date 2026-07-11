<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
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
  verificationUnit: '',
  opinion: '外委否通用设备已送回，检定日期和报告附件已确认'
})

function today() {
  return new Date().toISOString().slice(0, 10)
}

function close() {
  emit('update:open', false)
}

function submit() {
  if (!props.task) return
  emit('submit', {
    taskId: props.task.id,
    verificationDate: form.verificationDate,
    certificateAttachmentGroupId: certificateAttachmentGroupId.value,
    verificationUnit: form.verificationUnit || undefined,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    certificateAttachmentGroupId.value = undefined
    form.verificationDate = today()
    form.verificationUnit = ''
    form.opinion = '外委否通用设备已送回，检定日期和报告附件已确认'
  }
)
</script>

<template>
  <a-modal :open="open" width="860px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 周检外委检定</div>
          <strong>外委否通用设备检定信息</strong>
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
          <a-tag class="tag blue">外委送回后填写</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>计量编号</span><a-input :value="displayValue(task?.deviceCode)" readonly /></label>
          <label><span>设备名称</span><a-input :value="displayValue(task?.deviceName)" readonly /></label>
          <label><span>规格型号</span><a-input :value="displayValue(task?.modelSpec)" readonly /></label>
          <label><span>出厂编号</span><a-input :value="displayValue(task?.factoryCode)" readonly /></label>
          <label><span>使用部门</span><a-input :value="displayValue(task?.deptName)" readonly /></label>
          <label><span>管理类别</span><a-input :value="displayValue(task?.manageCategory)" readonly /></label>
          <label><span>检定周期</span><a-input :value="task?.verificationCycleMonth ? `${task.verificationCycleMonth}个月` : '-'" readonly /></label>
          <label><span>是否通用</span><a-input value="否" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>检定信息</h2>
        </div>
        <div class="form-grid cols-2">
          <label><span>检定日期</span><a-input v-model:value="form.verificationDate" type="date" /></label>
          <label><span>检定单位</span><a-input v-model:value="form.verificationUnit" placeholder="填写检定单位" /></label>
          <label class="span-2">
            <span>检定证书/报告附件</span>
            <div class="attachment-actions">
              <AttachmentUploadButton
                v-model="certificateAttachmentGroupId"
                business-type="PERIODIC_CERTIFICATE"
                :business-id="task?.id"
                remark="周检外委检定报告附件"
                button-text="上传报告"
                size="small"
              />
              <AttachmentListButton
                :group-id="certificateAttachmentGroupId"
                button-text="查看已上传"
                title="周检外委检定报告附件"
                size="small"
              />
            </div>
          </label>
          <label class="span-2"><span>处理意见</span><a-textarea v-model:value="form.opinion" :rows="3" /></label>
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

.form-grid.cols-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

@media (max-width: 900px) {
  .dialog-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .form-grid.cols-4,
  .form-grid.cols-2 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
