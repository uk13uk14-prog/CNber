<template>
  <view class="bonus-page">
    <view class="title">司机奖励中心</view>

    <view class="section" v-for="(bonus, i) in bonuses" :key="i">
      <view class="heading">{{ bonus.title }}</view>
      <view class="desc">{{ bonus.desc }}</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0704_driver_bonus_center',
  data() {
    return {
      bonuses: [
        {
          title: '每日活跃奖励',
          desc: '连续接单 3 单以上可获得额外积分，可兑换红包/优惠券。'
        },
        {
          title: '新司机奖励',
          desc: '注册 7 天内完成 10 单可获得一次性 50 元红包。'
        },
        {
          title: '节日冲单奖励',
          desc: '如国庆、春节期间完成派单目标可获得额外礼品。'
        }
      ]
    };
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.bonus-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    color: $color-primary;
    font-weight: bold;
    margin-bottom: 30rpx;
  }

  .section {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .heading {
      font-size: 30rpx;
      font-weight: bold;
      color: $color-text-main;
      margin-bottom: 10rpx;
    }

    .desc {
      font-size: 28rpx;
      color: $color-text-light;
      line-height: 1.6;
    }
  }
}
</style>
