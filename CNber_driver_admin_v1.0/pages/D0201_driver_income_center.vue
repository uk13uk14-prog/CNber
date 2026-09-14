<template>
  <view class="income-page">
    <view class="title">收入中心</view>

    <view v-if="loadError" class="error-box">
      <text>{{ loadError }}</text>
      <button class="btn-retry" size="mini" @click="reload">重试</button>
    </view>

    <template v-else>
      <view class="summary-box">
        <view class="summary-item">
          <view class="label">今日收入</view>
          <view class="value">{{ formatCny(summary.todayIncomeCny) }}</view>
        </view>
        <view class="summary-item">
          <view class="label">本周收入</view>
          <view class="value">{{ formatCny(summary.weekIncomeCny) }}</view>
        </view>
        <view class="summary-item">
          <view class="label">本月收入</view>
          <view class="value">{{ formatCny(summary.monthIncomeCny) }}</view>
        </view>
        <view class="summary-item highlight">
          <view class="label">累计收入</view>
          <view class="value">{{ formatCny(summary.totalIncomeCny) }}</view>
        </view>
      </view>

      <view class="settlement-cards">
        <view class="card">
          <view class="card-label">待结算</view>
          <view class="card-value">{{ formatCny(summary.pendingSettlementCny) }}</view>
          <view class="card-count">{{ summary.pendingSettlementCount }} 笔批次</view>
        </view>
        <view class="card">
          <view class="card-label">已结算</view>
          <view class="card-value">{{ formatCny(summary.paidSettlementCny) }}</view>
          <view class="card-count">{{ summary.paidSettlementCount }} 笔批次</view>
        </view>
      </view>

      <view v-if="summary.unconfirmedIncomeOrderCount > 0" class="hint">
        {{ summary.unconfirmedIncomeOrderCount }} 笔已完成订单结算待确认，未计入总收入
      </view>

      <view class="order-stat">
        <view class="stat-item">
          <view class="label">完成订单</view>
          <view class="number">{{ summary.completedOrderCount }}</view>
        </view>
      </view>

      <view class="section-title">结算明细</view>
      <view v-if="settlementsLoading" class="hint">加载结算明细…</view>
      <view v-else-if="!settlements.length" class="hint">暂无结算批次</view>
      <view v-else class="settlement-list">
        <view v-for="item in settlements" :key="item._id" class="settlement-item">
          <view class="row top">
            <text class="period">{{ item.periodLabel || periodRange(item) }}</text>
            <text class="status" :class="item.status">{{ statusLabel(item.status) }}</text>
          </view>
          <view class="row">
            <text class="meta">单数 {{ item.orderCount }}</text>
            <text class="amount">{{ item.payableCny != null ? formatCny(item.payableCny) : '待确认' }}</text>
          </view>
          <view v-if="item.status === 'paid'" class="payment-info">
            <view class="row paid-at">打款时间：{{ formatTime(item.paidAt) }}</view>
            <view v-if="item.paymentMethod" class="row">打款方式：{{ paymentMethodLabel(item.paymentMethod) }}</view>
            <view v-if="item.paymentReference" class="row">流水号：{{ item.paymentReference }}</view>
            <view v-if="item.paymentProofUrl" class="row">
              凭证：
              <text class="link" @click.stop="openProof(item.paymentProofUrl)">查看</text>
            </view>
            <view v-if="item.paymentRemark" class="row">备注：{{ item.paymentRemark }}</view>
          </view>
        </view>
      </view>

      <view class="btn-box">
        <button class="btn-primary" @click="goWithdraw">提现</button>
      </view>
    </template>
  </view>
</template>

<script>
import { getDriverIncomeSummary, getDriverSettlements } from '../utils/driverApi.js'
import { formatCny } from '../utils/driverCurrencyDisplay.js'
import { paymentMethodLabel } from '../utils/driverSupportApi.js'

const emptySummary = () => ({
  todayIncomeCny: 0,
  weekIncomeCny: 0,
  monthIncomeCny: 0,
  totalIncomeCny: 0,
  pendingSettlementCny: null,
  paidSettlementCny: null,
  completedOrderCount: 0,
  pendingSettlementCount: 0,
  paidSettlementCount: 0,
  unconfirmedIncomeOrderCount: 0
})

