<template>
  <view class="main-page">
    <view class="header-card">
      <view>
        <view class="driver-badge">司机端工作台</view>
        <view class="greeting">欢迎回来，{{ driverName }}</view>
        <view class="status">
          当前状态：<text :class="status === 'online' ? 'online' : 'offline'">
            {{ status === 'online' ? '可接单' : '暂停接单' }}
          </text>
        </view>
      </view>
      <view class="status-switch">
        <switch
          :checked="status === 'online'"
          color="#f97316"
          @change="onStatusChange"
        />
      </view>
    </view>

    <view class="summary-card">
      <view class="summary-item">
        <text class="summary-value">£{{ money(todayIncome) }}</text>
        <text class="summary-label">今日收入</text>
      </view>
      <view class="summary-divider"></view>
      <view class="summary-item">
        <text class="summary-value">£{{ money(weekIncome) }}</text>
        <text class="summary-label">本周收入</text>
      </view>
    </view>

    <view class="overview-grid">
      <view class="overview-card">
        <text class="overview-value">{{ pendingOrdersCount }}</text>
        <text class="overview-label">待接订单</text>
      </view>
      <view class="overview-card">
        <text class="overview-value">{{ ongoingOrdersCount }}</text>
        <text class="overview-label">行程中订单</text>
      </view>
    </view>

    <view class="section-title">未来 14 天工作提醒</view>
    <view class="schedule-card">
      <view v-if="!next14DaysOrders.length" class="empty-text">
        未来两周暂无预约订单
      </view>
      <view
        v-for="item in next14DaysOrders"
        :key="item._id"
        class="schedule-item"
      >
        <text class="schedule-time">{{ formatDateTime(item.scheduledTime) }}</text>
        <text class="schedule-route">{{ item.pickupAddress || '-' }} → {{ item.dropoffAddress || '-' }}</text>
        <text class="schedule-status">{{ statusLabel(item.status) }}</text>
      </view>
    </view>

    <view class="section-title">我的派单</view>
    <view class="dispatch-card">
      <view v-if="status !== 'online'" class="offline-tip">
        当前离线，不会收到新派单
      </view>
      <view v-if="!assignedOrders.length" class="empty-text">
        暂无派给你的订单
      </view>
      <view
        v-for="order in assignedOrders"
        :key="order._id"
        class="dispatch-item"
      >
        <text class="dispatch-status">{{ dispatchStatusLabel(order.dispatchStatus) }}</text>
        <text class="dispatch-route">{{ order.pickup || '-' }} → {{ order.destination || '-' }}</text>
        <text class="dispatch-time">{{ formatDateTime(order.scheduledTime || order.createdAt) }}</text>
        <view v-if="order.dispatchStatus === 'assigned'" class="dispatch-actions">
          <button class="accept-btn" @click="acceptOrder(order._id)">接受</button>
          <button class="reject-btn" @click="rejectOrder(order._id)">拒绝</button>
        </view>
      </view>
    </view>

    <view class="section-title">资料完善提醒</view>
    <view class="profile-card">
      <view class="profile-row">
        <text>个人信息</text>
        <text :class="profileCompletion.personal ? 'done' : 'todo'" @click="goSettings">
          {{ profileCompletion.personal ? '已完善' : '去完善' }}
        </text>
      </view>
      <view class="profile-row">
        <text>收款信息</text>
        <text :class="profileCompletion.payment ? 'done' : 'todo'" @click="goSettings">
          {{ profileCompletion.payment ? '已完善' : '去完善' }}
        </text>
      </view>
      <view class="profile-row">
        <text>车辆信息</text>
        <text :class="profileCompletion.vehicle ? 'done' : 'todo'" @click="goSettings">
          {{ profileCompletion.vehicle ? '已完善' : '去完善' }}
        </text>
      </view>
      <view class="profile-row">
        <text>资质材料</text>
        <text :class="profileCompletion.documents ? 'done' : 'todo'" @click="goSettings">
          {{ profileCompletion.documents ? '已完善' : '去完善' }}
        </text>
      </view>
    </view>

    <view class="section-title">常用功能</view>
    <view class="entry-grid">
      <view class="entry-item" @click="goTo('/pages/D0101_driver_order_list')">
        <view class="entry-icon">📋</view>
        <text class="entry-title">我的任务</text>
        <text class="entry-desc">查看可接订单</text>
      </view>
      <view class="entry-item" @click="goTo('/pages/D0303_driver_trip_history')">
        <view class="entry-icon">🚗</view>
        <text class="entry-title">我的行程</text>
        <text class="entry-desc">历史与行程中</text>
      </view>
      <view class="entry-item" @click="goTo('/pages/D0201_driver_income_center')">
        <view class="entry-icon">£</view>
        <text class="entry-title">收入中心</text>
        <text class="entry-desc">收入与提现</text>
      </view>
      <view class="entry-item" @click="goTo('/pages/D0401_driver_support_center')">
        <view class="entry-icon">💬</view>
        <text class="entry-title">客服中心</text>
        <text class="entry-desc">工单与帮助</text>
      </view>
      <view class="entry-item" @click="goTo('/pages/D0503_driver_settings')">
        <view class="entry-icon">⚙</view>
        <text class="entry-title">设置中心</text>
        <text class="entry-desc">账号与偏好</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
  acceptAssignedOrder,
  getDriverDashboard,
  getDriverOrders,
  rejectAssignedOrder,
  updateDriverStatus
} from '../utils/driverApi.js'
import { formatDriverOrderStatus, normalizeDriverOrderStatus } from '../utils/orderStatus.js'

