<template>
  <view class="container">
    <!-- 顶部 ✅ 图标 -->
    <view class="icon">🔆</view>


    <!-- 提示标题 -->
    <view class="title">您已退出账号</view>

    <!-- 友好提示 -->
    <view class="subtitle">
      感谢您对中步的支持！
    </view>
    <!-- 友好提示 -->
    <view class="subtitle">
      中步出行 您英国的守护专家！
    </view>

    <!-- 按钮组 -->
    <view class="btn-group">

      <button class="btn login-btn" @click="loginAgain">🔐重新登录</button>
    </view>
   <!-- 底部版权 -->
    <view class="footer">@2025 中步出行 版权所有</view>
  </view>
</template>
<script setup>

// 重新登录
const loginAgain = () => {
  uni.redirectTo({
    url: '/pages/A0002_client_login_v01'
  })
}
</script>

<style scoped>
.container {
  padding: 80rpx 40rpx;
  text-align: center;
 background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  position: relative;
}
.icon {
  font-size: 80rpx;
  margin-top: 200rpx;
  margin-bottom: 40rpx;
}
.title {
  font-size: 38rpx;
  font-weight: bold;
  margin-bottom: 50rpx;
  color: #333;
}
.subtitle {
  font-size: 35rpx;
    font-weight: bold;
  color: #333;
  margin-bottom: 50rpx;
}
/* 按钮组 */
.btn-group {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  padding: 0 40rpx;
}
.btn {
  width: 100%;
  padding: 20rpx;
  font-size: 30rpx;
  border-radius: 50rpx;
  font-weight: bold;
  transition: all 0.2s ease;
}
/* 按下时的反馈效果 */
.btn:active {
  opacity: 0.8;
  transform: scale(0.96);
}
/* 切换账号按钮 */
.switch-btn {
  background: #409eff;
    border-radius: 20rpx;
  color: white;
}
/* 重新登录按钮 */
.login-btn {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
   width: 90%;
}
.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>
