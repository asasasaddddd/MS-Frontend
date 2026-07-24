<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { confirmCategoryFirstCheck } from '@/api/firstcheck'
import { listUsersByDeptAndRole, type SysUserVO } from '@/api/system'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import { useSessionStore } from '@/stores/session'
import type { FirstCheckOrder, ManageCategory } from '@/types/firstcheck'
import { latestFirstCheckReturnFeedback } from '@/views/firstcheck/firstCheckReturnModel'

const props = defineProps<{
  open: boolean
  order?: FirstCheckOrder
  taskId?: string | number
  taskRowVersion?: number
  allowedActions: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const session = useSessionStore()
const submitting = ref(false)
const loadingUsers = ref(false)
const engineers = ref<SysUserVO[]>([])
const engineerDeptName = ref('')

const form = reactive({
  isWithReport: undefined as number | undefined,
  requestedCategory: undefined as ManageCategory | undefined,
  usageScenario: '',
  reportFileId: undefined as number | undefined,
  responsibleEngineerId: undefined as string | undefined,
  opinion: '设备信息核对无误，同意进入首检流程'
})

const engineerOptions = computed(() =>
  engineers.value.map((user) => ({
    label: `${user.employeeName || user.employeeId} / ${user.employeeId}`,
    value: user.employeeId
  }))
)

const returnFeedback = computed(() => latestFirstCheckReturnFeedback(props.order?.history))

const canSubmit = computed(() => Boolean(
  props.order && props.taskId !== undefined && props.taskRowVersion !== undefined &&
  (props.allowedActions.includes('SUBMIT') || props.allowedActions.includes('RESUBMIT')) &&
  form.isWithReport !== undefined && form.requestedCategory && form.responsibleEngineerId
))

function close() {
  emit('update:open', false)
}

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function normalizeDate(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 16)
}

function resolveDeptId(order?: FirstCheckOrder) {
  return order?.applyDeptId || session.user?.deptId || ''
}

async function loadEngineerUsers(order?: FirstCheckOrder) {
  const deptId = resolveDeptId(order)
  engineerDeptName.value = order?.applyDeptName || session.user?.deptName || ''

  if (!deptId) {
    engineers.value = []
    form.responsibleEngineerId = undefined
    return
  }

  loadingUsers.value = true
  try {
    const users = await listUsersByDeptAndRole(deptId, 'RESPONSIBLE_ENGINEER')
    engineers.value = users
    if (form.responsibleEngineerId && !users.some((user) => user.employeeId === form.responsibleEngineerId)) {
      form.responsibleEngineerId = undefined
    }
  } catch (error) {
    engineers.value = []
    form.responsibleEngineerId = undefined
    message.warning(error instanceof Error ? error.message : '责任工程师列表加载失败')
  } finally {
    loadingUsers.value = false
  }
}

function resetForm(order?: FirstCheckOrder) {
  form.isWithReport = order?.isWithReport ?? undefined
  form.requestedCategory = order?.requestedCategory
  form.usageScenario = order?.usageScenario || ''
  form.reportFileId = order?.reportFileId
  form.responsibleEngineerId = order?.responsibleEngineerId
  form.opinion = '设备信息核对无误，同意进入首检流程'
}

function saveDraft() {
  message.success('已保留当前填写内容')
}

async function submit() {
  const order = props.order
  if (!order) return
  if (form.isWithReport === undefined) {
    message.warning('请选择是否带报告')
    return
  }
  if (!form.requestedCategory) {
    message.warning('请选择设备分类')
    return
  }
  if (!form.responsibleEngineerId) {
    message.warning('请选择责任工程师')
    return
  }
  if (props.taskId === undefined || props.taskRowVersion === undefined) {
    message.warning('任务上下文已失效，请刷新待办后重试')
    return
  }
  if (!props.allowedActions.includes('SUBMIT') && !props.allowedActions.includes('RESUBMIT')) {
    message.warning('当前任务已流转，请刷新待办')
    return
  }

  const engineer = engineers.value.find((user) => user.employeeId === form.responsibleEngineerId)

  submitting.value = true
  try {
    await confirmCategoryFirstCheck({
      orderId: order.id,
      taskId: props.taskId,
      taskRowVersion: props.taskRowVersion,
      isWithReport: form.isWithReport,
      reportFileId: form.reportFileId,
      usageScenario: form.usageScenario.trim() || undefined,
      requestedCategory: form.requestedCategory,
      measureManagerId: session.user?.employeeId,
      measureManagerName: session.user?.employeeName,
      responsibleEngineerId: form.responsibleEngineerId,
      responsibleEngineerName: engineer?.employeeName || form.responsibleEngineerId,
      opinion: form.opinion
    })
    message.success('首检分类已提交，流程已流转到主管领导')
    emit('success')
    close()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '分类提交失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    resetForm(props.order)
    await loadEngineerUsers(props.order)
  }
)
</script>

