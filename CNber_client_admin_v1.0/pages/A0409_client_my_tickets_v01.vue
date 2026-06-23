<template>
  <view class="page">
    <view class="actions">
      <button class="action-btn" @click="goSubmit">提交工单</button>
    </view>

    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="!tickets.length" class="hint">暂无工单记录</view>
    <view v-else class="list">
      <view
        v-for="item in tickets"
        :key="item._id"
        class="item"
        @click="goDetail(item._id)"
      >
        <view class="row top">
          <text class="no">{{ item.ticketNo || item._id }}</text>
          <text class="status" :class="item.status">{{ statusLabel(item.status) }}</text>
        </view>
        <view class="row">
          <text class="type">{{ item.typeLabel || typeLabel(item.type) }}</text>
          <text class="time">{{ formatTime(item.createdAt) }}</text>
        </view>
        <view class="title">{{ item.title }}</view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import {
  fetchMySupportTickets,
  supportTicketTypeLabel,
  supportTicketStatusLabel
} from '../utils/supportApi.js'

const tickets = ref([])
const loading = ref(false)

function typeLabel(type) {
  return supportTicketTypeLabel(type)
}

function statusLabel(status) {
  return supportTicketStatusLabel(status)
}

function formatTime(value) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function load() {
  loading.value = true
  try {
    const data = await fetchMySupportTickets({ page: 1, pageSize: 50 })
    tickets.value = Array.isArray(data?.tickets) ? data.tickets : []
  } catch {
    tickets.value = []
  } finally {
    loading.value = false
  }
}

function goSubmit() {
  uni.navigateTo({ url: '/pages/A0408_client_submit_ticket_v01?returnTo=help' })
}

function goDetail(id) {
  uni.navigateTo({ url: `/pages/A0410_client_ticket_detail_v01?id=${id}` })
}

onShow(() => {
  load()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 32rpx 48rpx;
  background: linear-gradient(to bottom right, #cce6ff, #00f2fe);
  box-sizing: border-box;
}

.actions {
  margin-bottom: 24rpx;
}

.action-btn {
  background: linear-gradient(to right, #00c6ff, #0072ff);
  color: #fff;
  border-radius: 50rpx;
  font-size: 28rpx;
}

.hint {
  text-align: center;
  color: #64748b;
  padding: 48rpx 0;
  font-size: 28rpx;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.item {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
  font-size: 24rpx;
  color: #64748b;
}

.row.top {
  margin-bottom: 12rpx;
}

.no {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
}

.status {
  font-size: 22rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #fef3c7;
  color: #b45309;
}

.status.in_progress {
  background: #dbeafe;
  color: #1d4ed8;
}

.status.resolved,
.status.closed {
  background: #d1fae5;
  color: #047857;
}

.title {
  font-size: 28rpx;
  color: #1e293b;
  margin-top: 8rpx;
}
</style>
