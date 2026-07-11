<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="责任工程师周检二次判定"
    role="verifier"
    :node-codes="['responsible_second_judge']"
    :verification-methods="['send_out', 'external', 'external_commission']"
  />
</template>
