<template>
  <view class="welcome-page">
    <view class="bg-glow bg-glow-one"></view>
    <view class="bg-glow bg-glow-two"></view>

    <view class="welcome-content">
      <view class="driver-badge">CNber Driver</view>

      <view class="driver-visual">
        <view class="route-card">
          <text class="route-label">今日可接订单</text>
          <text class="route-count">12</text>
          <view class="route-line">
            <view class="route-dot start"></view>
            <view class="route-path"></view>
            <view class="route-dot end"></view>
          </view>
          <text class="route-text">Heathrow Airport → London City</text>
        </view>
        <view class="car-plate">
          <view class="car-window"></view>
          <view class="car-body">
            <view class="car-light"></view>
            <view class="car-grille"></view>
          </view>
          <view class="wheel wheel-left"></view>
          <view class="wheel wheel-right"></view>
        </view>
      </view>

      <text class="title">欢迎使用司机端</text>
      <text class="subtitle">接收订单、管理行程、查看收入，一站式开启今日服务</text>
      <button class="btn-primary" @click="goLogin">司机登录</button>
      <button class="btn-secondary" @click="goRegister">申请成为司机</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0001_driver_welcome',
  methods: {
    goLogin() {
      uni.reLaunch({ url: '/pages/D0002_driver_login' })
    },
    goRegister() {
      uni.navigateTo({ url: '/pages/D0003_driver_register' })
    }
  }
}
</script>

<style lang="scss" scoped>
.welcome-page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
  background: linear-gradient(160deg, #0f172a 0%, #16324f 48%, #f59e0b 100%);
  box-sizing: border-box;
  padding: 0 48rpx 64rpx;
}

.bg-glow {
  position: absolute;
  border-radius: 999rpx;
  opacity: 0.35;
  filter: blur(4rpx);
}

.bg-glow-one {
  width: 360rpx;
  height: 360rpx;
  top: -120rpx;
  right: -90rpx;
  background: #fbbf24;
}

.bg-glow-two {
  width: 440rpx;
  height: 440rpx;
  left: -180rpx;
  bottom: 120rpx;
  background: #38bdf8;
}

.welcome-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 72rpx 0 40rpx;
}

.driver-badge {
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.14);
  color: #fde68a;
  font-size: 24rpx;
  letter-spacing: 2rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  margin-bottom: 44rpx;
}

.driver-visual {
  position: relative;
  width: 100%;
  height: 430rpx;
  margin-bottom: 34rpx;
}

.route-card {
  position: absolute;
  top: 0;
  right: 0;
  width: 390rpx;
  padding: 28rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 30rpx 70rpx rgba(15, 23, 42, 0.26);
  box-sizing: border-box;
}

.route-label {
  display: block;
  color: #64748b;
  font-size: 24rpx;
}

.route-count {
  display: block;
  margin-top: 8rpx;
  color: #0f172a;
  font-size: 72rpx;
  font-weight: 800;
  line-height: 1;
}

.route-line {
  display: flex;
  align-items: center;
  margin: 26rpx 0 18rpx;
}

.route-dot {
  width: 18rpx;
  height: 18rpx;
  border-radius: 50%;
}

.route-dot.start {
  background: #22c55e;
}

.route-dot.end {
  background: #f59e0b;
}

.route-path {
  flex: 1;
  height: 4rpx;
  margin: 0 12rpx;
  border-radius: 999rpx;
  background: linear-gradient(90deg, #22c55e, #f59e0b);
}

.route-text {
  display: block;
  color: #334155;
  font-size: 24rpx;
  line-height: 1.45;
}

.car-plate {
  position: absolute;
  left: 8rpx;
  bottom: 0;
  width: 430rpx;
  height: 250rpx;
}

.car-window {
  position: absolute;
  left: 92rpx;
  top: 18rpx;
  width: 210rpx;
  height: 86rpx;
  border-radius: 80rpx 80rpx 20rpx 20rpx;
  background: linear-gradient(135deg, #e0f2fe, #7dd3fc);
  border: 10rpx solid #f8fafc;
  box-sizing: border-box;
}

.car-body {
  position: absolute;
  left: 28rpx;
  bottom: 38rpx;
  width: 370rpx;
  height: 122rpx;
  border-radius: 70rpx 90rpx 44rpx 44rpx;
  background: linear-gradient(135deg, #fbbf24, #f97316);
  box-shadow: 0 24rpx 42rpx rgba(15, 23, 42, 0.28);
}

.car-light {
  position: absolute;
  right: 28rpx;
  top: 40rpx;
  width: 42rpx;
  height: 22rpx;
  border-radius: 999rpx;
  background: #fef3c7;
}

.car-grille {
  position: absolute;
  left: 46rpx;
  top: 42rpx;
  width: 96rpx;
  height: 18rpx;
  border-radius: 999rpx;
  background: rgba(15, 23, 42, 0.22);
}

.wheel {
  position: absolute;
  bottom: 10rpx;
  width: 70rpx;
  height: 70rpx;
  border-radius: 50%;
  background: #0f172a;
  border: 12rpx solid #e5e7eb;
  box-sizing: border-box;
}

.wheel-left {
  left: 88rpx;
}

.wheel-right {
  right: 72rpx;
}

.title {
  display: block;
  font-size: 50rpx;
  font-weight: 800;
  color: #ffffff;
  text-align: center;
  line-height: 1.4;
  margin-bottom: 20rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.78);
  text-align: center;
  line-height: 1.6;
  padding: 0 16rpx;
  margin-bottom: 64rpx;
}

.btn-primary,
.btn-secondary {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  font-size: 32rpx;
  border-radius: 16rpx;
  box-sizing: border-box;
  padding: 0;
}

.btn-primary {
  background: linear-gradient(90deg, #facc15, #f97316);
  color: #111827;
  border: none;
  font-weight: 700;
  box-shadow: 0 18rpx 36rpx rgba(249, 115, 22, 0.26);
}

.btn-primary::after {
  border: none;
}

.btn-secondary {
  margin-top: 28rpx;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border: 2rpx solid rgba(255, 255, 255, 0.42);
}

.btn-secondary::after {
  border: none;
}
</style>
