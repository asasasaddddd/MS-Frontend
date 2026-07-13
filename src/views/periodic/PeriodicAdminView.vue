<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="周检待办明细"
    role="admin"
    :node-codes="['plan_issue', 'plan_confirm', 'manager_forward_confirm', 'exception_disposal']"
  />
</template>
