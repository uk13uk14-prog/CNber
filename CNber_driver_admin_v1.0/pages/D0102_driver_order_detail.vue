<template>
  <view class="order-detail-page">
    <view class="section">
      <view class="label">乘客姓名：</view>
      <view class="value">{{ order.name }}</view>
    </view>

    <view class="section">
      <view class="label">联系电话：</view>
      <view class="value">{{ order.phone }}</view>
    </view>

    <view class="section">
      <view class="label">出发地点：</view>
      <view class="value">{{ order.pickup }}</view>
    </view>

    <view class="section">
      <view class="label">目的地点：</view>
      <view class="value">{{ order.dropoff }}</view>
    </view>

    <view class="section">
      <view class="label">出发时间：</view>
      <view class="value">{{ order.time }}</view>
    </view>

    <view class="section">
      <view class="label">订单金额：</view>
      <view class="value price">£{{ order.price }}</view>
    </view>

    <view class="button-group">
      <button class="btn-outline" @click="contact">联系乘客</button>
      <button class="btn-primary" @click="acceptOrder">确认接单</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0102_driver_order_detail',
  data() {
    return {
      order: {
        id: 1,
        name: '李同学',
        phone: '123-456-7890',
        pickup: '伦敦国王十字',
        dropoff: '剑桥大学',
        time: '今天 14:00',
        price: 80
      }
    }
  },
  onLoad(query) {
    // TODO: 实际从后端接口加载订单详情
    const id = query.id || 1;
    this.order.id = id;
  },
  methods: {
    contact() {
      uni.showToast({ title: '联系功能暂未开放', icon: 'none' });
    },
    acceptOrder() {
      uni.navigateTo({
        url: `/pages/D0103_driver_trip_tracking?id=${this.order.id}`
      });
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.order-detail-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .section {
    margin-bottom: 24rpx;
    .label {
      font-size: 28rpx;
      color: $color-text-light;
    }
    .value {
      font-size: 32rpx;
      color: $color-text-main;
      margin-top: 6rpx;
    }
    .price {
      color: $color-primary;
      font-weight: bold;
    }
  }

  .button-group {
    display: flex;
    justify-content: space-between;
    margin-top: 40rpx;
    gap: 20rpx;

    .btn-outline {
      flex: 1;
      border: 2rpx solid $color-primary;
      color: $color-primary;
      background-color: white;
      border-radius: 12rpx;
      padding: 20rpx 0;
      font-size: 30rpx;
    }

    .btn-primary {
      flex: 1;
      background-color: $color-primary;
      color: white;
      border-radius: 12rpx;
      padding: 20rpx 0;
      font-size: 30rpx;
    }
  }
}
</style>
