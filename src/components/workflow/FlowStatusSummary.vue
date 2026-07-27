<script setup lang="ts">
import { computed, watch } from 'vue'
import type { FlowSummary } from '@/types/flowSummary'
import {
  buildFlowStatusViewModel,
  validateFlowSummary,
  type FlowDimensionView
} from '@/components/workflow/flowStatusDefinitions'

/** 统一流程状态组件的输入契约。 */
interface FlowStatusSummaryProps {
  /** 后端返回的一致性汇总快照；组件不会接收任务明细进行补算。 */
  summary?: FlowSummary | null
  /** 汇总接口请求期间是否展示加载骨架。 */
  loading?: boolean
  /** 汇总接口失败原因；失败时不得伪装成零值。 */
  error?: unknown
  /** 汇总区域的无障碍名称和展开详情来源标题。 */
  title?: string
  /** 后端未返回快照时的空状态文案。 */
  emptyText?: string
}

const props = withDefaults(defineProps<FlowStatusSummaryProps>(), {
  summary: null,
  loading: false,
  title: '流程状态汇总',
  emptyText: '暂无流程状态汇总'
})

/** 仅增加展示元数据的响应式视图模型，不改变后端统计口径。 */
const viewModel = computed(() =>
  props.summary
    ? buildFlowStatusViewModel(props.summary)
    : { overview: [], dimensions: [], pendingDimension: undefined }
)

const todayMetric = computed(() =>
  viewModel.value.overview.find((metric) => metric.metricCode === 'today_new')
)

const pendingMetric = computed(() =>
  viewModel.value.overview.find((metric) => metric.metricCode === 'pending')
)

const errorMessage = computed(() => {
  if (typeof props.error === 'string') return props.error
  if (props.error instanceof Error && props.error.message) return props.error.message
  return '流程汇总加载失败，请稍后重试'
})

/** 后端总数与分类数量不守恒时需要展示和记录的契约问题。 */
const validationIssues = computed(() =>
  props.summary ? validateFlowSummary(props.summary) : []
)

/** 未知状态和契约问题的稳定日志键，避免同一快照重复记录。 */
const dataQualityLogKey = computed(() => {
  if (!props.summary) return ''
  const dimensionWarnings = viewModel.value.dimensions
    .filter((dimension) => dimension.hasWarning)
    .map((dimension) =>
      [
        dimension.dimensionCode,
        dimension.unknownCount,
        ...dimension.unregisteredStageCodes
      ].join(':')
    )
  const contractWarnings = validationIssues.value.map((issue) => issue.message)
  return [...dimensionWarnings, ...contractWarnings].join('|')
})

/**
 * 将后端 ISO 快照时间转换为页面展示格式。
 *
 * @param value 后端快照时间。
 * @returns 本地化时间文本；无值时返回短横线。
 */
function formatSnapshotTime(value?: string): string {
  if (!value) return '-'
  const parsedTime = new Date(value)
  if (Number.isNaN(parsedTime.getTime())) return value.replace('T', ' ')
  return parsedTime.toLocaleString('zh-CN', { hour12: false })
}

/**
 * 生成后端未分类数量的显式告警文案。
 *
 * @param dimension 当前状态维度。
 * @returns 包含数量及单位的告警说明。
 */
function unknownCountMessage(dimension: FlowDimensionView): string {
  return `${dimension.label}存在 ${dimension.unknownCount} ${dimension.countUnitLabel}未知状态，请核对后端状态映射和原始数据。`
}

/**
 * 生成前端尚未登记状态码的显式告警文案。
 *
 * @param dimension 当前状态维度。
 * @returns 包含全部原始状态码的告警说明。
 */
function unregisteredStageMessage(dimension: FlowDimensionView): string {
  return `${dimension.label}收到未配置状态码：${dimension.unregisteredStageCodes.join('、')}。数量已原样展示，需补充集中状态定义。`
}

watch(
  dataQualityLogKey,
  (warningKey) => {
    if (!warningKey || !props.summary) return
    console.warn('[FlowStatusSummary] 流程汇总存在数据质量告警', {
      businessType: props.summary.businessType,
      scope: props.summary.scope,
      snapshotAt: props.summary.snapshotAt,
      warningKey
    })
  },
  { immediate: true }
)
</script>

