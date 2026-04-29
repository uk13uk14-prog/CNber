<template>
  <view class="box">
    <text class="t">订单摘要</text>
    <text class="line">#{{ shortId }} · {{ statusLabel }}</text>
    <text class="line muted">{{ pickup }} → {{ drop }}</text>
    <text class="line muted">{{ time }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { mapOrderToUiStatus, getUiStatusMeta } from '../config/orderStatus.js'
import { formatDateTime } from '../utils/format.js'

const props = defineProps({
  order: { type: Object, default: () => ({}) }
})

const shortId = computed(() => {
  const id = props.order._id || ''
  return id ? String(id).slice(-8) : '--'
})
const statusLabel = computed(() =>
  getUiStatusMeta(mapOrderToUiStatus(props.order)).label
)
const pickup = computed(() => props.order.pickup || '—')
const drop = computed(() => props.order.destination || '—')
const time = computed(() => formatDateTime(props.order.createdAt))
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.box {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 24rpx;
  border: 1rpx solid $admin-border;
  margin-bottom: 20rpx;
}
.t {
  font-size: 26rpx;
  font-weight: 600;
  color: $admin-text;
  display: block;
  margin-bottom: 12rpx;
}
.line {
  display: block;
  font-size: 26rpx;
  color: $admin-text;
  margin-top: 6rpx;
}
.muted {
  color: $admin-text-secondary;
  font-size: 24rpx;
}
</style>
