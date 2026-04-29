<template>
  <view class="row">
    <text class="title">{{ title }}</text>
    <text v-if="action" class="action" @click="$emit('action')">{{ action }}</text>
  </view>
</template>

<script setup>
defineProps({
  title: String,
  action: String
})
defineEmits(['action'])
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 24rpx 0 16rpx;
}
.title {
  font-size: 30rpx;
  font-weight: 600;
  color: $admin-text;
}
.action {
  font-size: 26rpx;
  color: $admin-primary;
}
</style>
