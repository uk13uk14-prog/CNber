<template>
  <view class="container">
    <view class="title">{{ title }}</view>

    <view class="content">
      <text
        v-for="(item, index) in steps"
        :key="index"
        class="step"
      >
        {{ index + 1 }}️⃣ {{ item }}
      </text>
    </view>

    <button class="back-btn" @click="goBack">返回</button>
  </view>
</template>

<script setup>
import { defineProps } from 'vue'

const props = defineProps({
  title: { type: String, default: '帮助说明' },
  steps: { type: Array, default: () => [] }
})

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.container {
  padding: 40rpx;
  background: linear-gradient(to bottom right, #d7f5ff, #a0e8f7);
  min-height: 100vh;
}
.title {
  font-size: 36rpx;
  font-weight: bold;
  margin-bottom: 30rpx;
  color: #333;
}
.step {
  display: block;
  font-size: 28rpx;
  color: #444;
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
