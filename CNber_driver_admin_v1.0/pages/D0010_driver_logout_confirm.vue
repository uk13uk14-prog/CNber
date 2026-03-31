<template>
  <view class="logout-page">
    <text class="text">确定要退出当前登录吗？</text>
    <view class="btn-box">
      <button class="btn-outline" @click="cancel">取消</button>
      <button class="btn-primary" @click="logout">退出登录</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0010_driver_logout_confirm',
  methods: {
    cancel() {
      uni.navigateBack();
    },
    logout() {
      uni.clearStorageSync();
      uni.reLaunch({ url: '/pages/D0002_driver_login' });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.logout-page {
  background-color: $color-background;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .text {
    font-size: 30rpx;
    margin-bottom: 60rpx;
    color: $color-text-main;
  }

  .btn-box {
    display: flex;
    gap: 40rpx;

    .btn-outline {
      padding: 20rpx 40rpx;
      font-size: 30rpx;
      border-radius: 12rpx;
      background-color: white;
      border: 2rpx solid $color-primary;
      color: $color-primary;
    }

    .btn-primary {
      padding: 20rpx 40rpx;
      font-size: 30rpx;
      border-radius: 12rpx;
      background-color: $color-primary;
      color: white;
    }
  }
}
</style>
