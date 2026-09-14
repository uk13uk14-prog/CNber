<template>
  <view class="container">
    <view class="header">消息通知</view>
    <view v-if="loading" class="card">加载中…</view>
    <view v-else-if="err" class="card err">{{ err }}</view>
    <view v-else-if="!requests.length" class="card">暂无司机取消申请</view>
    <view v-for="item in requests" :key="item.id" class="card">
      <text class="notice-title">司机申请取消订单</text>
      <text class="notice-line">订单号：{{ item.orderNo || '—' }}</text>
      <text class="notice-line">出发时间：{{ formatPickup(item.pickupAt) }}</text>
      <text class="notice-line">出发地点：{{ item.pickup || '—' }}</text>
      <text class="notice-line">目的地：{{ item.destination || '—' }}</text>
      <text class="notice-line">取消原因：{{ item.reason || '—' }}{{ item.note ? `（${item.note}）` : '' }}</text>
      <view class="actions">
        <button class="btn-ghost" :disabled="actingId === item.id" @click="onDecide(item, false)">不同意</button>
        <button class="btn-main" :disabled="actingId === item.id" @click="onDecide(item, true)">同意取消</button>
      </view>
    </view>
  </view>
</template>

<script>
import {
  fetchPendingDriverCancellations,
  decideDriverCancellation
} from '../utils/clientCancelWatch.js'

export default {
  data() {
    return {
      loading: false,
      err: '',
      requests: [],
      actingId: ''
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    formatPickup(iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return '—'
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}`
    },
    async load() {
      this.loading = true
      this.err = ''
      try {
        const data = await fetchPendingDriverCancellations()
        this.requests = (data && data.requests) || []
      } catch (e) {
        this.err = (e && e.message) || '加载失败'
        this.requests = []
      } finally {
        this.loading = false
      }
    },
    async onDecide(item, approve) {
      this.actingId = item.id
      try {
        await decideDriverCancellation(item.id, approve)
        uni.showToast({
          title: approve ? '已同意取消' : '已拒绝取消',
          icon: approve ? 'success' : 'none'
        })
        await this.load()
      } catch (e) {
        /* request 已 toast */
      } finally {
        this.actingId = ''
      }
    }
  }
}
</script>

<style scoped>
.container {
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  min-height: 100vh;
  padding: 32rpx;
}
.header {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  margin-bottom: 24rpx;
  color: #333;
}
.card {
  background-color: white;
  border-radius: 26rpx;
  padding: 34rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}
.card.err {
  color: #dc2626;
}
.notice-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 12rpx;
}
.notice-line {
  display: block;
  font-size: 26rpx;
  color: #374151;
  line-height: 1.6;
}
.actions {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
}
.btn-ghost,
.btn-main {
  flex: 1;
  margin: 0;
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
}
.btn-ghost {
  background: #fff;
  color: #1265d8;
  border: 2rpx solid #1265d8;
}
.btn-main {
  background: #ff7a00;
  color: #fff;
  border: none;
}
</style>
