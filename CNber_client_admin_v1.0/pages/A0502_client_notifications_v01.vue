<template>
  <view class="container">
    <view class="header">消息通知</view>

    <!-- 通知列表 -->
    <view v-for="(notice, index) in notices" :key="index" class="card">
      <text class="notice-title">{{ notice.title }}</text>
      <text class="notice-time">{{ notice.time }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const notices = ref([
  { title: '欢迎使用 CNber 出行服务！', time: '2025-05-11 13:00' },
  { title: '本月订单已结算，感谢您的支持。', time: '2025-05-10 09:30' }
])

const goHome = () => {
  uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
}
</script>

<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 32rpx;
}
.header {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24rpx;
  color: #333;
}
.card {
  background-color: white;
  border-radius: 26rpx;
  padding: 34rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.notice-title {
  font-size: 22rpx;
  font-weight: 500;
}
.notice-time {
  font-size: 24rpx;
  color: gray;
}
.return-home-btn {
  margin-top: 50rpx;
  text-align: center;
  font-size: 30rpx;
  padding: 24rpx;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
  border-radius: 50rpx;
}
.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>
