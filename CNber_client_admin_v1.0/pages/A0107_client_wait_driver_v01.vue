<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view class="nav-bar">
      <view class="nav-left">
        <view class="back-btn" @tap="goBack"></view>
      </view>
      <view class="nav-title"></view>
      <view class="nav-right">
        <view class="home-btn" @tap="goHome"></view>
      </view>
    </view>

    <view class="wait-driver-page">
      <!-- 状态卡片 -->
      <view v-if="order" class="status-card">
        <view class="status-row">
          <text class="status-title">{{ statusText }}</text>
        </view>
        <view class="status-row subtitle">
          <text>{{ waitingText }}</text>
        </view>
        <view class="order-info">
          <view class="row">
            <view class="label">出发地：</view>
            <view class="value">{{ order.pickup }}</view>
          </view>
          <view class="row">
            <view class="label">目的地：</view>
            <view class="value">{{ order.destination }}</view>
          </view>
          <view class="row">
            <view class="label">订单状态：</view>
            <view class="value">{{ statusText }}</view>
          </view>
          <view class="row">
            <view class="label">订单编号：</view>
            <view class="value">{{ order._id }}</view>
          </view>
          <view class="row">
            <view class="label">司机编号：</view>
            <view class="value">{{ order.driverId || '暂未分配司机' }}</view>
          </view>
        </view>
      </view>

      <view v-else class="status-card empty-card">
        <text class="status-title">暂无订单</text>
        <text class="waiting-text">当前没有可展示的订单记录</text>
      </view>

      <view v-if="driverInfo" class="status-card driver-card">
        <view class="status-row">
          <text class="status-title">司机信息</text>
        </view>
        <view class="order-info">
          <view class="row">
            <view class="label">司机姓名：</view>
            <view class="value">{{ driverInfo.name }}</view>
          </view>
          <view class="row">
            <view class="label">联系电话：</view>
            <view class="value">{{ driverInfo.phone }}</view>
          </view>
          <view class="row">
            <view class="label">车辆信息：</view>
            <view class="value">{{ driverInfo.vehicle }}</view>
          </view>
          <view class="row">
            <view class="label">车牌号码：</view>
            <view class="value">{{ driverInfo.plateNumber }}</view>
          </view>
        </view>
      </view>

      <!-- 等待动画 -->
      <view class="loading-section">
        <image src="/static/loading.gif" class="loading-icon"></image>
        <view class="waiting-text">{{ waitingText }}</view>
      </view>
      
      <!-- 操作按钮 -->
      <view v-if="order" class="action-buttons">
        <button class="edit-btn" @click="editOrder">修改订单</button>
      </view>

    </view>
  </view>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { BASE_URL } from '../config/api.js'

const order = ref(null)
const lastNavigatedStatus = ref('')
const driverInfo = computed(() => {
  if (!order.value?.driverId) {
    return null
  }

  return {
    name: '张师傅',
    phone: '138-0000-0000',
    vehicle: '丰田 Camry 2023款 2.5L 豪华版',
    plateNumber: '粤B·12345'
  }
})

const statusRouteMap = {
  pending: '/pages/A0107_client_wait_driver_v01',
  accepted: '/pages/A0109_client_driver_info_v01',
  ongoing: '/pages/A0110_client_in_trip_v01',
  completed: '/pages/A0111_client_trip_completed_v01'
}

const waitingText = computed(() => {
  const status = order.value?.status

  if (status === 'pending') return '系统正在为您安排司机，请耐心等待......'
  if (status === 'accepted') return '司机已接单，正在准备出发。'
  if (status === 'ongoing') return '您的行程正在进行中。'
  if (status === 'completed') return '您的订单已完成，感谢使用。'

  return '当前没有订单状态信息。'
})

const statusText = computed(() => {
  const status = order.value?.status

  if (status === 'pending') return '等待接单'
  if (status === 'accepted') return '司机已接单'
  if (status === 'ongoing') return '行程中'
  if (status === 'completed') return '已完成'

  return '暂无状态'
})

let pollingTimer = null

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
  if (pollingTimer) clearInterval(pollingTimer) // 避免重复开启
  fetchOrders()
  pollingTimer = setInterval(() => {
    fetchOrders()
  }, 5000)
}

const goBack = () => {
  uni.navigateTo({
    url: '/pages/A0106_client_payment_v01'
  })
}

const goHome = () => {
  uni.navigateTo({
    url: '/pages/A0300_client_main_v01'
  })
}

onMounted(() => {
  startPolling()
})

const contactService = () => {
  uni.makePhoneCall({
    phoneNumber: '400-800-8888'
  })
}

function editOrder() {
  uni.navigateTo({
    url: '/pages/A0108_client_edit_order_v01'
  })
}

onUnmounted(() => {
  if (pollingTimer) clearInterval(pollingTimer)
})
</script>

<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
}

/* 顶部导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 30px;
  background: transparent; /* ✅ 改为透明 */
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.wait-driver-page {
  padding: 20px;
}

/* 状态卡片 */
.status-card {
  font-size: 28px;
  background: #fff;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  margin-bottom: 30px;
}

.status-title {
  font-size: 28px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #333;
}

.subtitle {
  font-size: 18px;
  color: #666;
  margin-bottom: 20px;
}

.order-info {
  text-align: left;
}

.row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 24px;
  font-size: 26px;
  color: #555;
}

.label {
  font-weight: bold;
}

.value {
  color: #666;
}

.price {
  color: #e64340;
  font-weight: bold;
}

.empty-card {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 等待动画 */
.loading-section {
  margin: 40px 0;
  text-align: center;
}

.loading-icon {
  width: 100px;
  height: 100px;
  margin-bottom: 20px;
}

.waiting-text {
  font-size:18px;
  color: #555;
}

/* 按钮区 */
.action-buttons {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  margin-top: 20px;
}

.contact-btn {
  flex: 1;
  background-color: #409eff;
  color: white;
  border: none;
  padding: 14px 0;
  border-radius: 50px;
  font-size: 13px;
}

.edit-btn {
  flex: 1;
  background-color: #007AFF;
  color: white;
  border: none;
  padding: 14px 0;
  border-radius: 50px;
  font-size: 16px;
}

/* 底部版权 */
.footer {
  text-align: center;
  font-size: 12px;
  color: #777;
  margin-top: 40px;
  padding-bottom: 20px;
}
</style>