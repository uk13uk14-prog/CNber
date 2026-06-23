<template>
  <view class="in-trip-page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="back-btn" @tap="goBack"></view>
      </view>
      <view class="nav-title"></view>
      <view class="nav-right"></view>
    </view>

    <!-- 行程状态 -->
    <view class="trip-status">
      <view class="status-detail">{{ tripHeadline }}</view>
    </view>

    <!-- 司机和车辆信息 -->
    <view class="driver-card">
      <view class="driver-header">
        <image class="avatar" :src="driver.avatar"></image>
        <view class="driver-details">
          <view class="driver-name-rating">
            <text class="driver-name">{{ driver.name }}</text>
          </view>
          <view class="driver-info-item">
            <text class="iconfont icon-phone">📱</text>
            {{ driver.phone }}
          </view>
          <view class="driver-info-item">
            <text class="iconfont icon-plate">🚗</text>
            {{ driver.plateNumber }}
          </view>
        </view>
      </view>
    </view>

    <!-- 温馨提示 -->
    <view class="notice">
      <text class="iconfont icon-notice">ℹ️</text>
      为了您的安全，请全程系好安全带。
    </view>

    <!-- 操作按钮 -->
    <view class="action-buttons">
      <button class="sos-btn" @click="sos">
        <text class="iconfont icon-sos">🆘</text> 一键求助
      </button>
      <button class="contact-service" @click="callService">
        <text class="iconfont icon-service">👨‍💼</text> 联系客服
      </button>
    </view>

    <!-- 分享按钮 -->
    <view class="share-buttons">
      <button class="share-trip" @click="shareTrip">
        <text class="iconfont icon-share">🔗</text> 行程分享
      </button>
      <button class="share-social" @click="shareSocial">
        <text class="iconfont icon-social">📱</text> 分享至小红书
      </button>

    </view>
  </view>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { fetchOrderList } from '../utils/orderApi.js'
import { clientInTripHeadline } from '../utils/orderStatus.js'
import { pickActiveOrder, driverDisplayFromOrder, applyClientOrderRoute } from '../utils/orderFlow.js'

const driver = ref(driverDisplayFromOrder(null))
const order = ref(null)
const lastFlowSlot = ref('')
let pollingTimer = null

const tripHeadline = computed(() => clientInTripHeadline(order.value?.status))

const fetchOrders = async () => {
  const token = uni.getStorageSync('token')

  if (!token) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  try {
    const data = await fetchOrderList()

    const orders = Array.isArray(data?.orders) ? data.orders : []
    order.value = pickActiveOrder(orders)
    driver.value = driverDisplayFromOrder(order.value)
    applyClientOrderRoute(order.value, lastFlowSlot)
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

onMounted(() => {
  startPolling()
})

// 紧急求助
const sos = () => {
  uni.showModal({
    title: '紧急求助',
    content: '您确定要发起紧急求助吗？',
    success: function (res) {
      if (res.confirm) {
        uni.showToast({
          title: '求助已发出',
          icon: 'success'
        })
      }
    }
  })
}

// 客服 — 提交工单
const callService = () => {
  const oid = order.value?._id ? String(order.value._id) : ''
  const ono = order.value?.orderNo ? String(order.value.orderNo) : ''
  if (!oid) {
    uni.navigateTo({ url: '/pages/A0408_client_submit_ticket_v01?type=other' })
    return
  }
  const q = ono
    ? `type=driver_issue&orderId=${encodeURIComponent(oid)}&orderNo=${encodeURIComponent(ono)}&returnTo=order`
    : `type=driver_issue&orderId=${encodeURIComponent(oid)}&returnTo=order`
  uni.navigateTo({ url: `/pages/A0408_client_submit_ticket_v01?${q}` })
}

// 行程分享
const shareTrip = () => {
  uni.showToast({
    title: '生成行程分享链接',
    icon: 'none'
  })
}

// 社交平台分享
const shareSocial = () => {
  uni.showToast({
    title: '打开社交平台分享',
    icon: 'none'
  })
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})
</script>


<style scoped>
.in-trip-page {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* 公共模块间距压缩 */
.in-trip-page > view {
  margin-block: 10px;
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
}

.nav-left, .nav-right {
  flex: 1;
}

.nav-title {
  flex: 2;
  text-align: center;
  font-size: 20px;
  font-weight: bold;
  color: #333;
}

.back-btn {
  font-size: 16px;
  color: #409eff;
  padding: 8px 0;
  text-align: left;
}

/* 行程状态 */
.trip-status {
  text-align: center;
  font-size: 15px;
  color: #666;
}

/* 司机卡片 */
.driver-card {
  background: #fff;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.driver-header {
  display: flex;
  align-items: flex-start;
}

.avatar {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  margin-right: 16px;
  border: 2px solid #409eff;
}

.driver-details {
  flex: 1;
}

.driver-name-rating {
  margin-bottom: 6px;
}

.driver-name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.driver-info-item {
  font-size: 14px;
  color: #555;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
}

.iconfont {
  margin-right: 8px;
  font-size: 16px;
}

/* 温馨提示 */
.notice {
  text-align: center;
  font-size: 14px;
  color: #444;
  padding: 10px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 10px;
  line-height: 1.5;
}

/* 按钮组 */
.action-buttons,
.share-buttons {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.sos-btn,
.contact-service,
.share-trip,
.share-social {
  flex: 1;
  font-size: 14px;
  color: white;
  border: none;
  padding: 10px 0;
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sos-btn {
  background-color: #ff4d4f;
}

.contact-service {
  background-color: #409eff;
}

.share-trip {
  background-color: #67c23a;
}

.share-social {
  background-color: #ff69b4;
}

/* 底部测试按钮 */
button {
  margin-top: 10px;
  font-size: 14px;
  background-color: #ddd;
  color: #333;
  border-radius: 20px;
  padding: 6px 0;
}
</style>
