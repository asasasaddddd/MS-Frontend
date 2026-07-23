<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { CheckOutlined, CloseOutlined, RightOutlined } from '@ant-design/icons-vue'
import type { FlowDimensionCode, FlowSummary } from '@/types/flowSummary'
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
  /** 汇总区域的无障碍名称和展开详情来源标题。 */
  title?: string
  /** 后端未返回快照时的空状态文案。 */
  emptyText?: string
}

/** 公共汇总分块的稳定编码。 */
type FlowStatusGroupCode = 'process' | 'physical' | 'label'

/** 汇总分块的展示定义。 */
interface FlowStatusGroupDefinition {
  /** 分块稳定编码。 */
  code: FlowStatusGroupCode
  /** 分块中文名称。 */
  label: string
  /** 归入该分块的后端统计维度。 */
  dimensionCodes: readonly FlowDimensionCode[]
}

/** 可点击汇总分块的完整展示模型。 */
interface FlowStatusGroupView extends FlowStatusGroupDefinition {
  /** 当前分块包含的真实后端汇总维度。 */
  dimensions: FlowDimensionView[]
  /** 分块中是否存在未知状态或数量守恒问题。 */
  hasWarning: boolean
}

/**
 * 所有业务共用的三类页面分块。
 *
 * 业务节点、审批结果和异常归入业务流程；扫码属于实物交接条件；标签保持独立。
 */
const FLOW_STATUS_GROUP_DEFINITIONS: readonly FlowStatusGroupDefinition[] = [
  {
    code: 'process',
    label: '业务流程',
    dimensionCodes: ['business', 'workflow', 'result', 'exception']
  },
  {
    code: 'physical',
    label: '实物交接',
    dimensionCodes: ['physical', 'scan']
  },
  {
    code: 'label',
    label: '标签状态',
    dimensionCodes: ['label']
  }
]

const props = withDefaults(defineProps<FlowStatusSummaryProps>(), {
  summary: null,
  loading: false,
  title: '流程状态汇总',
  emptyText: '暂无流程状态汇总'
})

/** 当前展开的公共汇总分块；空字符串表示保持旧版紧凑摘要高度。 */
const activeGroupCode = ref<FlowStatusGroupCode | ''>('')

/** 仅增加展示元数据的响应式视图模型，不改变后端统计口径。 */
const viewModel = computed(() =>
  props.summary ? buildFlowStatusViewModel(props.summary) : { overview: [], dimensions: [] }
)

/** 后端总数与分类数量不守恒时需要展示和记录的契约问题。 */
const validationIssues = computed(() =>
  props.summary ? validateFlowSummary(props.summary) : []
)

/** 按生产业务语义归并后的可点击分块，仅展示后端实际返回的维度。 */
const dimensionGroups = computed<FlowStatusGroupView[]>(() =>
  FLOW_STATUS_GROUP_DEFINITIONS.map((definition) => {
    const dimensions = viewModel.value.dimensions.filter((dimension) =>
      definition.dimensionCodes.includes(dimension.dimensionCode)
    )
    return {
      ...definition,
      dimensions,
      hasWarning: dimensions.some((dimension) => dimension.hasWarning)
    }
  }).filter((group) => group.dimensions.length > 0)
)

/** 当前展开分块的完整视图模型。 */
const activeGroup = computed(() =>
  dimensionGroups.value.find((group) => group.code === activeGroupCode.value) || null
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
 * 选择指定状态分块。
 *
 * 重复点击当前分块时保持展开，只有详情右上角的关闭按钮负责收起，
 * 避免连续点击或切换分块时意外清空详情。
 *
 * @param groupCode 用户点击的公共分块编码。
 */
function selectDimension(groupCode: FlowStatusGroupCode): void {
  activeGroupCode.value = groupCode
}

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
    <div v-if="loading" class="summary-state-card">
      <a-skeleton active :paragraph="{ rows: 2 }" />
    </div>
    <div v-else-if="!summary" class="summary-state-card">
      <a-empty :description="emptyText" />
    </div>

    <template v-else>
      <div class="summary-line">
        <div v-if="viewModel.overview.length" class="overview-metrics" aria-label="流程概览指标">
          <a-card
            v-for="metric in viewModel.overview"
            :key="metric.metricCode"
            class="overview-metric"
            :bordered="false"
          >
            <a-statistic
              :title="metric.label"
              :value="metric.value"
              :suffix="metric.countUnitLabel"
            />
          </a-card>
        </div>

        <div v-if="dimensionGroups.length" class="dimension-quick-links" aria-label="流程状态分类">
          <span class="status-check" aria-hidden="true"><CheckOutlined /></span>
          <button
            v-for="group in dimensionGroups"
            :key="group.code"
            type="button"
            :class="[
              'dimension-quick-link',
              { 'dimension-quick-link--active': activeGroupCode === group.code },
              { 'dimension-quick-link--warning': group.hasWarning }
            ]"
            :aria-expanded="activeGroupCode === group.code"
            @click.stop="selectDimension(group.code)"
          >
            <span class="dimension-quick-link__label">{{ group.label }}</span>
            <span class="dimension-quick-link__meta">{{ group.dimensions.length }} 类</span>
            <RightOutlined class="dimension-quick-link__icon" />
          </button>
        </div>
      </div>

      <section
        v-if="activeGroup"
        :key="activeGroup.code"
        class="dimension-detail"
        :aria-label="`${activeGroup.label}详情`"
      >
        <header class="dimension-detail__header">
          <div>
            <h3>{{ activeGroup.label }}</h3>
            <span>{{ title }} · 快照时间：{{ formatSnapshotTime(summary.snapshotAt) }}</span>
          </div>
          <a-tooltip title="收起详情">
            <a-button
              type="text"
              shape="circle"
              aria-label="收起详情"
              @click="activeGroupCode = ''"
            >
              <template #icon><CloseOutlined /></template>
            </a-button>
          </a-tooltip>
        </header>

        <section
          v-for="dimension in activeGroup.dimensions"
          :key="dimension.dimensionCode"
          class="dimension-section"
          :aria-label="dimension.label"
        >
          <header class="dimension-header">
            <div>
              <h4>{{ dimension.label }}</h4>
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
      </section>
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

