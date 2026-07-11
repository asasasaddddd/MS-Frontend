<script setup lang="ts">
import { computed } from 'vue'
import type { EntityId, PeriodicTaskVO } from '../../../types/periodic'
import {
  getPeriodicTableColumns,
  mapPeriodicTaskRow,
  rowKeyOf,
  type PeriodicDisplayRowWithMeta,
  type PeriodicTableRole
} from '../periodicDisplayModel'

const props = withDefaults(
  defineProps<{
    tasks?: PeriodicTaskVO[]
    role?: PeriodicTableRole
    loading?: boolean
    selectable?: boolean
    selectedRowKeys?: EntityId[]
  }>(),
  {
    tasks: () => [],
    role: 'admin',
    loading: false,
    selectable: false,
    selectedRowKeys: () => []
  }
)

const emit = defineEmits<{
  process: [task: PeriodicTaskVO]
  detail: [task: PeriodicTaskVO]
  selectionChange: [keys: EntityId[], tasks: PeriodicTaskVO[]]
}>()

const columns = computed(() => getPeriodicTableColumns(props.role))
const rows = computed(() => props.tasks.map(mapPeriodicTaskRow))
const taskById = computed(() => new Map(props.tasks.map((task) => [String(task.id), task])))
const scrollX = computed(() => columns.value.reduce((sum, column) => sum + (column.width || 120), 0))

const rowSelection = computed(() => {
  if (!props.selectable) return undefined
  return {
    selectedRowKeys: props.selectedRowKeys,
    onChange: (keys: EntityId[]) => {
      emit(
        'selectionChange',
        keys,
        keys.map((key) => taskById.value.get(String(key))).filter((task): task is PeriodicTaskVO => Boolean(task))
      )
    }
  }
})

function findTask(row: PeriodicDisplayRowWithMeta) {
  return taskById.value.get(String(row.taskId))
}

function handleProcess(row: PeriodicDisplayRowWithMeta) {
  const task = findTask(row)
  if (task) emit('process', task)
}

function handleDetail(row: PeriodicDisplayRowWithMeta) {
  const task = findTask(row)
  if (task) emit('detail', task)
}

function cellText(row: PeriodicDisplayRowWithMeta, key: unknown) {
  if (typeof key !== 'string' || !(key in row)) return ''
  return String(row[key as keyof PeriodicDisplayRowWithMeta] ?? '-')
}

function isDisplayColumn(key: unknown) {
  return typeof key === 'string' && key !== 'action' && key !== 'currentNodeName'
}
</script>

<template>
  <a-table
    class="periodic-task-table"
    :columns="columns"
    :data-source="rows"
    :loading="loading"
    :pagination="{ pageSize: 10, showSizeChanger: false }"
    :row-key="rowKeyOf"
    :row-selection="rowSelection"
    :scroll="{ x: scrollX }"
    size="middle"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'currentNodeName'">
        <a-tag :class="['periodic-tag', record.tagColor]">{{ record.currentNodeName }}</a-tag>
      </template>
      <template v-else-if="column.key === 'action'">
        <a-space :size="4">
          <a-button type="link" class="button-link" @click="handleDetail(record)">查看</a-button>
          <a-button type="link" class="button-link" @click="handleProcess(record)">处理</a-button>
        </a-space>
      </template>
      <template v-else-if="isDisplayColumn(column.key)">
        <span class="cell-ellipsis" :title="cellText(record, column.key)">
          {{ cellText(record, column.key) }}
        </span>
      </template>
    </template>
  </a-table>
</template>

<style scoped>
.periodic-task-table :deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

.periodic-task-table :deep(.ant-table) {
  table-layout: fixed;
}

.periodic-task-table :deep(.ant-table-cell) {
  overflow: hidden;
  white-space: nowrap;
}

.cell-ellipsis {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button-link {
  height: 30px;
  padding: 0 6px;
  color: #1769e0;
}

.periodic-tag {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  border-radius: 6px;
  font-size: 12px;
}

.periodic-tag.blue {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.periodic-tag.green {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.periodic-tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.periodic-tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.periodic-tag.cyan {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}
</style>
