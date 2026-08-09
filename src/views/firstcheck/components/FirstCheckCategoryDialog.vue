<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { confirmCategoryFirstCheck } from '@/api/firstcheck'
import { previewTaskCandidates } from '@/api/nodePermission'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import { useSessionStore } from '@/stores/session'
import type { AttachmentId, FirstCheckOrder, ManageCategory } from '@/types/firstcheck'
import type { EntityId, RowVersion } from '@/types/common'
import type { RoleScopeType, TaskCandidatePreviewQuery, TaskCandidateVO } from '@/types/nodePermission'
import { latestFirstCheckReturnFeedback } from '@/views/firstcheck/firstCheckReturnModel'

const props = defineProps<{
  open: boolean
  order?: FirstCheckOrder
  taskId?: EntityId
  taskRowVersion?: RowVersion
  allowedActions: string[]
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const session = useSessionStore()
const submitting = ref(false)
const loadingUsers = ref(false)
const engineers = ref<TaskCandidateVO[]>([])
const responsibilityOrgName = ref('')
let engineerRequestSerial = 0
let submitRequestSerial = 0

const form = reactive({
  isWithReport: undefined as number | undefined,
  requestedCategory: undefined as ManageCategory | undefined,
  usageScenario: '',
  reportFileId: undefined as AttachmentId | undefined,
  responsibleEngineerId: undefined as string | undefined,
  opinion: '设备信息核对无误，同意进入首检流程'
})

const engineerOptions = computed(() =>
  engineers.value.map((user) => ({
    label: `${user.userName || user.userId} / ${user.userId}`,
    value: user.userId
  }))
)

const returnFeedback = computed(() => latestFirstCheckReturnFeedback(props.order?.history))

const canSubmit = computed(() => Boolean(
  props.order && props.taskId !== undefined && props.taskRowVersion !== undefined &&
  (props.allowedActions.includes('SUBMIT') || props.allowedActions.includes('RESUBMIT')) &&
  !loadingUsers.value && form.isWithReport !== undefined && form.requestedCategory &&
  form.responsibleEngineerId &&
  engineers.value.some((user) => user.userId === form.responsibleEngineerId)
))

function close() {
  invalidateSubmitRequest()
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

interface ResponsibilityOrganization {
  orgId: string
  orgName: string
  orgType: RoleScopeType
}

interface SubmitRequestIdentity {
  serial: number
  orderId: FirstCheckOrder['id']
  taskId: EntityId
  taskRowVersion: RowVersion
}

function invalidateSubmitRequest() {
  submitRequestSerial += 1
  submitting.value = false
}

function isCurrentSubmitRequest(request: SubmitRequestIdentity) {
  return props.open &&
    request.serial === submitRequestSerial &&
    props.order?.id === request.orderId &&
    props.taskId === request.taskId
}

function resolveResponsibilityOrganization(order?: FirstCheckOrder): ResponsibilityOrganization | null {
  if (
    order?.responsibilityOrgId &&
    (order.responsibilityOrgType === 'DEPARTMENT' || order.responsibilityOrgType === 'GROUP')
  ) {
    return {
      orgId: order.responsibilityOrgId,
      orgName: order.responsibilityOrgName || order.responsibilityOrgId,
      orgType: order.responsibilityOrgType
    }
  }

  if (!order?.applyDeptId) return null
  return {
    orgId: order.applyDeptId,
    orgName: order.applyDeptName || order.applyDeptId,
    orgType: 'DEPARTMENT'
  }
}

async function loadEngineerUsers(order?: FirstCheckOrder) {
  const requestSerial = ++engineerRequestSerial
  const responsibilityOrg = resolveResponsibilityOrganization(order)
  responsibilityOrgName.value = responsibilityOrg?.orgName || ''
  engineers.value = []
  form.responsibleEngineerId = undefined

  if (!responsibilityOrg) {
    loadingUsers.value = false
    message.warning('责任部门/组信息不完整，无法解析责任工程师候选')
    return
  }

  loadingUsers.value = true
  try {
    const candidateContext = {
      businessType: 'FIRST_CHECK',
      nodeCode: 'engineer_route',
      operationCode: 'SUBMIT_RETURN',
      permissionCode: 'first_check.main.engineer_route.submit_return',
      requiredRoleCode: 'RESPONSIBLE_ENGINEER'
    }
    const query: TaskCandidatePreviewQuery = responsibilityOrg.orgType === 'GROUP'
      ? {
          ...candidateContext,
          scopeType: responsibilityOrg.orgType,
          scopeOrgId: responsibilityOrg.orgId,
          audienceMode: 'EXACT'
        }
      : {
          ...candidateContext,
          scopeType: responsibilityOrg.orgType,
          scopeOrgId: responsibilityOrg.orgId,
          audienceMode: 'SUBTREE'
        }
    const users = await previewTaskCandidates(query)
    if (requestSerial !== engineerRequestSerial) return
    engineers.value = users
    if (!users.length) {
      form.responsibleEngineerId = undefined
      message.warning(`${responsibilityOrg.orgName}暂无可选责任工程师`)
      return
    }
  } catch (error) {
    if (requestSerial !== engineerRequestSerial) return
    engineers.value = []
    form.responsibleEngineerId = undefined
    message.error(error instanceof Error ? error.message : '责任工程师列表加载失败')
  } finally {
    if (requestSerial === engineerRequestSerial) loadingUsers.value = false
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

  const engineer = engineers.value.find((user) => user.userId === form.responsibleEngineerId)
  if (!engineer) {
    message.warning('所选责任工程师已不在当前候选范围，请重新选择')
    return
  }

  const request = {
    serial: ++submitRequestSerial,
    orderId: order.id,
    taskId: props.taskId,
    taskRowVersion: props.taskRowVersion
  }
  submitting.value = true
  try {
    await confirmCategoryFirstCheck({
      orderId: request.orderId,
      taskId: request.taskId,
      taskRowVersion: request.taskRowVersion,
      isWithReport: form.isWithReport,
      reportFileId: form.reportFileId,
      usageScenario: form.usageScenario.trim() || undefined,
      requestedCategory: form.requestedCategory,
      measureManagerId: session.user?.employeeId,
      measureManagerName: session.user?.employeeName,
      responsibleEngineerId: engineer.userId,
      responsibleEngineerName: engineer.userName || engineer.userId,
      opinion: form.opinion
    })
    if (!isCurrentSubmitRequest(request)) return
    message.success('首检分类已提交，流程已流转到主管领导')
    emit('success')
    close()
  } catch (error) {
    if (!isCurrentSubmitRequest(request)) return
    message.error(error instanceof Error ? error.message : '分类提交失败')
  } finally {
    if (isCurrentSubmitRequest(request)) submitting.value = false
  }
}

watch(
  () => [
    props.open,
    props.order?.id,
    props.taskId,
    props.taskRowVersion,
    props.order?.responsibilityOrgId,
    props.order?.responsibilityOrgType,
    props.order?.applyDeptId
  ] as const,
  async ([open]) => {
    invalidateSubmitRequest()
    if (!open) {
      engineerRequestSerial += 1
      loadingUsers.value = false
      return
    }
    resetForm(props.order)
    await loadEngineerUsers(props.order)
  },
  { immediate: true }
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
          <label><span>责任部门/组</span><a-input :value="display(order?.responsibilityOrgName || order?.applyDeptName)" readonly /></label>
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
            <p>
              责任工程师按{{ responsibilityOrgName || '当前责任部门/组' }}的授权范围解析，人员主组可不同；
              主管领导由后端按责任组织自动匹配。
            </p>
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
              placeholder="请选择责任部门/组授权范围内的责任工程师"
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
