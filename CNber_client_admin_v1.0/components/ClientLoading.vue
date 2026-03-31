<!-- components/ClientLoading.vue -->
<template>
  <view class="loading-overlay" v-if="visible">
    <view class="loading-box">
      <view class="loading-spinner" v-if="!iconLoaded">
        <view class="spinner"></view>
      </view>
      <image 
        src="/static/icons/loading.gif" 
        class="loading-icon" 
        mode="aspectFit"
        @error="handleImageError"
        @load="handleImageLoad"
      />
      <text class="loading-text">{{ message }}</text>
    </view>
  </view>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  message: {
    type: String,
    default: '加载中...'
  }
})

const visible = ref(props.show)
const message = ref(props.message)
const iconLoaded = ref(false)

const handleImageError = () => {
  iconLoaded.value = false
  console.log("图片加载失败")
}

const handleImageLoad = () => {
  iconLoaded.value = true
  console.log("图片加载成功")
}

watch(() => props.show, (val) => {
  visible.value = val
})

watch(() => props.message, (val) => {
  message.value = val
})
</script>

<style scoped>
.loading-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-box {
  background: white;
  padding: 40rpx;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 200px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.loading-icon {
  width: 80px;
  height: 80px;
  margin-bottom: 20px;
}

.loading-text {
  font-size: 16px;
  color: #333;
  margin-top: 10px;
}

.loading-spinner {
  width: 80px;
  height: 80px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
