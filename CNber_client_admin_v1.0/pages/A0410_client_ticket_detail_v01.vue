<template>
  <view class="page">
    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="!ticket" class="hint">工单不存在或无权查看</view>
    <template v-else>
      <view class="card">
        <view class="field">
          <text class="label">工单号</text>
          <text class="value">{{ ticket.ticketNo || ticket._id }}</text>
        </view>
        <view class="field">
          <text class="label">类型</text>
          <text class="value">{{ ticket.typeLabel || typeLabel(ticket.type) }}</text>
        </view>
        <view class="field">
          <text class="label">状态</text>
          <text class="value status" :class="ticket.status">{{ statusLabel(ticket.status) }}</text>
        </view>
        <view class="field">
          <text class="label">标题</text>
          <text class="value">{{ ticket.title }}</text>
        </view>
        <view class="field block">
          <text class="label">描述</text>
          <text class="desc">{{ ticket.description || '—' }}</text>
        </view>
        <view v-if="ticket.orderNo" class="field">
          <text class="label">关联订单</text>
          <text class="value">{{ ticket.orderNo }}</text>
        </view>
        <view v-if="ticket.resolution" class="field block">
          <text class="label">处理结果</text>
          <text class="desc">{{ ticket.resolution }}</text>
        </view>
      </view>

      <view class="section-title">处理记录</view>
      <view v-if="!logs.length" class="hint small">暂无处理记录</view>
      <view v-else class="timeline">
        <view v-for="log in logs" :key="log._id || log.createdAt" class="log-item">
          <view class="log-time">{{ formatTime(log.createdAt) }}</view>
          <view class="log-content">{{ log.content }}</view>
          <view v-if="log.authorName" class="log-author">{{ log.authorName }}</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import {
  fetchMySupportTicketDetail,
  supportTicketTypeLabel,
  supportTicketStatusLabel
} from '../utils/supportApi.js'

const ticketId = ref('')
const ticket = ref(null)
const loading = ref(false)

const logs = computed(() => {
  const list = ticket.value?.operationLogs
  return Array.isArray(list) ? [...list].reverse() : []
})

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
  if (!ticketId.value) return
  loading.value = true
  try {
    const data = await fetchMySupportTicketDetail(ticketId.value)
    ticket.value = data?.ticket || null
  } catch {
    ticket.value = null
  } finally {
    loading.value = false
  }
}

onLoad((query) => {
  ticketId.value = String(query?.id || '').trim()
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

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.field {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
  font-size: 28rpx;
}

.field.block {
  flex-direction: column;
  align-items: flex-start;
}

.field:last-child {
  border-bottom: none;
}

.label {
  color: #64748b;
  flex-shrink: 0;
}

.value {
  color: #1e293b;
  text-align: right;
  flex: 1;
}

.desc {
  color: #334155;
  line-height: 1.6;
  margin-top: 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1e293b;
  margin: 32rpx 0 16rpx;
}

.hint {
  text-align: center;
  color: #64748b;
  padding: 48rpx 0;
  font-size: 28rpx;
}

.hint.small {
  padding: 16rpx 0;
  font-size: 26rpx;
}

.timeline {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 24rpx;
}

.log-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  font-size: 24rpx;
  color: #94a3b8;
  margin-bottom: 8rpx;
}

.log-content {
  font-size: 28rpx;
  color: #334155;
  line-height: 1.5;
}

.log-author {
  font-size: 24rpx;
  color: #64748b;
  margin-top: 6rpx;
}
</style>
