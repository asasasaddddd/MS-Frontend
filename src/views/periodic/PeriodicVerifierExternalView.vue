<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="外委周检待办明细"
    role="verifier"
    :node-codes="[
      'plan_confirm',
      'send_out',
      'send_out_return',
      'verifier_fill_info',
      'verifier_second_judge',
      'verifier_third_judge',
      'verifier_scrap_disposal'
    ]"
    :verification-methods="['send_out', 'external', 'external_commission']"
  />
</template>
