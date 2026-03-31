<template>
  <view class="error-page">
    <text class="icon">⚠️</text>
    <text class="msg">出错啦，可能是网络连接问题</text>
    <button class="btn" @click="refresh">重试</button>
  </view>
</template>

<script>
export default {
  name: 'D0605_driver_error',
  methods: {
    refresh() {
      uni.reLaunch({ url: '/pages/D0300_driver_main' });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.error-page {
  background-color: $color-background;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .icon {
    font-size: 80rpx;
    margin-bottom: 30rpx;
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
