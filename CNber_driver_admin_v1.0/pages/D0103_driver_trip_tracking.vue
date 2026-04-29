<template>
  <view class="trip-page">
    <view class="map-placeholder">[ 地图加载中... ]</view>

    <view class="info-section">
      <view class="row"><text class="label">起点：</text>{{ order.pickup }}</view>
      <view class="row"><text class="label">终点：</text>{{ order.destination }}</view>
      <view class="row"><text class="label">乘客电话：</text>{{ passengerPhone }}</view>
      <view class="row"><text class="label">当前状态：</text>{{ formatStatus(order.status) }}</view>
      <view class="row"><text class="label">订单金额：</text>{{ formatAmount(order.amount) }}</view>
      <view class="row"><text class="label">支付状态：</text>{{ formatPaymentStatus(order.paymentStatus) }}</view>
    </view>

    <view class="action-buttons">
      <button class="btn-primary" :disabled="completing" @click="complete">完成行程</button>
    </view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'
import { formatDriverOrderStatus } from '../utils/orderStatus.js'

export default {
  name: 'D0103_driver_trip_tracking',
  data() {
    return {
      orderId: '',
      order: {},
      completing: false,
      pollingTimer: null
    }
  },
  computed: {
    passengerPhone() {
      const user = this.order.userId
      if (user && typeof user === 'object' && user.phone) return user.phone
      return '—'
    }
  },
  onLoad(query) {
    this.orderId = String(query.orderId || query.id || '')
    if (this.orderId) this.fetchOrderDetail()
  },
  onShow() {
    if (this.orderId) {
      this.fetchOrderDetail()
      this.startPolling()
    }
  },
  mounted() {
    this.startPolling()
  },
  onHide() {
    this.stopPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    async fetchOrderDetail() {
      if (!this.orderId) {
        uni.showToast({ title: '缺少订单ID', icon: 'none' })
        return
      }

      try {
        const data = await request({
          url: `/order/detail/${this.orderId}`,
          method: 'GET'
        })
        this.order = data.order || {}
      } catch (error) {
        /* request 已统一提示 */
      }
    },
    formatStatus(status) {
      return formatDriverOrderStatus(status)
    },
    formatAmount(amount) {
      if (amount == null || amount === '') return '—'
      const n = Number(amount)
      return Number.isFinite(n) ? `£${n.toFixed(2)}` : String(amount)
    },
    formatPaymentStatus(status) {
      const map = {
        unpaid: '未支付',
        pending: '待支付',
        paid: '已支付',
        refunded: '已退款'
      }
      return map[status || 'unpaid'] || status
    },
    startPolling() {
      if (!this.orderId) return
      this.stopPolling()
      this.pollingTimer = setInterval(() => {
        this.fetchOrderDetail()
      }, 5000)
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },
    async complete() {
      if (!this.orderId) {
        uni.showToast({ title: '缺少订单ID', icon: 'none' })
        return
      }

      this.completing = true
      try {
        await request({
          url: '/order/complete',
          method: 'POST',
          data: {
            orderId: this.orderId
          }
        })
        uni.showToast({ title: '订单已完成', icon: 'success' })
        uni.navigateTo({
          url: `/pages/D0104_driver_trip_complete?id=${this.orderId}`
        })
      } catch (error) {
        /* request 已统一提示 */
      } finally {
        this.completing = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.trip-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;
}

.map-placeholder {
  height: 300rpx;
  background-color: #f0f0f0;
  border: 2rpx dashed $color-divider;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: $color-text-light;
  font-size: 28rpx;
  margin-bottom: 30rpx;
}

.info-section {
  margin-bottom: 40rpx;
  .row {
    font-size: 30rpx;
    color: $color-text-main;
    margin-bottom: 14rpx;

    .label {
      color: $color-primary;
      font-weight: bold;
      margin-right: 10rpx;
    }
  }
}

.action-buttons {
  display: flex;
  justify-content: center;

  .btn,
  .btn-primary {
    width: 90%;
    font-size: 32rpx;
    padding: 24rpx 0;
    border-radius: 16rpx;
  }

  .btn {
    background-color: white;
    border: 2rpx solid $color-primary;
    color: $color-primary;
  }

  .btn-primary {
    background-color: $color-primary;
    color: white;
  }
}
</style>
