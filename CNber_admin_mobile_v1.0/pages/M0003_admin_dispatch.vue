<template>
  <view class="page">
    <view v-if="!canView" class="empty card">
      <text>无调度中心查看权限</text>
    </view>
    <template v-else>
      <scroll-view scroll-x class="tabs-wrap">
        <view class="tabs">
          <view
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            @click="switchTab(tab.id)"
          >
            <text>{{ tab.label }}</text>
            <text class="count">{{ tabCounts[tab.id] || 0 }}</text>
          </view>
        </view>
      </scroll-view>

      <scroll-view
        scroll-y
        class="list-scroll"
        refresher-enabled
        :refresher-triggered="refreshing"
        @refresherrefresh="onPullDown"
      >
        <view v-if="loading && !orders.length" class="muted center">加载中…</view>
        <view v-else-if="!visibleOrders.length" class="empty card">
          <text>当前 Tab 暂无订单</text>
        </view>
        <view v-else class="cards">
          <view v-for="order in visibleOrders" :key="order._id" class="order-card card">
            <view class="card-head">
              <text class="order-no">{{ orderDisplayNo(order) }}</text>
              <text class="pill">{{ adminBookingStatusLabel(order) }}</text>
            </view>

            <view class="row"><text class="dt">客户</text><text class="dd">{{ customerPhone(order) }}</text></view>
            <view class="row">
              <text class="dt">服务</text>
              <text class="dd">{{ serviceTypeLabel(order.serviceType) }}{{ order.vehicleLabel ? ' · ' + order.vehicleLabel : '' }}</text>
            </view>
            <view class="row"><text class="dt">路线</text><text class="dd">{{ order.pickup || '—' }} → {{ order.destination || '—' }}</text></view>
            <view class="row"><text class="dt">预约</text><text class="dd">{{ adminScheduledTimeLabel(order) }}</text></view>
            <view class="row">
              <text class="dt">客户价</text>
              <text class="dd">{{ customerPriceCell(order).main }}</text>
            </view>
            <view class="row">
              <text class="dt">司机价</text>
              <text class="dd">{{ driverPriceCell(order).main }}</text>
            </view>
            <view class="row"><text class="dt">支付</text><text class="dd">{{ adminPaymentStatusLabel(order) }}</text></view>
            <view v-if="showDriverRow(order)" class="row">
              <text class="dt">司机</text>
              <text class="dd">{{ driverInfoLine(order) }}</text>
            </view>

            <view class="actions">
              <button
                v-if="activeTab === 'payment_review' && canPay"
                class="btn primary"
                size="mini"
                :loading="actingId === order._id"
                :disabled="actingId === order._id"
                @click="onConfirmDeposit(order)"
              >
                确认付款
              </button>

              <template v-if="activeTab === 'ready_dispatch' && canDispatch">
                <picker
                  mode="selector"
                  :range="driverLabels(order._id)"
                  :value="driverPickerIndex(order._id)"
                  @change="(e) => onDriverPick(order, e)"
                >
                  <view class="picker-btn">{{ selectedDriverLabel(order._id) || '选择司机' }}</view>
                </picker>
                <button
                  class="btn primary"
                  size="mini"
                  :loading="actingId === order._id"
                  :disabled="!selectedDriverIds[order._id] || actingId === order._id"
                  @click="onAssign(order)"
                >
                  派单
                </button>
              </template>

              <button
                v-if="activeTab === 'assigned' && canDispatch"
                class="btn"
                size="mini"
                :loading="actingId === order._id"
                :disabled="!canUnassignOrder(order, actingId === order._id) || actingId === order._id"
                @click="onUnassign(order)"
              >
                取消派单
              </button>

              <button class="btn" size="mini" @click="goDetail(order)">查看详情</button>
              <button class="btn" size="mini" @click="callCustomer(order)">拨打客户</button>
            </view>
          </view>
        </view>
      </scroll-view>
    </template>
  </view>
</template>

