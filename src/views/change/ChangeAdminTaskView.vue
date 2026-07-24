<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import ChangeHistoryPanel from '@/views/change/components/ChangeHistoryPanel.vue'
import ChangeReceiveAdminPanel from '@/views/change/components/ChangeReceiveAdminPanel.vue'

const route = useRoute()
const activeTab = ref(route.query.tab === 'history' ? 'history' : 'todo')
const routeOrderId = computed(() => {
  const value = route.query.orderId
  if (Array.isArray(value)) return value[0] ? String(value[0]) : ''
  return value ? String(value) : ''
})
</script>

<template>
  <section class="change-admin-task-page">
    <a-tabs v-model:active-key="activeTab">
      <a-tab-pane key="todo" tab="当前待办" />
      <a-tab-pane key="history" tab="已办" />
    </a-tabs>

    <ChangeReceiveAdminPanel v-if="activeTab === 'todo'" />
    <ChangeHistoryPanel v-else :order-id="routeOrderId" />
  </section>
</template>

<style scoped>
.change-admin-task-page {
  display: grid;
  gap: 16px;
}
</style>
