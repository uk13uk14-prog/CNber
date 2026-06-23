<template>
  <view class="page">
    <view v-if="alerts.length" class="alerts">
      <view
        v-for="(alert, idx) in alerts"
        :key="idx"
        class="alert-card"
        :class="alert.priority === 'high' ? 'alert-high' : 'alert-normal'"
        @click="onAlert(alert)"
      >
        <text class="alert-title">{{ alert.title }}</text>
        <text class="alert-meta">{{ priorityLabel(alert.priority) }} · {{ formatTime(alert.createdAt) }}</text>
      </view>
    </view>

    <view v-if="loading" class="muted center">加载中…</view>
    <view v-else class="grid">
      <view v-for="card in cards" :key="card.key" class="card" @click="onCard(card)">
        <text class="label">{{ card.label }}</text>
        <text class="num">{{ stats[card.key] ?? 0 }}</text>
      </view>
    </view>
    <text v-if="error" class="error">{{ error }}</text>

    <view class="nav">
      <button class="nav-btn" @click="goDispatch">调度中心</button>
      <button class="nav-btn" @click="goTickets">客服工单</button>
      <button class="nav-btn" @click="goProfile">我的</button>
    </view>
  </view>
</template>

<script>
import { fetchMobileDashboard } from '@/services/adminApi'

export default {
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
        uni.navigateTo({ url: '/pages/M0005_admin_tickets?status=pending' })
      } else if (alert.target === 'dispatch') {
        const tab =
          alert.type === 'ready_dispatch'
            ? 'ready_dispatch'
            : 'payment_review'
        uni.navigateTo({ url: `/pages/M0003_admin_dispatch?tab=${tab}` })
      } else if (alert.type === 'driver_settlement') {
        uni.showToast({ title: '请使用 Web 管理端处理结算', icon: 'none' })
      }
    },
    onCard(card) {
      if (card.page === 'dispatch') {
        uni.navigateTo({ url: `/pages/M0003_admin_dispatch?tab=${card.tab || 'payment_review'}` })
      } else if (card.page === 'tickets') {
        uni.navigateTo({ url: `/pages/M0005_admin_tickets?status=${card.status || 'pending'}` })
      }
    },
    goDispatch() {
      uni.navigateTo({ url: '/pages/M0003_admin_dispatch' })
    },
    goTickets() {
      uni.navigateTo({ url: '/pages/M0005_admin_tickets' })
    },
    goProfile() {
      uni.navigateTo({ url: '/pages/M0007_admin_profile' })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; padding-bottom: 160rpx; }
.alerts { margin-bottom: 20rpx; display: flex; flex-direction: column; gap: 12rpx; }
.alert-card { border-radius: 12rpx; padding: 24rpx; }
.alert-high { background: #fef2f2; border: 1px solid #fecaca; }
.alert-high .alert-title { color: #b91c1c; }
.alert-normal { background: #eff6ff; border: 1px solid #bfdbfe; }
.alert-normal .alert-title { color: #1d4ed8; }
.alert-title { display: block; font-size: 28rpx; font-weight: 600; }
.alert-meta { display: block; font-size: 22rpx; color: #64748b; margin-top: 8rpx; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx; }
.label { color: #6b7280; font-size: 26rpx; }
.num { display: block; font-size: 48rpx; font-weight: 600; margin-top: 8rpx; }
.error { color: #e11; margin-top: 16rpx; display: block; }
.center { text-align: center; padding: 40rpx; }
.nav { position: fixed; left: 0; right: 0; bottom: 0; display: flex; gap: 12rpx; padding: 20rpx 24rpx; background: #fff; border-top: 1px solid #eee; box-sizing: border-box; }
.nav-btn { flex: 1; margin: 0; font-size: 26rpx; background: #f3f4f6; }
</style>
