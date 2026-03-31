<template>
  <view class="container">
    <view class="header"></view>
    <view class="faq-list">
      <view class="faq-item" v-for="(item, index) in faqList" :key="index" @click="goToFaq(item)">
        📌 {{ item.title }}
      </view>
    </view>
  </view>
</template>



<script setup>
import { ref } from 'vue'

const faqList = ref([
  { title: '如何注册？', page: '/pages/A0405_client_help_register_v01' },
  { title: '如何登录？', page: '/pages/A0406_client_help_login_v01' },
  { title: '如何使用各项服务？', page: '/pages/A0407_client_help_usage_v01' },
  { title: '联系客服通道', page: '/pages/A0301_client_customer_service_v01' }
])

const goToFaq = (item) => {
  uni.navigateTo({
    url: item.page
  })
}

const goHome = () => {
  uni.redirectTo({
    url: '/pages/A0300_client_main_v01'
  })
}
</script>


<style scoped>
.container {
  padding: 80rpx 40rpx;                      /* 页面上下左右边距 */
  text-align: center;                        /* 所有内容居中对齐 */
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);  /* 渐变背景色 */
  min-height: 100vh;                         /* 页面最小高度为一屏高 */
  position: relative;                        /* 设置定位基础（如后续需要绝对定位元素） */
}

.header {
  font-size: 46rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  text-align: center;
}
.faq-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.faq-item {
  padding: 34rpx;
  background-color: white;
  border-radius: 12rpx;
  font-size: 38rpx;
  color: #333;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.faq-item:active {
  background-color: #f0f8ff;
}

.return-btn {
  margin-top: 40rpx;
  text-align: center;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: white;
  padding: 20rpx;
  border-radius: 50rpx;
  font-size: 30rpx;
}

.footer {
  text-align: center;
  font-size: 12rpx;
  color: #777;
  margin-bottom: 20rpx;
}
</style>