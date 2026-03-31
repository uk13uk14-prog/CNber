<template>
  <view class="customer-service-page">
    <view class="title">平台客服</view>

    <view class="section">
      <text class="label">客服电话：</text>
      <text class="value" @click="call">400-123-4567</text>
    </view>

    <view class="section">
      <text class="label">在线客服：</text>
      <text class="value" @click="chat">点击进入客服小程序</text>
    </view>

    <view class="section">
      <text class="label">客服邮箱：</text>
      <text class="value">support@cnber.com</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0301_driver_customer_service',
  methods: {
    call() {
      uni.makePhoneCall({ phoneNumber: '4001234567' });
    },
    chat() {
      uni.showToast({ title: '暂未接入客服系统', icon: 'none' });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.customer-service-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 40rpx;
  }

  .section {
    background-color: white;
    padding: 30rpx;
    border-radius: 16rpx;
    margin-bottom: 20rpx;
    display: flex;
    justify-content: space-between;

    .label {
      font-size: 30rpx;
      color: $color-text-main;
    }

    .value {
      font-size: 30rpx;
      color: $color-primary;
    }
  }
}
</style>
