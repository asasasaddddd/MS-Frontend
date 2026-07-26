<script setup lang="ts">
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { displayValue } from '../periodicDisplayModel'
import type { PeriodicConfirmerConfirmRequest, PeriodicConfirmResult, PeriodicTaskVO } from '../../../types/periodic'

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
  submit: [payload: PeriodicConfirmerConfirmRequest]
}>()

const form = reactive({
  confirmResult: 'APPROVE' as PeriodicConfirmResult,
  opinion: '周检报告符合要求，同意确认'
})

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
    confirmResult: form.confirmResult,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.confirmResult = 'APPROVE'
    form.opinion = '周检报告符合要求，同意确认'
  }
)
</script>

<template>
  <a-modal :open="open" width="95vw" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 周检确认</div>
          <strong>确认员周检判定</strong>
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
          <h2>设备状态基础信息</h2>
          <a-tag class="tag orange">待确认</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>计量编号</span><a-input :value="displayValue(task?.deviceCode)" readonly /></label>
          <label><span>设备名称</span><a-input :value="displayValue(task?.deviceName)" readonly /></label>
          <label><span>生产厂商</span><a-input :value="displayValue(task?.manufacturer)" readonly /></label>
          <label><span>出厂编号</span><a-input :value="displayValue(task?.factoryCode)" readonly /></label>
          <label><span>规格型号</span><a-input :value="displayValue(task?.modelSpec)" readonly /></label>
          <label><span>有效期</span><a-input :value="displayValue(task?.validUntil)" readonly /></label>
          <label><span>检定周期</span><a-input :value="task?.verificationCycleMonth ? `${task.verificationCycleMonth}个月` : '-'" readonly /></label>
          <label><span>使用部门</span><a-input :value="displayValue(task?.deptName)" readonly /></label>
          <label><span>设备状态</span><a-input :value="displayValue(task?.deviceStatusName || task?.deviceStatus)" readonly /></label>
          <label><span>管理类别</span><a-input :value="displayValue(task?.manageCategory)" readonly /></label>
          <label><span>检定方法</span><a-input :value="displayValue(task?.verificationMethod)" readonly /></label>
          <label><span>学科分类</span><a-input :value="displayValue(task?.subjectCategory)" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>检定人员信息</h2>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>检定人员</span><a-input :value="displayValue(task?.assignedVerifierName)" readonly /></label>
          <label><span>检定时间</span><a-input :value="displayValue(task?.verificationTime)" readonly /></label>
          <label><span>新有效期</span><a-input :value="displayValue(task?.newValidUntil)" readonly /></label>
          <label><span>判定结果</span><a-input :value="displayValue(task?.result)" readonly /></label>
          <label class="span-2"><span>责任工程师</span><a-input :value="displayValue(task?.responsibleEngineerName)" readonly /></label>
          <label class="span-2"><span>检定备注</span><a-input :value="displayValue(task?.remark)" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>确认员判定</h2>
        </div>
        <div class="form-grid cols-4">
          <label>
            <span>确认结果</span>
            <a-select
              v-model:value="form.confirmResult"
              :options="[
                { label: '通过', value: 'APPROVE' },
                { label: '驳回', value: 'REJECT' }
              ]"
            />
          </label>
          <label class="span-3"><span>判定意见</span><a-textarea v-model:value="form.opinion" :rows="3" /></label>
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
  max-height: calc(95vh - 72px);
  display: grid;
  gap: 16px;
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

.span-2 {
  grid-column: span 2;
}

.span-3 {
  grid-column: span 3;
}

.readonly-area :deep(.ant-input) {
  color: #344054;
  background: #f9fafb;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

  .span-2,
  .span-3 {
    grid-column: span 1;
  }
}
</style>
