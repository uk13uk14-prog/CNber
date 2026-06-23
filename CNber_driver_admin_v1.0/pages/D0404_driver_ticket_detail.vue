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
          <text class="value">{{ statusLabel(ticket.status) }}</text>
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

<script>
import {
  fetchMySupportTicketDetail,
  supportTicketTypeLabel,
  supportTicketStatusLabel
} from '../utils/driverSupportApi.js'

export default {
  name: 'D0404_driver_ticket_detail',
  data() {
    return {
      ticketId: '',
      ticket: null,
      loading: false
    }
  },
  computed: {
    logs() {
      const list = this.ticket?.operationLogs
      return Array.isArray(list) ? [...list].reverse() : []
    }
  },
  onLoad(query) {
    this.ticketId = String(query?.id || '').trim()
    this.load()
  },
  methods: {
    typeLabel(type) {
      return supportTicketTypeLabel(type)
    },
    statusLabel(status) {
      return supportTicketStatusLabel(status)
    },
    formatTime(value) {
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '—'
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    async load() {
      if (!this.ticketId) return
      this.loading = true
      try {
        const data = await fetchMySupportTicketDetail(this.ticketId)
        this.ticket = data?.ticket || null
      } catch {
        this.ticket = null
      } finally {
        this.loading = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.page {
  min-height: 100vh;
  padding: 30rpx;
  background-color: $color-background;
}

.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}

.field {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f1f5f9;
  font-size: 28rpx;
}

.field.block {
  flex-direction: column;
  align-items: flex-start;
}

.label {
  color: #64748b;
}

.value {
  color: $color-text-main;
  text-align: right;
  flex: 1;
}

.desc {
  margin-top: 8rpx;
  line-height: 1.6;
  color: $color-text-main;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  margin: 32rpx 0 16rpx;
}

.hint {
  text-align: center;
  color: #94a3b8;
  padding: 48rpx 0;
}

.hint.small {
  padding: 16rpx 0;
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

.log-time {
  font-size: 24rpx;
  color: #94a3b8;
}

.log-content {
  font-size: 28rpx;
  margin-top: 8rpx;
}

.log-author {
  font-size: 24rpx;
  color: #64748b;
  margin-top: 6rpx;
}
</style>
