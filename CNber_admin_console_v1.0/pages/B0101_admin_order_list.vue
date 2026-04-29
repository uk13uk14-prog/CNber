<template>
  <view class="page">
    <view class="filters">
      <input v-model="q.orderId" class="inp" placeholder="订单号 / MongoId" />
      <input v-model="q.customerPhone" class="inp" placeholder="客户手机号" />
      <picker :range="statusLabels" :value="statusIndex" @change="onStatusPick">
        <view class="inp picker">状态：{{ statusLabels[statusIndex] }}</view>
      </picker>
      <picker :range="serviceLabels" :value="serviceIndex" @change="onServicePick">
        <view class="inp picker">服务：{{ serviceLabels[serviceIndex] }}</view>
      </picker>
      <view class="row2">
        <input v-model="q.dateFrom" class="inp half" placeholder="开始日期 YYYY-MM-DD" />
        <input v-model="q.dateTo" class="inp half" placeholder="结束日期" />
      </view>
      <button class="btn" type="primary" @click="reload">筛选</button>
    </view>

    <scroll-view scroll-y class="list">
      <AdminOrderCard
        v-for="item in orders"
        :key="item._id"
        :order="item"
        @detail="goDetail(item._id)"
        @dispatch="goDispatch(item._id)"
        @follow="goFollow(item._id)"
        @cancel="cancelOrder(item._id)"
      />
      <view v-if="!loading && orders.length === 0" class="empty">暂无订单</view>
    </scroll-view>
  </view>
</template>

<script>
import AdminOrderCard from '../components/AdminOrderCard.vue'
import { fetchOrderList, updateOrderMainStatus } from '../services/order.js'
import { uiStatusToListQuery, ORDER_FILTER_TABS } from '../config/orderStatus.js'
import { getServiceTypeLabel } from '../config/serviceTypes.js'
import { goPage } from '../utils/nav.js'
import { isLoggedIn } from '../store/session.js'

const SERVICE_KEYS = ['', 'ride', 'pickup', 'dropoff', 'charter', 'point']

export default {
  components: { AdminOrderCard },
  data() {
    return {
      orders: [],
      loading: false,
      q: {
        orderId: '',
        customerPhone: '',
        dateFrom: '',
        dateTo: ''
      },
      statusTabKey: 'all',
      statusIndex: 0,
      statusLabels: ORDER_FILTER_TABS.map((t) => t.label),
      statusKeys: ORDER_FILTER_TABS.map((t) => t.key),
      serviceIndex: 0,
      serviceLabels: [
        '全部',
        getServiceTypeLabel('ride'),
        getServiceTypeLabel('pickup'),
        getServiceTypeLabel('dropoff'),
        getServiceTypeLabel('charter'),
        getServiceTypeLabel('point')
      ]
    }
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/B0001_admin_login' })
      return
    }
    this.applyPresetFromStorage()
    this.reload()
  },
  methods: {
    applyPresetFromStorage() {
      try {
        const p = uni.getStorageSync('order_list_preset')
        if (p === 'dispatch') {
          const idx = this.statusKeys.indexOf('waiting_driver')
          if (idx >= 0) this.statusIndex = idx
          this.statusTabKey = 'waiting_driver'
        } else if (p === 'follow') {
          const idx = this.statusKeys.indexOf('in_progress')
          if (idx >= 0) this.statusIndex = idx
          this.statusTabKey = 'in_progress'
        }
        if (p) uni.removeStorageSync('order_list_preset')
      } catch (e) {
        /* ignore */
      }
    },
    onStatusPick(e) {
      const i = Number(e.detail.value)
      this.statusIndex = i
      this.statusTabKey = this.statusKeys[i] || 'all'
    },
    onServicePick(e) {
      this.serviceIndex = Number(e.detail.value)
    },
    buildQuery() {
      const query = {}
      const st = uiStatusToListQuery(this.statusTabKey)
      Object.assign(query, st)
      if (this.q.orderId && String(this.q.orderId).trim()) {
        query.orderId = String(this.q.orderId).trim()
      }
      if (this.q.customerPhone && String(this.q.customerPhone).trim()) {
        query.customerPhone = String(this.q.customerPhone).trim()
      }
      if (this.q.dateFrom) query.dateFrom = this.q.dateFrom
      if (this.q.dateTo) query.dateTo = this.q.dateTo
      const sk = SERVICE_KEYS[this.serviceIndex]
      if (sk) query.serviceType = sk
      return query
    },
    async reload() {
      this.loading = true
      try {
        const data = await fetchOrderList(this.buildQuery())
        this.orders = (data && data.orders) || []
      } catch (e) {
        this.orders = []
      } finally {
        this.loading = false
      }
    },
    goDetail(id) {
      goPage(`/pages/B0105_admin_order_readonly_detail?id=${id}`)
    },
    goDispatch(id) {
      goPage(`/pages/B0103_admin_dispatch?id=${id}`)
    },
    goFollow(id) {
      goPage(`/pages/B0104_admin_followup?id=${id}`)
    },
    cancelOrder(id) {
      uni.showModal({
        title: '确认取消订单',
        content: '将该已指派订单取消，是否继续？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await updateOrderMainStatus(id, 'cancelled')
            uni.showToast({ title: '订单已取消', icon: 'success' })
            this.reload()
          } catch (e) {
            /* request 已统一提示 */
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
  display: flex;
  flex-direction: column;
  height: 100vh;
}
.filters {
  padding: $admin-page-pad;
  padding-bottom: 12rpx;
  background: $admin-bg;
  flex-shrink: 0;
}
.inp {
  background: #fff;
  border: 1rpx solid $admin-border;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 26rpx;
  margin-bottom: 12rpx;
}
.picker {
  line-height: 1.4;
}
.row2 {
  display: flex;
  gap: 12rpx;
}
.half {
  flex: 1;
}
.btn {
  background: $admin-primary;
  border-radius: 12rpx;
  font-size: 28rpx;
}
.list {
  flex: 1;
  padding: 0 $admin-page-pad 120rpx;
  box-sizing: border-box;
}
.empty {
  text-align: center;
  color: $admin-text-secondary;
  padding: 80rpx 0;
}
</style>
