<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SelectProps } from 'ant-design-vue'
import type { WorkflowTodoDashboard } from '@/types/workflow'
import {
  buildWorkspaceDashboardRows,
  workspaceDashboardDefinitions
} from '@/views/workspaceTodoDashboardModel'
import type { WorkspaceTodoType } from '@/views/workspaceTodoModel'

interface Props {
  dashboard?: WorkflowTodoDashboard | null
  selectedType: WorkspaceTodoType
  loading?: boolean
  error?: unknown
}

const props = withDefaults(defineProps<Props>(), {
  dashboard: null,
  loading: false,
  error: undefined
})

const emit = defineEmits<{
  retry: []
  selectType: [type: WorkspaceTodoType]
  open: [type: Exclude<WorkspaceTodoType, 'all'>]
}>()

const filterOptions: SelectProps['options'] = [
  { label: '全部类型', value: 'all' },
  ...workspaceDashboardDefinitions.map((item) => ({
    label: item.title,
    value: item.type
  }))
]
const skeletonRows = Object.freeze([0, 1, 2, 3, 4])
const skeletonSummaries = Object.freeze([0, 1, 2])
const liveUpdateText = ref('')
const rows = computed(() => buildWorkspaceDashboardRows(
  props.error ? null : props.dashboard,
  props.selectedType
))
const pendingActionCount = computed(() =>
  props.error ? null : props.dashboard?.overview.pendingActionCount ?? null
)
const todayNewActionCount = computed(() =>
  props.error ? null : props.dashboard?.overview.todayNewActionCount ?? null
)

function displayCount(value: number | null | undefined) {
  return value === null || value === undefined ? '--' : value
}

function formatSnapshotTime(value?: string) {
  if (!value) return '--'
  return value.replace('T', ' ').slice(0, 16)
}

function selectType(value: WorkspaceTodoType) {
  emit('selectType', value)
}

watch(
  () => props.dashboard?.snapshotAt,
  (snapshotAt, previousSnapshotAt) => {
    if (!snapshotAt || snapshotAt === previousSnapshotAt) return
    liveUpdateText.value = `当前待办已更新为 ${props.dashboard?.overview.pendingActionCount ?? 0} 项操作`
  }
)
</script>

<template>
  <section class="workspace-dashboard" aria-label="统一待办仪表盘">
    <div v-if="loading" class="dashboard-summary-grid" aria-hidden="true">
      <div
        v-for="item in skeletonSummaries"
        :key="item"
        class="dashboard-skeleton-summary dashboard-skeleton"
      />
    </div>

    <div v-else class="dashboard-summary-grid">
      <a-card class="dashboard-metric dashboard-metric--today" :bordered="false">
        <a-statistic
          title="今日新增"
          :value="displayCount(todayNewActionCount)"
          suffix="项操作"
        />
      </a-card>
      <a-card class="dashboard-metric dashboard-metric--pending" :bordered="false">
        <a-statistic
          title="当前待办"
          :value="displayCount(pendingActionCount)"
          suffix="项操作"
        />
      </a-card>
      <a-card class="dashboard-composition" :bordered="false">
        <div class="dashboard-composition__header">
          <strong>待办构成</strong>
          <span>{{ formatSnapshotTime(dashboard?.snapshotAt) }}</span>
        </div>
        <div class="dashboard-composition__tags">
          <a-tag v-for="row in rows" :key="row.type">
            {{ row.title }} {{ displayCount(row.pendingActionCount) }} 项
          </a-tag>
        </div>
      </a-card>
    </div>

    <a-card class="dashboard-table-panel" :bordered="false">
      <template #title>
        <h2>流程任务</h2>
      </template>
      <template #extra>
        <span class="dashboard-total dashboard-number">
          {{ displayCount(pendingActionCount) }} 项待办
        </span>
      </template>

      <div class="dashboard-toolbar">
        <label class="sr-only" for="workspace-dashboard-business-filter">业务类型筛选</label>
        <a-select
          id="workspace-dashboard-business-filter"
          class="dashboard-filter"
          :value="selectedType"
          :options="filterOptions"
          @update:value="selectType"
        />
        <a-button v-if="error" danger @click="emit('retry')">重试</a-button>
      </div>

      <table class="dashboard-table">
        <thead>
          <tr>
            <th>业务类型</th>
            <th>待操作</th>
            <th>业务单据</th>
            <th>涉及对象</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody v-if="loading" aria-hidden="true">
          <tr v-for="item in skeletonRows" :key="item" class="dashboard-skeleton-row">
            <td colspan="5"><span class="dashboard-skeleton" /></td>
          </tr>
        </tbody>
        <tbody v-else>
          <tr
            v-for="row in rows"
            :key="row.type"
            :class="{
              'dashboard-row--zero': row.pendingActionCount === 0,
              'dashboard-row--selected': row.type === selectedType
            }"
            @click="emit('open', row.type)"
          >
            <th class="dashboard-cell--title" scope="row">{{ row.title }}</th>
            <td class="dashboard-cell--actions" data-label="待操作">
              <strong class="dashboard-number">{{ displayCount(row.pendingActionCount) }} 项</strong>
            </td>
            <td class="dashboard-cell--documents" data-label="业务单据">
              <span class="dashboard-number">{{ displayCount(row.containerCount) }} 张</span>
            </td>
            <td class="dashboard-cell--objects" data-label="涉及对象">
              <span class="dashboard-number">{{ row.affectedItemText }}</span>
            </td>
            <td class="dashboard-cell--link" data-label="操作">
              <a-button
                type="link"
                :aria-label="`查看${row.title}待办`"
                @click.stop="emit('open', row.type)"
              >
                查看
              </a-button>
            </td>
          </tr>
        </tbody>
      </table>
      <span class="sr-only" aria-live="polite">{{ liveUpdateText }}</span>
    </a-card>
  </section>