<script>
import { fetchAdminOrders, fetchDispatchDrivers, confirmOrderDeposit, assignDriver, unassignDriver } from '@/services/adminApi'
import {
  DISPATCH_MOBILE_TABS,
  filterOrdersByDispatchTab,
  orderDisplayNo,
  phoneOf,
  adminBookingStatusLabel,
  adminScheduledTimeLabel,
  adminPaymentStatusLabel,
  driverInfoLine,
  dispatchCenterTab
} from '@/utils/bookingStatus'
import { serviceTypeLabel } from '@/utils/serviceType'
import { customerPriceCell, driverPriceCell } from '@/utils/currencyDisplay'
import {
  extractDriverRows,
  normalizeDriverList,
  driverOptionValue,
  driverOptionLabel,
  canUnassignOrder
} from '@/utils/dispatchDrivers'
import { depositConfirmedForDispatch } from '@/utils/depositDispatch'
import { canViewDispatch, canConfirmPayment, canDispatchUpdate } from '@/stores/auth'
import { callPhone, showToast } from '@/utils/phone'

export default {
  data() {
    return {
      tabs: DISPATCH_MOBILE_TABS,
      activeTab: 'payment_review',
      orders: [],
      driversCache: {},
      selectedDriverIds: {},
      tabCounts: {},
      loading: false,
      refreshing: false,
      actingId: ''
    }
  },
  computed: {
    canView() {
      return canViewDispatch()
    },
    canPay() {
      return canConfirmPayment()
    },
    canDispatch() {
      return canDispatchUpdate()
    },
    visibleOrders() {
      return filterOrdersByDispatchTab(this.orders, this.activeTab)
    }
  },
  onLoad(query) {
    if (query?.tab && DISPATCH_MOBILE_TABS.some((t) => t.id === query.tab)) {
      this.activeTab = query.tab
    }
  },
  onShow() {
    if (this.canView) this.reload()
  },
  onPullDownRefresh() {
    this.onPullDown()
  },
  methods: {
    orderDisplayNo,
    adminBookingStatusLabel,
    adminScheduledTimeLabel,
    adminPaymentStatusLabel,
    driverInfoLine,
    serviceTypeLabel,
    customerPriceCell,
    driverPriceCell,
    canUnassignOrder,
    customerPhone(order) {
      return phoneOf(order.userId) || '—'
    },
    showDriverRow(order) {
      return ['assigned', 'in_trip'].includes(dispatchCenterTab(order))
    },
    switchTab(id) {
      this.activeTab = id
      if (id === 'ready_dispatch') this.prefetchDrivers()
    },
    updateTabCounts() {
      const counts = {}
      for (const tab of this.tabs) {
        counts[tab.id] = filterOrdersByDispatchTab(this.orders, tab.id).length
      }
      this.tabCounts = counts
    },
    async loadAllOrders() {
      const collected = []
      let page = 1
      const pageSize = 100
      let total = Infinity
      while (collected.length < total && page <= 30) {
        const data = await fetchAdminOrders({ page, pageSize, range: '14d' })
        const batch = data?.orders || []
        total = data?.total ?? batch.length
        collected.push(...batch)
        if (batch.length < pageSize) break
        page += 1
      }
      this.orders = collected.filter((o) => dispatchCenterTab(o))
      this.updateTabCounts()
    },
    async prefetchDrivers() {
      const list = filterOrdersByDispatchTab(this.orders, 'ready_dispatch')
      await Promise.all(list.map((o) => this.ensureDrivers(o._id)))
    },
    async ensureDrivers(orderId) {
      if (this.driversCache[orderId]) return
      try {
        const data = await fetchDispatchDrivers(orderId)
        const rows = normalizeDriverList(extractDriverRows(data))
        this.driversCache = { ...this.driversCache, [orderId]: rows }
        if (!this.selectedDriverIds[orderId] && rows[0]) {
          this.selectedDriverIds = { ...this.selectedDriverIds, [orderId]: driverOptionValue(rows[0]) }
        }
      } catch {
        this.driversCache = { ...this.driversCache, [orderId]: [] }
      }
    },
    driverLabels(orderId) {
      return (this.driversCache[orderId] || []).map(driverOptionLabel)
    },
    driverPickerIndex(orderId) {
      const drivers = this.driversCache[orderId] || []
      const sel = this.selectedDriverIds[orderId]
      const idx = drivers.findIndex((d) => driverOptionValue(d) === sel)
      return idx >= 0 ? idx : 0
    },
    selectedDriverLabel(orderId) {
      const drivers = this.driversCache[orderId] || []
      const sel = this.selectedDriverIds[orderId]
      const found = drivers.find((d) => driverOptionValue(d) === sel)
      return found ? driverOptionLabel(found) : ''
    },
    onDriverPick(order, e) {
      const idx = Number(e.detail.value)
      const drivers = this.driversCache[order._id] || []
      const driver = drivers[idx]
      if (driver) {
        this.selectedDriverIds = { ...this.selectedDriverIds, [order._id]: driverOptionValue(driver) }
      }
    },
    async reload() {
      this.loading = true
      try {
        await this.loadAllOrders()
        if (this.activeTab === 'ready_dispatch') await this.prefetchDrivers()
      } catch (e) {
        showToast(e.message || '加载失败')
      } finally {
        this.loading = false
        this.refreshing = false
        uni.stopPullDownRefresh()
      }
    },
    async onPullDown() {
      this.refreshing = true
      await this.reload()
    },
    async onConfirmDeposit(order) {
      this.actingId = order._id
      try {
        await confirmOrderDeposit(order._id)
        showToast('付款已确认', 'success')
        await this.reload()
      } catch (e) {
        showToast(e.message || '确认失败')
      } finally {
        this.actingId = ''
      }
    },
    async onAssign(order) {
      if (!depositConfirmedForDispatch(order)) {
        showToast('定金未确认，不能派单')
        return
      }
      await this.ensureDrivers(order._id)
      const driverId = this.selectedDriverIds[order._id]
      if (!driverId) {
        showToast('请选择司机')
        return
      }
      this.actingId = order._id
      try {
        await assignDriver(order._id, driverId)
        showToast('派单成功', 'success')
        await this.reload()
      } catch (e) {
        showToast(e.message || '派单失败')
      } finally {
        this.actingId = ''
      }
    },
    async onUnassign(order) {
      this.actingId = order._id
      try {
        await unassignDriver(order._id)
        showToast('已取消派单', 'success')
        await this.reload()
      } catch (e) {
        showToast(e.message || '取消派单失败')
      } finally {
        this.actingId = ''
      }
    },
    goDetail(order) {
      uni.navigateTo({ url: `/pages/M0004_admin_order_detail?id=${order._id}` })
    },
    callCustomer(order) {
      callPhone(phoneOf(order.userId))
    }
  }
}
</script>

