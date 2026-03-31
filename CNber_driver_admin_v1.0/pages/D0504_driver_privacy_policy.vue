<template>
  <view class="policy-page">
    <view class="title">隐私政策</view>
    <scroll-view scroll-y class="content-box">
      <view class="paragraph" v-for="(para, idx) in content" :key="idx">{{ para }}</view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  name: 'D0504_driver_privacy_policy',
  data() {
    return {
      content: [
        '我们非常重视您的隐私与数据保护。',
        '1. 您的个人信息将仅用于身份验证、接单统计与安全保障。',
        '2. 平台不会擅自将您的数据用于商业用途，未经授权绝不共享第三方。',
        '3. 如您主动提交评价或意见反馈，可能用于改进服务体验。',
        '4. 所有敏感数据传输过程均加密处理。',
        '5. 如需注销账号或删除数据，请联系客服申请处理。'
      ]
    };
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.policy-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 20rpx;
  }

  .content-box {
    max-height: 80vh;
    padding: 20rpx;
    background-color: white;
    border-radius: 16rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .paragraph {
      font-size: 28rpx;
      color: $color-text-main;
      margin-bottom: 24rpx;
      line-height: 1.8;
    }
  }
}
</style>
