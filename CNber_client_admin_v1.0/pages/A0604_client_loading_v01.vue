<template>
  <view class="page">
    <ClientLoading :show="true" message="页面加载中..." />
  </view>
</template>

<script setup>
import ClientLoading from '@/components/ClientLoading.vue'
</script>

<style scoped>
.page {
  width: 100vw;
  height: 100vh;
  background-color: #f0f0f0;
}
</style>
