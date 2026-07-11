<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="外扩人员周检待办明细"
    role="externalOperator"
    :node-codes="['send_out', 'supplier_fill_info']"
    :verification-methods="['send_out', 'external', 'external_commission']"
  />
</template>
