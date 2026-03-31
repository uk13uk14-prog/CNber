<template>
  <view class="container">
    <view class="header">
      <view class="back-btn" @tap="goBack">返回</view>
      <view class="title">创建订单</view>
      <view class="placeholder"></view>
    </view>

    <view class="form-card">
      <view class="field">
        <text class="label">起点</text>
        <input
          v-model="pickup"
          type="text"
          placeholder="请输入起点"
          class="input"
        />
      </view>

      <view class="field">
        <text class="label">终点</text>
        <input
          v-model="destination"
          type="text"
          placeholder="请输入终点"
          class="input"
        />
      </view>

      <button class="submit-btn" :loading="submitting" @click="submitOrder">
        下单
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { BASE_URL } from '../config/api.js'

const pickup = ref('')
const destination = ref('')
const submitting = ref(false)

const submitOrder = async () => {
  const token = uni.getStorageSync('token')

  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  if (!pickup.value.trim()) {
    uni.showToast({ title: '请输入起点', icon: 'none' })
    return
  }

  if (!destination.value.trim()) {
    uni.showToast({ title: '请输入终点', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    const [error, res] = await uni.request({
      url: `${BASE_URL}/order/create`,
      method: 'POST',
      header: {
        Authorization: `Bearer ${token}`
      },
      data: {
        pickup: pickup.value.trim(),
        destination: destination.value.trim()
      }
    })

    if (error) {
      throw error
    }

    if (res.statusCode === 201 || res.statusCode === 200) {
      uni.showToast({ title: '下单成功', icon: 'success' })
      setTimeout(() => {
        uni.navigateTo({
          url: '/pages/A0107_client_wait_driver_v01'
        })
      }, 800)
      return
    }

    uni.showToast({ title: res.data?.message || '下单失败', icon: 'none' })
  } catch (error) {
    uni.showToast({ title: '下单失败', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.container {
  min-height: 100vh;
  padding: 32rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.back-btn,
.placeholder {
  width: 120rpx;
  font-size: 28rpx;
  color: #333;
}

.title {
  flex: 1;
  text-align: center;
  font-size: 40rpx;
  font-weight: bold;
  color: #111;
}

.form-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.field {
  margin-bottom: 28rpx;
}

.label {
  display: block;
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  font-weight: 600;
}

.input {
  width: 100%;
  box-sizing: border-box;
  background: #f7f8fa;
  border: 2rpx solid #e5e7eb;
  border-radius: 16rpx;
  padding: 24rpx;
  font-size: 30rpx;
  color: #111;
}

.submit-btn {
  margin-top: 20rpx;
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: #fff;
  border: none;
  border-radius: 999rpx;
  font-size: 32rpx;
  padding: 24rpx 0;
}
</style>