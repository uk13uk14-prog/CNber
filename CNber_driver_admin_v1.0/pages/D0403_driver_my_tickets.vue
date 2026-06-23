<template>
  <view class="page">
    <view class="actions">
      <button class="action-btn" @click="goSubmit">提交工单</button>
    </view>

    <view v-if="loading" class="hint">加载中…</view>
    <view v-else-if="!tickets.length" class="hint">暂无工单</view>
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

<script>
import {
  fetchMySupportTickets,
  supportTicketTypeLabel,
  supportTicketStatusLabel
} from '../utils/driverSupportApi.js'

export default {
  name: 'D0403_driver_my_tickets',
  data() {
    return {
      tickets: [],
      loading: false
    }
  },
  onShow() {
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
      this.loading = true
      try {
        const data = await fetchMySupportTickets({ page: 1, pageSize: 50 })
        this.tickets = Array.isArray(data?.tickets) ? data.tickets : []
      } catch {
        this.tickets = []
      } finally {
        this.loading = false
      }
    },
    goSubmit() {
      uni.navigateTo({ url: '/pages/D0402_driver_submit_ticket' })
    },
    goDetail(id) {
      uni.navigateTo({ url: `/pages/D0404_driver_ticket_detail?id=${id}` })
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

.actions {
  margin-bottom: 24rpx;
}

.action-btn {
  background-color: $color-primary;
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
}

.hint {
  text-align: center;
  color: #94a3b8;
  padding: 48rpx 0;
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
}

.row {
  display: flex;
  justify-content: space-between;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}

.no {
  font-weight: 600;
  color: $color-text-main;
}

.status {
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #fef3c7;
  color: #b45309;
  font-size: 22rpx;
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
  color: $color-text-main;
  margin-top: 8rpx;
}
</style>
