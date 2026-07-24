<script setup lang="ts">
import AttachmentUploadButton from '@/components/AttachmentUploadButton.vue'
import {
  calculateQualifiedDeviceValidUntil,
  type QualifiedFirstCheckDeviceRow
} from '@/views/firstcheck/firstCheckQualifiedDeviceModel'

const props = defineProps<{
  orderId?: string | number
  confirmInterval?: string
  verificationCycleMonth?: number
}>()

const rows = defineModel<QualifiedFirstCheckDeviceRow[]>('rows', { required: true })

function refreshValidUntil(record: QualifiedFirstCheckDeviceRow) {
  record.validUntil = calculateQualifiedDeviceValidUntil(
    record.verificationDate,
    props.confirmInterval,
    props.verificationCycleMonth
  )
}
</script>

<template>
  <a-table
    :data-source="rows"
    :pagination="false"
    row-key="key"
    size="small"
    :scroll="{ x: 1180, y: 420 }"
  >
    <a-table-column title="序号" data-index="index" :width="64" fixed="left" />
    <a-table-column title="计量编号" :width="180" fixed="left">
      <template #default="{ record }">
        <a-input :value="record.deviceCode" readonly placeholder="请先生成计量编号" />
      </template>
    </a-table-column>
    <a-table-column title="出厂编号" :width="170">
      <template #default="{ record }">
        <a-input v-model:value="record.factoryCode" placeholder="填写单台出厂编号" />
      </template>
    </a-table-column>
    <a-table-column title="出厂日期" :width="160">
      <template #default="{ record }">
        <a-input v-model:value="record.factoryDate" type="date" />
      </template>
    </a-table-column>
    <a-table-column :width="160">
      <template #title>
        <span>检定日期 <b class="required">*</b></span>
      </template>
      <template #default="{ record }">
        <a-input v-model:value="record.verificationDate" type="date" required @change="refreshValidUntil(record)" />
      </template>
    </a-table-column>
    <a-table-column title="有效期" :width="160">
      <template #default="{ record }">
        <a-input :value="record.validUntil" readonly placeholder="一次检定无有效期" />
      </template>
    </a-table-column>
    <a-table-column title="检定证书（选传）" :width="250">
      <template #default="{ record }">
        <AttachmentUploadButton
          v-model="record.certificateAttachmentGroupId"
          business-type="FIRST_CHECK_CERTIFICATE"
          :business-id="orderId"
          :remark="`首检单台设备检定证书：${record.deviceCode || record.index}`"
          button-text="上传"
          size="small"
        />
      </template>
    </a-table-column>
  </a-table>
</template>

<style scoped>
:deep(.ant-table-cell) {
  vertical-align: top;
}

.required {
  color: #ff4d4f;
}
</style>
