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
          <text class="status-title">{{ pageTitle }}</text>
        </view>
        <view class="status-row subtitle">
          <text>{{ waitingText }}</text>
        </view>
        <view class="order-info">
          <view class="row">
            <view class="label">出发地：</view>
            <view class="value address-value">
              <view v-for="line in pickupAddressLines" :key="line">{{ line }}</view>
            </view>
          </view>
          <view class="row">
            <view class="label">目的地：</view>
            <view class="value address-value">
              <view v-for="line in dropoffAddressLines" :key="line">{{ line }}</view>
            </view>
          </view>
          <view class="row">
            <view class="label">订单状态：</view>
            <view class="value">{{ statusLabel }}</view>
          </view>
          <view class="row">
            <view class="label">价格状态：</view>
            <view class="value">{{ priceLine }}</view>
          </view>
          <view class="row">
            <view class="label">支付状态：</view>
            <view class="value">{{ paymentLine }}</view>
          </view>
          <view class="row">
            <view class="label">订单编号：</view>
            <view class="value">{{ orderIdShort }}</view>
          </view>
          <view class="row">
            <view class="label">司机：</view>
            <view class="value">{{ driverSummaryLine }}</view>
          </view>
        </view>
      </view>

      <view v-else class="status-card empty-card">
        <text class="status-title">暂无订单</text>
        <text class="waiting-text">当前没有可展示的订单记录</text>
      </view>

      <view v-if="driverInfo && showDriverPreviewCard" class="status-card driver-card">
        <view class="status-row">
          <text class="status-title">{{ driverCardTitle }}</text>
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
        <button
          v-if="canConfirmPrice"
          class="pay-btn"
          :disabled="priceActing"
          @click="confirmPrice"
        >
          确认价格
        </button>
        <button
          v-else-if="canMockPay"
          class="pay-btn"
          :disabled="priceActing"
          @click="mockPay"
        >
          模拟支付
        </button>
        <button class="edit-btn" @click="editOrder">修改订单</button>
        <button
          v-if="canCancelOrder"
          class="cancel-btn"
          :disabled="priceActing"
          @click="cancelOrder"
        >
          取消订单
        </button>
      </view>

    </view>
  </view>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import {
  cancelPassengerOrder,
  confirmOrderPrice,
  fetchOrderList,
  payOrderMock
} from '../utils/orderApi.js'
import {
  normalizeOrderStatus,
  clientOrderStatusLabel,
  clientWaitPageTitle,
  clientOrderWaitingHint
} from '../utils/orderStatus.js'
import { pickActiveOrder, driverDisplayFromOrder, applyClientOrderRoute } from '../utils/orderFlow.js'

const order = ref(null)
const lastFlowSlot = ref('')
const priceActing = ref(false)
const driverInfo = computed(() => {
  if (!order.value?.driverId) return null
  return driverDisplayFromOrder(order.value)
})

const orderNorm = computed(() => normalizeOrderStatus(order.value?.status))

const pageTitle = computed(() => clientWaitPageTitle(order.value?.status))
const statusLabel = computed(() => clientOrderStatusLabel(order.value?.status))
const waitingText = computed(() => clientOrderWaitingHint(order.value?.status))
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
const pickupAddressLines = computed(() =>
  addressLines(
    order.value?.pickupPostcode,
    order.value?.pickup,
    order.value?.pickupDetail
  )
)
const dropoffAddressLines = computed(() =>
  addressLines(
    order.value?.dropoffPostcode,
    order.value?.destination,
    order.value?.dropoffDetail
  )
)
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
const canCancelOrder = computed(() => ['pending', 'assigned'].includes(orderNorm.value))

const orderIdShort = computed(() => {
  const id = order.value?._id
  if (!id) return '—'
  const s = String(id)
  return s.length > 12 ? `${s.slice(0, 8)}…` : s
})

const driverSummaryLine = computed(() => {
  if (!order.value?.driverId) return '暂未分配司机'
  const n = orderNorm.value
  const d = driverDisplayFromOrder(order.value)
  if (n === 'assigned') {
    return d.phone && d.phone !== '—'
      ? `已指派，待司机确认（尾号 ${String(d.phone).slice(-4)}）`
      : '已指派，待司机确认'
  }
  if (d.phone && d.phone !== '—') return `尾号 ${String(d.phone).slice(-4)}`
  return '已关联司机'
})

const showDriverPreviewCard = computed(() => orderNorm.value === 'assigned' && !!driverInfo.value)

const driverCardTitle = computed(() =>
  orderNorm.value === 'assigned' ? '指派司机（待对方确认）' : '司机信息'
)

let pollingTimer = null

function addressLines(postcode, address, detail) {
  return [postcode, address, detail]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
}

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
    applyClientOrderRoute(order.value, lastFlowSlot)
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

async function cancelOrder() {
  if (!order.value?._id) return
  uni.showModal({
    title: '确认取消订单',
    content: '取消后订单将进入订单历史，是否继续？',
    success: async (res) => {
      if (!res.confirm) return
      priceActing.value = true
      try {
        await cancelPassengerOrder(order.value._id)
        uni.showToast({ title: '订单已取消', icon: 'success' })
        await fetchOrders()
      } catch (e) {
        /* request 已提示 */
      } finally {
        priceActing.value = false
      }
    }
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

.address-value {
  text-align: right;
  max-width: 60%;
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

.pay-btn {
  flex: 1;
  background-color: #ff9800;
  color: white;
  border: none;
  padding: 14px 0;
  border-radius: 50px;
  font-size: 16px;
}

.cancel-btn {
  flex: 1;
  background-color: #e43d33;
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