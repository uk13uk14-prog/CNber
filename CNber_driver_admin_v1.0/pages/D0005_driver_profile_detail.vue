<template>
  <view class="profile-page">
    <view class="title">我的资料</view>
    <view class="info">
      <view class="row"><text class="label">姓名：</text>{{ profile.name }}</view>
      <view class="row"><text class="label">电话：</text>{{ profile.phone }}</view>
      <view class="row"><text class="label">车牌号：</text>{{ profile.carNumber }}</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0005_driver_profile_detail',
  data() {
    return {
      profile: {
        name: '张师傅',
        phone: '1234567890',
        carNumber: '粤A·88888'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.profile-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 40rpx;
  }

  .info {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    box-shadow: 0 2rpx 4rpx rgba(0,0,0,0.05);

    .row {
      font-size: 30rpx;
      color: $color-text-main;
      margin-bottom: 20rpx;

      .label {
        font-weight: bold;
        color: $color-primary;
      }
    }
  }
}
</style>
