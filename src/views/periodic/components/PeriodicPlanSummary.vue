<script setup lang="ts">
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import type { FlowSummary } from '@/types/flowSummary'
import type { PeriodicPlanVO } from '@/types/periodic'

/** 周检计划基础信息与后端权威状态汇总的输入契约。 */
interface PeriodicPlanSummaryProps {
  /** 当前工作台打开的周检计划；未选择计划时为空。 */
  plan?: PeriodicPlanVO | null
  /** 后端在同一计划范围内生成的权威状态快照。 */
  summary?: FlowSummary | null
  /** 计划信息和状态汇总是否正在加载。 */
  loading?: boolean
}

const props = withDefaults(defineProps<PeriodicPlanSummaryProps>(), {
  plan: null,
  summary: null,
  loading: false
})

/**
 * 格式化后端日期字段，不进行任何流程或数量推算。
 *
 * @param value 后端 ISO 日期或日期时间。
 * @returns 页面使用的日期文本；无值时返回短横线。
 */
function displayDate(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 10) : '-'
}
</script>

<template>
  <section class="periodic-plan-summary">
    <a-card class="plan-panel" :bordered="false" :loading="loading && !plan">
      <template #title>
        <h2>计划基本信息</h2>
      </template>

      <a-descriptions v-if="plan" :column="4" bordered size="small">
        <a-descriptions-item label="计划编号">{{ plan.planNo || '-' }}</a-descriptions-item>
        <a-descriptions-item label="计划名称">{{ plan.planName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="计划年月">
          {{ plan.planYear && plan.planMonth ? `${plan.planYear}-${String(plan.planMonth).padStart(2, '0')}` : '-' }}
        </a-descriptions-item>
        <a-descriptions-item label="计划状态">{{ plan.statusName || plan.status || '-' }}</a-descriptions-item>
        <a-descriptions-item label="责任管理员">{{ plan.ownerName || plan.ownerId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="使用部门">{{ plan.deptName || plan.deptId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="计划开始日期">{{ displayDate(plan.planStartDate) }}</a-descriptions-item>
        <a-descriptions-item label="计划结束日期">{{ displayDate(plan.planEndDate) }}</a-descriptions-item>
      </a-descriptions>
      <a-empty v-else description="请从工作台选择一张周检计划" />
    </a-card>

    <FlowStatusSummary
      :summary="summary"
      :loading="loading"
      title="周检流程汇总"
      empty-text="当前计划暂无状态汇总"
    />
  </section>
</template>

<style scoped>
.periodic-plan-summary {
  display: grid;
  gap: 12px;
}

.plan-panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.plan-panel :deep(.ant-card-head) {
  min-height: 49px;
  padding: 0 16px;
  border-bottom: 1px solid #e5eaf1;
}

.plan-panel :deep(.ant-card-body) {
  padding: 14px 16px;
}

.plan-panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 0;
}

@media (max-width: 900px) {
  .plan-panel :deep(.ant-descriptions-view) {
    overflow-x: auto;
  }
}
</style>
