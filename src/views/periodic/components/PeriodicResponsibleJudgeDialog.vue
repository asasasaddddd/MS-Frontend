<script setup lang="ts">
import { reactive, watch } from 'vue'
import { displayValue } from '../periodicDisplayModel'
import type { PeriodicResponsibleJudgeResult, PeriodicResponsibleSecondJudgeRequest, PeriodicTaskVO } from '../../../types/periodic'

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
  submit: [payload: PeriodicResponsibleSecondJudgeRequest]
}>()

const form = reactive({
  judgeResult: 'qualified' as PeriodicResponsibleJudgeResult,
  opinion: '责任工程师二次判定合格'
})

function close() {
  emit('update:open', false)
}

function submit() {
  if (!props.task) return
  emit('submit', {
    taskId: props.task.id,
    judgeResult: form.judgeResult,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.judgeResult = 'qualified'
    form.opinion = '责任工程师二次判定合格'
  }
)
</script>

<template>
  <a-modal :open="open" width="760px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 责任工程师二次判定</div>
          <strong>责任工程师二次判定</strong>
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
          <a-tag class="tag orange">待二次判定</a-tag>
        </div>
        <div class="info-grid">
          <div><span>计量编号</span><strong>{{ displayValue(task?.deviceCode) }}</strong></div>
          <div><span>设备名称</span><strong>{{ displayValue(task?.deviceName) }}</strong></div>
          <div><span>规格型号</span><strong>{{ displayValue(task?.modelSpec) }}</strong></div>
          <div><span>使用部门</span><strong>{{ displayValue(task?.deptName) }}</strong></div>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>判定信息</h2>
        </div>
        <div class="form-grid">
          <label>
            <span>判定结果</span>
            <a-radio-group v-model:value="form.judgeResult" button-style="solid">
              <a-radio-button value="qualified">合格</a-radio-button>
              <a-radio-button value="unqualified">不合格</a-radio-button>
            </a-radio-group>
          </label>
          <label>
            <span>判定意见</span>
            <a-textarea v-model:value="form.opinion" :rows="3" />
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
    border-bottom: 1px solid #e5eaf1;
  }
}
</style>
