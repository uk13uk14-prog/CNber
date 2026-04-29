<template>
  <view class="history-page">
    <view class="title">历史行程</view>

    <view v-if="trips.length > 0">
      <view v-for="trip in trips" :key="trip.id" class="trip-card" @click="goDetail(trip.id)">
        <view class="location">
          <text class="label">出发：</text>{{ trip.pickup }}
        </view>
        <view class="location">
          <text class="label">目的：</text>{{ trip.dropoff }}
        </view>
        <view class="info">
          <text class="time">{{ trip.time }}</text>
          <text class="price">£{{ trip.price }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">暂无行程记录</view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'

export default {
  name: 'D0303_driver_trip_history',
  data() {
    return {
      trips: []
    }
  },
  onShow() {
    this.fetchTripHistory()
  },
  methods: {
    async fetchTripHistory() {
      try {
        const data = await request({
          url: '/driver/orders',
          method: 'GET'
        })
        const orders = Array.isArray(data?.orders) ? data.orders : []
        this.trips = orders
          .filter((order) => ['completed', 'cancelled'].includes(order.status))
          .map((order) => this.mapOrderToTrip(order))
      } catch (error) {
        /* request 已统一提示 */
      }
    },
    mapOrderToTrip(order) {
      return {
        id: order._id || order.id,
        pickup: order.pickup || '—',
        dropoff: order.destination || order.dropoff || '—',
        time: this.formatTime(order.completedAt || order.updatedAt || order.createdAt),
        price: this.formatAmount(order.amount)
      }
    },
    formatTime(value) {
      if (!value) return '—'
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('zh-CN')
    },
    formatAmount(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    },
    goDetail(id) {
      uni.navigateTo({
        url: `/pages/D0102_driver_order_detail?id=${id}`
      })
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.history-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .trip-card {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
    border: 1rpx solid $color-divider;

    .location {
      font-size: 28rpx;
      color: $color-text-main;
      margin-bottom: 10rpx;

      .label {
        color: $color-primary;
        font-weight: bold;
      }
    }

    .info {
      display: flex;
      justify-content: space-between;
      font-size: 26rpx;
      color: $color-text-light;

      .price {
        font-weight: bold;
        color: $color-primary;
      }
    }
  }

  .empty {
    text-align: center;
    color: $color-text-light;
    margin-top: 100rpx;
    font-size: 30rpx;
  }
}
</style>
