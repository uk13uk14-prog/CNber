<template>
  <view class="main-page">
    <view class="overlay">
      <view class="header">
        <view class="greeting">欢迎回来，{{ driverName }}</view>
        <view class="status">当前状态：<text class="online">在线</text></view>
      </view>

      <view class="entry-grid">
        <view class="entry-item" @click="goTo('/pages/D0101_driver_order_list')">
          <image src="/static/icons/order.png" class="icon" />
          <text>接单中心</text>
        </view>
        <view class="entry-item" @click="goTo('/pages/D0303_driver_trip_history')">
          <image src="/static/icons/history.png" class="icon" />
          <text>我的行程</text>
        </view>
        <view class="entry-item" @click="goTo('/pages/D0201_driver_income_center')">
          <image src="/static/icons/income.png" class="icon" />
          <text>收入中心</text>
        </view>
        <view class="entry-item" @click="goTo('/pages/D0503_driver_settings')">
          <image src="/static/icons/settings.png" class="icon" />
          <text>设置中心</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0300_driver_main',
  data() {
    return {
      driverName: '张师傅', // TODO: 实际从缓存或API获取
    }
  },
  methods: {
    goTo(url) {
      uni.navigateTo({ url })
    }
  }
}
</script>

<style lang="scss" scoped>
.main-page {
  background: -webkit-linear-gradient(to right, #FFEB3B, #FF9800);
  background: linear-gradient(to right, #FFEB3B, #FF9800);
  min-height: 100vh;
  
  // 如果需要同时使用背景图和渐变
  // background: linear-gradient(to right, #FFEB3B, #FF9800), url('/static/images/background.jpg');
  // background-size: cover;
  // background-blend-mode: overlay;
}

.overlay {
  background-color: rgba(255, 255, 255, 0.85);
  min-height: 100vh;
  padding: 40rpx 30rpx;
}

.header {
  margin-bottom: 40rpx;
  .greeting {
    font-size: 36rpx;
    font-weight: bold;
    color: #FF5722;  // 主色
  }
  .status {
    font-size: 28rpx;
    margin-top: 20rpx;
    color: #757575;  // 辅助文本颜色
    .online {
      color: #FF5722;  // 主色
      font-weight: bold;
    }
  }
}

.entry-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 24rpx;
}

.entry-item {
  width: 47%;
  background-color: rgba(255, 87, 34, 0.1);  // 主色浅色版
  padding: 30rpx 0;
  border-radius: 16rpx;
  text-align: center;
  color: #212121;  // 主文本颜色
  font-size: 28rpx;
  .icon {
    width: 60rpx;
    height: 60rpx;
    margin-bottom: 10rpx;
  }
}
</style>