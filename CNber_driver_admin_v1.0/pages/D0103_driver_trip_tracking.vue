<template>
  <view class="trip-page">
    <view class="map-placeholder">[ 地图加载中... ]</view>

    <view class="info-section">
      <view class="row"><text class="label">起点：</text>{{ order.pickup }}</view>
      <view class="row"><text class="label">终点：</text>{{ order.dropoff }}</view>
      <view class="row"><text class="label">时间：</text>{{ order.time }}</view>
    </view>

    <view class="action-buttons">
      <button v-if="step === 0" class="btn" @click="arrive">我已到达上车点</button>
      <button v-else-if="step === 1" class="btn" @click="start">开始行程</button>
      <button v-else class="btn-primary" @click="complete">完成行程</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0103_driver_trip_tracking',
  data() {
    return {
      order: {
        id: 1,
        pickup: '伦敦国王十字',
        dropoff: '剑桥大学',
        time: '今天 14:00'
      },
      step: 0 // 0：未到达，1：已到达准备出发，2：行程中
    }
  },
  onLoad(query) {
    // TODO: 从 query.id 请求详情
    this.order.id = query.id || 1;
  },
  methods: {
    arrive() {
      this.step = 1;
      uni.showToast({ title: '已到达上车点', icon: 'success' });
    },
    start() {
      this.step = 2;
      uni.showToast({ title: '行程开始', icon: 'success' });
    },
    complete() {
      uni.navigateTo({
        url: `/pages/D0104_driver_trip_complete?id=${this.order.id}`
      });
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
