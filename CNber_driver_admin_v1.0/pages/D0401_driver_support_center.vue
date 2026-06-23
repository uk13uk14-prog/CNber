<template>
  <view class="page">
    <view class="menu-list">
      <view class="menu-item" @click="goSubmit">
        <text class="menu-title">提交工单</text>
        <text class="menu-desc">订单、结算、车辆等问题</text>
      </view>
      <view class="menu-item" @click="goMyTickets">
        <text class="menu-title">我的工单</text>
        <text class="menu-desc">查看处理进度与记录</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0401_driver_support_center',
  methods: {
    goSubmit() {
      uni.navigateTo({ url: '/pages/D0402_driver_submit_ticket' })
    },
    goMyTickets() {
      uni.navigateTo({ url: '/pages/D0403_driver_my_tickets' })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.page {
  min-height: 100vh;
  padding: 30rpx;
  background-color: $color-background;
}

.menu-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.menu-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.menu-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: $color-text-main;
  margin-bottom: 8rpx;
}

.menu-desc {
  font-size: 26rpx;
  color: $color-text-light;
}
</style>