export default {
  name: 'D0201_driver_income_center',
  data() {
    return {
      summary: emptySummary(),
      settlements: [],
      loadError: '',
      settlementsLoading: false
    }
  },
  onShow() {
    this.reload()
  },
  methods: {
    formatCny,
    paymentMethodLabel,
    normalizeAmount(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    },
    optionalCny(value) {
      if (value == null || value === '') return null
      const n = Number(value)
      return Number.isFinite(n) ? n : null
    },
    async reload() {
      this.loadError = ''
      await Promise.all([this.fetchIncomeSummary(), this.fetchSettlements()])
    },
    async fetchIncomeSummary() {
      try {
        const data = await getDriverIncomeSummary()
        this.summary = {
          ...emptySummary(),
          todayIncomeCny: this.normalizeAmount(data.todayIncomeCny ?? data.todayIncome),
          weekIncomeCny: this.normalizeAmount(data.weekIncomeCny ?? data.weekIncome),
          monthIncomeCny: this.normalizeAmount(data.monthIncomeCny ?? data.monthIncome),
          totalIncomeCny: this.normalizeAmount(data.totalIncomeCny ?? data.totalIncome),
          pendingSettlementCny: this.optionalCny(data.pendingSettlementCny),
          paidSettlementCny: this.optionalCny(data.paidSettlementCny),
          completedOrderCount: this.normalizeAmount(data.completedOrderCount ?? data.totalCompletedOrders),
          pendingSettlementCount: this.normalizeAmount(data.pendingSettlementCount),
          paidSettlementCount: this.normalizeAmount(data.paidSettlementCount),
          unconfirmedIncomeOrderCount: this.normalizeAmount(data.unconfirmedIncomeOrderCount)
        }
      } catch (error) {
        this.loadError = error?.message || '收入数据加载失败，请稍后重试'
      }
    },
    async fetchSettlements() {
      this.settlementsLoading = true
      try {
        const data = await getDriverSettlements({ page: 1, pageSize: 30 })
        this.settlements = Array.isArray(data?.settlements) ? data.settlements : []
      } catch {
        if (!this.loadError) {
          this.settlements = []
        }
      } finally {
        this.settlementsLoading = false
      }
    },
    statusLabel(status) {
      return status === 'paid' ? '已结算' : '待结算'
    },
    periodRange(item) {
      if (item.startDate && item.endDate && item.startDate !== item.endDate) {
        return `${item.startDate} ~ ${item.endDate}`
      }
      return item.startDate || item.endDate || '—'
    },
    formatTime(value) {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    goWithdraw() {
      uni.navigateTo({
        url: '/pages/D0202_driver_withdraw'
      })
    },
    openProof(url) {
      if (!url) return
      // #ifdef H5
      window.open(url, '_blank')
      // #endif
      // #ifndef H5
      uni.setClipboardData({
        data: url,
        success: () => uni.showToast({ title: '凭证链接已复制', icon: 'none' })
      })
      // #endif
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

  .error-box {
    background: #fff5f5;
    border: 1rpx solid #fecaca;
    border-radius: 16rpx;
    padding: 24rpx;
    color: #b91c1c;
    font-size: 28rpx;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    align-items: flex-start;
  }

  .btn-retry {
    background: #fff;
    color: $color-primary;
  }

  .summary-box {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
    margin-bottom: 24rpx;

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 16rpx 0;
      border-bottom: 1rpx solid $color-divider;

      &:last-child {
        border-bottom: none;
      }

      &.highlight .value {
        color: #0d9488;
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

  .settlement-cards {
    display: flex;
    gap: 20rpx;
    margin-bottom: 24rpx;

    .card {
      flex: 1;
      background: #fff;
      border-radius: 16rpx;
      padding: 24rpx;
      box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

      .card-label {
        font-size: 26rpx;
        color: $color-text-light;
        margin-bottom: 8rpx;
      }
      .card-value {
        font-size: 34rpx;
        font-weight: bold;
        color: $color-text-main;
      }
      .card-sub {
        font-size: 24rpx;
        color: #64748b;
        margin-top: 6rpx;
      }
      .card-count {
        font-size: 22rpx;
        color: #94a3b8;
        margin-top: 10rpx;
      }
    }
  }

  .order-stat {
    display: flex;
    gap: 24rpx;
    margin-bottom: 28rpx;

    .stat-item {
      flex: 1;
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

      .rate {
        font-size: 26rpx;
      }
    }
  }

  .section-title {
    font-size: 30rpx;
    font-weight: 600;
    color: $color-text-main;
    margin-bottom: 16rpx;
  }

  .hint {
    text-align: center;
    color: #94a3b8;
    font-size: 26rpx;
    padding: 24rpx 0 40rpx;
  }

  .settlement-list {
    margin-bottom: 32rpx;
  }

  .settlement-item {
    background: #fff;
    border-radius: 16rpx;
    padding: 24rpx;
    margin-bottom: 16rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16rpx;
      margin-bottom: 8rpx;
      font-size: 26rpx;
      color: $color-text-light;

      &.top {
        margin-bottom: 12rpx;
      }
    }

    .period {
      font-size: 28rpx;
      font-weight: 600;
      color: $color-text-main;
      flex: 1;
    }

    .status {
      font-size: 24rpx;
      padding: 4rpx 12rpx;
      border-radius: 999rpx;
      background: #fef3c7;
      color: #b45309;

      &.paid {
        background: #d1fae5;
        color: #047857;
      }
    }

    .amount {
      color: $color-primary;
      font-weight: 600;
    }

    .paid-at {
      font-size: 24rpx;
      color: #64748b;
      margin-bottom: 0;
    }

    .payment-info {
      margin-top: 12rpx;
      padding-top: 12rpx;
      border-top: 1rpx dashed #e2e8f0;
      font-size: 24rpx;
      color: #64748b;

      .row {
        margin-bottom: 6rpx;
      }

      .link {
        color: $color-primary;
      }
    }
  }

  .btn-box {
    display: flex;
    justify-content: center;
    padding-bottom: 40rpx;

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
