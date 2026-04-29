<template>
  <view class="container">
    <view class="card">
      <text class="title">密码找回暂未开放</text>
      <text class="desc">当前 MVP 版本仅支持手机号和密码登录。忘记密码功能待短信服务接入后开放。</text>
      <button class="submit-btn" @click="goLogin">返回登录</button>
    </view>
  </view>
</template>

<script setup>
const goLogin = () => {
  uni.redirectTo({ url: '/pages/A0002_client_login_v01' })
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 80rpx 32rpx;
  background: #f5f7fb;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}
.card {
  width: 100%;
  padding: 56rpx 40rpx;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 16rpx 40rpx rgba(15, 23, 42, 0.06);
  box-sizing: border-box;
}
.title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #111827;
  text-align: center;
}
.desc {
  display: block;
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #6b7280;
  line-height: 1.7;
  text-align: center;
}
.submit-btn {
  width: 100%;
  height: 92rpx;
  margin-top: 44rpx;
  border-radius: 46rpx;
  background: #1677ff;
  color: #ffffff;
  font-size: 32rpx;
  line-height: 92rpx;
}
</style>
