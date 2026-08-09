<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { displayValue } from '../periodicDisplayModel'
import type {
  PeriodicResponsibleScrapConfirmRequest,
  PeriodicTaskVO
} from '../../../types/periodic'
import PeriodicJudgementHistory from './PeriodicJudgementHistory.vue'

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
  submit: [payload: PeriodicResponsibleScrapConfirmRequest]
}>()

const form = reactive({
  approved: true,
  opinion: ''
})

const resultName = computed(() => (form.approved ? '同意正常报废' : '退回原检定路线重检'))

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
    approved: form.approved,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.approved = true
    form.opinion = '确认正常报废'
  }
)

watch(
  () => form.approved,
  (approved, previous) => {
    if (!props.open) return
    const previousDefault = previous ? '确认正常报废' : '退回原检定路线重检'
    if (!form.opinion || form.opinion === previousDefault) {
      form.opinion = approved ? '确认正常报废' : '退回原检定路线重检'
    }
  }
)
</script>

<template>
  <a-modal :open="open" width="760px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 责任工程师确认正常报废</div>
          <strong>责任工程师确认正常报废</strong>
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
          <a-tag class="tag orange">待确认</a-tag>
        </div>
        <div class="info-grid">
          <div><span>计量编号</span><strong>{{ displayValue(task?.deviceCode) }}</strong></div>
          <div><span>设备名称</span><strong>{{ displayValue(task?.deviceName) }}</strong></div>
          <div><span>规格型号</span><strong>{{ displayValue(task?.modelSpec) }}</strong></div>
          <div><span>使用部门</span><strong>{{ displayValue(task?.deptName) }}</strong></div>
          <div><span>责任工程师</span><strong>{{ displayValue(task?.responsibleEngineerName) }}</strong></div>
          <div><span>检定结果</span><strong>{{ displayValue(task?.result) }}</strong></div>
        </div>
      </section>

      <PeriodicJudgementHistory :records="task?.judgementRecords" />

      <section class="panel">
        <div class="panel-header">
          <h2>报废确认</h2>
          <a-tag class="tag orange">{{ resultName }}</a-tag>
        </div>
        <div class="form-grid">
          <label>
            <span>确认结果</span>
            <a-radio-group v-model:value="form.approved" button-style="solid">
              <a-radio-button :value="true">同意正常报废</a-radio-button>
              <a-radio-button :value="false">退回重检</a-radio-button>
            </a-radio-group>
          </label>
          <label>
            <span>确认意见</span>
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
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.info-grid > div {
  min-height: 74px;
  padding: 14px;
  border-right: 1px solid #e5eaf1;
  border-bottom: 1px solid #e5eaf1;
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

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
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
  }
}
</style>
