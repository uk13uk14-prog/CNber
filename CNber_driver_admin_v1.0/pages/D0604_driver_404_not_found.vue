<template>
  <view class="not-found-page">
    <text class="code">404</text>
    <text class="msg">页面未找到</text>
    <button class="btn" @click="goHome">返回首页</button>
  </view>
</template>

<script>
export default {
  name: 'D0604_driver_404_not_found',
  methods: {
    goHome() {
      uni.reLaunch({ url: '/pages/D0300_driver_main' });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.not-found-page {
  background-color: $color-background;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .code {
    font-size: 100rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 20rpx;
  }

  .msg {
    font-size: 30rpx;
    color: $color-text-light;
    margin-bottom: 40rpx;
  }

  .btn {
    background-color: $color-primary;
    color: white;
    font-size: 30rpx;
    padding: 20rpx 60rpx;
    border-radius: 12rpx;
  }
}
</style>