<template>
  <section class="flow-status-summary" :aria-label="title">
    <div v-if="loading" class="summary-line summary-three-card-grid" aria-label="流程汇总加载中">
      <a-card v-for="index in 3" :key="index" class="summary-loading-card" :bordered="false">
        <a-skeleton active :paragraph="{ rows: index === 3 ? 2 : 1 }" />
      </a-card>
    </div>
    <a-card v-else-if="!summary && error" class="summary-state-card summary-state-card--error" :bordered="false">
      <a-alert type="error" show-icon :message="errorMessage" />
    </a-card>
    <a-card v-else-if="!summary" class="summary-state-card" :bordered="false">
      <a-empty :description="emptyText" />
    </a-card>

    <template v-else>
      <div class="summary-line summary-three-card-grid">
        <a-card class="summary-metric-card overview-metric summary-metric-card--today" :bordered="false">
          <a-statistic
            title="今日新增"
            :value="todayMetric?.value ?? 0"
            :suffix="todayMetric?.countUnitLabel || ''"
          />
          <span class="summary-card-caption">今日进入当前角色处理范围</span>
        </a-card>

        <a-card class="summary-metric-card overview-metric summary-metric-card--pending" :bordered="false">
          <a-statistic
            title="当前待办"
            :value="pendingMetric?.value ?? 0"
            :suffix="pendingMetric?.countUnitLabel || ''"
          />
          <span class="summary-card-caption">当前仍需处理的有效条目</span>
        </a-card>

        <a-card class="status-summary-card" :bordered="false" aria-label="当前待办状态">
          <div class="current-todo-status__header">
            <strong>状态汇总</strong>
            <span>快照时间：{{ formatSnapshotTime(summary.snapshotAt) }}</span>
          </div>
          <div v-if="viewModel.pendingDimension?.stages.length" class="stage-list">
            <a-tag
              v-for="stage in viewModel.pendingDimension.stages"
              :key="stage.stageCode"
              :class="['flow-stage-tag', `flow-stage-tag--${stage.tone}`]"
            >
              <span>{{ stage.label }}</span>
              <strong>{{ stage.count }} {{ stage.countUnitLabel }}</strong>
            </a-tag>
          </div>
          <a-empty v-else class="dimension-empty" description="暂无当前待办状态" :image="null" />
        </a-card>
      </div>

      <div
        v-if="viewModel.pendingDimension?.hasWarning"
        class="dimension-warnings"
      >
        <a-alert
          v-if="viewModel.pendingDimension.unknownCount > 0"
          type="error"
          show-icon
          :message="unknownCountMessage(viewModel.pendingDimension)"
        />
        <a-alert
          v-if="viewModel.pendingDimension.unregisteredStageCodes.length > 0"
          type="error"
          show-icon
          :message="unregisteredStageMessage(viewModel.pendingDimension)"
        />
        <a-alert
          v-for="issue in validationIssues.filter((item) => item.dimensionCode === viewModel.pendingDimension?.dimensionCode)"
          :key="issue.message"
          type="error"
          show-icon
          :message="issue.message"
        />
      </div>
    </template>
  </section>
</template>

<style scoped>
.flow-status-summary {
  min-width: 0;
}

.summary-state-card {
  padding: 16px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.summary-state-card--error {
  border-color: #fecdca;
  background: #fffafa;
}

.summary-three-card-grid {
  display: grid;
  grid-template-columns: minmax(156px, 0.72fr) minmax(156px, 0.72fr) minmax(320px, 2fr);
  gap: 14px;
}

.summary-loading-card,
.summary-metric-card,
.status-summary-card {
  position: relative;
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(16, 24, 40, 0.03);
}

.summary-metric-card::before,
.status-summary-card::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #1570ef;
  content: '';
}

.summary-metric-card--today::before {
  background: #0e9384;
}

.status-summary-card::before {
  background: #667085;
}

.summary-loading-card :deep(.ant-card-body),
.summary-metric-card :deep(.ant-card-body),
.status-summary-card :deep(.ant-card-body) {
  height: 100%;
  padding: 14px 16px 14px 18px;
}

.summary-metric-card :deep(.ant-statistic-title) {
  margin-bottom: 4px;
  color: #667085;
  font-size: 13px;
}

.summary-metric-card :deep(.ant-statistic-content) {
  color: #172033;
  font-size: 26px;
  font-weight: 650;
  line-height: 1.2;
}

.summary-metric-card :deep(.ant-statistic-content-suffix) {
  margin-left: 4px;
  color: #667085;
  font-size: 13px;
}

.summary-card-caption {
  display: block;
  margin-top: 7px;
  color: #98a2b3;
  font-size: 11px;
  line-height: 1.4;
}

.current-todo-status__header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  color: #172033;
  font-size: 13px;
}

.current-todo-status__header span {
  color: #667085;
  font-size: 12px;
  white-space: nowrap;
}

.stage-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.flow-stage-tag {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 3px 9px;
  border-radius: 6px;
  font-size: 12px;
  line-height: 20px;
}

.flow-stage-tag strong {
  font-weight: 700;
}

.flow-stage-tag--neutral {
  border-color: #d0d5dd;
  background: #f9fafb;
  color: #475467;
}

.flow-stage-tag--info {
  border-color: #a5f3fc;
  background: #ecfeff;
  color: #0e7490;
}

.flow-stage-tag--processing {
  border-color: #b7d3ff;
  background: #eef5ff;
  color: #175cd3;
}

.flow-stage-tag--success {
  border-color: #b7e4c7;
  background: #ecfdf3;
  color: #027a48;
}

.flow-stage-tag--warning {
  border-color: #fedf89;
  background: #fffaeb;
  color: #b54708;
}

.flow-stage-tag--error {
  border-color: #fecdca;
  background: #fef3f2;
  color: #b42318;
}

.dimension-warnings {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.dimension-empty {
  margin: 0;
  padding: 2px 0;
}

.dimension-empty :deep(.ant-empty-description) {
  margin: 0;
  color: #98a2b3;
  font-size: 12px;
}

@media (max-width: 1120px) {
  .summary-three-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-summary-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 720px) {
  .summary-three-card-grid {
    grid-template-columns: 1fr;
  }

  .status-summary-card {
    grid-column: auto;
  }

  .current-todo-status__header {
    align-items: flex-start;
    flex-direction: column;
    gap: 3px;
  }
}

</style>
