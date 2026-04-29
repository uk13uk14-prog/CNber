<template>
  <scroll-view scroll-y class="page">
    <view v-if="order._id" class="pad">
      <AdminSectionTitle title="订单基础" />
      <view class="card">
        <view class="r"><text class="rk">订单号</text><text class="rv">{{ order._id }}</text></view>
        <view class="r"><text class="rk">状态</text><text class="rv">{{ uiMeta.label }}</text></view>
        <view class="r"><text class="rk">创建时间</text><text class="rv">{{ fmt(order.createdAt) }}</text></view>
        <view class="r"><text class="rk">更新时间</text><text class="rv">{{ fmt(order.updatedAt) }}</text></view>
      </view>

      <AdminSectionTitle title="客户信息" />
      <view class="card">
        <view class="r"><text class="rk">手机</text><text class="rv">{{ mask(cPhone) }}</text></view>
      </view>

      <AdminSectionTitle title="服务信息" />
      <view class="card">
        <view class="r"><text class="rk">服务类型</text><text class="rv">{{ svcLabel }}</text></view>
        <view class="r"><text class="rk">上车/接机</text><text class="rv">{{ order.pickup || '—' }}</text></view>
        <view class="r"><text class="rk">下车/目的地</text><text class="rv">{{ order.destination || '—' }}</text></view>
      </view>

      <AdminSectionTitle title="支付信息" />
      <view class="card">
        <view class="r"><text class="rk">支付状态</text><text class="rv">{{ payLabel }}</text></view>
        <view class="r"><text class="rk">金额</text><text class="rv">{{ moneyLine }}</text></view>
      </view>

      <AdminSectionTitle title="司机信息" />
      <view class="card">
        <view class="r"><text class="rk">司机</text><text class="rv">{{ driverLine }}</text></view>
      </view>

      <AdminSectionTitle title="状态时间线" />
      <view class="card">
        <view v-for="(l, i) in timeline" :key="i" class="tl">
          <text class="dot">●</text>
          <view>
            <text class="tl-t">{{ l.t }}</text>
            <text class="tl-d">{{ l.d }}</text>
          </view>
        </view>
      </view>

      <AdminSectionTitle title="客服备注" />
      <view class="card">
        <text v-if="!notes.length" class="muted">暂无备注</text>
        <AdminFollowNoteItem v-for="(n, i) in notes" :key="i" :item="n" />
      </view>

      <view class="sp" />
    </view>
    <view class="bar">
      <button class="b ghost" @click="goDispatch">指派司机</button>
      <button class="b ghost" @click="goFollow">添加备注</button>
      <button
        v-if="canCancelOrder"
        class="b danger"
        @click="cancelOrder"
      >
        取消订单
      </button>
      <button class="b primary" @click="openStatus">修改状态</button>
    </view>
  </scroll-view>
</template>

<script>
import AdminSectionTitle from '../components/AdminSectionTitle.vue'
import AdminFollowNoteItem from '../components/AdminFollowNoteItem.vue'
import { fetchOrderDetail, updateOrderMainStatus } from '../services/order.js'
import { mapOrderToUiStatus, getUiStatusMeta } from '../config/orderStatus.js'
import { getServiceTypeLabel } from '../config/serviceTypes.js'
import { formatDateTime, formatMoney, maskPhone } from '../utils/format.js'
import { goPage } from '../utils/nav.js'
import { isLoggedIn } from '../store/session.js'

export default {
  components: { AdminSectionTitle, AdminFollowNoteItem },
  data() {
    return {
      id: '',
      order: {}
    }
  },
  computed: {
    uiMeta() {
      return getUiStatusMeta(mapOrderToUiStatus(this.order))
    },
    cPhone() {
      const u = this.order.userId
      return typeof u === 'object' && u ? u.phone : ''
    },
    svcLabel() {
      return getServiceTypeLabel(this.order.serviceType)
    },
    payLabel() {
      return this.order.paymentStatus === 'paid' ? '已支付' : '未支付'
    },
    moneyLine() {
      return this.order.amount != null
        ? `¥${formatMoney(this.order.amount)}`
        : '—'
    },
    driverLine() {
      const d = this.order.driverId
      if (!d) return '待分配'
      const p = typeof d === 'object' && d ? d.phone : ''
      return p ? maskPhone(p) : '已分配'
    },
    notes() {
      return this.order.followUpNotes || []
    },
    canCancelOrder() {
      return this.order.status === 'assigned'
    },
    timeline() {
      const o = this.order
      const lines = [{ t: '订单创建', d: this.fmt(o.createdAt) }]
      const s = o.status
      if (s && s !== 'pending') {
        lines.push({ t: `状态：${s}`, d: this.fmt(o.updatedAt || o.createdAt) })
      }
      return lines
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
    if (this.id) this.load()
  },
  methods: {
    fmt(v) {
      return formatDateTime(v)
    },
    mask(p) {
      return maskPhone(p)
    },
    async load() {
      try {
        const data = await fetchOrderDetail(this.id)
        this.order = (data && data.order) || {}
      } catch (e) {
        this.order = {}
      }
    },
    goDispatch() {
      goPage(`/pages/B0103_admin_dispatch?id=${this.id}`)
    },
    goFollow() {
      goPage(`/pages/B0104_admin_followup?id=${this.id}`)
    },
    openStatus() {
      const items = ['pending', 'accepted', 'started', 'completed', 'cancelled']
      uni.showActionSheet({
        itemList: items,
        success: async (res) => {
          const st = items[res.tapIndex]
          try {
            await updateOrderMainStatus(this.id, st)
            uni.showToast({ title: '已更新', icon: 'success' })
            this.load()
          } catch (e) {
            /* toast */
          }
        }
      })
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
  padding-bottom: 140rpx;
  box-sizing: border-box;
}
.pad {
  padding: $admin-page-pad;
}
.card {
  background: #fff;
  border-radius: $admin-card-radius;
  padding: 8rpx 24rpx 24rpx;
  border: 1rpx solid $admin-border;
  margin-bottom: 8rpx;
}
.r {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f2f4f7;
  font-size: 26rpx;
}
.rk {
  width: 200rpx;
  color: $admin-text-secondary;
}
.rv {
  flex: 1;
  color: $admin-text;
}
.muted {
  color: $admin-text-secondary;
  font-size: 26rpx;
}
.tl {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.dot {
  color: $admin-primary;
  font-size: 24rpx;
}
.tl-t {
  display: block;
  font-size: 28rpx;
  color: $admin-text;
}
.tl-d {
  font-size: 24rpx;
  color: $admin-text-secondary;
}
.sp {
  height: 40rpx;
}
.bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 16rpx $admin-page-pad calc(16rpx + env(safe-area-inset-bottom));
  background: #fff;
  border-top: 1rpx solid $admin-border;
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  box-sizing: border-box;
}
.b {
  flex: 1;
  min-width: 200rpx;
  font-size: 26rpx;
  border-radius: 12rpx;
  margin: 0;
}
.b.primary {
  background: $admin-primary;
  color: #fff;
}
.b.danger {
  background: #f04438;
  color: #fff;
}
.b.ghost {
  background: #fff;
  color: $admin-primary;
  border: 1rpx solid $admin-border;
}
</style>
