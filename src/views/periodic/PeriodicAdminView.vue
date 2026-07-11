<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="周检异常分流"
    role="admin"
    :node-codes="['plan_issue', 'plan_confirm', 'manager_receive']"
  />
</template>
