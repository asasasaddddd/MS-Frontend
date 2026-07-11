<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { batchAssignCodesFirstCheck, previewDeviceCodesFirstCheck } from '@/api/firstcheck'
import type { DeviceCodePreview, FirstCheckOrder } from '@/types/firstcheck'

const props = defineProps<{
  open: boolean
  order?: FirstCheckOrder
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  success: []
}>()

const loading = ref(false)
const submitting = ref(false)
const previewRows = ref<DeviceCodePreview[]>([])
const opinion = ref('检定员赋计量编号')

const qualifiedCount = computed(() => props.order?.qualifiedQuantity || previewRows.value.length || 0)

const columns = [
  { title: '序号', key: 'index', width: 70 },
  { title: '计量编号', key: 'deviceCode', width: 190 },
  { title: '设备名称', dataIndex: 'deviceName', key: 'deviceName', width: 160 },
  { title: '型号规格', dataIndex: 'modelSpec', key: 'modelSpec', width: 140 },
  { title: '学科小类', dataIndex: 'subjectSubcategory', key: 'subjectSubcategory', width: 120 },
  { title: '制造厂商', dataIndex: 'manufacturer', key: 'manufacturer', width: 160 }
]

function display(value: unknown) {
  if (value === null || value === undefined || value === '') return '-'
  return String(value)
}

function close() {
  emit('update:open', false)
}

async function loadPreview() {
  const orderId = props.order?.id
  if (!orderId) return
  loading.value = true
  try {
    previewRows.value = await previewDeviceCodesFirstCheck(orderId)
  } catch (error) {
    previewRows.value = []
    message.error(error instanceof Error ? error.message : '生成赋码预览失败')
  } finally {
    loading.value = false
  }
}

function validateCodes() {
  if (previewRows.value.length === 0) {
    message.warning('没有可赋码的合格设备')
    return false
  }
  const codes = previewRows.value.map((row) => row.deviceCode?.trim()).filter(Boolean)
  if (codes.length !== previewRows.value.length) {
    message.warning('每台合格设备都必须填写计量编号')
    return false
  }
  if (new Set(codes).size !== codes.length) {
    message.warning('计量编号不能重复')
    return false
  }
  return true
}

async function submit() {
  const order = props.order
  if (!order || !validateCodes()) return
  submitting.value = true
  try {
    await batchAssignCodesFirstCheck({
      orderId: order.id,
      deviceCodes: previewRows.value.map((row) => row.deviceCode.trim())
    })
    message.success('赋码成功，已生成待打印标签')
    emit('success')
    close()
  } catch (error) {
    message.error(error instanceof Error ? error.message : '赋码失败')
  } finally {
    submitting.value = false
  }
}

watch(
  () => props.open,
  (open) => {
    if (!open) return
    opinion.value = '检定员赋计量编号'
    void loadPreview()
  }
)
</script>

<template>
  <a-modal
    :open="open"
    width="980px"
    class="assign-code-dialog"
    :footer="null"
    :destroy-on-close="true"
    @cancel="close"
  >
    <template #title>
      <div class="modal-title">
        <div>
          <div class="dialog-breadcrumb">首页 / 工作台 / 待办事项 / 首次检定</div>
          <strong>赋计量编号</strong>
        </div>
        <a-tag class="tag cyan">编号 {{ display(order?.orderNo) }}</a-tag>
      </div>
    </template>

    <div class="assign-body">
      <a-alert
        type="info"
        show-icon
        message="按合格数量炸开赋码"
        :description="`首检单只对应一种设备；当前合格数量 ${qualifiedCount} 台，每台设备必须分配一个唯一计量编号。赋码前扫码使用首检临时码，赋码后管理员取回扫码使用单台设备计量编号。`"
      />

      <div class="info-grid">
        <div><span>首检编号</span><strong>{{ display(order?.orderNo) }}</strong></div>
        <div><span>设备名称</span><strong>{{ display(order?.deviceName) }}</strong></div>
        <div><span>物料编码</span><strong>{{ display(order?.materialCode) }}</strong></div>
        <div><span>合格数量</span><strong>{{ display(qualifiedCount) }}</strong></div>
        <div><span>使用部门</span><strong>{{ display(order?.applyDeptName) }}</strong></div>
        <div><span>管理类别</span><strong>{{ display(order?.requestedCategory) }}</strong></div>
      </div>

      <a-table
        :columns="columns"
        :data-source="previewRows"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 920, y: 360 }"
        row-key="deviceCode"
        size="middle"
      >
        <template #bodyCell="{ column, record, index }">
          <template v-if="column.key === 'index'">{{ record.index || index + 1 }}</template>
          <template v-else-if="column.key === 'deviceCode'">
            <a-input v-model:value="record.deviceCode" placeholder="请输入计量编号" />
          </template>
          <template v-else-if="column.key === 'deviceName'">{{ display(record.deviceName || order?.deviceName) }}</template>
          <template v-else-if="column.key === 'modelSpec'">{{ display(record.modelSpec || order?.modelSpec) }}</template>
          <template v-else-if="column.key === 'subjectSubcategory'">{{ display(record.subjectSubcategory || order?.subjectSubcategory) }}</template>
          <template v-else-if="column.key === 'manufacturer'">{{ display(record.manufacturer || order?.manufacturer) }}</template>
        </template>
      </a-table>

      <label class="opinion-field">
        <span>备注</span>
        <a-textarea v-model:value="opinion" :rows="2" />
      </label>

      <div class="dialog-actions">
        <a-button @click="close">取消</a-button>
        <a-button :loading="loading" @click="loadPreview">重新生成</a-button>
        <a-button type="primary" :loading="submitting" @click="submit">确认赋码并推送打印</a-button>
      </div>
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

.dialog-breadcrumb {
  margin-bottom: 4px;
  color: #667085;
  font-size: 12px;
  font-weight: 400;
}

.assign-body {
  display: grid;
  gap: 14px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid #e5eaf1;
  border-right: 0;
  border-bottom: 0;
}

.info-grid > div {
  min-height: 64px;
  padding: 12px;
  border-right: 1px solid #e5eaf1;
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.info-grid span,
.opinion-field span {
  display: block;
  margin-bottom: 6px;
  color: #667085;
  font-size: 12px;
}

.info-grid strong {
  color: #172033;
}

.opinion-field {
  display: flex;
  flex-direction: column;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.tag.cyan {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}

@media (max-width: 900px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
