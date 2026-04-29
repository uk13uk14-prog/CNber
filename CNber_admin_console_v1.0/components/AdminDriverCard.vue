<template>
  <view class="card">
    <view class="top">
      <text class="name">{{ name }}</text>
      <text class="st" :class="statusClass">{{ statusLabel }}</text>
    </view>
    <view class="row">
      <text class="k">电话</text>
      <text class="v">{{ phoneLine }}</text>
    </view>
    <view class="row">
      <text class="k">接单</text>
      <text class="v">{{ dispatchLine }}</text>
    </view>
    <view class="row">
      <text class="k">评分</text>
      <text class="v">{{ score }}</text>
    </view>
    <view class="row">
      <text class="k">完成单</text>
      <text class="v">{{ totalOrders }}</text>
    </view>
    <button
      v-if="showAssign"
      class="assign"
      type="primary"
      @click="$emit('assign')"
    >
      指派该司机
    </button>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { getDriverStatusLabel } from '../config/driverDisplay.js'
import { maskPhone } from '../utils/format.js'

const props = defineProps({
  driver: { type: Object, default: () => ({}) },
  showAssign: { type: Boolean, default: true }
})

defineEmits(['assign'])

const u = computed(() => props.driver.userId)
const phoneLine = computed(() => {
  if (typeof u.value === 'object' && u.value && u.value.phone) {
    return maskPhone(u.value.phone)
  }
  if (props.driver.phone) return maskPhone(props.driver.phone)
  return '—'
})
const name = computed(() =>
  props.driver.name ? props.driver.name : `司机 ${phoneLine.value}`
)

const statusLabel = computed(() =>
  getDriverStatusLabel(props.driver.status)
)

const statusClass = computed(() => {
  const s = props.driver.status
  if (s === 'approved' || s === 'online') return 'ok'
  if (s === 'banned' || s === 'rejected') return 'bad'
  return 'wa'
})

const dispatchLine = computed(() => {
  if (props.driver.status === 'online') return '在线，可接单'
  if (props.driver.status !== 'approved') return '暂不可派（未认证或受限）'
  return '可接单'
})

const score = computed(() =>
  props.driver.score != null ? String(props.driver.score) : '—'
)
const totalOrders = computed(() =>
  props.driver.totalOrders != null ? String(props.driver.totalOrders) : '0'
)
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 24rpx;
  margin-bottom: 20rpx;
  border: 1rpx solid $admin-border;
}
.top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}
.name {
  font-size: 30rpx;
  font-weight: 600;
  color: $admin-text;
}
.st {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}
.st.ok {
  color: $admin-success;
  background: #e8faf0;
}
.st.bad {
  color: $admin-danger;
  background: #fee4e2;
}
.st.wa {
  color: $admin-warning;
  background: #fff4e5;
}
.row {
  display: flex;
  font-size: 26rpx;
  margin-top: 8rpx;
}
.k {
  width: 120rpx;
  color: $admin-text-secondary;
}
.v {
  flex: 1;
  color: $admin-text;
}
.assign {
  margin-top: 20rpx;
  background: $admin-primary;
  border-radius: 16rpx;
  font-size: 28rpx;
}
</style>