<template>
  <a-modal
    :open="open"
    class="firstcheck-category-dialog"
    width="1120px"
    :footer="null"
    :destroy-on-close="true"
    @cancel="close"
  >
    <template #title>
      <div>
        <div class="dialog-breadcrumb">首页 / 待办事项 / 首次检定 / {{ display(order?.orderNo) }}</div>
        <strong>{{ returnFeedback ? '首检分类修订' : '首检设备分类' }}</strong>
      </div>
    </template>

    <div class="form-page">
      <a-alert
        v-if="returnFeedback"
        class="return-feedback"
        type="warning"
        show-icon
        message="最近退回意见"
      >
        <template #description>
          <div class="return-feedback-grid">
            <div><span>退回人</span><strong>{{ display(returnFeedback.operatorName) }} · {{ display(returnFeedback.operatorId) }}</strong></div>
            <div><span>退回节点</span><strong>{{ display(returnFeedback.nodeName) }}</strong></div>
            <div><span>退回时间</span><strong>{{ normalizeDate(returnFeedback.operatedAt) }}</strong></div>
            <div class="full"><span>审批意见</span><strong>{{ display(returnFeedback.opinion) }}</strong></div>
          </div>
        </template>
      </a-alert>

      <section class="panel">
        <div class="panel-header">
          <h2>基本信息</h2>
          <a-tag class="tag blue">编号 {{ display(order?.orderNo) }}</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>采购订单编号</span><a-input :value="display(order?.purchaseOrderNo)" readonly /></label>
          <label><span>物料编号</span><a-input :value="display(order?.materialCode)" readonly /></label>
          <label><span>物料描述</span><a-input :value="display(order?.materialName)" readonly /></label>
          <label><span>数量</span><a-input :value="`${display(order?.quantity)} 台`" readonly /></label>
          <label><span>使用部门</span><a-input :value="display(order?.applyDeptName)" readonly /></label>
          <label><span>供应商名称</span><a-input :value="display(order?.supplierName)" readonly /></label>
          <label>
            <span>附件</span>
            <AttachmentListButton :group-id="order?.attachmentGroupId" title="供应商申请附件" />
          </label>
          <label><span>申请时间</span><a-input :value="normalizeDate(order?.applyTime)" readonly /></label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>设备分类</h2>
            <p>责任工程师仅从{{ engineerDeptName || '当前使用部门' }}中选择；主管领导由后端按使用部门自动匹配。</p>
          </div>
        </div>
        <div class="form-grid cols-4">
          <label>
            <span>是否带报告</span>
            <a-select
              v-model:value="form.isWithReport"
              placeholder="请选择"
              :options="[
                { label: '是', value: 1 },
                { label: '否', value: 0 }
              ]"
            />
          </label>
          <label>
            <span>设备分类</span>
            <a-select
              v-model:value="form.requestedCategory"
              placeholder="请选择"
              :options="[
                { label: 'A类', value: 'A类' },
                { label: 'B类', value: 'B类' },
                { label: 'C类', value: 'C类' }
              ]"
            />
          </label>
          <label class="span-2">
            <span>责任工程师</span>
            <a-select
              v-model:value="form.responsibleEngineerId"
              placeholder="请选择本部门责任工程师"
              :loading="loadingUsers"
              :options="engineerOptions"
              show-search
              option-filter-prop="label"
            />
          </label>
          <label class="span-2">
            <span>使用场景</span>
            <a-textarea v-model:value="form.usageScenario" placeholder="填写设备使用场景描述" :rows="3" />
          </label>
          <label class="span-2">
            <span>审批意见</span>
            <a-textarea v-model:value="form.opinion" :rows="3" />
          </label>
        </div>
      </section>

      <div class="dialog-actions">
        <a-button @click="saveDraft">保存</a-button>
        <a-button type="primary" :loading="submitting" :disabled="!canSubmit" @click="submit">
          {{ returnFeedback ? '重新提交' : '提交' }}
        </a-button>
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

.form-page {
  display: grid;
  gap: 16px;
  padding-top: 4px;
}

.return-feedback {
  border: 1px solid #f5c86b;
  background: #fffaf0;
}

.return-feedback-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px 18px;
}

.return-feedback-grid > div {
  min-width: 0;
  display: grid;
  gap: 4px;
}

.return-feedback-grid span {
  color: #8a6116;
  font-size: 12px;
}

.return-feedback-grid strong {
  color: #533b12;
  font-size: 13px;
  overflow-wrap: anywhere;
}

.return-feedback-grid .full {
  grid-column: 1 / -1;
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

.panel p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 12px;
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
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 980px) {
  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }

  .return-feedback-grid {
    grid-template-columns: 1fr;
  }

  .return-feedback-grid .full {
    grid-column: auto;
  }
}
</style>