export default {
  name: 'D0300_driver_main',
  data() {
    return {
      driverName: '司机',
      status: 'offline',
      todayIncome: 0,
      weekIncome: 0,
      totalIncome: 0,
      pendingOrdersCount: 0,
      ongoingOrdersCount: 0,
      assignedOrders: [],
      next14DaysOrders: [],
      profileCompletion: {
        personal: false,
        payment: false,
        vehicle: false,
        documents: false
      }
    }
  },
  onShow() {
    this.fetchDashboard()
    this.fetchAssignedOrders()
  },
  methods: {
    goTo(url) {
      uni.navigateTo({ url })
    },
    goSettings() {
      uni.navigateTo({ url: '/pages/D0503_driver_settings' })
    },
    money(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n.toFixed(2) : '0.00'
    },
    formatDateTime(value) {
      if (!value) return '待确认时间'
      const d = new Date(value)
      if (Number.isNaN(d.getTime())) return '待确认时间'
      const date = `${d.getMonth() + 1}/${d.getDate()}`
      const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      return `${date} ${time}`
    },
    statusLabel(status) {
      return formatDriverOrderStatus(status)
    },
    dispatchStatusLabel(status) {
      const map = {
        assigned: '待确认',
        accepted: '已接受',
        rejected: '已拒绝',
        completed: '已完成',
        unassigned: '未派单'
      }
      return map[status || 'unassigned'] || status
    },
    async fetchDashboard() {
      try {
        const data = await getDriverDashboard()
        this.driverName = data.driverName || this.driverName
        this.status = data.status || 'offline'
        this.todayIncome = data.todayIncome || 0
        this.weekIncome = data.weekIncome || 0
        this.totalIncome = data.totalIncome || 0
        this.pendingOrdersCount = data.pendingOrdersCount || 0
        this.ongoingOrdersCount = data.ongoingOrdersCount || 0
        this.next14DaysOrders = Array.isArray(data.next14DaysOrders) ? data.next14DaysOrders : []
        this.profileCompletion = {
          personal: !!data.profileCompletion?.personal,
          payment: !!data.profileCompletion?.payment,
          vehicle: !!data.profileCompletion?.vehicle,
          documents: !!(data.profileCompletion?.documents || data.documentsCompletion)
        }
      } catch (error) {
        /* request 内已提示 */
      }
    },
    async fetchAssignedOrders() {
      try {
        const data = await getDriverOrders()
        const rows = Array.isArray(data?.orders) ? data.orders : []
        this.assignedOrders = rows.filter((item) => {
          const ds = String(item.dispatchStatus || '')
          const st = normalizeDriverOrderStatus(item.status)
          if (['assigned', 'accepted', 'started'].includes(ds)) return true
          return ['assigned', 'accepted', 'started'].includes(st)
        })
      } catch (error) {
        /* request 内已提示 */
      }
    },
    async acceptOrder(orderId) {
      try {
        await acceptAssignedOrder(orderId)
        uni.showToast({ title: '接单成功', icon: 'success' })
        await Promise.all([this.fetchDashboard(), this.fetchAssignedOrders()])
      } catch (error) {
        /* request 内已提示 */
      }
    },
    async rejectOrder(orderId) {
      try {
        await rejectAssignedOrder(orderId)
        uni.showToast({ title: '已拒绝派单', icon: 'none' })
        await Promise.all([this.fetchDashboard(), this.fetchAssignedOrders()])
      } catch (error) {
        /* request 内已提示 */
      }
    },
    async onStatusChange(e) {
      const nextStatus = e.detail.value ? 'online' : 'offline'
      const previous = this.status
      this.status = nextStatus
      try {
        const data = await updateDriverStatus(nextStatus)
        this.status = data.status || nextStatus
        uni.showToast({
          title: this.status === 'online' ? '已切换为可接单' : '已暂停接单',
          icon: 'none'
        })
        this.fetchAssignedOrders()
      } catch (error) {
        this.status = previous
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.main-page {
  min-height: 100vh;
  background: #16324f;
  box-sizing: border-box;
  padding: 40rpx 30rpx 56rpx;
}

.header-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 36rpx;
  border-radius: 32rpx;
  background: #0f172a;
  box-shadow: 0 18rpx 44rpx rgba(15, 23, 42, 0.12);
  margin-bottom: 24rpx;
}

.driver-badge {
  display: inline-flex;
  padding: 8rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(250, 204, 21, 0.14);
  color: #fde68a;
  font-size: 22rpx;
  margin-bottom: 20rpx;
}

.greeting {
  font-size: 40rpx;
  font-weight: 800;
  color: #ffffff;
  line-height: 1.35;
}

.status {
  font-size: 26rpx;
  margin-top: 14rpx;
  color: rgba(255, 255, 255, 0.72);
}

.online {
  color: #facc15;
  font-weight: 700;
}

.offline {
  color: #cbd5e1;
  font-weight: 700;
}

.status-switch {
  margin-top: 2rpx;
}

.summary-card {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.06);
  margin-bottom: 36rpx;
}

.summary-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.summary-value {
  font-size: 34rpx;
  font-weight: 800;
  color: #f97316;
}

.summary-label {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #64748b;
}

.summary-divider {
  width: 2rpx;
  height: 54rpx;
  background: #e2e8f0;
}

.overview-grid {
  display: flex;
  gap: 24rpx;
  margin-bottom: 36rpx;
}

.overview-card {
  flex: 1;
  padding: 28rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.08);
}

.overview-value {
  display: block;
  color: #f97316;
  font-size: 44rpx;
  font-weight: 800;
}

.overview-label {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 20rpx;
}

.schedule-card,
.profile-card,
.dispatch-card {
  padding: 28rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 32rpx rgba(15, 23, 42, 0.08);
  margin-bottom: 36rpx;
}

.offline-tip {
  margin-bottom: 18rpx;
  padding: 16rpx 18rpx;
  border-radius: 16rpx;
  background: #fff7ed;
  color: #c2410c;
  font-size: 24rpx;
}

.dispatch-item {
  padding: 22rpx 0;
  border-bottom: 1rpx solid #e2e8f0;
}

.dispatch-item:last-child {
  border-bottom: none;
}

.dispatch-status,
.dispatch-route,
.dispatch-time {
  display: block;
}

.dispatch-status {
  color: #f97316;
  font-size: 24rpx;
  font-weight: 700;
}

.dispatch-route {
  margin-top: 8rpx;
  color: #0f172a;
  font-size: 28rpx;
  line-height: 1.45;
}

.dispatch-time {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.dispatch-actions {
  display: flex;
  gap: 18rpx;
  margin-top: 18rpx;
}

.accept-btn,
.reject-btn {
  flex: 1;
  border-radius: 40rpx;
  color: #ffffff;
  font-size: 26rpx;
  line-height: 68rpx;
}

.accept-btn {
  background: #f97316;
}

.reject-btn {
  background: #64748b;
}

.empty-text {
  color: #64748b;
  font-size: 26rpx;
  text-align: center;
  padding: 24rpx 0;
}

.schedule-item {
  padding: 22rpx 0;
  border-bottom: 1rpx solid #e2e8f0;
}

.schedule-item:last-child {
  border-bottom: none;
}

.schedule-time,
.schedule-route,
.schedule-status {
  display: block;
}

.schedule-time {
  color: #f97316;
  font-size: 24rpx;
  font-weight: 700;
}

.schedule-route {
  margin-top: 8rpx;
  color: #0f172a;
  font-size: 28rpx;
  line-height: 1.45;
}

.schedule-status {
  margin-top: 8rpx;
  color: #64748b;
  font-size: 24rpx;
}

.profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #e2e8f0;
  color: #0f172a;
  font-size: 28rpx;
}

.profile-row:last-child {
  border-bottom: none;
}

.done {
  color: #16a34a;
  font-weight: 700;
}

.todo {
  color: #f97316;
  font-weight: 700;
}

.entry-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 24rpx;
}

.entry-item {
  width: 47%;
  min-height: 190rpx;
  background-color: #ffffff;
  padding: 28rpx;
  border-radius: 28rpx;
  box-sizing: border-box;
  box-shadow: 0 10rpx 28rpx rgba(15, 23, 42, 0.06);
}

.entry-icon {
  width: 64rpx;
  height: 64rpx;
  line-height: 64rpx;
  border-radius: 20rpx;
  background: #fff7ed;
  color: #f97316;
  text-align: center;
  font-size: 32rpx;
  font-weight: 800;
  margin-bottom: 20rpx;
}

.entry-title {
  display: block;
  color: #0f172a;
  font-size: 30rpx;
  font-weight: 800;
}

.entry-desc {
  display: block;
  margin-top: 8rpx;
  color: #64748b;
  font-size: 23rpx;
  line-height: 1.4;
}
</style>