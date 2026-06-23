<template>
  <view class="page">
    <view class="card">
      <view class="row"><text class="label">账号</text><text>{{ user?.phone || '—' }}</text></view>
      <view class="row"><text class="label">角色</text><text>{{ roleLabel }}</text></view>
    </view>

    <view class="nav">
      <button class="nav-btn" @click="goDashboard">工作台</button>
      <button class="nav-btn" @click="goDispatch">调度中心</button>
      <button class="nav-btn" @click="goTickets">客服工单</button>
    </view>

    <button class="btn logout" @click="onLogout">退出登录</button>
  </view>
</template>

<script>
import { getUser, logout, ROLE_LABELS } from '@/stores/auth'

export default {
  data() {
    return { user: null }
  },
  computed: {
    roleLabel() {
      return ROLE_LABELS[this.user?.role] || this.user?.role || '—'
    }
  },
  onShow() {
    this.user = getUser()
  },
  methods: {
    goDashboard() {
      uni.reLaunch({ url: '/pages/M0002_admin_dashboard' })
    },
    goDispatch() {
      uni.navigateTo({ url: '/pages/M0003_admin_dispatch' })
    },
    goTickets() {
      uni.navigateTo({ url: '/pages/M0005_admin_tickets' })
    },
    onLogout() {
      logout()
      uni.reLaunch({ url: '/pages/M0001_admin_login' })
    }
  }
}
</script>

<style scoped>
.page { padding: 24rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 32rpx; }
.row { display: flex; justify-content: space-between; padding: 16rpx 0; border-bottom: 1px solid #f0f0f0; }
.label { color: #6b7280; }
.nav { display: flex; flex-direction: column; gap: 16rpx; margin-bottom: 32rpx; }
.nav-btn { margin: 0; font-size: 28rpx; }
.logout { background: #fff; color: #e11; border: 1px solid #fecaca; }
</style>
