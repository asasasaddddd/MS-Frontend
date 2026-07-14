<script setup lang="ts">
import PeriodicTaskWorkspace from './components/PeriodicTaskWorkspace.vue'
</script>

<template>
  <PeriodicTaskWorkspace
    title="周检待办明细"
    role="verifier"
    :node-codes="['plan_confirm', 'self_verify', 'verification_record']"
    :verification-methods="['self', 'self_check', 'internal']"
  />
</template>
