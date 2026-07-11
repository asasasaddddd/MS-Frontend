<template>
  <a-config-provider
    :theme="{
      token: {
        colorPrimary: '#1769e0',
        borderRadius: 8,
        fontFamily: 'Microsoft YaHei, PingFang SC, system-ui, sans-serif'
      }
    }"
  >
    <router-view />
  </a-config-provider>
</template>
