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
  /** 汇总区域标题。 */
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

/** 仅增加展示元数据的响应式视图模型，不改变后端统计值。 */
const viewModel = computed(() =>
  props.summary ? buildFlowStatusViewModel(props.summary) : { overview: [], dimensions: [] }
)

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
  <a-card class="flow-status-summary" :bordered="false">
    <template #title>
      <h2>{{ title }}</h2>
    </template>
    <template v-if="summary" #extra>
      <span class="snapshot-time">快照时间：{{ formatSnapshotTime(summary.snapshotAt) }}</span>
    </template>

    <a-skeleton v-if="loading" active :paragraph="{ rows: 4 }" />
    <a-empty v-else-if="!summary" :description="emptyText" />

    <div v-else class="summary-content">
      <div v-if="viewModel.overview.length" class="overview-grid" aria-label="流程概览指标">
        <div v-for="metric in viewModel.overview" :key="metric.metricCode" class="overview-metric">
          <a-statistic
            :title="metric.label"
            :value="metric.value"
            :suffix="metric.countUnitLabel"
          />
        </div>
      </div>

      <div class="dimension-list">
        <section
          v-for="dimension in viewModel.dimensions"
          :key="dimension.dimensionCode"
          class="dimension-section"
          :aria-label="dimension.label"
        >
          <header class="dimension-header">
            <div>
              <h3>{{ dimension.label }}</h3>
              <span>统计单位：{{ dimension.countUnitName }}（{{ dimension.countUnitLabel }}）</span>
            </div>
            <strong>{{ dimension.totalCount }} {{ dimension.countUnitLabel }}</strong>
          </header>

          <div v-if="dimension.stages.length" class="stage-list">
            <a-tag
              v-for="stage in dimension.stages"
              :key="stage.stageCode"
              :class="['flow-stage-tag', `flow-stage-tag--${stage.tone}`]"
            >
              <span>{{ stage.label }}</span>
              <strong>{{ stage.count }} {{ stage.countUnitLabel }}</strong>
            </a-tag>
          </div>
          <a-empty v-else class="dimension-empty" description="暂无已分类状态" :image="null" />

          <div v-if="dimension.hasWarning" class="dimension-warnings">
            <a-alert
              v-if="dimension.unknownCount > 0"
              type="error"
              show-icon
              :message="unknownCountMessage(dimension)"
            />
            <a-alert
              v-if="dimension.unregisteredStageCodes.length > 0"
              type="error"
              show-icon
              :message="unregisteredStageMessage(dimension)"
            />
            <a-alert
              v-for="issue in validationIssues.filter((item) => item.dimensionCode === dimension.dimensionCode)"
              :key="issue.message"
              type="error"
              show-icon
              :message="issue.message"
            />
          </div>
        </section>
      </div>
    </div>
  </a-card>
</template>

<style scoped>
.flow-status-summary {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.flow-status-summary :deep(.ant-card-head) {
  min-height: 49px;
  padding: 0 16px;
  border-bottom: 1px solid #e5eaf1;
}

.flow-status-summary :deep(.ant-card-body) {
  padding: 0;
}

.flow-status-summary h2,
.flow-status-summary h3 {
  margin: 0;
  color: #172033;
  letter-spacing: 0;
}

.flow-status-summary h2 {
  font-size: 16px;
  font-weight: 700;
}

.flow-status-summary h3 {
  font-size: 14px;
  font-weight: 700;
}

.snapshot-time {
  color: #667085;
  font-size: 12px;
}

.summary-content {
  min-width: 0;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.overview-metric {
  min-width: 0;
  padding: 14px 16px;
  border-right: 1px solid #e5eaf1;
}

.overview-metric:last-child {
  border-right: 0;
}

.overview-metric :deep(.ant-statistic-title) {
  margin-bottom: 5px;
  color: #667085;
  font-size: 12px;
}

.overview-metric :deep(.ant-statistic-content) {
  color: #172033;
  font-size: 23px;
  line-height: 1.25;
}

.overview-metric :deep(.ant-statistic-content-suffix) {
  margin-left: 5px;
  color: #667085;
  font-size: 13px;
}

.dimension-list {
  display: grid;
}

.dimension-section {
  min-width: 0;
  padding: 14px 16px;
  border-bottom: 1px solid #e5eaf1;
}

.dimension-section:last-child {
  border-bottom: 0;
}

.dimension-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.dimension-header div {
  min-width: 0;
}

.dimension-header span {
  display: block;
  margin-top: 4px;
  color: #667085;
  font-size: 12px;
}

.dimension-header > strong {
  flex: 0 0 auto;
  color: #172033;
  font-size: 16px;
}

.stage-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
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

@media (max-width: 720px) {
  .flow-status-summary :deep(.ant-card-head) {
    align-items: flex-start;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .flow-status-summary :deep(.ant-card-extra) {
    margin-left: 12px;
    white-space: normal;
    text-align: right;
  }

  .overview-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-metric:nth-child(2n) {
    border-right: 0;
  }

  .dimension-header {
    align-items: flex-start;
  }
}

@media (max-width: 420px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .overview-metric {
    border-right: 0;
    border-bottom: 1px solid #e5eaf1;
  }

  .overview-metric:last-child {
    border-bottom: 0;
  }

  .dimension-header {
    flex-direction: column;
    gap: 6px;
  }
}
</style>
