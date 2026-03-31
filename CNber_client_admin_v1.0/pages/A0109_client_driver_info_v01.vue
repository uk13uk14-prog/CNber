<template>
  <view class="driver-info-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="back-btn" @tap="goBack">＜ 返回</view>
      </view>
      <view class="nav-title">司机信息页</view>
      <view class="nav-right"></view>
    </view>

    <!-- 司机信息卡片 -->
    <view class="driver-card">
      <view class="driver-header">
        <image class="avatar" :src="driver.avatar"></image>
        <view class="driver-details">
          <view class="driver-name-rating">
            <text class="driver-name">{{ driver.name }}</text>
            <text class="driver-rating">{{ driver.rating }} ⭐</text>
          </view>
          <view class="driver-phone">
            <text class="iconfont icon-phone">📱</text>
            {{ driver.phone }}
          </view>
          <view class="driver-info-item">
            <text class="iconfont icon-car">🚗</text>
            {{ driver.vehicle }}
          </view>
          <view class="driver-info-item">
            <text class="iconfont icon-plate">🔢</text>
            {{ driver.plateNumber }}
          </view>
        </view>
      </view>
    </view>

    <!-- 温馨提示 -->
    <view class="notice">
      <text class="iconfont icon-notice">ℹ️</text>
      {{ noticeText }}
      <br />如有问题请及时联系客服。
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="contact-driver" @click="callDriver">
        <text class="iconfont icon-call">📞</text> 联系司机
      </button>
      <button class="contact-service" @click="callService">
        <text class="iconfont icon-service">👨‍💼</text> 联系客服
      </button>
    </view>

    <!-- 底部版权 -->
    <view class="footer">@2025 赛博出行 版权所有</view>
  </view>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { BASE_URL } from '../config/api.js'

const driver = ref({
  name: '张师傅',
  phone: '138-0000-0000',
  rating: 4.8,
  avatar: '/static/driver_avatar.png',
  vehicle: '丰田 Camry 2023款 2.5L 豪华版',
  plateNumber: '粤B·12345'
})
const order = ref(null)
const lastNavigatedStatus = ref('')
let pollingTimer = null

const statusRouteMap = {
  pending: '/pages/A0107_client_wait_driver_v01',
  accepted: '/pages/A0109_client_driver_info_v01',
  ongoing: '/pages/A0110_client_in_trip_v01',
  completed: '/pages/A0111_client_trip_completed_v01'
}

const noticeText = computed(() => {
  if (order.value?.status === 'accepted') {
    return '司机已接单，请保持手机畅通，司机将在预计时间内到达上车地点。'
  }
  return '请保持手机畅通，如有问题请及时联系客服。'
})

const handleStatusNavigation = (status) => {
  if (!status || lastNavigatedStatus.value === status) {
    return
  }

  const targetUrl = statusRouteMap[status]
  if (!targetUrl) {
    return
  }

  const currentRoute = getCurrentPages().slice(-1)[0]?.route
  const currentPath = currentRoute ? `/${currentRoute}` : ''

  if (currentPath === targetUrl) {
    lastNavigatedStatus.value = status
    return
  }

  lastNavigatedStatus.value = status
  uni.redirectTo({ url: targetUrl })
}

const fetchOrders = async () => {
  const token = uni.getStorageSync('token')

  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    const [error, res] = await uni.request({
      url: `${BASE_URL}/order/list`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${token}`
      }
    })

    if (error) {
      throw error
    }

    const orders = Array.isArray(res.data?.orders) ? res.data.orders : []
    order.value = orders.length > 0 ? orders[0] : null
    handleStatusNavigation(order.value?.status)
  } catch (error) {
    uni.showToast({ title: '获取订单失败', icon: 'none' })
  }
}

const startPolling = () => {
  if (pollingTimer) clearInterval(pollingTimer)
  fetchOrders()
  pollingTimer = setInterval(() => {
    fetchOrders()
  }, 5000)
}

const callDriver = () => {
  uni.makePhoneCall({
    phoneNumber: driver.value.phone
  })
}

const callService = () => {
  uni.makePhoneCall({
    phoneNumber: '400-800-8888'
  })
}

const goBack = () => {
  uni.navigateBack()
}

onMounted(() => {
  startPolling()
})

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})
</script>

<style scoped>
.driver-info-page {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 0;
  margin-bottom: 20px;
}

.nav-left, .nav-right {
  flex: 1;
}

.nav-title {
  flex: 2;
  text-align: center;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.back-btn {
  font-size: 16px;
  color: #409eff;
  padding: 8px 0;
  text-align: left;
}

/* 司机卡片 */
.driver-card {
  background: #fff;
  padding: 25px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin-bottom: 25px;
}

.driver-header {
  display: flex;
  align-items: flex-start;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  margin-right: 20px;
  border: 3px solid #409eff;
}

.driver-details {
  flex: 1;
}

.driver-name-rating {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.driver-name {
  font-size: 28px;
  font-weight: bold;
  color: #333;
}

.driver-rating {
  font-size: 22px;
  color: #ffb400;
  background: #fff8e6;
  padding: 4px 10px;
  border-radius: 20px;
}

.driver-phone,
.driver-info-item {
  font-size: 20px;
  color: #555;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.iconfont {
  margin-right: 10px;
  font-size: 22px;
}

.notice {
  text-align: center;
  font-size: 18px;
  color: #555;
  margin: 25px 0;
  padding: 15px;
  line-height: 1.6;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 12px;
}

.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.contact-driver,
.contact-service {
  flex: 1;
  font-size: 26px;
  color: white;
  border: none;
  padding: 14px 0;
  border-radius: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-driver {
  background-color: #409eff;
}

.contact-service {
  background-color: #69bfff;
}

.footer {
  text-align: center;
  font-size: 12px;
  color: #777;
  padding: 15px 0;
  margin-top: auto;
}
</style>