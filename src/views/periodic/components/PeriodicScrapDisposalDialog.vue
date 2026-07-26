<script setup lang="ts">
import { reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { displayValue } from '../periodicDisplayModel'
import type { PeriodicScrapDisposalRequest, PeriodicTaskVO } from '../../../types/periodic'
import PeriodicJudgementHistory from './PeriodicJudgementHistory.vue'

/** 报废处置弹窗输入，由当前外委检定员待办提供设备信息。 */
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

/** 报废处置弹窗的关闭和提交事件。 */
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: PeriodicScrapDisposalRequest]
}>()

/** 报废处置表单，只包含报废原因和可选处理意见。 */
const form = reactive({
  scrapReason: '',
  opinion: ''
})

/** 关闭报废处置弹窗。 */
function close() {
  emit('update:open', false)
}

/** 校验报废原因并提交当前任务的报废处置。 */
function submit() {
  if (!props.task) return
  if (props.task.workflowTaskId === undefined || props.task.rowVersion === undefined) {
    message.warning('工作流任务上下文已失效，请刷新待办')
    return
  }
  if (!form.scrapReason.trim()) {
    message.warning('请填写报废原因')
    return
  }
  emit('submit', {
    periodicTaskId: props.task.id,
    taskId: props.task.workflowTaskId,
    rowVersion: props.task.rowVersion,
    scrapReason: form.scrapReason,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.scrapReason = ''
    form.opinion = ''
  }
)
</script>

<template>
  <a-modal :open="open" width="760px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 报废处置</div>
          <strong>外委检定员报废处置</strong>
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
          <h2>设备信息</h2>
          <a-tag class="tag red">待报废处置</a-tag>
        </div>
        <div class="info-grid">
          <div><span>计量编号</span><strong>{{ displayValue(task?.deviceCode) }}</strong></div>
          <div><span>设备名称</span><strong>{{ displayValue(task?.deviceName) }}</strong></div>
          <div><span>规格型号</span><strong>{{ displayValue(task?.modelSpec) }}</strong></div>
          <div><span>使用部门</span><strong>{{ displayValue(task?.deptName) }}</strong></div>
        </div>
      </section>

      <PeriodicJudgementHistory :records="task?.judgementRecords" />

      <section class="panel">
        <div class="panel-header">
          <h2>处置信息</h2>
        </div>
        <div class="form-grid">
          <label>
            <span>报废原因</span>
            <a-textarea v-model:value="form.scrapReason" :rows="3" :maxlength="1000" show-count />
          </label>
          <label>
            <span>处理意见</span>
            <a-textarea v-model:value="form.opinion" :rows="3" :maxlength="1000" show-count />
          </label>
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
  gap: 14px;
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.info-grid > div {
  min-height: 74px;
  padding: 14px;
  border-right: 1px solid #e5eaf1;
}

.info-grid > div:last-child {
  border-right: 0;
}

.info-grid span,
.form-grid span {
  display: block;
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
}

.info-grid strong {
  color: #172033;
  font-size: 15px;
}

.form-grid {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

@media (max-width: 860px) {
  .dialog-title {
    align-items: flex-start;
    flex-direction: column;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-grid > div {
    border-right: 0;
    border-bottom: 1px solid #e5eaf1;
  }
}
</style>
