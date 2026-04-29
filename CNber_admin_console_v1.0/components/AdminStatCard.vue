<template>
  <view class="card">
    <text class="label">{{ label }}</text>
    <text class="val">{{ displayValue }}</text>
    <text v-if="hint" class="hint">{{ hint }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: String,
  value: { type: [Number, String], default: 0 },
  hint: String
})

const displayValue = computed(() =>
  props.value === undefined || props.value === null ? '-' : String(props.value)
)
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 28rpx;
  border: 1rpx solid $admin-border;
  min-height: 140rpx;
  box-sizing: border-box;
}
.label {
  font-size: 24rpx;
  color: $admin-text-secondary;
  display: block;
  margin-bottom: 12rpx;
}
.val {
  font-size: 40rpx;
  font-weight: 600;
  color: $admin-text;
}
.hint {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  color: $admin-text-secondary;
}
</style>
