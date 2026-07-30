<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import AttachmentListButton from '@/components/AttachmentListButton.vue'
import type { ChangeItemVO, ChangeOrderVO } from '@/types/change'
import {
  changeTypeTitle,
  deviceStatusName,
  display,
  formatCycleMonth,
  formatDate,
  normalizeCategory,
  normalizeChangeType,
  resolveItemSnapshot
} from '@/views/change/changeDisplayModel'

const props = defineProps<{
  open: boolean
  orders: ChangeOrderVO[]
  submitting?: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  approve: [opinion: string]
  reject: [reason: string]
}>()

const opinion = ref('')

const firstOrder = computed(() => props.orders[0] || null)
const changeType = computed(() => normalizeChangeType(firstOrder.value?.changeType))
const title = computed(() => changeTypeTitle(changeType.value))
const allItems = computed(() =>
  props.orders.flatMap((order) =>
    (order.items || []).map((item) => ({
      order,
      item
    }))
  )
)

const applyDate = computed(() => {
  const dates = uniqueValues(props.orders.map((order) => formatDate(order.applyTime)).filter((value) => value !== '-'))
  if (dates.length === 0) return '-'
  if (dates.length === 1) return dates[0].replace(/-/g, '/')
  return `${dates[0].replace(/-/g, '/')} 等 ${dates.length} 个日期`
})

const attachmentName = computed(() => {
  const names = uniqueValues(
    props.orders
      .map((order) => {
        const anyOrder = order as unknown as Record<string, unknown>
        return anyOrder.attachmentName || anyOrder.fileName || anyOrder.applyFileName || anyOrder.attachmentFileName
      })
      .filter(Boolean)
      .map(String)
  )
  return names.length > 0 ? names.join('，') : '暂无附件'
})

const attachmentGroupId = computed(() => firstOrder.value?.attachmentGroupId)

const primaryFields = computed(() => {
  const type = changeType.value
  if (type === 'category') {
    return [{ label: '调整后管理类别', value: aggregateItemValue((item) => normalizeCategory(item.newCategory)), required: true }]
  }
  if (type === 'cycle') {
    return [{ label: '调整后检定周期', value: aggregateItemValue((item) => formatCycleMonth(item.newCycleMonth)), required: true }]
  }
  if (type === 'seal') {
    return [{ label: '封存原因', value: aggregateItemValue((item, order) => item.sealReason || order.reason), required: true }]
  }
  if (type === 'enable') {
    return [{ label: '启用原因', value: aggregateItemValue((item, order) => item.enableReason || order.reason), required: true }]
  }
  if (type === 'transfer') {
    return [
      { label: '接收单位', value: aggregateItemValue((item) => item.transferToDeptName), required: true },
      { label: '转移原因', value: aggregateItemValue((item, order) => item.transferReason || order.reason), required: true }
    ]
  }
  if (type === 'scrap') {
    return [{ label: '报废原因', value: aggregateItemValue((item, order) => item.scrapReason || order.reason), required: true }]
  }
  if (type === 'precheck') {
    return [{ label: '检定原因', value: aggregateItemValue((item, order) => item.verificationReason || order.reason), required: true }]
  }
  return [{ label: '申请原因', value: aggregateItemValue((item, order) => order.reason || item.remark), required: true }]
})

watch(
  () => props.open,
  (open) => {
    if (open) opinion.value = ''
  }
)

function close() {
  emit('update:open', false)
}

function approve() {
  emit('approve', opinion.value.trim() || '同意')
}

function reject() {
  emit('reject', opinion.value.trim() || '退回修改')
}

function viewAttachment() {
  if (attachmentName.value === '暂无附件') {
    message.info('当前状态变更单暂无附件')
    return
  }
  message.info(`查看附件：${attachmentName.value}`)
}

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value !== '-'))))
}

function aggregateItemValue(resolve: (item: ChangeItemVO, order: ChangeOrderVO) => unknown) {
  const values = uniqueValues(allItems.value.map(({ item, order }) => display(resolve(item, order))))
  if (values.length === 0) return '-'
  if (values.length === 1) return values[0]
  return values.join('，')
}

function statusTagClass(value?: string) {
  const text = String(value || '').toLowerCase()
  if (text.includes('repair') || text.includes('维修')) return 'orange'
  if (text.includes('scrap') || text.includes('报废')) return 'red'
  if (text.includes('seal') || text.includes('封存')) return 'red'
  return 'green'
}
</script>

