<template>
  <view class="invoice-page">
    <view class="title">发票记录</view>

    <view v-if="invoices.length > 0">
      <view v-for="(item, index) in invoices" :key="index" class="invoice-card">
        <view class="row">
          <text class="label">结算时间：</text>
          <text>{{ item.date }}</text>
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

    <view v-else class="empty">暂无发票记录</view>
  </view>
</template>

<script>
export default {
  name: 'D0203_driver_invoice_history',
  data() {
    return {
      invoices: [
        { date: '2025-05-15', amount: 260, status: 'success' },
        { date: '2025-04-30', amount: 440, status: 'pending' },
        { date: '2025-04-15', amount: 310, status: 'rejected' }
      ]
    };
  },
  methods: {
    getStatusText(status) {
      switch (status) {
        case 'success': return '已开票';
        case 'pending': return '待审核';
        case 'rejected': return '已驳回';
        default: return '未知状态';
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
