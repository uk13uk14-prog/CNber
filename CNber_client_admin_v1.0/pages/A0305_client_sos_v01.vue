<template>
  <view class="container">
    <view class="info-box">
      <text class="item">📞 通用紧急电话：<text class="emph">999</text> 或 <text class="emph">112</text>（警察、消防、急救）</text>
      <text class="item">📞 非紧急医疗：<text class="emph">111</text></text>
      <text class="item">📞 中国驻英使馆领保电话：<text class="emph">+44 (0)20 7631 1430</text></text>
    </view>

    <view class="input-area">
    
    </view>

   </view>
 </template>
<script setup>
import { ref } from 'vue'

const description = ref('')

const handleSOS = () => {
  uni.showToast({
    title: 'SOS 已触发',
    icon: 'none'
  })
}

const goHome = () => {
  uni.redirectTo({ url: '/pages/A0300_client_main_v01' })
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
}
.title {
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  text-align: center;
  color: #333;
}
.info-box {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.05);
}
.item {
  display: block;
  font-size: 25rpx;
  color: #333;
  margin-bottom: 20rpx;
}
.emph {
  font-weight: bold;
  color: #d70000;
}
.input-area {
  margin-bottom: 30rpx;
}
.input-box {
  width: 94%;
  min-height: 140rpx;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
}
.sos-btn {
  background-color: #ff4d4f;
  color: white;
  font-size: 60rpx;
  padding: 50rpx;
  border-radius: 12rpx;
  margin-bottom: 30rpx;
}
.home-btn {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
  padding: 24rpx;
  border-radius: 50rpx;
  font-size: 28rpx;
  text-align: center;
}
.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>