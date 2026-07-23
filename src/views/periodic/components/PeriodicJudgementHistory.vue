<script setup lang="ts">
import { computed } from 'vue'
import type { PeriodicJudgementRecordVO } from '../../../types/periodic'

/** 判定历程组件输入，记录顺序由后端按轮次保证。 */
const props = withDefaults(
  defineProps<{
    records?: PeriodicJudgementRecordVO[]
  }>(),
  {
    records: () => []
  }
)

/** 当前任务已有的正式判定记录。 */
const judgementRecords = computed(() => props.records)

/** 将判定结果编码转换为页面文案。 */
function resultName(result: PeriodicJudgementRecordVO['judgeResult']) {
  return result === 'qualified' ? '合格' : '不合格'
}

/** 将后端时间转换为紧凑的本地展示格式。 */
function judgedAtName(value?: string) {
  if (!value) return '-'
  return value.replace('T', ' ').slice(0, 19)
}
</script>

<template>
  <section class="history-panel">
    <div class="history-header">
      <h2>判定历程</h2>
      <span>{{ judgementRecords.length }} 条</span>
    </div>
    <a-empty v-if="judgementRecords.length === 0" description="暂无判定记录" :image-style="{ height: '36px' }" />
    <div v-else class="history-list">
      <article v-for="record in judgementRecords" :key="String(record.id)" class="history-row">
        <div class="history-round">第{{ record.roundNo }}次</div>
        <div class="history-main">
          <strong>{{ record.judgeUserName }} · {{ record.judgeUserId }}</strong>
          <span>{{ record.opinion || '未填写意见' }}</span>
        </div>
        <a-tag :color="record.judgeResult === 'qualified' ? 'green' : 'red'">
          {{ resultName(record.judgeResult) }}
        </a-tag>
        <time>{{ judgedAtName(record.judgedAt) }}</time>
      </article>
    </div>
  </section>
</template>

<style scoped>
.history-panel {
  overflow: hidden;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.history-header {
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e5eaf1;
}

.history-header h2 {
  margin: 0;
  color: #172033;
  font-size: 16px;
}

.history-header span,
.history-main span,
.history-row time {
  color: #667085;
  font-size: 12px;
}

.history-list {
  display: grid;
}

.history-row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 64px 150px;
  align-items: center;
  gap: 12px;
  min-height: 64px;
  padding: 10px 14px;
  border-bottom: 1px solid #eef1f5;
}

.history-row:last-child {
  border-bottom: 0;
}

.history-round {
  color: #155eef;
  font-weight: 600;
}

.history-main {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.history-main strong,
.history-main span {
  overflow-wrap: anywhere;
}

@media (max-width: 760px) {
  .history-row {
    grid-template-columns: 56px minmax(0, 1fr) 56px;
  }

  .history-row time {
    grid-column: 2 / -1;
  }
}
</style>
