<template>
  <view class="order-list-page">
    <view class="title">订单列表</view>

    <view class="filter-tabs">
      <button
        v-for="tab in filterTabs"
        :key="tab.value"
        class="filter-tab"
        :class="{ active: currentFilter === tab.value }"
        @click="currentFilter = tab.value"
      >
        {{ tab.label }}
      </button>
    </view>

    <view
      v-for="order in filteredOrders"
      :key="order._id"
      class="order-card"
      :class="{ pinned: isCurrentTask(order) }"
    >
      <view v-if="isCurrentTask(order)" class="pin-banner">当前任务</view>
      <view class="card-head">
        <text class="status-tag" :class="statusTagClass(order.status)">
          {{ statusTagLabel(order.status) }}
        </text>
        <text class="payment-tag" :class="{ paid: order.paymentStatus === 'paid' }">
          {{ formatPaymentStatus(order.paymentStatus) }}
        </text>
      </view>
      <view class="route-line">
        <text>{{ order.pickup || '—' }}</text>
        <text class="arrow">→</text>
        <text>{{ order.destination || '—' }}</text>
      </view>
      <view class="amount-line">
        <text>{{ driverPrimarySettlementLine(order) }}</text>
        <text v-if="driverSecondarySettlementLine(order)" class="amount-sub">
          {{ driverSecondarySettlementLine(order) }}
        </text>
      </view>
      <view v-if="order.paymentStatus !== 'paid'" class="unpaid-tip">未支付</view>
      <view class="meta-row">
        <text>状态：{{ formatStatus(order.status) }}</text>
        <text v-if="order.vehicleLabel">车型：{{ order.vehicleLabel }}</text>
        <text>订单：#{{ shortId(order._id) }}</text>
      </view>
      <view v-if="primaryAction(order)" class="actions">
        <button
          class="action-btn"
          :class="primaryAction(order).className"
          :disabled="actionDisabled(order)"
          @click="runPrimaryAction(order)"
        >
          {{ primaryAction(order).label }}
        </button>
        <button
          v-if="canReject(order)"
          class="action-btn reject-btn"
          @click="rejectAssigned(order._id)"
        >
          拒绝
        </button>
      </view>
    </view>

    <view v-if="filteredOrders.length === 0" class="empty">暂无相关订单</view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'
import {
  acceptAssignedOrder,
  getDriverOrders,
  rejectAssignedOrder
} from '../utils/driverApi.js'
import { formatDriverOrderStatus, normalizeDriverOrderStatus } from '../utils/orderStatus.js'
import {
  driverPrimarySettlementLine,
  driverSecondarySettlementLine
} from '../utils/driverCurrencyDisplay.js'

