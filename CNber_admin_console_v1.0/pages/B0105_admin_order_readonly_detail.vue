<template>
  <scroll-view scroll-y class="page">
    <view v-if="order._id" class="pad">
      <AdminSectionTitle title="订单详情" />
      <view class="card">
        <view class="row">
          <text class="key">订单ID</text>
          <text class="value mono">{{ order._id }}</text>
        </view>
        <view class="row">
          <text class="key">状态</text>
          <text class="value">{{ statusLabel }}</text>
        </view>
        <view class="row">
          <text class="key">乘客</text>
          <text class="value">{{ passengerLine }}</text>
        </view>
        <view class="row">
          <text class="key">司机</text>
          <text class="value">{{ driverLine }}</text>
        </view>
        <view class="row">
          <text class="key">创建时间</text>
          <text class="value">{{ fmt(order.createdAt) }}</text>
        </view>
        <view class="row last">
          <text class="key">更新时间</text>
          <text class="value">{{ fmt(order.updatedAt) }}</text>
        </view>
      </view>
      <button v-if="canCancelOrder" class="cancel-btn" @click="cancelOrder">
        取消订单
      </button>
    </view>

    <view v-else class="empty">
      <text>{{ loading ? '加载中...' : '订单不存在或加载失败' }}</text>
    </view>
  </scroll-view>
</template>

<script>
import AdminSectionTitle from '../components/AdminSectionTitle.vue'
import { fetchOrderDetail, updateOrderMainStatus } from '../services/order.js'
import { mapOrderToUiStatus, getUiStatusMeta } from '../config/orderStatus.js'
import { formatDateTime, maskPhone } from '../utils/format.js'
import { isLoggedIn } from '../store/session.js'

function personLine(value) {
  if (!value || typeof value !== 'object') return '—'
  const name = value.name || value.realName || value.nickname || value.driverProfile?.name
  const phone = value.phone ? maskPhone(value.phone) : ''
  return [name, phone].filter(Boolean).join(' / ') || '—'
}

export default {
  components: { AdminSectionTitle },
  data() {
    return {
      id: '',
      order: {},
      loading: false
    }
  },
  computed: {
    statusLabel() {
      return getUiStatusMeta(mapOrderToUiStatus(this.order)).label
    },
    passengerLine() {
      return personLine(this.order.userId)
    },
    driverLine() {
      return personLine(this.order.driverId || this.order.assignedDriver)
    },
    canCancelOrder() {
      return this.order.status === 'assigned'
    }
  },
  onLoad(query) {
    this.id = query.id || ''
  },
  onShow() {
    if (!isLoggedIn()) {
      uni.reLaunch({ url: '/pages/B0001_admin_login' })
      return
    }
    if (this.id) this.load()
  },
  methods: {
    fmt(value) {
      return formatDateTime(value)
    },
    async load() {
      this.loading = true
      try {
        const data = await fetchOrderDetail(this.id)
        this.order = (data && data.order) || {}
      } catch (e) {
        this.order = {}
      } finally {
        this.loading = false
      }
    },
    cancelOrder() {
      uni.showModal({
        title: '确认取消订单',
        content: '将该已指派订单取消，是否继续？',
        success: async (res) => {
          if (!res.confirm) return
          try {
            await updateOrderMainStatus(this.id, 'cancelled')
            uni.showToast({ title: '订单已取消', icon: 'success' })
            this.load()
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
  min-height: 100vh;
  background: $admin-bg;
}
.pad {
  padding: $admin-page-pad;
}
.card {
  background: #fff;
  border: 1rpx solid $admin-border;
  border-radius: $admin-card-radius;
  padding: 8rpx 24rpx;
}
.row {
  display: flex;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f2f4f7;
  font-size: 26rpx;
}
.row.last {
  border-bottom: 0;
}
.key {
  width: 180rpx;
  color: $admin-text-secondary;
}
.value {
  flex: 1;
  color: $admin-text;
  word-break: break-all;
}
.mono {
  font-family: monospace;
}
.empty {
  padding: 120rpx 32rpx;
  text-align: center;
  color: $admin-text-secondary;
  font-size: 26rpx;
}
.cancel-btn {
  margin-top: 24rpx;
  border-radius: 12rpx;
  background: #f04438;
  color: #fff;
  font-size: 28rpx;
}
</style>
