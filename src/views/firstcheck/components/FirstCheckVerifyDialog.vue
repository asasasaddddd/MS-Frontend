<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { message } from 'ant-design-vue'
import { verifierVerifyFirstCheck } from '@/api/firstcheck'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import type { AttachmentId, FirstCheckOrder, VerificationResult, VerifierVerifyRequest } from '@/types/firstcheck'

const props = defineProps<{
  open: boolean
  order?: FirstCheckOrder
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const submitting = defineModel<boolean>('submitting', { default: false })

const form = reactive({
  verificationResult: 'qualified' as VerificationResult,
  qualifiedQuantity: undefined as number | undefined,
  unqualifiedQuantity: 0,
  certificateAttachmentGroupId: undefined as AttachmentId | undefined,
  deviceName: '',
  modelSpec: '',
  deviceUsage: undefined as string | undefined,
  measureRange: '',
  resolution: '',
  precisionLevel: '',
  allowedError: '',
  manufacturer: '',
  factoryCode: '',
  factoryDate: '',
  subjectCategory: undefined as string | undefined,
  subjectSubcategory: undefined as string | undefined,
  deviceStatus: 'in_use',
  isMandatory: 0,
  standardDevice: '',
  confirmInterval: '周期检定',
  specialProject: '',
  verificationCycleMonth: 12,
  verificationDate: '',
  validUntil: '',
  storageLocation: '',
  selfCost: undefined as number | undefined,
  sendoutCost: undefined as string | undefined,
  verificationOpinion: '检定完成',
  opinion: '检定完成'
})

const subjectSubcategoryOptions = [
  { label: '温度 010101', value: '010101' },
  { label: '压力 020101', value: '020101' },
  { label: '电压 040101', value: '040101' },
  { label: '卡尺 050102', value: '050102' }
]

function normalizeSubjectSubcategory(value?: string) {
  if (!value) return undefined
  if (/^\d{6}$/.test(value)) return value
  const aliasMap: Record<string, string> = {
    温度: '010101',
    压力: '020101',
    电压: '040101',
    卡尺: '050102'
  }
  return aliasMap[value]
}

const previewRows = computed(() => {
  const total = Math.max(1, Math.min(Number(form.qualifiedQuantity || props.order?.quantity || 1), 3))
  return Array.from({ length: total }, (_, index) => ({ index: index + 1 }))
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

function resetForm(order?: FirstCheckOrder) {
  form.verificationResult = (order?.verificationResult as VerificationResult) || 'qualified'
  form.qualifiedQuantity = order?.qualifiedQuantity ?? order?.quantity ?? undefined
  form.unqualifiedQuantity = order?.unqualifiedQuantity ?? 0
  form.certificateAttachmentGroupId = order?.certificateAttachmentGroupId
  form.deviceName = order?.deviceName || ''
  form.modelSpec = order?.modelSpec || ''
  form.deviceUsage = order?.deviceUsage
  form.measureRange = order?.measureRange || ''
  form.resolution = order?.resolution || ''
  form.precisionLevel = order?.precisionLevel || ''
  form.allowedError = order?.allowedError || ''
  form.manufacturer = order?.manufacturer || ''
  form.factoryCode = order?.factoryCode || ''
  form.factoryDate = order?.factoryDate || ''
  form.subjectCategory = order?.subjectCategory
  form.subjectSubcategory = normalizeSubjectSubcategory(order?.subjectSubcategory)
  form.deviceStatus = order?.deviceStatus || 'in_use'
  form.isMandatory = order?.isMandatory ?? 0
  form.standardDevice = order?.standardDevice || ''
  form.confirmInterval = order?.confirmInterval || '周期检定'
  form.specialProject = order?.specialProject || ''
  form.verificationCycleMonth = order?.verificationCycleMonth || 12
  form.verificationDate = order?.verificationDate || new Date().toISOString().slice(0, 10)
  form.validUntil = order?.validUntil || ''
  form.storageLocation = order?.storageLocation || ''
  form.selfCost = order?.selfCost
  form.sendoutCost = order?.sendoutCost === undefined ? undefined : String(order.sendoutCost)
  form.verificationOpinion = order?.verificationOpinion || '检定完成'
  form.opinion = '检定完成'
}

function compactPayload(payload: VerifierVerifyRequest): VerifierVerifyRequest {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== '' && value !== undefined)) as VerifierVerifyRequest
}

async function submit() {
  const order = props.order
  if (!order) return
  if (!form.verificationResult) {
    message.warning('请选择检定结果')
    return
  }

  const quantity = Number(order.quantity || 0)
  const qualified = Number(form.qualifiedQuantity || 0)
  const unqualified = Number(form.unqualifiedQuantity || 0)
  if (quantity > 0 && qualified + unqualified > quantity) {
    message.warning('合格数量和不合格数量不能超过申请数量')
    return
  }

  if (!/^\d{6}$/.test(form.subjectSubcategory || '')) {
    message.warning('请选择 6 位学科小类编码')
    return
  }

  submitting.value = true
  try {
    await verifierVerifyFirstCheck(
      compactPayload({
        orderId: order.id,
        verificationResult: form.verificationResult,
        qualifiedQuantity: qualified,
        unqualifiedQuantity: unqualified,
        certificateAttachmentGroupId: form.certificateAttachmentGroupId,
        deviceName: form.deviceName,
        modelSpec: form.modelSpec,
        deviceUsage: form.deviceUsage,
        measureRange: form.measureRange,
        resolution: form.resolution,
        precisionLevel: form.precisionLevel,
        allowedError: form.allowedError,
        manufacturer: form.manufacturer,
        factoryCode: form.factoryCode,
        factoryDate: form.factoryDate,
        subjectCategory: form.subjectCategory,
        subjectSubcategory: form.subjectSubcategory,
        deviceStatus: form.deviceStatus,
        isMandatory: form.isMandatory,
        standardDevice: form.standardDevice,
        confirmInterval: form.confirmInterval,
        specialProject: form.specialProject,
        verificationCycleMonth: form.verificationCycleMonth,
        verificationDate: form.verificationDate,
        validUntil: form.validUntil,
        storageLocation: form.storageLocation,
        verificationOpinion: form.verificationOpinion,
        selfCost: form.selfCost,
        sendoutCost: form.sendoutCost,
        opinion: form.opinion
      })
    )
    message.success('检定信息已提交，流程已按首检规则流转')
    emit('success')
    close()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '检定信息提交失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) resetForm(props.order)
  }
)
</script>

<template>
  <a-modal
    :open="open"
    class="firstcheck-verify-dialog"
    width="95vw"
    :footer="null"
    :destroy-on-close="true"
    @cancel="close"
  >
    <template #title>
      <div class="dialog-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / {{ display(order?.orderNo) }}</div>
          <strong>首次检定表单填写</strong>
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
          <label><span>是否通用设备</span><a-input :value="commonText(order?.isCommon)" readonly /></label>
          <label>
            <span>附件</span>
            <AttachmentListButton :group-id="order?.attachmentGroupId" title="供应商申请附件" />
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>结果判定</h2>
          <a-tag class="tag orange">待填写</a-tag>
        </div>
        <div class="form-grid cols-4">
          <label>
            <span>检定结果</span>
            <a-select
              v-model:value="form.verificationResult"
              :options="[
                { label: '合格', value: 'qualified' },
                { label: '不合格', value: 'unqualified' },
                { label: '部分合格', value: 'partial' }
              ]"
            />
          </label>
          <label><span>合格数量</span><a-input-number v-model:value="form.qualifiedQuantity" :min="0" style="width:100%" /></label>
          <label><span>不合格数量</span><a-input-number v-model:value="form.unqualifiedQuantity" :min="0" style="width:100%" /></label>
          <label>
            <span>检定证书/报告附件</span>
            <div class="attachment-actions">
              <AttachmentUploadButton
                v-model="form.certificateAttachmentGroupId"
                business-type="FIRST_CHECK_CERTIFICATE"
                :business-id="order?.id"
                remark="首检检定证书附件"
                button-text="上传检定证书"
                size="small"
              />
              <AttachmentListButton
                :group-id="form.certificateAttachmentGroupId"
                button-text="查看已上传"
                title="检定证书/报告附件"
                size="small"
              />
            </div>
          </label>
        </div>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>入库设备信息</h2>
        </div>
        <div class="form-grid cols-4">
          <label><span>设备名称</span><a-input v-model:value="form.deviceName" placeholder="填写设备名称" /></label>
          <label><span>规格型号</span><a-input v-model:value="form.modelSpec" placeholder="填写规格型号" /></label>
          <label>
            <span>设备用途</span>
            <a-select
              v-model:value="form.deviceUsage"
              placeholder="请选择"
              :options="[
                { label: '工艺控制', value: '工艺控制' },
                { label: '质量检验', value: '质量检验' },
                { label: '试验验证', value: '试验验证' }
              ]"
            />
          </label>
          <label><span>测量范围</span><a-input v-model:value="form.measureRange" placeholder="填写测量范围" /></label>
          <label><span>分度值</span><a-input v-model:value="form.resolution" placeholder="填写分度值" /></label>
          <label><span>准确度等级</span><a-input v-model:value="form.precisionLevel" placeholder="填写准确度等级" /></label>
          <label><span>允许误差</span><a-input v-model:value="form.allowedError" placeholder="填写允许误差" /></label>
          <label><span>生产厂家</span><a-input v-model:value="form.manufacturer" placeholder="填写生产厂家" /></label>
          <label><span>出厂日期</span><a-input v-model:value="form.factoryDate" type="date" /></label>
          <label>
            <span>学科大类</span>
            <a-select
              v-model:value="form.subjectCategory"
              placeholder="请选择"
              :options="[
                { label: '长度', value: '长度' },
                { label: '热学', value: '热学' },
                { label: '力学', value: '力学' },
                { label: '电磁', value: '电磁' }
              ]"
            />
          </label>
          <label>
            <span>学科小类</span>
            <a-select
              v-model:value="form.subjectSubcategory"
              placeholder="请选择"
              :options="subjectSubcategoryOptions"
            />
          </label>
          <label>
            <span>设备状态</span>
            <a-select
              v-model:value="form.deviceStatus"
              :options="[
                { label: '在用', value: 'in_use' },
                { label: '封存', value: 'sealed' },
                { label: '停用', value: 'stopped' }
              ]"
            />
          </label>
          <label>
            <span>是否强检</span>
            <a-select
              v-model:value="form.isMandatory"
              :options="[
                { label: '否', value: 0 },
                { label: '是', value: 1 }
              ]"
            />
          </label>
          <label><span>标准器</span><a-input v-model:value="form.standardDevice" placeholder="填写标准器" /></label>
          <label>
            <span>确认间隔</span>
            <a-select
              v-model:value="form.confirmInterval"
              :options="[
                { label: '周期检定', value: '周期检定' },
                { label: '自然', value: '自然' }
              ]"
            />
          </label>
          <label><span>专用项目</span><a-input v-model:value="form.specialProject" placeholder="填写专用项目" /></label>
          <label>
            <span>检定周期</span>
            <a-select
              v-model:value="form.verificationCycleMonth"
              :options="[
                { label: '12个月', value: 12 },
                { label: '6个月', value: 6 },
                { label: '24个月', value: 24 }
              ]"
            />
          </label>
          <label><span>费用</span><a-input-number v-model:value="form.selfCost" style="width:100%" placeholder="填写费用" /></label>
          <label><span>使用部门</span><a-input :value="display(order?.applyDeptName)" readonly /></label>
          <label><span>检定日期</span><a-input v-model:value="form.verificationDate" type="date" /></label>
          <label><span>有效期</span><a-input v-model:value="form.validUntil" type="date" /></label>
          <label><span>存储位置</span><a-input v-model:value="form.storageLocation" placeholder="填写存储位置" /></label>
          <label class="span-2"><span>检定意见</span><a-textarea v-model:value="form.verificationOpinion" :rows="3" /></label>
        </div>
      </section>

      <section class="panel">
        <a-table :data-source="previewRows" :pagination="false" row-key="index" size="small" :scroll="{ x: 980 }">
          <a-table-column title="序号" data-index="index" :width="70" />
          <a-table-column title="计量编号">
            <template #default>
              <a-input placeholder="管理员赋码阶段生成" disabled />
            </template>
          </a-table-column>
          <a-table-column title="检定日期">
            <template #default>
              <a-input :value="form.verificationDate" type="date" />
            </template>
          </a-table-column>
          <a-table-column title="有效期">
            <template #default>
              <a-input :value="form.validUntil" type="date" />
            </template>
          </a-table-column>
          <a-table-column title="出厂编号">
            <template #default>
              <a-input v-model:value="form.factoryCode" />
            </template>
          </a-table-column>
          <a-table-column title="上传检定证书">
            <template #default>
              <AttachmentUploadButton
                v-model="form.certificateAttachmentGroupId"
                business-type="FIRST_CHECK_CERTIFICATE"
                :business-id="order?.id"
                remark="首检检定证书附件"
                button-text="上传"
                size="small"
              />
            </template>
          </a-table-column>
        </a-table>
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.firstcheck-verify-dialog :deep(.ant-modal) {
  max-width: 95vw;
}

.firstcheck-verify-dialog :deep(.ant-modal-content) {
  max-height: 95vh;
  overflow: hidden;
}

.firstcheck-verify-dialog :deep(.ant-modal-body) {
  max-height: calc(95vh - 72px);
  overflow: auto;
  background: #f3f5f8;
}

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

.attachment-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
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
