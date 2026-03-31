<template>
  <view class="sos-page">
    <view class="title">紧急求助</view>

    <view class="warning-box">
      <view class="icon">🚨</view>
      <view class="text">若遇到紧急情况，请优先确保人身安全，并立即求助！</view>
    </view>

    <view class="btn-box">
      <button class="btn-red" @click="callContact">联系紧急联系人</button>
      <button class="btn-red" @click="callPolice">拨打报警电话</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0304_driver_sos',
  methods: {
    callContact() {
      // TODO: 替换为司机设定的紧急联系人电话
      uni.makePhoneCall({
        phoneNumber: '1234567890' // 示例：司机家属
      });
    },
    callPolice() {
      uni.makePhoneCall({
        phoneNumber: '112' // 国际通用报警号码（或 999 / 110）
      });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.sos-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 40rpx 30rpx;
  text-align: center;

  .title {
    font-size: 38rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 40rpx;
  }

  .warning-box {
    background-color: #fff3f0;
    border-left: 8rpx solid red;
    padding: 30rpx;
    margin-bottom: 60rpx;
    border-radius: 12rpx;

    .icon {
      font-size: 60rpx;
      color: red;
      margin-bottom: 20rpx;
    }

    .text {
      font-size: 30rpx;
      color: #b71c1c;
    }
  }

  .btn-box {
    display: flex;
    flex-direction: column;
    gap: 30rpx;

    .btn-red {
      background-color: #d32f2f;
      color: white;
      font-size: 32rpx;
      padding: 26rpx 0;
      border-radius: 16rpx;
    }
  }
}
</style>