.summary-line {
  display: flex;
  align-items: stretch;
  gap: 14px;
}

.overview-metrics {
  display: flex;
  align-items: stretch;
  flex-wrap: wrap;
  gap: 14px;
}

.overview-metric {
  width: 140px;
  min-height: 76px;
  flex: 0 0 auto;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.overview-metric :deep(.ant-card-body) {
  padding: 12px 16px;
}

.overview-metric :deep(.ant-statistic-title) {
  margin-bottom: 4px;
  color: #667085;
  font-size: 13px;
}

.overview-metric :deep(.ant-statistic-content) {
  color: #172033;
  font-size: 22px;
  line-height: 1.2;
}

.overview-metric :deep(.ant-statistic-content-suffix) {
  margin-left: 4px;
  color: #667085;
  font-size: 13px;
}

.dimension-quick-links {
  min-width: 280px;
  display: flex;
  align-items: center;
  flex: 1;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid #d9f3e5;
  border-radius: 8px;
  background: #fbfffd;
}

.status-check {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #12b76a;
  color: #ffffff;
  font-size: 13px;
}

.dimension-quick-link {
  min-width: 132px;
  height: 38px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 14px;
  align-items: center;
  gap: 7px;
  padding: 0 10px;
  border: 1px solid #d0d5dd;
  border-radius: 6px;
  background: #ffffff;
  color: #344054;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color 0.16s ease, background-color 0.16s ease, color 0.16s ease;
}

.dimension-quick-link:hover,
.dimension-quick-link:focus-visible,
.dimension-quick-link--active {
  border-color: #84adff;
  background: #eef5ff;
  color: #175cd3;
  outline: none;
}

.dimension-quick-link--warning {
  border-color: #fda29b;
  background: #fff7f6;
  color: #b42318;
}

.dimension-quick-link__label {
  overflow: hidden;
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dimension-quick-link__meta {
  color: currentColor;
  font-size: 12px;
  opacity: 0.72;
  white-space: nowrap;
}

.dimension-quick-link__icon {
  font-size: 11px;
  transition: transform 0.16s ease;
}

.dimension-quick-link--active .dimension-quick-link__icon {
  transform: rotate(90deg);
}

.dimension-detail {
  margin-top: 10px;
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.dimension-detail__header {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 14px;
  border-bottom: 1px solid #e5eaf1;
  background: #fbfcfe;
}

.dimension-detail h3,
.dimension-detail h4 {
  margin: 0;
  color: #172033;
  letter-spacing: 0;
}

.dimension-detail h3 {
  font-size: 15px;
  font-weight: 700;
}

.dimension-detail h4 {
  font-size: 14px;
  font-weight: 700;
}

.dimension-detail__header span,
.dimension-header span {
  display: block;
  margin-top: 3px;
  color: #667085;
  font-size: 12px;
}

.dimension-section {
  min-width: 0;
  padding: 12px 14px;
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
  margin-bottom: 9px;
}

.dimension-header > strong {
  flex: 0 0 auto;
  color: #172033;
  font-size: 15px;
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

@media (max-width: 1120px) {
  .summary-line {
    flex-direction: column;
  }

  .dimension-quick-links {
    min-width: 0;
  }
}

@media (max-width: 720px) {
  .overview-metrics {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .overview-metric {
    width: auto;
  }

  .dimension-quick-links {
    align-items: stretch;
  }

  .status-check {
    align-self: center;
  }

  .dimension-quick-link {
    min-width: calc(50% - 24px);
    flex: 1 1 calc(50% - 24px);
  }

  .dimension-detail__header,
  .dimension-header {
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .overview-metrics {
    grid-template-columns: 1fr;
  }

  .dimension-quick-link {
    min-width: calc(100% - 34px);
    flex-basis: calc(100% - 34px);
  }

  .dimension-detail__header span {
    line-height: 1.5;
  }

  .dimension-header {
    flex-direction: column;
    gap: 5px;
  }
}
</style>
