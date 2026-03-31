<template>
  <view class="settings-page">
    <view class="title">设置中心</view>

    <view class="setting-group">
      <view class="setting-item" @click="go('/pages/D0506_driver_feedback')">
        <text>意见反馈</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @click="go('/pages/D0504_driver_privacy_policy')">
        <text>隐私政策</text>
        <text class="arrow">›</text>
      </view>
      <view class="setting-item" @click="go('/pages/D0505_driver_terms_of_service')">
        <text>服务条款</text>
        <text class="arrow">›</text>
      </view>
    </view>

    <view class="logout-box">
      <button class="btn-outline" @click="logout">退出登录</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0503_driver_settings',
  methods: {
    go(url) {
      uni.navigateTo({ url });
    },
    logout() {
      uni.showModal({
        title: '确认退出登录？',
        success: res => {
          if (res.confirm) {
            // TODO: 清除 token / 账户信息
            uni.reLaunch({ url: '/pages/D0002_driver_login' });
          }
        }
      });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.settings-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .setting-group {
    background-color: white;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .setting-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 30rpx;
      font-size: 30rpx;
      color: $color-text-main;
      border-bottom: 1rpx solid $color-divider;

      &:last-child {
        border-bottom: none;
      }

      .arrow {
        font-size: 36rpx;
        color: $color-text-light;
      }
    }
  }

  .logout-box {
    margin-top: 60rpx;
    display: flex;
    justify-content: center;

    .btn-outline {
      width: 90%;
      font-size: 30rpx;
      padding: 24rpx 0;
      border-radius: 16rpx;
      color: $color-primary;
      border: 2rpx solid $color-primary;
      background-color: white;
    }
  }
}
</style>
