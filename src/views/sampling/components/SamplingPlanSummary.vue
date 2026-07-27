<script setup lang="ts">
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import type { FlowSummary } from '@/types/flowSummary'
import type { SamplingPlanVO } from '@/types/sampling'

/** 抽检计划基础信息与后端权威汇总的组件输入。 */
interface SamplingPlanSummaryProps {
  /** 当前工作台打开的抽检计划。 */
  plan?: SamplingPlanVO | null
  /** 后端按当前计划和用户权限生成的流程状态快照。 */
  summary?: FlowSummary | null
  /** 计划与汇总是否正在加载。 */
  loading?: boolean
  /** 统一汇总接口失败时透传给公共错误卡。 */
  error?: unknown
}

withDefaults(defineProps<SamplingPlanSummaryProps>(), {
  plan: null,
  summary: null,
  loading: false
})

/**
 * 格式化后端计划日期，不参与任何流程状态推断。
 *
 * @param value 后端 ISO 日期或日期时间。
 * @returns 页面日期文本；无值时返回短横线。
 */
function displayDate(value?: string): string {
  return value ? value.replace('T', ' ').slice(0, 10) : '-'
}
</script>

<template>
  <section class="sampling-plan-summary">
    <a-card class="plan-panel" :bordered="false" :loading="loading && !plan">
      <template #title>
        <h2>计划基本信息</h2>
      </template>

      <a-descriptions v-if="plan" :column="4" bordered size="small">
        <a-descriptions-item label="计划编号">{{ plan.planNo || '-' }}</a-descriptions-item>
        <a-descriptions-item label="计划名称">{{ plan.planName || '-' }}</a-descriptions-item>
        <a-descriptions-item label="抽检规则">{{ plan.sampleRule || '-' }}</a-descriptions-item>
        <a-descriptions-item label="抽检比例">{{ plan.sampleRate ?? '-' }}</a-descriptions-item>
        <a-descriptions-item label="计划状态">{{ plan.status || '-' }}</a-descriptions-item>
        <a-descriptions-item label="责任管理员">{{ plan.ownerName || plan.ownerId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="使用部门">{{ plan.deptName || plan.deptId || '-' }}</a-descriptions-item>
        <a-descriptions-item label="检定日期">{{ displayDate(plan.verificationDate) }}</a-descriptions-item>
      </a-descriptions>
      <a-empty v-else description="请从工作台选择一张抽检计划" />
    </a-card>

    <FlowStatusSummary
      :summary="summary"
      :loading="loading"
      :error="error"
      title="抽检流程汇总"
      empty-text="当前计划暂无流程汇总"
    />
  </section>
</template>

<style scoped>
.sampling-plan-summary {
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
