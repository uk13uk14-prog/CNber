<template>
  <view class="trip-complete-page">
    <view class="success-icon">🎉</view>
    <view class="title">行程完成！</view>
    <view class="subtitle">感谢您的辛勤服务</view>

    <view class="summary-box">
      <view class="row"><text class="label">起点：</text>{{ order.pickup }}</view>
      <view class="row"><text class="label">终点：</text>{{ order.dropoff }}</view>
      <view class="row"><text class="label">时间：</text>{{ order.time }}</view>
      <view class="row"><text class="label">金额：</text><text class="price">£{{ order.price }}</text></view>
    </view>

    <view class="btn-group">
      <button class="btn-primary" @click="goHome">返回首页</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0104_driver_trip_complete',
  data() {
    return {
      order: {
        id: 1,
        pickup: '伦敦国王十字',
        dropoff: '剑桥大学',
        time: '今天 14:00',
        price: 80
      }
    }
  },
  onLoad(query) {
    this.order.id = query.id || 1;
  },
  methods: {
    goHome() {
      uni.reLaunch({
        url: '/pages/D0300_driver_main'
      });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.trip-complete-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 40rpx 30rpx;
  text-align: center;

  .success-icon {
    font-size: 80rpx;
    margin-bottom: 30rpx;
  }

  .title {
    font-size: 40rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 10rpx;
  }

  .subtitle {
    font-size: 28rpx;
    color: $color-text-light;
    margin-bottom: 40rpx;
  }

  .summary-box {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    text-align: left;
    margin-bottom: 50rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .row {
      font-size: 30rpx;
      margin-bottom: 16rpx;
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
    }
  }

  .btn-group {
    display: flex;
    justify-content: center;

    .btn-primary {
      width: 90%;
      font-size: 32rpx;
      padding: 24rpx 0;
      border-radius: 16rpx;
      background-color: $color-primary;
      color: white;
    }
  }
}
</style>