export default {
  name: 'D0101_driver_order_list',
  data() {
    return {
      orders: [],
      myUserId: '',
      currentFilter: 'assigned',
      pollingTimer: null,
      filterTabs: [
        { value: 'assigned', label: '指派给我' },
        { value: 'active', label: '行程中' },
        { value: 'history', label: '历史订单' }
      ]
    }
  },
  computed: {
    filteredOrders() {
      const list = this.orders.filter((order) => {
        const status = normalizeDriverOrderStatus(order.status)
        if (this.currentFilter === 'assigned') {
          return this.isAssignedToMe(order)
        }
        if (this.currentFilter === 'active') {
          return status === 'accepted' || status === 'started'
        }
        if (this.currentFilter === 'history') {
          return status === 'completed' || status === 'cancelled'
        }
        return true
      })
      return list.sort((a, b) => this.taskPriority(b) - this.taskPriority(a))
    }
  },
  onShow() {
    this.readMyId()
    this.fetchOrders()
    this.startPolling()
  },
  onHide() {
    this.stopPolling()
  },
  onUnload() {
    this.stopPolling()
  },
  methods: {
    readMyId() {
      try {
        const u = uni.getStorageSync('user')
        if (u && u._id) this.myUserId = String(u._id)
      } catch (e) {
        this.myUserId = ''
      }
    },
    normalizeStatus(status) {
      return normalizeDriverOrderStatus(status)
    },
    isAssignedToMe(order) {
      const rawStatus = String(order.status || '').trim()
      const rawDispatch = String(order.dispatchStatus || '').trim()
      if (!this.myUserId) return false
      if (rawStatus !== 'assigned' && rawDispatch !== 'assigned') return false
      const d = order.assignedDriver || order.driverId
      if (!d) return false
      const id = typeof d === 'object' && d._id != null ? String(d._id) : String(d)
      return id === this.myUserId
    },
    async fetchOrders() {
      const token = uni.getStorageSync('token')

      if (!token) {
        uni.showToast({ title: '请先登录司机账号', icon: 'none' })
        return
      }

      try {
        const data = await getDriverOrders()
        this.orders = Array.isArray(data?.orders) ? data.orders : []
      } catch (error) {
        /* 封装内已提示 */
      }
    },
    startPolling() {
      this.stopPolling()
      this.pollingTimer = setInterval(() => {
        this.fetchOrders()
      }, 5000)
    },
    stopPolling() {
      if (this.pollingTimer) {
        clearInterval(this.pollingTimer)
        this.pollingTimer = null
      }
    },
    formatStatus(status) {
      return formatDriverOrderStatus(status)
    },
    driverPrimarySettlementLine,
    driverSecondarySettlementLine,
    formatPaymentStatus(status) {
      const map = {
        unpaid: '未支付',
        pending: '待支付',
        paid: '已支付',
        refunded: '已退款'
      }
      return map[status || 'unpaid'] || status
    },
    shortId(id) {
      if (!id) return '--'
      return String(id).slice(-6)
    },
    taskPriority(order) {
      const status = this.normalizeStatus(order.status)
      if (status === 'started') return 2
      if (status === 'accepted') return 1
      return 0
    },
    isCurrentTask(order) {
      const status = this.normalizeStatus(order.status)
      return status === 'accepted' || status === 'started'
    },
    statusTagLabel(status) {
      const map = {
        pending: '待指派',
        assigned: '已指派',
        accepted: '已接单',
        started: '行程中',
        completed: '已完成',
        cancelled: '已取消'
      }
      const normalized = this.normalizeStatus(status)
      return map[normalized] || this.formatStatus(status)
    },
    statusTagClass(status) {
      const map = {
        assigned: 'assigned',
        accepted: 'accepted',
        started: 'started',
        completed: 'completed',
        cancelled: 'cancelled'
      }
      return map[this.normalizeStatus(status)] || 'default'
    },
    canReject(order) {
      return this.isAssignedToMe(order)
    },
    actionDisabled(order) {
      return !this.isAssignedToMe(order) && order.paymentStatus !== 'paid'
    },
    primaryAction(order) {
      const status = this.normalizeStatus(order.status)
      if (this.isAssignedToMe(order)) {
        return { label: '确认收到任务', action: 'accept', className: 'confirm-btn' }
      }
      if (status === 'accepted') {
        return { label: '开始行程', action: 'start', className: 'start-btn' }
      }
      if (status === 'started') {
        return { label: '完成订单', action: 'complete', className: 'complete-btn' }
      }
      return null
    },
    runPrimaryAction(order) {
      if (!this.isAssignedToMe(order) && order.paymentStatus !== 'paid') {
        uni.showToast({ title: '用户未支付，不能操作', icon: 'none' })
        return
      }
      const action = this.primaryAction(order)
      if (!action) return
      if (action.action === 'accept') this.acceptOrder(order._id)
      if (action.action === 'start') this.startOrder(order._id)
      if (action.action === 'complete') this.completeOrder(order._id)
    },
    async acceptOrder(orderId) {
      try {
        await acceptAssignedOrder(orderId)
        uni.showToast({ title: '接单成功', icon: 'success' })
        this.currentFilter = 'active'
        this.fetchOrders()
      } catch (error) {
        /* 封装内已提示 */
      }
    },
    async rejectAssigned(orderId) {
      try {
        await rejectAssignedOrder(orderId)
        uni.showToast({ title: '已拒绝派单', icon: 'none' })
        this.fetchOrders()
      } catch (error) {
        /* 封装内已提示 */
      }
    },
    async startOrder(orderId) {
      const order = this.orders.find((item) => String(item._id) === String(orderId))
      if (order && order.paymentStatus !== 'paid') {
        uni.showToast({ title: '用户未支付，不能开始行程', icon: 'none' })
        return
      }
      this.updateOrderStatus('/order/start', orderId, '行程已开始')
    },
    async completeOrder(orderId) {
      this.updateOrderStatus('/order/complete', orderId, '订单已完成')
    },
    async updateOrderStatus(path, orderId, successText) {
      const token = uni.getStorageSync('token')

      if (!token) {
        uni.showToast({ title: '请先登录司机账号', icon: 'none' })
        return
      }

      try {
        await request({
          url: path,
          method: 'POST',
          data: {
            orderId: orderId != null ? String(orderId) : ''
          }
        })
        uni.showToast({ title: successText, icon: 'success' })
        if (path === '/order/complete') this.currentFilter = 'history'
        this.fetchOrders()
      } catch (error) {
        /* 封装内已提示 */
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.order-list-page {
  background: #16324f;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: #ffffff;
    margin-bottom: 30rpx;
  }

  .filter-tabs {
    display: flex;
    gap: 16rpx;
    margin-bottom: 24rpx;

    .filter-tab {
      flex: 1;
      background-color: rgba(255, 255, 255, 0.85);
      color: #f97316;
      border: 1rpx solid #fed7aa;
      border-radius: 40rpx;
      font-size: 26rpx;
      line-height: 64rpx;
      padding: 0;

      &.active {
        background-color: #f97316;
        color: #fff;
        border-color: #f97316;
      }
    }
  }

  .order-card {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
    border: 1rpx solid #e0e0e0;

    &.pinned {
      border-color: #007aff;
      box-shadow: 0 8rpx 18rpx rgba(0, 122, 255, 0.16);
    }

    .pin-banner {
      background: #e3f2fd;
      color: #0d47a1;
      font-size: 24rpx;
      font-weight: bold;
      padding: 10rpx 14rpx;
      border-radius: 8rpx;
      margin-bottom: 16rpx;
      display: inline-block;
    }

    .card-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12rpx;
      margin-bottom: 18rpx;
    }

    .status-tag,
    .payment-tag {
      border-radius: 999rpx;
      padding: 8rpx 18rpx;
      font-size: 24rpx;
      font-weight: bold;
    }

    .status-tag.assigned {
      background: #fff3e0;
      color: #e65100;
    }

    .status-tag.accepted {
      background: #e3f2fd;
      color: #1565c0;
    }

    .status-tag.started {
      background: #dbeafe;
      color: #1e3a8a;
    }

    .status-tag.completed {
      background: #dcfce7;
      color: #166534;
    }

    .status-tag.cancelled,
    .status-tag.default {
      background: #f3f4f6;
      color: #4b5563;
    }

    .payment-tag {
      background: #fee2e2;
      color: #b91c1c;
    }

    .payment-tag.paid {
      background: #dcfce7;
      color: #15803d;
    }

    .route-line {
      display: flex;
      align-items: center;
      gap: 12rpx;
      font-size: 34rpx;
      font-weight: bold;
      color: #212121;
      line-height: 1.45;
      margin-bottom: 16rpx;
    }

    .arrow {
      color: #f97316;
    }

    .amount-line {
      font-size: 40rpx;
      font-weight: bold;
      color: #f97316;
      margin-bottom: 12rpx;
      display: flex;
      flex-direction: column;
      gap: 6rpx;
    }

    .amount-sub {
      font-size: 24rpx;
      font-weight: 400;
      color: #64748b;
    }

    .unpaid-tip {
      color: #b91c1c;
      background: #fee2e2;
      border-radius: 8rpx;
      padding: 10rpx 14rpx;
      font-size: 24rpx;
      margin-bottom: 12rpx;
      display: inline-block;
    }

    .meta-row {
      display: flex;
      justify-content: space-between;
      gap: 16rpx;
      color: #757575;
      font-size: 24rpx;
    }

    .actions {
      margin-top: 24rpx;
      display: flex;
      justify-content: stretch;
      gap: 16rpx;
    }

    .action-btn {
      color: #fff;
      border: none;
      border-radius: 40rpx;
      font-size: 26rpx;
      padding: 0 32rpx;
      line-height: 72rpx;
      width: 100%;

      &[disabled] {
        opacity: 0.5;
      }
    }

    .accept-btn {
      background-color: #f97316;
    }

    .confirm-btn {
      background-color: #f59e0b;
    }

    .start-btn {
      background-color: #007aff;
    }

    .complete-btn {
      background-color: #34c759;
    }
  }

  .empty {
    text-align: center;
    color: rgba(255, 255, 255, 0.72);
    margin-top: 100rpx;
    font-size: 30rpx;
  }
}
</style>
