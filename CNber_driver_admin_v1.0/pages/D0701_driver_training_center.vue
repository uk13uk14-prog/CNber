<template>
  <view class="training-page">
    <view class="title">新手培训中心</view>

    <view class="section" v-for="(item, idx) in training" :key="idx">
      <view class="heading">{{ item.title }}</view>
      <view class="content">{{ item.desc }}</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0701_driver_training_center',
  data() {
    return {
      training: [
        { title: '如何接单与取消流程', desc: '接单需点击确认 → 到达 → 完成；如需取消，请及时转派或联系客服。' },
        { title: '乘客沟通规范', desc: '请礼貌沟通，尊重乘客隐私，严禁辱骂和骚扰行为。' },
        { title: '高峰期派单提示', desc: '高峰时段系统将优先匹配附近司机，请保持在线状态。' }
      ]
    };
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.training-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .section {
    background-color: white;
    padding: 30rpx;
    border-radius: 16rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);

    .heading {
      font-size: 30rpx;
      font-weight: bold;
      color: $color-text-main;
      margin-bottom: 12rpx;
    }

    .content {
      font-size: 28rpx;
      color: $color-text-light;
      line-height: 1.8;
    }
  }
}
</style>
