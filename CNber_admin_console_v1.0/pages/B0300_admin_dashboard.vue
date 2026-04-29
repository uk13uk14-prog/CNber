<template>
  <scroll-view scroll-y class="page">
    <view class="pad">
      <text class="welcome">工作台</text>
      <text class="tip">今日概览与快捷入口</text>

      <view class="grid2">
        <AdminStatCard label="今日新单" :value="stats.todayOrderCount" />
        <AdminStatCard label="待指派" :value="stats.pendingDispatchCount" hint="status=pending" />
        <AdminStatCard label="已接单" :value="stats.acceptedOrderCount" />
        <AdminStatCard label="行程中" :value="stats.inProgressOrderCount" />
        <AdminStatCard label="累计完成" :value="stats.completedOrderCount" />
        <AdminStatCard label="今日完成" :value="stats.completedTodayCount" />
      </view>

      <AdminSectionTitle title="快捷入口" />
      <view class="shortcuts">
        <view
          v-for="s in shortcuts"
          :key="s.key"
          class="sc"
          @click="onShortcut(s)"
        >
          <text class="sc-t">{{ s.label }}</text>
          <text class="sc-a">进入</text>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
import AdminStatCard from '../components/AdminStatCard.vue'
import AdminSectionTitle from '../components/AdminSectionTitle.vue'
import { DASHBOARD_SHORTCUTS } from '../config/menu.js'
import { fetchDashboardStats } from '../services/stats.js'
import { goTab } from '../utils/nav.js'
import { isLoggedIn } from '../store/session.js'

export default {
  components: { AdminStatCard, AdminSectionTitle },
  data() {
    return {
      shortcuts: DASHBOARD_SHORTCUTS,
      stats: {
        todayOrderCount: 0,
        pendingDispatchCount: 0,
        acceptedOrderCount: 0,
        inProgressOrderCount: 0,
        completedOrderCount: 0,
        completedTodayCount: 0
      }
    }
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/B0001_admin_login' })
      return
    }
    this.load()
  },
  methods: {
    async load() {
      try {
        const d = await fetchDashboardStats()
        if (d) Object.assign(this.stats, d)
      } catch (e) {
        /* handled */
      }
    },
    onShortcut(s) {
      if (s.type === 'switchTab') {
        if (s.preset) {
          try {
            uni.setStorageSync('order_list_preset', s.preset)
          } catch (e) {
            /* ignore */
          }
        } else {
          try {
            uni.removeStorageSync('order_list_preset')
          } catch (e) {
            /* ignore */
          }
        }
        goTab(s.path)
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
}
.tip {
  display: block;
  margin: 8rpx 0 24rpx;
  color: $admin-text-secondary;
  font-size: 26rpx;
}
.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.shortcuts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
}
.sc {
  background: #fff;
  border: 1rpx solid $admin-border;
  border-radius: $admin-card-radius;
  padding: 28rpx;
}
.sc-t {
  font-size: 28rpx;
  font-weight: 600;
  color: $admin-text;
  display: block;
}
.sc-a {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: $admin-primary;
  display: block;
}
</style>
