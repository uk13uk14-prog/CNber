<template>
  <view class="invoice-page">
    <view class="title">提现记录</view>

    <view v-if="withdrawals.length > 0">
      <view v-for="item in withdrawals" :key="item._id" class="invoice-card">
        <view class="row">
          <text class="label">申请时间：</text>
          <text>{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="row">
          <text class="label">金额：</text>
          <text class="price">£{{ item.amount }}</text>
        </view>
        <view class="row">
          <text class="label">状态：</text>
          <text :class="'status ' + item.status">{{ getStatusText(item.status) }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">暂无提现记录</view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'

export default {
  name: 'D0203_driver_invoice_history',
  data() {
    return {
      withdrawals: []
    }
  },
  onShow() {
    this.fetchWithdrawals()
  },
  methods: {
    async fetchWithdrawals() {
      try {
        const data = await request({
          url: '/driver/withdrawals',
          method: 'GET'
        })
        this.withdrawals = Array.isArray(data?.withdrawals) ? data.withdrawals : []
      } catch (error) {
        /* request 已统一提示 */
      }
    },
    formatTime(value) {
      if (!value) return '—'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
    },
    getStatusText(status) {
      switch (status) {
        case 'pending': return '审核中'
        case 'approved': return '已到账'
        case 'rejected': return '已拒绝'
        default: return '未知状态'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.invoice-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    color: $color-primary;
    font-weight: bold;
    margin-bottom: 30rpx;
  }

  .invoice-card {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .row {
      display: flex;
      font-size: 28rpx;
      margin-bottom: 14rpx;
      color: $color-text-main;

      .label {
        font-weight: bold;
        color: $color-primary;
        margin-right: 10rpx;
      }

      .price {
        font-weight: bold;
        color: $color-primary;
      }

      .status {
        font-weight: bold;

        &.success {
          color: #52c41a;
        }

        &.pending {
          color: #faad14;
        }

        &.approved {
          color: #52c41a;
        }

        &.rejected {
          color: #f5222d;
        }
      }
    }
  }

  .empty {
    text-align: center;
    font-size: 30rpx;
    color: $color-text-light;
    margin-top: 80rpx;
  }
}
</style>
