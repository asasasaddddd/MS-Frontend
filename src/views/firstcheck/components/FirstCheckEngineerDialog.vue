<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { engineerConfirmTypeFirstCheck, engineerReturnFirstCheck } from '@/api/firstcheck'
import { listUsersByDeptAndRole, type SysUserVO } from '@/api/system'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import type { FirstCheckOrder, VerificationType } from '@/types/firstcheck'

const props = defineProps<{
  open: boolean
  order?: FirstCheckOrder
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const submitting = ref(false)
const loadingUsers = ref(false)
const selfVerifiers = ref<SysUserVO[]>([])
const externalVerifiers = ref<SysUserVO[]>([])
const externalOperators = ref<SysUserVO[]>([])

const form = reactive({
  verificationType: 'self_check' as VerificationType,
  isCommon: 1,
  selfVerifierId: undefined as string | undefined,
  externalVerifierId: undefined as string | undefined,
  externalOperatorId: undefined as string | undefined,
  opinion: ''
})

const selfVerifierOptions = computed(() => toOptions(selfVerifiers.value))
const externalVerifierOptions = computed(() => toOptions(externalVerifiers.value))
const externalOperatorOptions = computed(() => toOptions(externalOperators.value))

function toOptions(users: SysUserVO[]) {
  return users.map((user) => ({
    label: `${user.employeeName || user.employeeId} · ${user.employeeId}`,
    value: user.employeeId
  }))
}

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

async function loadRoleUsers(deptId?: string) {
  if (!deptId) return
  loadingUsers.value = true
  try {
    const [selfList, externalList, operatorList] = await Promise.all([
      listUsersByDeptAndRole(deptId, 'VERIFIER_SELF'),
      listUsersByDeptAndRole(deptId, 'VERIFIER_EXTERNAL'),
      listUsersByDeptAndRole(deptId, 'EXTERNAL_OPERATOR')
    ])
    selfVerifiers.value = selfList
    externalVerifiers.value = externalList
    externalOperators.value = operatorList
  } catch (error) {
    message.warning(error instanceof Error ? error.message : '检定员列表加载失败')
  } finally {
    loadingUsers.value = false
  }
}

function resetForm(order?: FirstCheckOrder) {
  form.verificationType = order?.verificationType || 'self_check'
  form.isCommon = order?.isCommon ?? 1
  form.selfVerifierId = order?.verifierId
  form.externalVerifierId = order?.externalVerifierId
  form.externalOperatorId = order?.externalOperatorId
  form.opinion = ''
}

async function submit() {
  const order = props.order
  if (!order) return
  if (form.verificationType === 'self_check' && !form.selfVerifierId) {
    message.warning('请选择自检检定员')
    return
  }
  if (form.verificationType === 'external_commission' && (!form.externalVerifierId || !form.externalOperatorId)) {
    message.warning('外委时必须选择外委检定员和外扩人员')
    return
  }

  const selfVerifier = selfVerifiers.value.find((user) => user.employeeId === form.selfVerifierId)
  const externalVerifier = externalVerifiers.value.find((user) => user.employeeId === form.externalVerifierId)
  const externalOperator = externalOperators.value.find((user) => user.employeeId === form.externalOperatorId)

  submitting.value = true
  try {
    await engineerConfirmTypeFirstCheck({
      orderId: order.id,
      verificationType: form.verificationType,
      isCommon: form.isCommon,
      selfVerifierId: form.verificationType === 'self_check' ? form.selfVerifierId : undefined,
      selfVerifierName: form.verificationType === 'self_check' ? selfVerifier?.employeeName : undefined,
      externalVerifierId: form.verificationType === 'external_commission' ? form.externalVerifierId : undefined,
      externalVerifierName: form.verificationType === 'external_commission' ? externalVerifier?.employeeName : undefined,
      externalOperatorId: form.verificationType === 'external_commission' ? form.externalOperatorId : undefined,
      externalOperatorName: form.verificationType === 'external_commission' ? externalOperator?.employeeName : undefined,
      opinion: form.opinion || '计量属性确认通过'
    })
    message.success('计量属性已提交，流程已流转到检定员接收')
    emit('success')
    close()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '计量属性提交失败')
  } finally {
    submitting.value = false
  }
}

