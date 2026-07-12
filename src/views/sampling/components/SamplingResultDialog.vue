<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import type { AttachmentId } from '@/api/attachment'
import type { SamplingResult, SamplingTaskVO, SamplingVerificationSubmitRequest } from '@/types/sampling'
import { display, formatDate } from '../samplingDisplayModel'

const props = withDefaults(
  defineProps<{
    open: boolean
    tasks: SamplingTaskVO[]
    result: SamplingResult
    title: string
    submitting?: boolean
  }>(),
  {
    submitting: false
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  submit: [payload: SamplingVerificationSubmitRequest]
}>()

const form = reactive({
  verificationDate: '',
  validUntil: '',
  attachmentGroupId: undefined as AttachmentId | undefined,
  nonconformingReason: '',
  disposalType: undefined as string | undefined,
  opinion: ''
})

const firstTask = computed(() => props.tasks[0])
const isQualified = computed(() => props.result === 'qualified')
const taskIds = computed(() => props.tasks.map((task) => task.id))

function close() {
  emit('update:open', false)
}

function resetForm() {
  const task = firstTask.value
  form.verificationDate = formatDate(task?.verificationDate) === '-' ? new Date().toISOString().slice(0, 10) : formatDate(task?.verificationDate)
  form.validUntil = formatDate(task?.validUntil) === '-' ? '' : formatDate(task?.validUntil)
  form.attachmentGroupId = task?.attachmentGroupId
  form.nonconformingReason = task?.nonconformingReason || ''
  form.disposalType = task?.disposalType
  form.opinion = isQualified.value ? '抽检合格' : '抽检不合格，提交处理'
}

function submit() {
  if (taskIds.value.length === 0) {
    message.warning('请选择抽检任务')
    return
  }
  if (!form.verificationDate) {
    message.warning('请填写检定日期')
    return
  }
  if (!isQualified.value && !form.nonconformingReason.trim()) {
    message.warning('请填写不合格原因')
    return
  }
  if (!isQualified.value && !form.disposalType) {
    message.warning('请选择处理方式')
    return
  }
  emit('submit', {
    taskIds: taskIds.value,
    result: props.result,
    verificationDate: form.verificationDate,
    validUntil: form.validUntil || undefined,
    attachmentGroupId: form.attachmentGroupId,
    nonconformingReason: isQualified.value ? undefined : form.nonconformingReason,
    disposalType: isQualified.value ? undefined : form.disposalType,
    opinion: form.opinion
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  }
)
</script>

<template>
  <a-modal :open="open" width="760px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div>
        <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / C类抽检</div>
        <strong>{{ title }}</strong>
      </div>
    </template>

    <div class="dialog-body">
      <section class="panel">
        <div class="panel-header">
          <h2>已选器具</h2>
          <a-tag class="tag orange">{{ tasks.length }} 项</a-tag>
        </div>
        <a-table
          :data-source="tasks"
          :pagination="false"
          :row-key="(row: SamplingTaskVO) => row.id"
          :scroll="{ y: 180 }"
          size="small"
        >
          <a-table-column title="计量编号" data-index="deviceCode" :width="150" />
          <a-table-column title="设备名称" data-index="deviceName" :width="150" />
          <a-table-column title="规格型号" data-index="modelSpec" :width="130" />
          <a-table-column title="使用部门" data-index="deptName" :width="150" />
        </a-table>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>{{ isQualified ? '检定信息' : '不合格处理' }}</h2>
        </div>
        <div class="form-grid cols-2">
          <label><span>检定日期 <b>*</b></span><a-input v-model:value="form.verificationDate" type="date" /></label>
          <label><span>新有效期</span><a-input v-model:value="form.validUntil" type="date" /></label>
          <label>
            <span>证书/记录附件</span>
            <div class="attachment-actions">
              <AttachmentUploadButton
                v-model="form.attachmentGroupId"
                business-type="SAMPLING"
                :business-id="firstTask?.id"
                button-text="上传文件"
                size="small"
              />
              <AttachmentListButton :group-id="form.attachmentGroupId" button-text="查看文件" title="抽检附件" size="small" />
            </div>
          </label>
          <label v-if="!isQualified" class="span-2">
            <span>不合格原因 <b>*</b></span>
            <a-textarea v-model:value="form.nonconformingReason" :rows="3" placeholder="请填写不合格原因及处理说明" />
          </label>
          <label v-if="!isQualified">
            <span>处理方式 <b>*</b></span>
            <a-select
              v-model:value="form.disposalType"
              placeholder="请选择"
              :options="[
                { label: '正常报废', value: 'scrap' },
                { label: '维修', value: 'repair' }
              ]"
            />
          </label>
          <label class="span-2">
            <span>处理意见</span>
            <a-textarea v-model:value="form.opinion" :rows="3" />
          </label>
        </div>
      </section>

      <div class="dialog-actions">
        <a-button @click="close">取消</a-button>
        <a-button type="primary" :loading="submitting" @click="submit">确认提交</a-button>
      </div>
    </div>
  </a-modal>
</template>

<style scoped>
.dialog-breadcrumb {
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 400;
}

.dialog-body {
  display: grid;
  gap: 16px;
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

.form-grid b {
  color: #d92d20;
  font-weight: 700;
}

.span-2 {
  grid-column: span 2;
}

.attachment-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tag {
  border-radius: 999px;
  font-weight: 600;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

@media (max-width: 760px) {
  .form-grid.cols-2 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
