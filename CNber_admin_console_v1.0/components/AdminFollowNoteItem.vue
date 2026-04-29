<template>
  <view class="item">
    <text class="time">{{ time }}</text>
    <text class="who">{{ who }}</text>
    <text class="content">{{ item.content }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { formatDateTime } from '../utils/format.js'

const props = defineProps({
  item: { type: Object, default: () => ({}) }
})

const time = computed(() => formatDateTime(props.item.createdAt))
const who = computed(() => props.item.authorPhone || '客服')
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.item {
  background: #fff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid $admin-border;
}
.time {
  font-size: 22rpx;
  color: $admin-text-secondary;
  display: block;
}
.who {
  font-size: 24rpx;
  color: $admin-primary;
  display: block;
  margin: 8rpx 0;
}
.content {
  font-size: 28rpx;
  color: $admin-text;
  line-height: 1.5;
}
</style>