<template>
  <a-modal
    :open="open"
    width="760px"
    centered
    :footer="null"
    :closable="false"
    wrap-class-name="change-approval-modal-wrap"
    @cancel="close"
  >
    <div class="change-approval-modal">
      <header class="modal-header">
        <h1>{{ title }}</h1>
        <div class="modal-header-actions">
          <a-button @click="close">返回</a-button>
          <a-button :loading="submitting" @click="reject">退回</a-button>
          <a-button type="primary" :loading="submitting" @click="approve">同意</a-button>
        </div>
      </header>

      <main class="modal-body">
        <div class="section-title">设备明细</div>
        <div class="device-table-wrap">
          <table class="device-table">
            <thead>
              <tr>
                <th>计量编号</th>
                <th>设备名称</th>
                <th>规格型号</th>
                <th>管理类别</th>
                <th>检定周期</th>
                <th>设备状态</th>
                <th>使用部门</th>
                <th>有效期</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="{ item } in allItems" :key="String(item.id || item.deviceId || item.deviceCode)">
                <td>{{ display(resolveItemSnapshot(item).deviceCode || item.deviceId) }}</td>
                <td>{{ display(resolveItemSnapshot(item).deviceName) }}</td>
                <td>{{ display(resolveItemSnapshot(item).modelSpec) }}</td>
                <td><span class="tag blue">{{ normalizeCategory(item.oldCategory || item.newCategory) }}</span></td>
                <td>{{ formatCycleMonth(item.oldCycleMonth || item.newCycleMonth) }}</td>
                <td><span :class="['tag', statusTagClass(item.oldStatus || item.newStatus)]">{{ deviceStatusName(item.oldStatus || item.newStatus) }}</span></td>
                <td>{{ display(resolveItemSnapshot(item).deptName) }}</td>
                <td>{{ formatDate(item.oldValidUntil || item.newValidUntil) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section-title">调整信息</div>
        <div v-for="field in primaryFields" :key="field.label" class="form-row">
          <label>{{ field.label }} <span v-if="field.required" class="required">*</span></label>
          <input type="text" :value="field.value" readonly />
        </div>

        <div class="form-row">
          <label>申请日期</label>
          <input type="text" :value="applyDate" readonly />
        </div>

        <div class="form-row">
          <label>附件</label>
          <div class="upload-area">
            <AttachmentListButton :group-id="attachmentGroupId" title="状态变更申请附件" size="small" />
            <span>{{ attachmentName }}</span>
          </div>
        </div>

        <div class="form-row no-margin">
          <label>审批意见</label>
          <textarea v-model="opinion" placeholder="请输入审批意见（选填）"></textarea>
        </div>
      </main>
    </div>
  </a-modal>
</template>

<style scoped>
.change-approval-modal {
  overflow: hidden;
  border-radius: 12px;
  background: #ffffff;
}

.modal-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
  border-bottom: 1px solid #e5e9f0;
}

.modal-header h1 {
  margin: 0;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: 600;
}

.modal-header-actions {
  display: flex;
  gap: 8px;
}

.modal-body {
  max-height: calc(90vh - 64px);
  overflow-y: auto;
  padding: 20px;
}

.section-title {
  margin-bottom: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid #e5e9f0;
  color: #344054;
  font-size: 14px;
  font-weight: 600;
}

.device-table-wrap {
  max-height: 180px;
  margin-bottom: 20px;
  overflow: auto;
}

.device-table {
  width: 100%;
  min-width: 700px;
  border-collapse: collapse;
}

.device-table th,
.device-table td {
  height: 36px;
  padding: 4px 8px;
  border-bottom: 1px solid #e5e9f0;
  color: #172033;
  text-align: left;
  white-space: nowrap;
  font-size: 13px;
}

.device-table th {
  background: #f8fafc;
  color: #344054;
  font-weight: 600;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 16px;
}

.form-row.no-margin {
  margin-bottom: 0;
}

.form-row label {
  color: #344054;
  font-size: 13px;
  font-weight: 500;
}

.required {
  margin-left: 2px;
  color: #e53e3e;
}

.form-row input {
  height: 36px;
  padding: 0 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  outline: none;
  background: #f8fafc;
  color: #344054;
  font-size: 13px;
  font-weight: 500;
}

.form-row textarea {
  height: 72px;
  padding: 8px 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  outline: none;
  resize: none;
  background: #ffffff;
  color: #344054;
  font-size: 13px;
  transition: border-color 0.15s;
}

.form-row textarea:focus {
  border-color: #175cd3;
}

.upload-area {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-area span {
  color: #667085;
  font-size: 12px;
}

.tag {
  display: inline-block;
  height: 22px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  line-height: 22px;
}

.tag.green {
  background: #ecfdf5;
  color: #059669;
}

.tag.orange {
  background: #fff7ed;
  color: #d97706;
}

.tag.red {
  background: #fef2f2;
  color: #dc2626;
}

.tag.blue {
  background: #eef5ff;
  color: #175cd3;
}

:global(.change-approval-modal-wrap .ant-modal-content) {
  overflow: hidden;
  padding: 0;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

@media (max-width: 820px) {
  .modal-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 12px;
  }
}
</style>
