<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { Modal, message } from 'ant-design-vue'
import { deptLeaderApproveFirstCheck, deptLeaderRejectFirstCheck } from '@/api/firstcheck'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import type { FirstCheckOrder } from '@/types/firstcheck'

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
  opinion: ''
})

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

async function submit() {
  const order = props.order
  if (!order) return
  submitting.value = true
  try {
    await deptLeaderApproveFirstCheck({
      orderId: order.id,
      opinion: form.opinion || '主管领导审批同意'
    })
    message.success('已同意，流程已流转到责任工程师')
    emit('success')
    close()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '主管领导审批失败')
  } finally {
    submitting.value = false
  }
}

function rejectOrder() {
  const order = props.order
  if (!order) return
  Modal.confirm({
    title: '确认驳回终止首检单？',
    content: '驳回后首检流程将终止，不会继续推送给责任工程师。',
    okText: '驳回终止',
    okButtonProps: { danger: true },
    cancelText: '取消',
    async onOk() {
      submitting.value = true
      try {
        await deptLeaderRejectFirstCheck({
          orderId: order.id,
          opinion: form.opinion || '主管领导驳回终止'
        })
        message.success('已驳回，首检流程已终止')
        emit('success')
        close()
      } catch (error) {
        message.error(error instanceof Error ? error.message : '主管领导驳回失败')
        throw error
      } finally {
        submitting.value = false
      }
    }
  })
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      form.opinion = ''
    }
  }
)
</script>

<template>
  <a-modal
    :open="open"
    class="firstcheck-leader-dialog"
    width="760px"
    :footer="null"
    :destroy-on-close="true"
    @cancel="close"
  >
    <template #title>
      <div class="modal-title">
        <strong>首检类别确认</strong>
        <a-tag class="tag blue">编号 {{ display(order?.orderNo) }}</a-tag>
      </div>
    </template>

    <section class="panel">
      <div class="panel-header">
        <h2>基本信息</h2>
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

    <div class="comment-area">
      <label>审批意见</label>
      <a-textarea v-model:value="form.opinion" placeholder="请输入审批意见（选填）" :rows="3" />
    </div>

    <div class="dialog-actions">
      <a-button :disabled="submitting" @click="close">返回</a-button>
      <a-button danger :disabled="submitting" @click="rejectOrder">驳回终止</a-button>
      <a-button type="primary" :loading="submitting" @click="submit">同意</a-button>
    </div>
  </a-modal>
</template>

<style scoped>
.modal-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-right: 28px;
}

.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel-header {
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 14px;
  font-weight: 700;
}

.form-grid {
  display: grid;
  gap: 10px;
  padding: 14px;
}

.form-grid.cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.form-grid label,
.comment-area label {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: #344054;
  font-size: 13px;
  font-weight: 600;
}

.form-grid span {
  color: #667085;
  font-size: 12px;
  font-weight: 500;
}

.span-2 {
  grid-column: span 2;
}

.readonly-area :deep(.ant-input) {
  color: #344054;
  background: #f8fafc;
}

.comment-area {
  margin-top: 18px;
  padding-top: 18px;
  border-top: 1px solid #e5eaf1;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

@media (max-width: 900px) {
  .form-grid.cols-4 {
    grid-template-columns: 1fr;
  }

  .span-2 {
    grid-column: span 1;
  }
}
</style>