</template>

<style scoped>
.workspace-dashboard {
  min-width: 0;
  display: grid;
  gap: 14px;
  color: #172033;
}

.dashboard-summary-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(150px, 0.72fr) minmax(150px, 0.72fr) minmax(320px, 1.56fr);
  gap: 12px;
}

.dashboard-metric,
.dashboard-composition,
.dashboard-table-panel,
.dashboard-skeleton-summary {
  min-width: 0;
  border: 1px solid #e4e9f0;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(23, 32, 51, 0.04);
}

.dashboard-metric :deep(.ant-card-body),
.dashboard-composition :deep(.ant-card-body) {
  min-height: 116px;
  padding: 18px;
}

.dashboard-metric--today {
  border-top: 3px solid #169b62;
}

.dashboard-metric--pending {
  border-top: 3px solid #1769e0;
}

.dashboard-metric :deep(.ant-statistic-title) {
  margin-bottom: 10px;
  color: #667085;
  font-size: 13px;
}

.dashboard-metric :deep(.ant-statistic-content) {
  color: #172033;
  font-variant-numeric: tabular-nums;
}

.dashboard-metric :deep(.ant-statistic-content-value) {
  font-size: 30px;
  font-weight: 750;
}

.dashboard-metric :deep(.ant-statistic-content-suffix) {
  margin-left: 6px;
  color: #667085;
  font-size: 13px;
}

.dashboard-composition__header {
  min-width: 0;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.dashboard-composition__header strong {
  font-size: 15px;
}

.dashboard-composition__header span {
  color: #8a94a6;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.dashboard-composition__tags {
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 16px;
}

.dashboard-composition__tags :deep(.ant-tag) {
  margin: 0;
  border-color: #d8e0ea;
  border-radius: 4px;
  background: #f7f9fc;
  color: #344054;
  line-height: 24px;
}

.dashboard-table-panel {
  overflow: hidden;
}

.dashboard-table-panel :deep(.ant-card-head) {
  min-height: 54px;
  padding: 0 18px;
  border-bottom: 1px solid #e5eaf1;
}

.dashboard-table-panel :deep(.ant-card-body) {
  padding: 0;
}

.dashboard-table-panel h2 {
  margin: 0;
  color: #172033;
  font-size: 17px;
  font-weight: 750;
}

.dashboard-total {
  color: #b54708;
  font-size: 13px;
  font-weight: 700;
}

.dashboard-toolbar {
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-bottom: 1px solid #edf0f4;
  background: #fafbfd;
}

.dashboard-filter {
  width: min(220px, 100%);
}

.dashboard-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
}

