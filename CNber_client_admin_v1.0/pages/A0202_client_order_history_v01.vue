<template>
  <view class="order-history-page">
    <view class="title">订单历史</view>

    <scroll-view scroll-x class="tabs-wrap">
      <view class="tabs">
        <view
          v-for="tab in tabs"
          :key="tab.id"
          class="tab"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
          <text class="count">{{ tabCounts[tab.id] || 0 }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="!visibleOrders.length" class="hint">暂无订单记录</view>

    <scroll-view v-else class="order-list" scroll-y="true">
      <view class="order-item" v-for="item in visibleOrders" :key="item._id">
        <view class="row">
          <text class="label">订单状态</text>
          <text class="value">{{ bookingLabel(item) }}</text>
        </view>
        <view class="row">
          <text class="label">付款状态</text>
          <text class="value">{{ paymentLabel(item) }}</text>
        </view>
        <view class="row">
          <text class="label">下单时间</text>
          <text class="value">{{ formatOrderListTime(item.createdAt) }}</text>
        </view>
        <view class="row">
          <text class="label">出发地</text>
          <text class="value">{{ item.pickup || '—' }}</text>
        </view>
        <view class="row">
          <text class="label">目的地</text>
          <text class="value">{{ item.destination || '—' }}</text>
        </view>
        <view class="row">
          <text class="label">金额</text>
          <text class="value">{{ clientPrimaryAmountLine(item) }}</text>
        </view>
        <view class="row id-row">
          <text class="label">订单号</text>
          <text class="value mono">{{ item.orderNo || item._id }}</text>
        </view>
        <view v-if="needsPay(item)" class="pay-actions">
          <button class="pay-btn" type="default" @click="goPay(item._id)">继续付款</button>
          <button class="cancel-btn" type="default" @click="cancelOrder(item)">取消订单</button>
        </view>
        <view class="help-actions">
          <button class="help-btn" type="default" @click="goHelp(item)">申请帮助</button>
        </view>
        <view v-if="isCompleted(item)" class="rate-actions">
          <button class="rate-btn" type="default" @click="goRating(item)">
            {{ item.ratingStatus === 'rated' ? '查看评价' : '评价' }}
          </button>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { cancelPassengerOrder, fetchOrderList } from '../utils/orderApi.js'
import { formatOrderListTime, normalizeOrderStatus } from '../utils/orderStatus.js'
import { clientV1BookingStatusLabel, clientV1PaymentLabel } from '../utils/clientBookingFlow.js'
import { clientPrimaryAmountLine } from '../utils/currencyDisplay.js'
import {
  CLIENT_HISTORY_TABS,
  clientOrderHistoryTab,
  filterOrdersByHistoryTab
} from '../utils/clientOrderGroups.js'

const orders = ref([])
const loading = ref(true)
const activeTab = ref('active')
const tabs = CLIENT_HISTORY_TABS

const tabCounts = computed(() => {
  const counts = {}
  for (const tab of tabs) {
    counts[tab.id] = filterOrdersByHistoryTab(orders.value, tab.id).length
  }
  return counts
})

const visibleOrders = computed(() => filterOrdersByHistoryTab(orders.value, activeTab.value))

function bookingLabel(item) {
  return clientV1BookingStatusLabel(item)
}

function paymentLabel(item) {
  return clientV1PaymentLabel(item)
}

function needsPay(o) {
  return clientV1PaymentLabel(o) === '待付款'
}

function goPay(orderId) {
  if (!orderId) return
  uni.navigateTo({
    url: `/pages/A0106_client_payment_v01?orderId=${encodeURIComponent(String(orderId))}`
  })
}

function orderNoOf(item) {
  if (item?.orderNo) return String(item.orderNo)
  return ''
}

function isCompleted(item) {
  return normalizeOrderStatus(item?.status) === 'completed'
}

function goRating(item) {
  if (!item?._id) return
  uni.navigateTo({
    url: `/pages/A0201_client_rating_v01?orderId=${encodeURIComponent(String(item._id))}`
  })
}

function goHelp(item) {
  if (!item?._id) return
  const orderId = encodeURIComponent(String(item._id))
  const orderNo = orderNoOf(item)
  const q = orderNo
    ? `orderId=${orderId}&orderNo=${encodeURIComponent(orderNo)}&returnTo=order`
    : `orderId=${orderId}&returnTo=order`
  uni.navigateTo({ url: `/pages/A0408_client_submit_ticket_v01?${q}` })
}

function cancelOrder(item) {
  if (!item?._id) return
  uni.showModal({
    title: '取消订单',
    content: '确定取消该未付款订单？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await cancelPassengerOrder(item._id)
        uni.showToast({ title: '已取消', icon: 'success' })
        await loadList()
      } catch {
        /* request 已提示 */
      }
    }
  })
}

async function loadList() {
  const token = uni.getStorageSync('token')
  if (!token) {
    loading.value = false
    orders.value = []
    uni.showToast({ title: '请先登录', icon: 'none' })
    setTimeout(() => {
      uni.navigateTo({ url: '/pages/A0002_client_login_v01' })
    }, 600)
    return
  }
  loading.value = true
  try {
    const data = await fetchOrderList()
    const list = Array.isArray(data?.orders) ? data.orders : []
    orders.value = [...list].sort((a, b) => {
      const ta = new Date(a.createdAt || 0).getTime()
      const tb = new Date(b.createdAt || 0).getTime()
      return tb - ta
    })
  } catch {
    orders.value = []
  } finally {
    loading.value = false
  }
}

onShow(() => {
  loadList()
})
</script>

<style scoped>
.order-history-page {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 24rpx;
  box-sizing: border-box;
}
.title {
  font-size: 40rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
}
.tabs-wrap {
  margin-bottom: 20rpx;
  white-space: nowrap;
}
.tabs {
  display: flex;
  gap: 12rpx;
}
.tab {
  display: inline-flex;
  align-items: center;
  padding: 12rpx 24rpx;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 999rpx;
  font-size: 26rpx;
}
.tab.active {
  background: #0072ff;
  color: #fff;
}
.count {
  margin-left: 8rpx;
  font-size: 22rpx;
  opacity: 0.85;
}
.hint {
  text-align: center;
  color: #666;
  padding: 40rpx;
}
.order-list {
  max-height: calc(100vh - 220rpx);
}
.order-item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.row {
  display: flex;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}
.label {
  width: 160rpx;
  color: #666;
  flex-shrink: 0;
}
.value {
  flex: 1;
  word-break: break-all;
}
.mono {
  font-family: monospace;
  font-size: 24rpx;
}
.pay-actions,
.help-actions,
.rate-actions {
  margin-top: 16rpx;
  display: flex;
  gap: 12rpx;
}
.pay-btn,
.cancel-btn,
.help-btn,
.rate-btn {
  flex: 1;
  font-size: 26rpx;
}
</style>
