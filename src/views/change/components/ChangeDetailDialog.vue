<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import type { ChangeOrderVO, ChangeVerifierHandleRequest } from '@/types/change'
import {
  changeStatusName,
  changeTagColor,
  changeTypeName,
  changeTypeTitle,
  deviceStatusName,
  display,
  formatDate,
  formatDateTime,
  normalizeCategory,
  resolveItemSnapshot,
  statusTagColor
} from '@/views/change/changeDisplayModel'

const props = withDefaults(
  defineProps<{
    open: boolean
    order?: ChangeOrderVO | null
    mode?: 'approval' | 'readonly' | 'verifier'
    submitting?: boolean
  }>(),
  {
    mode: 'readonly'
  }
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  approve: [opinion: string]
  reject: [reason: string]
  verifierSubmit: [request: ChangeVerifierHandleRequest]
}>()

const opinion = ref('')
const rejectReason = ref('')
const verificationResult = ref<'qualified' | 'unqualified'>('qualified')
const verificationDate = ref('')
const validUntil = ref('')
const verifierCertificateAttachmentGroupId = ref<ChangeVerifierHandleRequest['certificateAttachmentGroupId']>()

const title = computed(() => changeTypeTitle(props.order?.changeType))
const canHandle = computed(() => props.mode === 'approval')
const isVerifierMode = computed(() => props.mode === 'verifier')
const canEditOpinion = computed(() => canHandle.value || isVerifierMode.value)
const existingCertificateAttachmentGroupId = computed(() => props.order?.items?.find((item) => item.certificateAttachmentGroupId)?.certificateAttachmentGroupId)
const certificateAttachmentGroupId = computed(() => verifierCertificateAttachmentGroupId.value || existingCertificateAttachmentGroupId.value)

const columns = [
  { title: '计量编号', key: 'deviceCode', width: 150 },
  { title: '设备名称', key: 'deviceName', width: 150 },
  { title: '规格型号', key: 'modelSpec', width: 150 },
  { title: '管理类别', key: 'category', width: 120 },
  { title: '检定周期', key: 'cycle', width: 120 },
  { title: '设备状态', key: 'status', width: 120 },
  { title: '使用部门', key: 'deptName', width: 150 },
  { title: '有效期', key: 'validUntil', width: 140 }
]

watch(
  () => props.open,
  (open) => {
    if (open) {
      opinion.value = ''
      rejectReason.value = ''
      verificationResult.value = 'qualified'
      verificationDate.value = new Date().toISOString().slice(0, 10)
      validUntil.value = props.order?.items?.find((item) => item.newValidUntil)?.newValidUntil || ''
      verifierCertificateAttachmentGroupId.value = existingCertificateAttachmentGroupId.value
    }
  }
)

function close() {
  emit('update:open', false)
}

function approve() {
  emit('approve', opinion.value || '同意')
}

function reject() {
  emit('reject', rejectReason.value || opinion.value || '退回修改')
}

function submitVerifier() {
  if (!props.order?.id) return
  emit('verifierSubmit', {
    orderId: props.order.id,
    verificationResult: verificationResult.value,
    verificationDate: verificationDate.value || undefined,
    validUntil: validUntil.value || undefined,
    certificateAttachmentGroupId: certificateAttachmentGroupId.value,
    opinion: opinion.value || (verificationResult.value === 'qualified' ? '检定通过' : '检定不通过')
  })
}
</script>

