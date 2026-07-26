<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { listUsersByDeptAndRole, type SysUserVO } from '../../../api/system'
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
const responsibleEngineers = ref<SysUserVO[]>([])
const loadingEngineers = ref(false)
const engineerSelectOpen = ref(false)
const engineerSelectRef = ref<{ focus?: () => void } | null>(null)

const form = reactive({
  verificationTime: '',
  newValidUntil: '',
  result: 'qualified' as PeriodicVerificationResult,
  nonconformingDisposal: undefined as 'repair' | 'scrap' | undefined,
  responsibleEngineerId: undefined as string | undefined,
  opinion: ''
})

const engineerOptions = computed(() =>
  responsibleEngineers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId}（${user.employeeId}）`,
    value: user.employeeId
  }))
)

const selectedEngineer = computed(() =>
  responsibleEngineers.value.find((user) => user.employeeId === form.responsibleEngineerId)
)

const verifierDisplay = computed(() => {
  const id = props.task?.assignedVerifierId
  const name = props.task?.assignedVerifierName
  if (id && name) return `${id}（${name}）`
  return displayValue(id || name)
})

const verificationMethodDisplay = computed(() => {
  const value = String(props.task?.verificationMethod || '').toLowerCase()
  if (['self', 'self_check', 'internal'].includes(value)) return '自检'
  if (['send_out', 'external', 'external_commission'].includes(value)) return '外委'
  return displayValue(props.task?.verificationMethod)
})

const canSubmit = computed(() => {
  if (!props.task || !form.verificationTime) return false
  if (form.result !== 'unqualified') return true
  return Boolean(form.nonconformingDisposal && form.responsibleEngineerId)
})

function today() {
  const date = new Date()
  return formatLocalDate(date)
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calculateValidUntil(verificationDate: string, cycleMonth?: number) {
  if (!verificationDate || !cycleMonth) return ''
  const [year, month, day] = verificationDate.split('-').map(Number)
  if (!year || !month || !day) return ''
  const date = new Date(year, month - 1, day)
  date.setDate(1)
  date.setMonth(date.getMonth() + cycleMonth)
  const lastDayOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  date.setDate(Math.min(day, lastDayOfTargetMonth))
  date.setDate(date.getDate() - 1)
  return formatLocalDate(date)
}

function syncValidUntil() {
  form.newValidUntil = calculateValidUntil(form.verificationTime, props.task?.verificationCycleMonth)
}

function close() {
  emit('update:open', false)
}

function openEngineerDirectory() {
  if (form.result !== 'unqualified') return
  engineerSelectOpen.value = true
  nextTick(() => engineerSelectRef.value?.focus?.())
}

async function loadResponsibleEngineers() {
  responsibleEngineers.value = []
  const task = props.task
  if (!task) return
  loadingEngineers.value = true
  try {
    const users = task.deptId
      ? await listUsersByDeptAndRole(task.deptId, 'RESPONSIBLE_ENGINEER')
      : []
    const boundEngineer = task.responsibleEngineerId
      ? {
          employeeId: task.responsibleEngineerId,
          employeeName: task.responsibleEngineerName,
          deptId: task.deptId,
          deptName: task.deptName
        }
      : undefined
    responsibleEngineers.value = boundEngineer && !users.some((user) => user.employeeId === boundEngineer.employeeId)
      ? [boundEngineer, ...users]
      : users
  } catch {
    responsibleEngineers.value = []
  } finally {
    loadingEngineers.value = false
  }
}

function submit() {
  if (!props.task || !canSubmit.value) return
  if (props.task.workflowTaskId === undefined || props.task.rowVersion === undefined) {
    message.warning('工作流任务上下文已失效，请刷新待办')
    return
  }
  const unqualified = form.result === 'unqualified'
  const disposal = unqualified ? form.nonconformingDisposal : undefined
  const engineer = unqualified ? selectedEngineer.value : undefined
  emit('submit', {
    periodicTaskId: props.task.id,
    taskId: props.task.workflowTaskId,
    rowVersion: props.task.rowVersion,
    verificationTime: form.verificationTime,
    newValidUntil: form.newValidUntil || undefined,
    result: form.result,
    conclusion: form.opinion || (unqualified ? '检定不合格' : '检定合格'),
    opinion: form.opinion,
    certificateAttachmentGroupId: certificateAttachmentGroupId.value,
    nonconformingDisposal: disposal,
    repairUserId: disposal === 'repair' ? engineer?.employeeId : undefined,
    repairUserName: disposal === 'repair' ? engineer?.employeeName : undefined,
    scrapEngineerId: disposal === 'scrap' ? engineer?.employeeId : undefined,
    scrapEngineerName: disposal === 'scrap' ? engineer?.employeeName : undefined
  })
}

watch(
  () => form.verificationTime,
  () => syncValidUntil()
)

watch(
  () => form.result,
  (result) => {
    if (result === 'unqualified') return
    form.nonconformingDisposal = undefined
    form.responsibleEngineerId = undefined
  }
)

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    certificateAttachmentGroupId.value = undefined
    form.verificationTime = today()
    form.newValidUntil = calculateValidUntil(form.verificationTime, props.task?.verificationCycleMonth)
    form.result = 'qualified'
    form.nonconformingDisposal = undefined
    form.responsibleEngineerId = props.task?.responsibleEngineerId
    form.opinion = ''
    engineerSelectOpen.value = false
    await loadResponsibleEngineers()
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
          <strong>测量设备填写检定信息</strong>
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
          <label><span>检定人</span><a-input :value="verifierDisplay" readonly /></label>
          <label><span>检定时间</span><a-input v-model:value="form.verificationTime" type="date" /></label>
          <label><span>新有效期</span><a-input v-model:value="form.newValidUntil" type="date" /></label>
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
          <label>
            <span>不合格处理方式</span>
            <a-select
              v-model:value="form.nonconformingDisposal"
              :disabled="form.result !== 'unqualified'"
              placeholder="请选择"
              :options="[
                { label: '报废', value: 'scrap' },
                { label: '维修', value: 'repair' }
              ]"
            />
          </label>
          <label>
            <span>责任工程师</span>
            <div class="inline-row">
              <a-select
                ref="engineerSelectRef"
                v-model:value="form.responsibleEngineerId"
                v-model:open="engineerSelectOpen"
                :disabled="form.result !== 'unqualified'"
                :loading="loadingEngineers"
                :options="engineerOptions"
                placeholder="请选择"
                show-search
                option-filter-prop="label"
              />
              <a-button :disabled="form.result !== 'unqualified'" @click="openEngineerDirectory">数据目录</a-button>
            </div>
          </label>
          <label class="span-4"><span>检定意见</span><a-textarea v-model:value="form.opinion" :rows="3" placeholder="填写检定意见" /></label>
          <label>
            <span>上传附件</span>
            <div class="attachment-actions">
              <AttachmentUploadButton
                v-model="certificateAttachmentGroupId"
                business-type="PERIODIC_CERTIFICATE"
                :business-id="task?.id"
                remark="周检检定附件"
                button-text="上传文件"
                size="small"
              />
              <AttachmentListButton
                :group-id="certificateAttachmentGroupId"
                button-text="查看已上传"
                title="周检检定附件"
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
.inline-row,
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
.inline-row,
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

.inline-row {
  width: 100%;
}

.inline-row :deep(.ant-select) {
  min-width: 0;
  flex: 1;
}

.readonly-area :deep(.ant-input),
.readonly-area :deep(.ant-select-disabled .ant-select-selector),
.form-grid :deep(.ant-input[readonly]) {
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