function returnOrder() {
  const order = props.order
  if (!order) return
  if (!form.opinion.trim()) {
    message.warning('请输入退回意见')
    return
  }
  Modal.confirm({
    title: '确认退回计量管理员修改？',
    content: '退回后业务不会终止，管理员修订后将重新经过主管领导和责任工程师审批。',
    okText: '退回修改',
    okButtonProps: { danger: true },
    cancelText: '取消',
    async onOk() {
      submitting.value = true
      try {
        await engineerReturnFirstCheck({
          orderId: order.id,
          opinion: form.opinion.trim()
        })
        message.success('已退回计量管理员修改')
        emit('success')
        close()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '责任工程师退回失败')
        throw error
      } finally {
        submitting.value = false
      }
    }
  })
}

watch(
  () => props.open,
  async (open) => {
    if (!open) return
    resetForm(props.order)
    await loadRoleUsers(props.order?.applyDeptId)
  }
)
</script>

<template>
  <a-modal :open="open" width="680px" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="modal-header-line">
        <h1>填写计量属性</h1>
        <a-tag class="tag blue">编号 {{ display(order?.orderNo) }}</a-tag>
      </div>
    </template>

    <div class="engineer-modal-body">
      <section class="panel">
        <div class="panel-header">
          <h2>基本信息</h2>
          <div class="panel-actions">
            <a-button @click="close">返回</a-button>
            <a-button danger :disabled="submitting" @click="returnOrder">退回修改</a-button>
            <a-button type="primary" :loading="submitting" @click="submit">提交</a-button>
          </div>
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
          <label><span>设备分类</span><a-input :value="display(order?.requestedCategory)" readonly /></label>
          <label class="span-2"><span>使用场景</span><a-input :value="display(order?.usageScenario)" readonly /></label>
        </div>
      </section>

      <section class="panel section-gap">
        <div class="panel-header">
          <h2>计量属性</h2>
        </div>
        <div class="form-grid cols-4">
          <label>
            <span>检定方式</span>
            <a-select
              v-model:value="form.verificationType"
              :options="[
                { label: '自检', value: 'self_check' },
                { label: '外委', value: 'external_commission' }
              ]"
            />
          </label>
          <label>
            <span>通用设备</span>
            <a-select
              v-model:value="form.isCommon"
              :options="[
                { label: '是', value: 1 },
                { label: '否', value: 0 }
              ]"
            />
          </label>
          <label v-if="form.verificationType === 'self_check'">
            <span>检定员</span>
            <a-select
              v-model:value="form.selfVerifierId"
              :loading="loadingUsers"
              :options="selfVerifierOptions"
              placeholder="请选择"
              show-search
              option-filter-prop="label"
            />
          </label>
          <label v-else>
            <span>外委检定员</span>
            <a-select
              v-model:value="form.externalVerifierId"
              :loading="loadingUsers"
              :options="externalVerifierOptions"
              placeholder="请选择"
              show-search
              option-filter-prop="label"
            />
          </label>
          <label v-if="form.verificationType === 'external_commission'">
            <span>外扩人员</span>
            <a-select
              v-model:value="form.externalOperatorId"
              :loading="loadingUsers"
              :options="externalOperatorOptions"
              placeholder="请选择"
              show-search
              option-filter-prop="label"
            />
          </label>
        </div>
      </section>

      <section class="comment-area section-gap">
        <label>审批意见</label>
        <a-textarea v-model:value="form.opinion" placeholder="请输入审批意见（选填）" :rows="3" />
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.modal-header-line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-header-line h1 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

.engineer-modal-body {
  display: grid;
  gap: 16px;
}

.panel {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
  overflow: hidden;
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

.panel-header h2 {
  margin: 0;
  color: #172033;
  font-size: 14px;
}

.panel-actions {
  display: flex;
  gap: 8px;
}

.form-grid {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.form-grid.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-grid span,
.comment-area label {
  color: #344054;
  font-size: 13px;
  font-weight: 500;
}

.span-2 {
  grid-column: span 2;
}

.section-gap {
  margin-top: 4px;
}

.comment-area {
  display: grid;
  gap: 6px;
}

.readonly-area :deep(.ant-input) {
  color: #344054;
  background: #f8fafc;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

@media (max-width: 980px) {
  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