.dashboard-table th,
.dashboard-table td {
  min-width: 0;
  padding: 13px 18px;
  border-bottom: 1px solid #edf0f4;
  overflow-wrap: anywhere;
  text-align: left;
}

.dashboard-table thead th {
  background: #f6f8fb;
  color: #667085;
  font-size: 12px;
  font-weight: 650;
}

.dashboard-table thead th:nth-child(2),
.dashboard-table thead th:nth-child(3),
.dashboard-table thead th:nth-child(4),
.dashboard-cell--actions,
.dashboard-cell--documents,
.dashboard-cell--objects {
  width: 132px;
  text-align: right;
}

.dashboard-table thead th:last-child,
.dashboard-cell--link {
  width: 76px;
  text-align: right;
}

.dashboard-table tbody tr {
  cursor: pointer;
  outline: none;
}

.dashboard-table tbody tr:hover,
.dashboard-table tbody tr:focus-visible,
.dashboard-row--selected {
  background: #f5f8fd;
}

.dashboard-cell--title {
  color: #263247;
  font-size: 14px;
  font-weight: 650;
}

.dashboard-cell--actions strong {
  color: #175cd3;
  font-weight: 750;
}

.dashboard-row--zero .dashboard-cell--title,
.dashboard-row--zero .dashboard-number {
  color: #98a2b3;
}

.dashboard-cell--link :deep(.ant-btn) {
  height: 30px;
  padding: 0;
}

.dashboard-number {
  font-variant-numeric: tabular-nums;
  transition: color 180ms ease;
}

.dashboard-skeleton {
  position: relative;
  display: block;
  overflow: hidden;
  background: #edf1f5;
}

.dashboard-skeleton::after {
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
  content: '';
  animation: dashboard-shimmer 1.2s linear infinite;
}

.dashboard-skeleton-summary {
  height: 118px;
}

.dashboard-skeleton-row td {
  height: 55px;
}

.dashboard-skeleton-row .dashboard-skeleton {
  width: 100%;
  height: 14px;
  border-radius: 4px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes dashboard-shimmer {
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
}

@media (max-width: 860px) {
  .dashboard-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-composition,
  .dashboard-skeleton-summary:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .dashboard-summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .dashboard-metric :deep(.ant-card-body),
  .dashboard-composition :deep(.ant-card-body) {
    min-height: 104px;
    padding: 14px;
  }

  .dashboard-toolbar {
    padding: 10px 12px;
  }

  .dashboard-filter {
    width: 100%;
  }

  .dashboard-table {
    display: block;
  }

  .dashboard-table thead {
    display: none;
  }

  .dashboard-table tbody {
    display: block;
  }

  .dashboard-table tbody tr:not(.dashboard-skeleton-row) {
    min-width: 0;
    display: grid;
    grid-template-columns: minmax(0, 1fr) 84px 54px;
    grid-template-areas:
      'title actions link'
      'documents objects objects';
    column-gap: 8px;
    row-gap: 7px;
    padding: 12px;
    border-bottom: 1px solid #edf0f4;
  }

  .dashboard-table th,
  .dashboard-table td {
    width: auto;
    padding: 0;
    border: 0;
  }

  .dashboard-cell--title { grid-area: title; }
  .dashboard-cell--actions { grid-area: actions; }
  .dashboard-cell--documents { grid-area: documents; }
  .dashboard-cell--objects { grid-area: objects; }
  .dashboard-cell--link { grid-area: link; }

  .dashboard-cell--actions,
  .dashboard-cell--link {
    text-align: right;
  }

  .dashboard-cell--documents,
  .dashboard-cell--objects {
    color: #667085;
    font-size: 12px;
    text-align: left;
  }

  .dashboard-cell--documents::before,
  .dashboard-cell--objects::before {
    margin-right: 5px;
    color: #98a2b3;
  }

  .dashboard-cell--documents::before { content: '单据'; }
  .dashboard-cell--objects::before { content: '对象'; }

  .dashboard-skeleton-row {
    display: block;
  }

  .dashboard-skeleton-row td {
    display: block;
    height: 55px;
    padding: 20px 12px;
  }
}

@media (max-width: 420px) {
  .dashboard-summary-grid {
    grid-template-columns: 1fr;
  }

  .dashboard-composition,
  .dashboard-skeleton-summary:last-child {
    grid-column: auto;
  }
}
</style>
