<template>
  <view class="container">
    <!-- ✅ 主体内容自动居中显示 -->
    <view class="main">
      <image class="logo" :src="logoSrc" mode="widthFix"></image>
      <view class="titles-container">
        <text class="title title-top">欢迎使用</text>
        <text class="title title-bottom">中步出行</text>
      </view>
      <button class="enter-btn" @click="goLogin">立即进入</button>
    </view>

    <!-- ✅ 底部版权区域始终固定 -->
    <view class="footer">@2025 中步出行 版权所有</view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const logoSrc = `/static/logo.png?v=${Date.now()}`
const hasClicked = ref(false)

const goLogin = () => {
  hasClicked.value = true
  uni.navigateTo({
    url: '/pages/A0002_client_login_v01'
  })
}

onMounted(() => {
  setTimeout(() => {
    if (!hasClicked.value) {
      goLogin()
    }
  }, 5000)
})
</script>

<style>
/* 页面容器：整个撑满并设置渐变背景 */
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
}

/* 主内容区域居中显示 */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

/* 标题容器 */
.titles-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 60rpx;
  position: relative;
}

/* Logo 图片 */
.logo {
  width: 600rpx;
  margin-bottom: 20rpx;
transform: translateX(0px)
}

/* 上方标题 - 向前偏移 */
.title-top {
  transform: translateY(-20rpx) scale(0.9);
  opacity: 0.8;
  font-size: 36rpx;
  font-weight: bold;
}

/* 下方标题 - 向后偏移 */
.title-bottom {
  transform: translateY(10rpx) scale(1.1);
  color: #222;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.1);
  font-size: 47rpx;
  font-weight: bold;
}
.enter-btn {
  width: 400rpx; /* 固定宽度 */
  height: 100rpx; /* 固定高度 */
  line-height: 100rpx; /* 垂直居中 */
  text-align: center; /* 水平居中 */
  border-radius: 20rpx;
  background-color: #409eff;
  color: white;
  font-size: 40rpx;
}

.enter-btn-wrapper {
  width: 70%;
  height: 100rpx;
  background: #409eff;
  clip-path: polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.enter-btn {
  color: white;
  font-size: 70rpx;
  background: #007aff;
}


/* 底部版权 */
.footer {
  text-align: center;
  font-size: 12px;
  color: #777;
  padding: 10px 0;
  margin-top: 80rpx;
}
</style>