<template>
  <a-modal :open="open" :title="title" width="960px" :footer="null" @cancel="close">
    <div v-if="order" class="change-detail">
      <div class="modal-actions">
        <a-button @click="close">返回</a-button>
        <template v-if="canHandle">
          <a-button danger :loading="submitting" @click="reject">退回</a-button>
          <a-button type="primary" :loading="submitting" @click="approve">同意</a-button>
        </template>
        <a-button v-else-if="isVerifierMode" type="primary" :loading="submitting" @click="submitVerifier">提交</a-button>
      </div>

      <div class="base-grid">
        <div><span>申请编号</span><strong>{{ display(order.orderNo) }}</strong></div>
        <div><span>变更流程</span><strong><a-tag :class="['tag', changeTagColor(order.changeType)]">{{ changeTypeName(order.changeType) }}</a-tag></strong></div>
        <div><span>申请时间</span><strong>{{ formatDateTime(order.applyTime) }}</strong></div>
        <div><span>数量</span><strong>{{ display(order.itemCount || order.items?.length) }}</strong></div>
        <div><span>申请部门</span><strong>{{ display(order.applyDeptName) }}</strong></div>
        <div><span>申请人</span><strong>{{ display(order.applicantName || order.applicantId) }}</strong></div>
        <div><span>业务状态</span><strong><a-tag :class="['tag', statusTagColor(order.status)]">{{ changeStatusName(order.status) }}</a-tag></strong></div>
        <div><span>流程状态</span><strong>{{ changeStatusName(order.workflowStatus) }}</strong></div>
      </div>

      <section class="detail-section">
        <h3>设备明细</h3>
        <a-table
          :columns="columns"
          :data-source="order.items || []"
          :pagination="false"
          :scroll="{ x: 1040 }"
          row-key="id"
          size="small"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'deviceCode'">{{ display(resolveItemSnapshot(record).deviceCode || record.deviceId) }}</template>
            <template v-else-if="column.key === 'deviceName'">{{ display(resolveItemSnapshot(record).deviceName) }}</template>
            <template v-else-if="column.key === 'modelSpec'">{{ display(resolveItemSnapshot(record).modelSpec) }}</template>
            <template v-else-if="column.key === 'category'">
              {{ normalizeCategory(record.newCategory || record.oldCategory) }}
            </template>
            <template v-else-if="column.key === 'cycle'">
              {{ record.newCycleMonth || record.oldCycleMonth ? `${record.newCycleMonth || record.oldCycleMonth}个月` : '-' }}
            </template>
            <template v-else-if="column.key === 'status'">
              {{ deviceStatusName(record.newStatus || record.oldStatus) }}
            </template>
            <template v-else-if="column.key === 'deptName'">{{ display(resolveItemSnapshot(record).deptName) }}</template>
            <template v-else-if="column.key === 'validUntil'">{{ formatDate(record.newValidUntil || record.oldValidUntil) }}</template>
          </template>
        </a-table>
      </section>

      <section class="detail-section">
        <h3>调整信息</h3>
        <div class="info-grid">
          <div><span>申请原因</span><strong>{{ display(order.reason) }}</strong></div>
          <div><span>备注</span><strong>{{ display(order.remark) }}</strong></div>
          <div><span>封存原因</span><strong>{{ display(order.items?.[0]?.sealReason) }}</strong></div>
          <div><span>启用原因</span><strong>{{ display(order.items?.[0]?.enableReason) }}</strong></div>
          <div><span>转移原因</span><strong>{{ display(order.items?.[0]?.transferReason) }}</strong></div>
          <div><span>接收单位</span><strong>{{ display(order.items?.[0]?.transferToDeptName) }}</strong></div>
          <div><span>调整原因</span><strong>{{ display(order.items?.[0]?.adjustmentReason) }}</strong></div>
          <div><span>报废原因</span><strong>{{ display(order.items?.[0]?.scrapReason) }}</strong></div>
          <div><span>检定原因</span><strong>{{ display(order.items?.[0]?.verificationReason) }}</strong></div>
          <div>
            <span>申请附件</span>
            <strong><AttachmentListButton :group-id="order.attachmentGroupId" title="状态变更申请附件" size="small" /></strong>
          </div>
          <div>
            <span>检定证书附件</span>
            <strong><AttachmentListButton :group-id="certificateAttachmentGroupId" title="状态变更检定证书附件" size="small" /></strong>
          </div>
        </div>
      </section>

      <section v-if="isVerifierMode" class="detail-section">
        <h3>检定员处理</h3>
        <div class="verifier-grid">
          <label>
            <span>处理结果</span>
            <a-radio-group v-model:value="verificationResult" button-style="solid">
              <a-radio-button value="qualified">合格 / 通过</a-radio-button>
              <a-radio-button value="unqualified">不合格 / 驳回</a-radio-button>
            </a-radio-group>
          </label>
          <label>
            <span>检定日期</span>
            <a-input v-model:value="verificationDate" type="date" />
          </label>
          <label>
            <span>新有效期</span>
            <a-input v-model:value="validUntil" type="date" />
          </label>
          <label>
            <span>检定证书附件</span>
            <AttachmentUploadButton
              v-model="verifierCertificateAttachmentGroupId"
              business-type="CHANGE_VERIFIER"
              :business-id="order.id"
              button-text="上传证书"
              size="small"
            />
          </label>
        </div>
      </section>

      <section class="detail-section">
        <h3>{{ isVerifierMode ? '处理意见' : '审批意见' }}</h3>
        <a-textarea
          v-model:value="opinion"
          :disabled="!canEditOpinion"
          :placeholder="isVerifierMode ? '请输入检定员处理意见（选填）' : '请输入审批意见（选填）'"
          :rows="3"
        />
        <a-input
          v-if="canHandle"
          v-model:value="rejectReason"
          class="reject-input"
          placeholder="退回时可填写退回原因"
        />
      </section>
    </div>
  </a-modal>
</template>

<style scoped>
.change-detail {
  display: grid;
  gap: 14px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.base-grid,
.info-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  border: 1px solid #e5eaf1;
  border-right: 0;
  border-bottom: 0;
}

.base-grid > div,
.info-grid > div {
  min-height: 64px;
  padding: 12px;
  border-right: 1px solid #e5eaf1;
  border-bottom: 1px solid #e5eaf1;
}

.base-grid span,
.info-grid span {
  display: block;
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
}

.base-grid strong,
.info-grid strong {
  color: #172033;
  font-size: 14px;
  font-weight: 600;
}

.detail-section {
  display: grid;
  gap: 10px;
}

.detail-section h3 {
  margin: 0;
  color: #172033;
  font-size: 15px;
}

.detail-section :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.reject-input {
  margin-top: 8px;
}

.verifier-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.verifier-grid label {
  display: grid;
  gap: 6px;
}

.verifier-grid span {
  color: #667085;
  font-size: 12px;
}

.tag {
  border-radius: 6px;
}

.tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.tag.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.tag.cyan {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}

@media (max-width: 900px) {
  .base-grid,
  .info-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
