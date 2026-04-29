<template>
  <view class="page">
    <scroll-view scroll-y class="scroll">
      <view class="pad">
        <AdminOrderSummary v-if="order._id" :order="order" />

        <AdminSectionTitle title="可选司机" />
        <text class="tip">以下为当前在线司机，可直接指派给该订单</text>

        <AdminDriverCard
          v-for="d in drivers"
          :key="d._id"
          :driver="d"
          @assign="onAssign(d)"
        />
        <view v-if="!loading && drivers.length === 0" class="empty">暂无司机数据</view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import AdminOrderSummary from '../components/AdminOrderSummary.vue'
import AdminSectionTitle from '../components/AdminSectionTitle.vue'
import AdminDriverCard from '../components/AdminDriverCard.vue'
import { fetchOrderDetail, assignOrderDriver } from '../services/order.js'
import { fetchAvailableDrivers } from '../services/driver.js'
import { isLoggedIn } from '../store/session.js'
import { back } from '../utils/nav.js'

export default {
  components: { AdminOrderSummary, AdminSectionTitle, AdminDriverCard },
  data() {
    return {
      id: '',
      order: {},
      drivers: [],
      loading: false
    }
  },
  onLoad(q) {
    this.id = q.id || ''
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/B0001_admin_login' })
      return
    }
    if (this.id) {
      this.loadOrder()
      this.loadDrivers()
    }
  },
  methods: {
    async loadOrder() {
      try {
        const data = await fetchOrderDetail(this.id)
        this.order = (data && data.order) || {}
      } catch (e) {
        this.order = {}
      }
    },
    async loadDrivers() {
      this.loading = true
      try {
        const data = await fetchAvailableDrivers()
        this.drivers = Array.isArray(data) ? data : []
      } catch (e) {
        this.drivers = []
      } finally {
        this.loading = false
      }
    },
    onAssign(driver) {
      const userId = driver.userId
      const uid =
        (userId && (typeof userId === 'object' ? userId._id : userId)) ||
        driver._id
      if (!uid) {
        uni.showToast({ title: '司机账号异常', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认指派',
        content: '将把该订单指派给此在线司机',
        success: async (r) => {
          if (!r.confirm) return
          try {
            await assignOrderDriver(this.id, uid)
            uni.showToast({ title: '指派成功', icon: 'success' })
            await this.loadOrder()
            setTimeout(() => back(), 500)
          } catch (e) {
            /* toast */
          }
        }
      })
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
}
.scroll {
  flex: 1;
  height: 0;
}
.pad {
  padding: $admin-page-pad;
  padding-bottom: 40rpx;
}
.tip {
  font-size: 24rpx;
  color: $admin-text-secondary;
  margin-bottom: 16rpx;
  display: block;
}
.empty {
  text-align: center;
  color: $admin-text-secondary;
  padding: 40rpx;
}
</style>
