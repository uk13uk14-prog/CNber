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

    <view v-if="order" class="payment-card">
      <view>{{ priceLine }}</view>
      <view>{{ paymentLine }}</view>
      <button
        v-if="canConfirmPrice"
        class="pay-action"
        :disabled="priceActing"
        @click="confirmPrice"
      >
        确认价格
      </button>
      <button
        v-else-if="canMockPay"
        class="pay-action"
        :disabled="priceActing"
        @click="mockPay"
      >
        模拟支付
      </button>
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
import { confirmOrderPrice, fetchOrderList, payOrderMock } from '../utils/orderApi.js'
import { clientDriverInfoNotice } from '../utils/orderStatus.js'
import { pickActiveOrder, driverDisplayFromOrder, applyClientOrderRoute } from '../utils/orderFlow.js'

const driver = ref(driverDisplayFromOrder(null))
const order = ref(null)
const lastFlowSlot = ref('')
const priceActing = ref(false)
let pollingTimer = null

const noticeText = computed(() => clientDriverInfoNotice(order.value?.status))
const amountLine = computed(() => {
  const amount = order.value?.amount
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  return Number.isFinite(n) ? `£${n.toFixed(2)}` : String(amount)
})
const priceLine = computed(() => {
  const status = order.value?.priceStatus || 'pending'
  if (status === 'quoted' && order.value?.quoteSource === 'matrix') {
    return `机场固定价：${amountLine.value}`
  }
  if (status === 'quoted') return `报价：${amountLine.value}`
  if (status === 'confirmed') return `价格已确认：${amountLine.value}`
  return '等待后台报价'
})
const paymentLine = computed(() => {
  const map = {
    unpaid: '未支付',
    pending: '待支付',
    paid: '已支付，等待司机服务',
    refunded: '已退款'
  }
  return map[order.value?.paymentStatus || 'unpaid'] || order.value?.paymentStatus
})
const canConfirmPrice = computed(() => order.value?.priceStatus === 'quoted')
const canMockPay = computed(() =>
  order.value?.priceStatus === 'confirmed' && order.value?.paymentStatus !== 'paid'
)

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

const callDriver = () => {
  const num = String(driver.value.phone || '').replace(/\s/g, '')
  if (!num || num === '—') {
    uni.showToast({ title: '暂无司机电话', icon: 'none' })
    return
  }
  uni.makePhoneCall({ phoneNumber: num })
}

const callService = () => {
  uni.makePhoneCall({
    phoneNumber: '400-800-8888'
  })
}

async function confirmPrice() {
  if (!order.value?._id) return
  priceActing.value = true
  try {
    await confirmOrderPrice(order.value._id)
    uni.showToast({ title: '价格已确认', icon: 'success' })
    await fetchOrders()
  } catch (e) {
    /* request 已提示 */
  } finally {
    priceActing.value = false
  }
}

async function mockPay() {
  if (!order.value?._id) return
  priceActing.value = true
  try {
    await payOrderMock(order.value._id)
    uni.showToast({ title: '支付成功（测试）', icon: 'success' })
    await fetchOrders()
  } catch (e) {
    /* request 已提示 */
  } finally {
    priceActing.value = false
  }
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

.payment-card {
  text-align: center;
  font-size: 18px;
  color: #555;
  margin: 20px 0;
  padding: 15px;
  line-height: 1.8;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 12px;
}

.pay-action {
  margin-top: 12px;
  background-color: #ff9800;
  color: #fff;
  border-radius: 50px;
  font-size: 16px;
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