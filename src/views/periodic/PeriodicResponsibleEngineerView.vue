<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="责任工程师周检判定"
    role="verifier"
    :node-codes="['responsible_second_judge', 'responsible_third_judge', 'responsible_fourth_judge']"
    :verification-methods="['send_out', 'external', 'external_commission']"
  />
</template>
