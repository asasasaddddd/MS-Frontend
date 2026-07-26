<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { displayValue, getPeriodicJudgementDisplay } from '../periodicDisplayModel'
import PeriodicJudgementHistory from './PeriodicJudgementHistory.vue'
import type {
  PeriodicJudgementRequest,
  PeriodicJudgementResult,
  PeriodicTaskVO
} from '../../../types/periodic'

/** 统一判定弹窗输入，由当前后端待办提供节点和设备信息。 */
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

/** 统一判定弹窗的关闭和提交事件。 */
const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: PeriodicJudgementRequest]
}>()

/** 当前判定表单，只包含后端统一判定接口接受的业务字段。 */
const form = reactive({
  judgeResult: 'qualified' as PeriodicJudgementResult,
  opinion: ''
})

/** 当前节点对应的处理角色和判定轮次。 */
const judgementDisplay = computed(() => getPeriodicJudgementDisplay(props.task?.currentNode))

/** 弹窗标题，始终反映当前待办的处理角色和判定轮次。 */
const dialogTitle = computed(() => {
  const display = judgementDisplay.value
  return display ? `${display.roleName}第${display.round}次判定` : '周检判定'
})

/**
 * 生成与当前节点和结果一致的默认判定意见。
 *
 * @param result 当前选择的判定结果。
 */
function defaultOpinion(result: PeriodicJudgementResult) {
  const resultName = result === 'qualified' ? '合格' : '不合格'
  return `${dialogTitle.value}${resultName}`
}

/** 关闭统一判定弹窗。 */
function close() {
  emit('update:open', false)
}

/** 提交当前任务的判定结果，不携带角色、轮次或下一节点。 */
function submit() {
  if (!props.task || !judgementDisplay.value) return
  if (props.task.workflowTaskId === undefined || props.task.rowVersion === undefined) {
    message.warning('工作流任务上下文已失效，请刷新待办')
    return
  }
  emit('submit', {
    periodicTaskId: props.task.id,
    taskId: props.task.workflowTaskId,
    rowVersion: props.task.rowVersion,
    judgeResult: form.judgeResult,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    form.judgeResult = 'qualified'
    form.opinion = defaultOpinion(form.judgeResult)
  }
)

watch(
  () => form.judgeResult,
  (result, previousResult) => {
    if (!props.open) return
    const previousDefault = defaultOpinion(previousResult)
    if (!form.opinion || form.opinion === previousDefault) {
      form.opinion = defaultOpinion(result)
    }
  }
)
</script>

<template>
  <a-modal :open="open" width="760px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / {{ dialogTitle }}</div>
          <strong>{{ dialogTitle }}</strong>
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
          <a-tag class="tag orange">待判定</a-tag>
        </div>
        <div class="info-grid">
          <div><span>计量编号</span><strong>{{ displayValue(task?.deviceCode) }}</strong></div>
          <div><span>设备名称</span><strong>{{ displayValue(task?.deviceName) }}</strong></div>
          <div><span>规格型号</span><strong>{{ displayValue(task?.modelSpec) }}</strong></div>
          <div><span>使用部门</span><strong>{{ displayValue(task?.deptName) }}</strong></div>
          <div><span>当前角色</span><strong>{{ displayValue(judgementDisplay?.roleName) }}</strong></div>
          <div><span>判定轮次</span><strong>第{{ judgementDisplay?.round }}次</strong></div>
        </div>
      </section>

      <PeriodicJudgementHistory :records="task?.judgementRecords" />

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
