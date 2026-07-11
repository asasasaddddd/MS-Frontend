<script setup lang="ts">
import { computed } from 'vue'
import type { PeriodicPlanVO, PeriodicTaskVO } from '../../../types/periodic'
import { buildPeriodicPlanSummary } from '../periodicDisplayModel'

const props = withDefaults(
  defineProps<{
    plan?: PeriodicPlanVO | null
    tasks?: PeriodicTaskVO[]
  }>(),
  {
    plan: null,
    tasks: () => []
  }
)

const summary = computed(() => buildPeriodicPlanSummary(props.plan, props.tasks))
</script>

<template>
  <section class="periodic-plan-summary">
    <a-card class="summary-panel" :bordered="false">
      <template #title>
        <h2>计划基本信息</h2>
      </template>

      <div class="plan-info-row">
        <div class="plan-info-item">
          <span>计划编号</span>
          <strong>{{ summary.planNo }}</strong>
        </div>
        <div class="plan-info-item">
          <span>器具数量</span>
          <strong>{{ summary.deviceCount }} 台</strong>
        </div>
        <div class="plan-info-item wide">
          <span>状态变更</span>
          <strong>{{ summary.statusChangeCount }}</strong>
          <small>封存 / 非正常报废 / 正常报废 / 缓检 / 维修 / 管理类别调整 / 检定周期调整</small>
        </div>
        <div class="plan-info-item">
          <span>未送检</span>
          <strong>{{ summary.notSentCount }}</strong>
        </div>
        <div class="status-strip compact">
          <div class="status-check">✓</div>
          <a-tag
            v-for="item in summary.metrics"
            :key="item.key"
            :class="['periodic-tag', item.color]"
          >
            {{ item.label }} {{ item.value }}
          </a-tag>
        </div>
      </div>
    </a-card>
  </section>
</template>

<style scoped>
.summary-panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.summary-panel :deep(.ant-card-head) {
  min-height: 49px;
  padding: 0 14px;
  border-bottom: 1px solid #e5eaf1;
}

.summary-panel :deep(.ant-card-body) {
  padding: 0;
}

.summary-panel h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
  font-weight: 700;
}

.plan-info-row {
  display: grid;
  grid-template-columns: 150px 150px minmax(220px, 1fr) 120px minmax(360px, 2fr);
  gap: 0;
  border-top: 0;
}

.plan-info-item {
  min-height: 96px;
  padding: 14px 16px;
  border-right: 1px solid #e5eaf1;
  background: #ffffff;
}

.plan-info-item span {
  display: block;
  margin-bottom: 8px;
  color: #667085;
  font-size: 12px;
}

.plan-info-item strong {
  color: #172033;
  font-size: 24px;
  line-height: 1.1;
}

.plan-info-item small {
  display: block;
  margin-top: 8px;
  color: #667085;
  font-size: 12px;
  line-height: 1.6;
}

.status-strip {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px;
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
  font-weight: 700;
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

@media (max-width: 1180px) {
  .plan-info-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .status-strip {
    grid-column: 1 / -1;
  }
}
</style>
