<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="外委周检待办明细"
    role="verifier"
    :node-codes="['transfer_verifier', 'send_out', 'send_out_return', 'verifier_fill_info', 'external_third_judge']"
    :verification-methods="['send_out', 'external', 'external_commission']"
  />
</template>
