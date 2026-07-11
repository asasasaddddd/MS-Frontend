<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import AttachmentListButton from '../../../components/AttachmentListButton.vue'
import AttachmentUploadButton from '../../../components/AttachmentUploadButton.vue'
import { displayValue } from '../periodicDisplayModel'
import type { EntityId, PeriodicTaskVO, PeriodicVerificationRecordRequest, PeriodicVerificationResult } from '../../../types/periodic'

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
  submit: [payload: PeriodicVerificationRecordRequest]
}>()

const certificateAttachmentGroupId = ref<EntityId>()
const form = reactive({
  reportNo: '',
  verificationTime: '',
  verificationUnit: '',
  result: 'qualified' as PeriodicVerificationResult,
  conclusion: '检定合格',
  newValidUntil: '',
  forceValidUntil: false,
  environmentTemp: '',
  environmentHumidity: '',
  nonconformingDisposal: undefined as string | undefined,
  confirmationRequired: false,
  opinion: '自检检定信息已填写'
})

function today() {
  return new Date().toISOString().slice(0, 10)
}

function nextYearMinusOneDay() {
  const date = new Date()
  date.setFullYear(date.getFullYear() + 1)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

function close() {
  emit('update:open', false)
}

function submit() {
  if (!props.task) return
  emit('submit', {
    taskId: props.task.id,
    reportNo: form.reportNo || undefined,
    verificationTime: form.verificationTime,
    verificationUnit: form.verificationUnit || undefined,
    result: form.result,
    conclusion: form.conclusion,
    opinion: form.opinion,
    newValidUntil: form.newValidUntil || undefined,
    forceValidUntil: form.forceValidUntil,
    environmentTemp: form.environmentTemp || undefined,
    environmentHumidity: form.environmentHumidity || undefined,
    certificateAttachmentGroupId: certificateAttachmentGroupId.value,
    nonconformingDisposal: form.result === 'qualified' ? undefined : form.nonconformingDisposal,
    confirmationRequired: form.confirmationRequired
  })
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    certificateAttachmentGroupId.value = undefined
    form.reportNo = ''
    form.verificationTime = today()
    form.verificationUnit = ''
    form.result = 'qualified'
    form.conclusion = '检定合格'
    form.newValidUntil = props.task?.newValidUntil || nextYearMinusOneDay()
    form.forceValidUntil = false
    form.environmentTemp = ''
    form.environmentHumidity = ''
    form.nonconformingDisposal = undefined
    form.confirmationRequired = false
    form.opinion = '自检检定信息已填写'
  }
)
</script>

<template>
  <a-modal :open="open" width="95vw" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 周检检定信息</div>
          <strong>自检及外委通用检定信息</strong>
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
          <a-tag class="tag blue">{{ displayValue(task?.currentNodeName || task?.currentNode) }}</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>计量编号</span><a-input :value="displayValue(task?.deviceCode)" readonly /></label>
          <label><span>设备名称</span><a-input :value="displayValue(task?.deviceName)" readonly /></label>
          <label><span>规格型号</span><a-input :value="displayValue(task?.modelSpec)" readonly /></label>
          <label><span>出厂编号</span><a-input :value="displayValue(task?.factoryCode)" readonly /></label>
          <label><span>使用部门</span><a-input :value="displayValue(task?.deptName)" readonly /></label>
          <label><span>管理类别</span><a-input :value="displayValue(task?.manageCategory)" readonly /></label>
          <label><span>有效期</span><a-input :value="displayValue(task?.validUntil)" readonly /></label>
          <label><span>是否通用</span><a-input :value="task?.isCommon === 1 ? '是' : task?.isCommon === 0 ? '否' : '-'" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>检定信息</h2>
          <a-tag class="tag orange">待填写</a-tag>
        </div>
        <div class="form-grid cols-4">
          <label><span>报告编号</span><a-input v-model:value="form.reportNo" placeholder="填写报告编号" /></label>
          <label><span>检定日期</span><a-input v-model:value="form.verificationTime" type="date" /></label>
          <label><span>检定单位</span><a-input v-model:value="form.verificationUnit" placeholder="填写检定单位" /></label>
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
          <label><span>新有效期</span><a-input v-model:value="form.newValidUntil" type="date" /></label>
          <label>
            <span>强制使用新有效期</span>
            <a-switch v-model:checked="form.forceValidUntil" checked-children="是" un-checked-children="否" />
          </label>
          <label><span>环境温度</span><a-input v-model:value="form.environmentTemp" placeholder="例如 23℃" /></label>
          <label><span>环境湿度</span><a-input v-model:value="form.environmentHumidity" placeholder="例如 45%" /></label>
          <label class="span-2"><span>检定结论</span><a-textarea v-model:value="form.conclusion" :rows="3" /></label>
          <label>
            <span>不合格处理方式</span>
            <a-select
              v-model:value="form.nonconformingDisposal"
              :disabled="form.result === 'qualified'"
              placeholder="不合格时选择"
              :options="[
                { label: '维修', value: 'repair' },
                { label: '报废', value: 'scrap' }
              ]"
            />
          </label>
          <label>
            <span>是否需要确认员</span>
            <a-switch v-model:checked="form.confirmationRequired" checked-children="是" un-checked-children="否" />
          </label>
          <label class="span-2">
            <span>检定证书/报告附件</span>
            <div class="attachment-actions">
              <AttachmentUploadButton
                v-model="certificateAttachmentGroupId"
                business-type="PERIODIC_CERTIFICATE"
                :business-id="task?.id"
                remark="周检检定证书附件"
                button-text="上传检定证书"
                size="small"
              />
              <AttachmentListButton
                :group-id="certificateAttachmentGroupId"
                button-text="查看已上传"
                title="周检检定证书附件"
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

  .span-2 {
    grid-column: span 1;
  }
}
</style>