<style scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #f5f6f8; }
.tabs-wrap { background: #fff; border-bottom: 1px solid #eee; flex-shrink: 0; }
.tabs { display: flex; white-space: nowrap; padding: 12rpx 16rpx; }
.tab { display: inline-flex; align-items: center; padding: 16rpx 24rpx; margin-right: 12rpx; border-radius: 999rpx; background: #f3f4f6; font-size: 26rpx; }
.tab.active { background: #1a5cff; color: #fff; }
.count { margin-left: 8rpx; font-size: 22rpx; opacity: 0.85; }
.list-scroll { flex: 1; height: 0; padding: 20rpx; box-sizing: border-box; }
.cards { padding-bottom: 40rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.order-card .card-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16rpx; }
.order-no { font-weight: 600; font-size: 30rpx; }
.pill { font-size: 22rpx; padding: 4rpx 12rpx; background: #eef2ff; color: #1a5cff; border-radius: 8rpx; }
.row { display: flex; margin-bottom: 10rpx; font-size: 26rpx; }
.dt { width: 120rpx; color: #6b7280; flex-shrink: 0; }
.dd { flex: 1; word-break: break-all; }
.actions { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 20rpx; }
.btn { margin: 0; font-size: 24rpx; }
.btn.primary { background: #1a5cff; color: #fff; }
.picker-btn { padding: 12rpx 20rpx; background: #f3f4f6; border-radius: 8rpx; font-size: 24rpx; max-width: 360rpx; overflow: hidden; text-overflow: ellipsis; }
.empty, .center { text-align: center; padding: 80rpx 24rpx; color: #6b7280; }
.muted { color: #6b7280; }
</style>
