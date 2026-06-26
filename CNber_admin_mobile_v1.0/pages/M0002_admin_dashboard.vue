<template>
  <scroll-view scroll-y class="page">
    <view class="pad">
      <text class="welcome">工作台</text>
      <text class="tip">今日概览 · 点击卡片快速进入</text>

      <view v-if="alerts.length" class="alerts">
        <view
          v-for="(alert, idx) in alerts"
          :key="idx"
          class="alert-card"
          :class="alert.priority === 'high' ? 'admin-alert-high' : 'admin-alert-normal'"
          @click="onAlert(alert)"
        >
          <text class="admin-alert-title">{{ alert.title }}</text>
          <text class="admin-alert-meta">{{ priorityLabel(alert.priority) }} · {{ formatTime(alert.createdAt) }}</text>
        </view>
      </view>

      <view v-if="loading" class="admin-center admin-muted">加载中…</view>
      <view v-else class="grid">
        <AdminStatCard
          v-for="card in cards"
          :key="card.key"
          :label="card.label"
          :value="stats[card.key] ?? 0"
          @click="onCard(card)"
        />
      </view>
      <text v-if="error" class="admin-error">{{ error }}</text>
    </view>
  </scroll-view>
</template>

<script>
import AdminStatCard from '@/components/AdminStatCard.vue'
import { fetchMobileDashboard } from '@/services/adminApi'
import { DISPATCH_TAB_PRESET_KEY, TICKET_STATUS_PRESET_KEY } from '@/config/navPreset'

export default {
  components: { AdminStatCard },
  data() {
    return {
      loading: false,
      error: '',
      stats: {},
      alerts: [],
      cards: [
        { key: 'paymentReviewCount', label: '付款待确认', tab: 'payment_review', page: 'dispatch' },
        { key: 'readyDispatchCount', label: '待派单', tab: 'ready_dispatch', page: 'dispatch' },
        { key: 'inTripCount', label: '进行中', tab: 'in_trip', page: 'dispatch' },
        { key: 'openTicketCount', label: '新工单', status: 'pending', page: 'tickets' },
        { key: 'pendingSettlementCount', label: '待结算', page: 'none' },
        { key: 'todayCompletedCount', label: '今日完成', tab: 'in_trip', page: 'dispatch' }
      ]
    }
  },
  onShow() {
    this.load()
  },
  methods: {
    priorityLabel(p) {
      return p === 'high' ? '高优先级' : '普通'
    },
    formatTime(value) {
      if (!value) return '刚刚'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '刚刚'
      const pad = (n) => String(n).padStart(2, '0')
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
    },
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = (await fetchMobileDashboard()) || {}
        this.stats = data
        this.alerts = Array.isArray(data.alerts) ? data.alerts : []
      } catch (e) {
        this.error = e.message || '加载失败'
        this.alerts = []
      } finally {
        this.loading = false
      }
    },
    onAlert(alert) {
      if (alert.target === 'tickets') {
        uni.setStorageSync(TICKET_STATUS_PRESET_KEY, 'pending')
        uni.switchTab({ url: '/pages/M0005_admin_tickets' })
      } else if (alert.target === 'dispatch') {
        const tab = alert.type === 'ready_dispatch' ? 'ready_dispatch' : 'payment_review'
        uni.setStorageSync(DISPATCH_TAB_PRESET_KEY, tab)
        uni.switchTab({ url: '/pages/M0003_admin_dispatch' })
      } else if (alert.type === 'driver_settlement') {
        uni.showToast({ title: '请使用 Web 管理端处理结算', icon: 'none' })
      }
    },
    onCard(card) {
      if (card.page === 'dispatch') {
        if (card.tab) uni.setStorageSync(DISPATCH_TAB_PRESET_KEY, card.tab)
        uni.switchTab({ url: '/pages/M0003_admin_dispatch' })
      } else if (card.page === 'tickets') {
        if (card.status) uni.setStorageSync(TICKET_STATUS_PRESET_KEY, card.status)
        uni.switchTab({ url: '/pages/M0005_admin_tickets' })
      } else if (card.page === 'none') {
        uni.showToast({ title: '请使用 Web 管理端处理结算', icon: 'none' })
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page {
  height: 100vh;
}
.pad {
  padding: $admin-page-pad;
  padding-bottom: 120rpx;
}
.welcome {
  font-size: 40rpx;
  font-weight: 700;
  color: $admin-text;
  display: block;
}
.tip {
  display: block;
  margin: 8rpx 0 24rpx;
  color: $admin-text-secondary;
  font-size: 26rpx;
}
.alerts {
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.alert-card {
  padding: 24rpx;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.admin-error {
  display: block;
  margin-top: 16rpx;
}
</style>
