<script setup lang="ts">
import FlowStatusSummary from '@/components/workflow/FlowStatusSummary.vue'
import type { FlowSummary } from '@/types/flowSummary'

/** 周检角色待办状态汇总的输入契约。 */
interface PeriodicPlanSummaryProps {
  /** 后端在同一计划范围内生成的权威状态快照。 */
  summary?: FlowSummary | null
  /** 状态汇总是否正在加载。 */
  loading?: boolean
}

withDefaults(defineProps<PeriodicPlanSummaryProps>(), {
  summary: null,
  loading: false
})
</script>

<template>
  <section class="periodic-plan-summary">
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

</style>
