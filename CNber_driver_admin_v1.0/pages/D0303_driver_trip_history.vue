<template>
  <view class="history-page">
    <view class="title">历史行程</view>

    <view v-if="trips.length > 0">
      <view v-for="(trip, index) in trips" :key="index" class="trip-card" @click="goDetail(trip.id)">
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
export default {
  name: 'D0303_driver_trip_history',
  data() {
    return {
      trips: [
        {
          id: 101,
          pickup: '牛津大学',
          dropoff: '伦敦市中心',
          time: '2025-05-01 10:00',
          price: 85
        },
        {
          id: 102,
          pickup: '剑桥火车站',
          dropoff: '希思罗机场',
          time: '2025-04-28 14:30',
          price: 95
        }
      ]
    }
  },
  methods: {
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
