<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="周检待办明细"
    role="confirmer"
    :node-codes="['confirmer_confirm']"
  />
</template>
