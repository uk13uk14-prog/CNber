<template>
  <view class="safety-page">
    <view class="title">安全驾驶指南</view>

    <view class="tip" v-for="(tip, i) in tips" :key="i">
      <text class="num">✔</text>
      <text class="text">{{ tip }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0702_driver_safety_tips',
  data() {
    return {
      tips: [
        '每日最长行驶时间建议不超过 8 小时，注意定时休息。',
        '夜间行车需减速慢行，保持车窗清洁，避免疲劳驾驶。',
        '请勿酒后驾驶或使用违禁药物。',
        '若乘客行为异常或拒付，请及时联系平台客服。',
        '务必系好安全带，乘客必须在后排乘坐。'
      ]
    };
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.safety-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .tip {
    display: flex;
    align-items: flex-start;
    margin-bottom: 24rpx;
    font-size: 28rpx;
    color: $color-text-main;

    .num {
      color: $color-primary;
      font-size: 32rpx;
      margin-right: 16rpx;
    }

    .text {
      flex: 1;
      line-height: 1.6;
    }
  }
}
</style>
