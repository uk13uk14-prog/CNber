<template>
  <view class="income-page">
    <view class="title">收入中心</view>

    <view class="summary-box">
      <view class="summary-item">
        <view class="label">今日收入</view>
        <view class="value">£{{ income.today }}</view>
      </view>
      <view class="summary-item">
        <view class="label">本周收入</view>
        <view class="value">£{{ income.week }}</view>
      </view>
      <view class="summary-item">
        <view class="label">本月收入</view>
        <view class="value">£{{ income.month }}</view>
      </view>
    </view>

    <view class="order-stat">
      <view class="stat-item">
        <view class="label">总接单数</view>
        <view class="number">{{ stats.total }}</view>
      </view>
      <view class="stat-item">
        <view class="label">完成订单</view>
        <view class="number">{{ stats.completed }}</view>
      </view>
    </view>

    <view class="btn-box">
      <button class="btn-primary" @click="goWithdraw">提现</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0201_driver_income_center',
  data() {
    return {
      income: {
        today: 120,
        week: 890,
        month: 3120
      },
      stats: {
        total: 48,
        completed: 45
      }
    }
  },
  methods: {
    goWithdraw() {
      uni.navigateTo({
        url: '/pages/D0202_driver_withdraw'
      });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.income-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .summary-box {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
    margin-bottom: 40rpx;

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 16rpx 0;
      border-bottom: 1rpx solid $color-divider;

      &:last-child {
        border-bottom: none;
      }

      .label {
        font-size: 28rpx;
        color: $color-text-light;
      }
      .value {
        font-size: 32rpx;
        font-weight: bold;
        color: $color-primary;
      }
    }
  }

  .order-stat {
    display: flex;
    justify-content: space-between;
    margin-bottom: 40rpx;

    .stat-item {
      width: 48%;
      background-color: white;
      border-radius: 16rpx;
      padding: 24rpx;
      text-align: center;
      box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

      .label {
        font-size: 26rpx;
        color: $color-text-light;
        margin-bottom: 12rpx;
      }

      .number {
        font-size: 34rpx;
        font-weight: bold;
        color: $color-text-main;
      }
    }
  }

  .btn-box {
    display: flex;
    justify-content: center;

    .btn-primary {
      width: 90%;
      background-color: $color-primary;
      color: white;
      font-size: 32rpx;
      padding: 24rpx 0;
      border-radius: 16rpx;
    }
  }
}
</style>
