<template>
  <view class="login-page">
    <view class="title">司机登录</view>
    <view class="form">
      <input v-model="phone" placeholder="请输入手机号" type="number" />
      <button class="btn-primary" @click="login">登录</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0002_driver_login',
  data() {
    return { phone: '' }
  },
  methods: {
    login() {
      if (!this.phone) {
        uni.showToast({ title: '请输入手机号', icon: 'none' });
        return;
      }
      // TODO: 替换为真实登录逻辑
      uni.setStorageSync('driver_token', 'mock_token');
      uni.reLaunch({ url: '/pages/D0300_driver_main' });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.login-page {
  background-color: $color-background;  // 使用 tokens.scss 中定义的背景颜色变量
  min-height: 100vh;
  padding: 80rpx 30rpx;

  .title {
    font-size: 46rpx;
    font-weight: bold;
    color: $color-primary;  // 使用 tokens.scss 中定义的主色变量
    margin-bottom: 60rpx;
    text-align: center;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 40rpx;

    input {
      background-color: white;
      padding: 24rpx;
      border-radius: 12rpx;
      font-size: 40rpx;
      border: 1rpx solid $color-divider;  // 使用 tokens.scss 中定义的分割线颜色变量
    }

    .btn-primary {
      background-color: $color-primary;  // 使用主色
      color: white;
      font-size: 36rpx;
      padding: 24rpx 80rpx;
      border-radius: 50rpx;
    }
  }
}
</style>
