<script setup lang="ts">
import { computed } from 'vue'
import { RightOutlined } from '@ant-design/icons-vue'
import type { PeriodicPlanPickerItem } from '../periodicDisplayModel'

const props = defineProps<{
  open: boolean
  items: readonly PeriodicPlanPickerItem[]
  incomplete: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  select: [containerId: string]
}>()

const modalOpen = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value)
})

const columns = [
  { title: '周检单号', key: 'containerNo', dataIndex: 'containerNo', width: 200 },
  { title: '当前节点', key: 'currentNodeSummary', dataIndex: 'currentNodeSummary', width: 250 },
  { title: '整单条目', key: 'totalItemCount', dataIndex: 'totalItemCount', width: 100, align: 'center' },
  { title: '未完成', key: 'unfinishedItemCount', dataIndex: 'unfinishedItemCount', width: 100, align: 'center' },
  { title: '我的待办', key: 'myPendingItemCount', dataIndex: 'myPendingItemCount', width: 100, align: 'center' },
  { title: '操作次数', key: 'myPendingActionCount', dataIndex: 'myPendingActionCount', width: 100, align: 'center' },
  { title: '操作', key: 'action', width: 110 }
] as const
</script>

<template>
  <a-modal
    v-model:open="modalOpen"
    title="周检待办单据"
    width="min(1120px, calc(100vw - 32px))"
    wrap-class-name="periodic-plan-picker-dialog"
    :footer="null"
    destroy-on-close
  >
    <a-alert
      v-if="incomplete"
      class="picker-warning"
      type="error"
      show-icon
      message="周检单据入口加载失败，请检查后端接口"
    />

    <a-table
      v-if="items.length > 0"
      class="picker-table"
      size="middle"
      row-key="containerId"
      :columns="columns"
      :data-source="items"
      :pagination="false"
    >
      <template #bodyCell="{ column, record }">
        <span v-if="column.key === 'containerNo'" class="plan-no">{{ record.containerNo }}</span>
        <span v-else-if="column.key === 'currentNodeSummary'" class="node-summary">
          {{ record.currentNodeSummary }}
        </span>
        <a-tag v-else-if="column.key === 'totalItemCount'" class="device-count">
          {{ record.totalItemCount }} 条
        </a-tag>
        <a-tag v-else-if="column.key === 'unfinishedItemCount'" class="device-count">
          {{ record.unfinishedItemCount }}
        </a-tag>
        <a-tag v-else-if="column.key === 'myPendingItemCount'" class="device-count">
          {{ record.myPendingItemCount }}
        </a-tag>
        <span v-else-if="column.key === 'myPendingActionCount'">
          {{ record.myPendingActionCount }}
        </span>
        <a-button
          v-else-if="column.key === 'action'"
          type="link"
          class="enter-button"
          @click="emit('select', record.containerId)"
        >
          进入详情
          <RightOutlined />
        </a-button>
      </template>
    </a-table>

    <a-empty
      v-else-if="!incomplete"
      class="picker-empty"
      description="当前角色暂时无周检待办单据"
    />
  </a-modal>
</template>

<style scoped>
.picker-warning {
  margin-bottom: 14px;
}

.picker-table :deep(.ant-table-thead > tr > th) {
  color: #475467;
  font-size: 12px;
  font-weight: 700;
  background: #f8fafc;
}

.picker-table :deep(.ant-table-cell) {
  padding-top: 13px;
  padding-bottom: 13px;
}

.picker-table :deep(.ant-table) {
  width: 100%;
}

.plan-no {
  color: #172033;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.node-summary {
  color: #475467;
  line-height: 1.5;
}

.device-count {
  min-width: 58px;
  margin-inline-end: 0;
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
  font-weight: 700;
  text-align: center;
}

.enter-button {
  height: 32px;
  padding: 0;
  color: #1769e0;
  white-space: nowrap;
}

.picker-empty {
  padding: 48px 0 42px;
}

:global(.periodic-plan-picker-dialog .ant-modal) {
  max-width: calc(100vw - 24px);
}

:global(.periodic-plan-picker-dialog .ant-modal-header) {
  margin-bottom: 18px;
}

:global(.periodic-plan-picker-dialog .ant-modal-title) {
  color: #172033;
  font-size: 18px;
  font-weight: 800;
}
</style>
