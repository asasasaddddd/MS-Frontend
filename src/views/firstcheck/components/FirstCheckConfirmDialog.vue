<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { confirmerConfirmFirstCheck } from '@/api/firstcheck'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import type { ConfirmCheckRequest, FirstCheckOrder } from '@/types/firstcheck'

const props = defineProps<{
  open: boolean
  order?: FirstCheckOrder
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const submitting = ref(false)
const form = reactive({
  confirmResult: 'PASS' as ConfirmCheckRequest['confirmResult'],
  opinion: '检定结果符合要求，同意确认'
})

const isExternalNonCommonWithReport = computed(
  () => props.order?.verificationType === 'external_commission' && props.order?.isCommon === 0 && props.order?.isWithReport === 1
)

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

function verificationTypeText(value?: string) {
  if (value === 'self_check') return '自检'
  if (value === 'external_commission') return '外委'
  return display(value)
}

function commonText(value?: number) {
  if (value === 1) return '是'
  if (value === 0) return '否'
  return '-'
}

function resetForm() {
  form.confirmResult = 'PASS'
  form.opinion = '检定结果符合要求，同意确认'
}

async function submit() {
  const order = props.order
  if (!order) return
  submitting.value = true
  try {
    await confirmerConfirmFirstCheck({
      orderId: order.id,
      confirmResult: form.confirmResult,
      opinion: form.opinion
    })
    const target = form.confirmResult === 'PASS' ? '管理员赋码' : form.confirmResult === 'RETURN' ? '检定员重检' : '流程终止'
    message.success(`确认结果已提交，流程已流转到${target}`)
    emit('success')
    close()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '确认提交失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm()
  }
)
</script>

<template>
  <a-modal :open="open" width="95vw" :footer="null" :destroy-on-close="true" @cancel="close">
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / {{ display(order?.orderNo) }}</div>
          <strong>{{ isExternalNonCommonWithReport ? '首检外委判定' : '首次检定表单确认' }}</strong>
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
          <h2>基本信息</h2>
          <a-tag class="tag blue">申请单 {{ display(order?.orderNo) }}</a-tag>
        </div>
        <div class="form-grid cols-4 readonly-area">
          <label><span>采购订单编号</span><a-input :value="display(order?.purchaseOrderNo)" readonly /></label>
          <label><span>物料编号</span><a-input :value="display(order?.materialCode)" readonly /></label>
          <label><span>物料描述</span><a-input :value="display(order?.materialName)" readonly /></label>
          <label><span>数量</span><a-input :value="`${display(order?.quantity)} 台`" readonly /></label>
          <label><span>使用部门</span><a-input :value="display(order?.applyDeptName)" readonly /></label>
          <label><span>供应商名称</span><a-input :value="display(order?.supplierName)" readonly /></label>
          <label><span>申请时间</span><a-input :value="normalizeDate(order?.applyTime)" readonly /></label>
          <label><span>设备分类</span><a-input :value="display(order?.requestedCategory)" readonly /></label>
          <label class="span-2"><span>使用场景</span><a-input :value="display(order?.usageScenario)" readonly /></label>
          <label><span>检定方式</span><a-input :value="verificationTypeText(order?.verificationType)" readonly /></label>
          <label><span>{{ isExternalNonCommonWithReport ? '是否通用设备' : '通用设备' }}</span><a-input :value="commonText(order?.isCommon)" readonly /></label>
          <label>
            <span>附件</span>
            <AttachmentListButton :group-id="order?.attachmentGroupId" title="供应商申请附件" />
          </label>
          <label>
            <span>检定证书</span>
            <AttachmentListButton :group-id="order?.certificateAttachmentGroupId" title="检定证书/报告附件" />
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>结果判定</h2>
          <a-tag class="tag orange">待判定</a-tag>
        </div>
        <div class="form-grid cols-4">
          <label><span>合格数量</span><a-input-number :value="order?.qualifiedQuantity" disabled style="width:100%" /></label>
          <label><span>不合格数量</span><a-input-number :value="order?.unqualifiedQuantity" disabled style="width:100%" /></label>
          <label>
            <span>确认结果</span>
            <a-select
              v-model:value="form.confirmResult"
              :options="[
                { label: '通过', value: 'PASS' },
                { label: '驳回', value: 'REJECT' },
                { label: '退回重检', value: 'RETURN' }
              ]"
            />
          </label>
          <label class="span-2">
            <span>审批意见</span>
            <a-textarea v-model:value="form.opinion" :rows="3" />
          </label>
        </div>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.dialog-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog-title-actions {
  display: flex;
  gap: 8px;
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
  padding-right: 4px;
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
