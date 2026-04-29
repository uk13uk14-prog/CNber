<template>
  <view class="container">
    <view class="title"></view>
    <view class="content">
      <text>1. 打开应用后点击“注册账号”。</text>
      <text>2. 填写手机号、密码并确认密码。</text>
      <text>3. 阅读并同意协议后点击注册。</text>
    </view>
  
  </view>
</template>

<script setup>
const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.container {
  padding: 40rpx;
 background: linear-gradient(to bottom right, #cce6ff, #00f2fe);  /* 渐变背景色 */
  min-height: 100vh;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  color: #333;
}
.content text {
  display: block;
  font-size: 28rpx;
  color: #555;
  margin-bottom: 20rpx;
  line-height: 1.6;
}
.back-btn {
  margin-top: 60rpx;
  background-color: #007aff;
  color: white;
  padding: 20rpx 0;
  border-radius: 50rpx;
  width: 60%;
  text-align: center;
  font-size: 28rpx;
}
</style>
