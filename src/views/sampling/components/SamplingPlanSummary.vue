<script setup lang="ts">
import { computed } from 'vue'
import type { SamplingPlanVO, SamplingTaskVO } from '@/types/sampling'
import { buildSamplingPlanSummary } from '../samplingDisplayModel'

const props = defineProps<{
  plan?: SamplingPlanVO | null
  tasks: SamplingTaskVO[]
}>()

const summary = computed(() => buildSamplingPlanSummary(props.plan, props.tasks))
</script>

<template>
  <a-card class="panel summary-panel" :bordered="false">
    <template #title><h2>计划基本信息</h2></template>
    <div class="summary-row">
      <div class="summary-item">
        <span>计划编号</span>
        <strong>{{ summary.planNo }}</strong>
      </div>
      <div class="summary-item">
        <span>器具数量</span>
        <strong>{{ summary.deviceCount }} 台</strong>
      </div>
      <div class="summary-item">
        <span>已完成</span>
        <strong>{{ summary.completedCount }}</strong>
      </div>
      <div class="summary-item">
        <span>状态变更</span>
        <strong>{{ summary.statusChangeCount }}</strong>
      </div>
      <div v-for="metric in summary.metrics" :key="metric.key" class="summary-chip">
        <a-tag :class="['tag', metric.color]">{{ metric.label }} {{ metric.value }}</a-tag>
      </div>
    </div>
  </a-card>
</template>

<style scoped>
.panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.panel :deep(.ant-card-head) {
  min-height: 52px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.panel :deep(.ant-card-body) {
  padding: 0;
}

.panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.summary-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 18px;
  padding: 14px;
}

.summary-item {
  min-width: 130px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-item span {
  color: #667085;
  font-size: 12px;
  font-weight: 600;
}

.summary-item strong {
  color: #172033;
  font-size: 22px;
  font-weight: 800;
}

.summary-chip {
  display: flex;
  align-items: center;
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
