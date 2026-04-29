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
      <view class="stat-item">
        <view class="label">可提现余额</view>
        <view class="number">£{{ stats.availableBalance }}</view>
      </view>
      <view class="stat-item">
        <view class="label">已提现</view>
        <view class="number">£{{ stats.withdrawnAmount }}</view>
      </view>
    </view>

    <view class="btn-box">
      <button class="btn-primary" @click="goWithdraw">提现</button>
    </view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'

export default {
  name: 'D0201_driver_income_center',
  data() {
    return {
      income: {
        today: 0,
        week: 0,
        month: 0
      },
      stats: {
        total: 0,
        completed: 0,
        availableBalance: 0,
        withdrawnAmount: 0
      }
    }
  },
  onShow() {
    this.fetchIncomeSummary()
  },
  methods: {
    normalizeAmount(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    },
    async fetchIncomeSummary() {
      try {
        const data = await request({
          url: '/driver/income/summary',
          method: 'GET'
        })
        this.income = {
          today: this.normalizeAmount(data.todayIncome ?? data.today),
          week: this.normalizeAmount(data.weekIncome ?? data.week),
          month: this.normalizeAmount(data.monthIncome ?? data.month)
        }
        this.stats = {
          total: this.normalizeAmount(data.totalOrders ?? data.total),
          completed: this.normalizeAmount(data.totalCompletedOrders ?? data.completed),
          availableBalance: this.normalizeAmount(data.availableBalance),
          withdrawnAmount: this.normalizeAmount(data.withdrawnAmount)
        }
      } catch (error) {
        /* request 已统一提示 */
      }
    },
    goWithdraw() {
      uni.navigateTo({
        url: '/pages/D0202_driver_withdraw'
      })
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
    flex-wrap: wrap;
    gap: 24rpx;
    justify-content: space-between;
    margin-bottom: 40rpx;

    .stat-item {
      width: calc(50% - 12rpx);
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
