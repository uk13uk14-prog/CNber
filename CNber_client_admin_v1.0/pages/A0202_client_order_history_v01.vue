<template>
  <view class="order-history-page">
    <view class="title">订单历史</view>

    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="!orders.length" class="hint">暂无订单记录</view>

    <scroll-view v-else class="order-list" scroll-y="true">
      <view class="order-item" v-for="item in orders" :key="item._id">
        <view class="row">
          <text class="label">订单状态</text>
          <text class="value">{{ statusLabel(item.status) }}</text>
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
          <text class="label">服务类型</text>
          <text class="value">{{ item.serviceType || 'ride' }}</text>
        </view>
        <view class="row">
          <text class="label">金额</text>
          <text class="value">{{ formatAmount(item.amount) }}</text>
        </view>
        <view class="row id-row">
          <text class="label">订单号</text>
          <text class="value mono">{{ item._id }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { fetchOrderList } from '../utils/orderApi.js'
import { clientOrderStatusLabel, formatOrderListTime } from '../utils/orderStatus.js'

const orders = ref([])
const loading = ref(true)

function statusLabel(status) {
  return clientOrderStatusLabel(status)
}

function formatAmount(amount) {
  if (amount == null || amount === '') return '—'
  const n = Number(amount)
  if (Number.isNaN(n)) return String(amount)
  return `¥${n.toFixed(2)}`
}

async function loadList() {
  const token = uni.getStorageSync('token')
  if (!token) {
    loading.value = false
    orders.value = []
    uni.showToast({ title: '请先登录', icon: 'none' })
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
  padding: 15px;
  box-sizing: border-box;
}

.title {
  font-size: 30px;
  font-weight: bold;
  margin: 10px 0 15px;
  text-align: center;
  color: #333;
}

.hint {
  text-align: center;
  color: #555;
  font-size: 28rpx;
  padding: 40rpx 0;
}

.order-list {
  flex-grow: 1;
  max-height: calc(100vh - 120px);
}

.order-item {
  background: #fff;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
  font-size: 20px;
  gap: 12px;
}

.id-row .value {
  flex: 1;
  text-align: right;
  word-break: break-all;
}

.mono {
  font-size: 18px;
}

.label {
  font-weight: 500;
  color: #333;
  flex-shrink: 0;
}

.value {
  color: #666;
  text-align: right;
}
</style>
