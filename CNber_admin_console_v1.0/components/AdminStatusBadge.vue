<template>
  <view class="badge" :style="{ color: meta.color, background: meta.bg }">
    <text class="t">{{ meta.label }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { getUiStatusMeta } from '../config/orderStatus.js'

const props = defineProps({
  uiStatus: { type: String, default: '' }
})

const meta = computed(() => getUiStatusMeta(props.uiStatus))
</script>

<style scoped lang="scss">
.badge {
  display: inline-flex;
  align-items: center;
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}
.t {
  line-height: 1.2;
}
</style>
