<script setup lang="ts">
import { computed } from 'vue'
import type { SamplingEntityId, SamplingTaskVO } from '@/types/sampling'
import {
  getSamplingTableColumns,
  mapSamplingTaskRow,
  resolveSamplingTaskAction,
  rowKeyOf,
  samplingTagColor,
  type SamplingTableRole
} from '../samplingDisplayModel'

const props = withDefaults(
  defineProps<{
    tasks: SamplingTaskVO[]
    role: SamplingTableRole
    loading?: boolean
    selectable?: boolean
    selectableTask?: (task: SamplingTaskVO) => boolean
    selectedRowKeys?: SamplingEntityId[]
  }>(),
  {
    loading: false,
    selectable: true,
    selectableTask: () => true,
    selectedRowKeys: () => []
  }
)

const emit = defineEmits<{
  'selection-change': [keys: SamplingEntityId[], rows: SamplingTaskVO[]]
  detail: [task: SamplingTaskVO]
  process: [task: SamplingTaskVO]
}>()

const rows = computed(() => props.tasks.map(mapSamplingTaskRow))
const columns = computed(() => getSamplingTableColumns(props.role))
const taskById = computed(() => new Map(props.tasks.map((task) => [String(task.id), task])))

const rowSelection = computed(() => {
  if (!props.selectable) return undefined
  return {
    selectedRowKeys: props.selectedRowKeys,
    getCheckboxProps: (row: { taskId: SamplingEntityId }) => {
      const task = taskById.value.get(String(row.taskId))
      return { disabled: !task || !props.selectableTask(task) }
    },
    onChange: (keys: SamplingEntityId[]) => {
      const selectedTasks = keys
        .map((key) => taskById.value.get(String(key)))
        .filter((task): task is SamplingTaskVO => Boolean(task))
      emit('selection-change', keys, selectedTasks)
    }
  }
})

function findTask(taskId: SamplingEntityId) {
  return taskById.value.get(String(taskId))
}

function openDetail(taskId: SamplingEntityId) {
  const task = findTask(taskId)
  if (task) emit('detail', task)
}

function openProcess(taskId: SamplingEntityId) {
  const task = findTask(taskId)
  if (task) emit('process', task)
}

function canProcess(taskId: SamplingEntityId) {
  const task = findTask(taskId)
  return Boolean(task && resolveSamplingTaskAction(task))
}
</script>

<template>
  <a-table
    :columns="columns"
    :data-source="rows"
    :loading="loading"
    :pagination="{ pageSize: 10, showSizeChanger: false }"
    :row-key="rowKeyOf"
    :row-selection="rowSelection"
    :scroll="{ x: role === 'admin' ? 1320 : 1420 }"
    size="middle"
  >
    <template #bodyCell="{ column, record }">
      <template v-if="column.key === 'currentNodeName'">
        <a-tag :class="['tag', samplingTagColor(record.currentNode)]">{{ record.currentNodeName }}</a-tag>
      </template>
      <template v-else-if="column.key === 'action'">
        <a-space>
          <a-button v-if="canProcess(record.taskId)" type="link" class="table-link" @click="openProcess(record.taskId)">处理</a-button>
          <a-button type="link" class="table-link muted" @click="openDetail(record.taskId)">详情</a-button>
        </a-space>
      </template>
      <template v-else>
        <span class="cell-text" :title="String(record[column.key] || '-')">{{ record[column.key] }}</span>
      </template>
    </template>
  </a-table>
</template>

<style scoped>
:deep(.ant-table-thead > tr > th) {
  background: #f8fafc;
  color: #344054;
  font-weight: 700;
}

:deep(.ant-table-tbody > tr > td) {
  color: #172033;
}

.cell-text {
  max-width: 100%;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
  white-space: nowrap;
}

.table-link {
  padding: 0;
  color: #1769e0;
}

.table-link.muted {
  color: #667085;
}

.tag {
  border-radius: 999px;
  font-weight: 600;
}

.tag.blue {
  border-color: #b2ddff;
  background: #eff8ff;
  color: #175cd3;
}

.tag.cyan {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}

.tag.orange {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.tag.green {
  border-color: #abefc6;
  background: #ecfdf3;
  color: #067647;
}

.tag.red {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}
</style>
