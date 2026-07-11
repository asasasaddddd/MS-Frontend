<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LabelListPanel from '@/views/label/components/LabelListPanel.vue'

type LabelMode = 'pending' | 'printed'

const route = useRoute()
const router = useRouter()

const activeMode = computed<LabelMode>({
  get() {
    return route.query.mode === 'printed' ? 'printed' : 'pending'
  },
  set(mode) {
    router.replace({ path: '/label/print', query: { mode } })
  }
})
</script>

<template>
  <section class="label-workspace">
    <a-card class="mode-card" :bordered="false">
      <a-segmented
        v-model:value="activeMode"
        :options="[
          { label: '待打印标签', value: 'pending' },
          { label: '已打印标签', value: 'printed' }
        ]"
      />
    </a-card>

    <LabelListPanel :key="activeMode" :mode="activeMode" />
  </section>
</template>

<style scoped>
.label-workspace {
  display: grid;
  gap: 16px;
}

.mode-card {
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  background: #ffffff;
}

.mode-card :deep(.ant-card-body) {
  padding: 12px 14px;
}
</style>
