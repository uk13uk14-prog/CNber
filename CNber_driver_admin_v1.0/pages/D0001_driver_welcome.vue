<template>
  <view class="welcome-page">
    <image src="/static/logo.png" class="logo" />
    <text class="title">欢迎使用 CNber 司机端</text>
    <button class="btn-primary" @click="goLogin">立即登录</button>
  </view>
</template>

<script>
export default {
  name: 'D0001_driver_welcome',
  methods: {
    goLogin() {
      uni.reLaunch({ url: '/pages/D0002_driver_login' });
    }
  }
}
</script>

<style lang="scss" scoped>
.welcome-page {
  background: var(--color-background);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .logo {
    width: 180rpx;
    height: 180rpx;
    margin-bottom: 40rpx;
  }

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: var(--color-primary);
    margin-bottom: 60rpx;
  }

  .btn-primary {
    background-color: var(--color-primary);
    color: white;
    font-size: 32rpx;
    padding: 24rpx 60rpx;
    border-radius: 16rpx;
    border: none;
  }
}
</style>