<template>
  <scroll-view scroll-y class="page">
    <view class="pad">
      <view v-if="loading" class="center muted">加载中…</view>
      <view v-else-if="error" class="center error">{{ error }}</view>
      <template v-else-if="order._id">
        <view class="head-card">
          <text class="order-no">{{ orderDisplayNo(order) }}</text>
          <AdminStatusBadge
            :label="statusMeta.label"
            :color="statusMeta.color"
            :bg="statusMeta.bg"
          />
        </view>

        <AdminSectionTitle title="基本信息" />
        <view class="card">
          <view class="row"><text class="dt">客户手机</text><text class="dd link" @click="callCustomer">{{ customerPhone }}</text></view>
          <view class="row"><text class="dt">服务类型</text><text class="dd">{{ serviceTypeLabel(order.serviceType) }}</text></view>
          <view v-if="order.vehicleLabel" class="row"><text class="dt">车型</text><text class="dd">{{ order.vehicleLabel }}</text></view>
          <view class="row"><text class="dt">预约时间</text><text class="dd">{{ adminScheduledTimeLabel(order) }}</text></view>
          <view class="row"><text class="dt">付款状态</text><text class="dd">{{ paymentSummaryLabel(order) }}</text></view>
        </view>

        <AdminSectionTitle title="路线" />
        <view class="card">
          <view class="route-row">
            <view class="dot start" />
            <text class="route-text">{{ order.pickup || '—' }}</text>
          </view>
          <view class="route-row">
            <view class="dot end" />
            <text class="route-text">{{ order.destination || '—' }}</text>
          </view>
        </view>

        <AdminSectionTitle title="价格" />
        <view class="card">
          <view class="row"><text class="dt">客户价 CNY</text><text class="dd price">{{ customerPriceCell(order).main }}</text></view>
          <view v-if="customerPriceCell(order).sub" class="row sub"><text class="dd">{{ customerPriceCell(order).sub }}</text></view>
          <view class="row"><text class="dt">司机价 GBP</text><text class="dd">{{ driverPriceCell(order).main }}</text></view>
          <view v-if="order.couponCode" class="row"><text class="dt">优惠券</text><text class="dd">{{ order.couponCode }} -{{ formatCny(order.discountAmountCny) }}</text></view>
        </view>

        <AdminSectionTitle title="司机" />
        <view class="card">
          <view class="row"><text class="dt">司机信息</text><text class="dd">{{ driverInfoLine(order) }}</text></view>
          <button v-if="driverPhone" class="btn ghost" size="mini" @click="callDriver">联系司机</button>
        </view>

        <template v-if="rating">
          <AdminSectionTitle title="乘客评价" />
          <view class="card">
            <view class="row"><text class="dt">司机评分</text><text class="dd">{{ rating.driverStars }} / 5</text></view>
            <view class="row"><text class="dt">服务评分</text><text class="dd">{{ rating.serviceStars }} / 5</text></view>
            <view v-if="rating.comment" class="row"><text class="dt">评价</text><text class="dd">{{ rating.comment }}</text></view>
          </view>
        </template>

        <AdminSectionTitle title="客服工单" />
        <view class="card">
          <view class="actions">
            <button class="btn ghost" size="mini" @click="goTickets">查看工单</button>
            <button v-if="canCreateTicket" class="btn primary" size="mini" @click="openCreateTicket">创建工单</button>
          </view>
        </view>

        <view class="footer-actions">
          <button class="btn ghost" @click="callCustomer">拨打客户</button>
          <button class="btn primary" @click="goDispatch">返回调度中心</button>
        </view>
      </template>
    </view>

    <view v-if="createOpen" class="mask" @click.self="createOpen = false">
      <view class="modal card">
        <AdminSectionTitle title="创建工单" />
        <input v-model="createForm.title" class="input" placeholder="标题" />
        <textarea v-model="createForm.description" class="textarea" placeholder="问题描述" />
        <view class="actions">
          <button class="btn ghost" size="mini" @click="createOpen = false">取消</button>
          <button class="btn primary" size="mini" :loading="creating" @click="submitCreateTicket">提交</button>
        </view>
      </view>
    </view>
  </scroll-view>
</template>

<script>
import AdminSectionTitle from '@/components/AdminSectionTitle.vue'
import AdminStatusBadge from '@/components/AdminStatusBadge.vue'
import { fetchOrderDetail, createSupportTicket } from '@/services/adminApi'
import {
  orderDisplayNo,
  phoneOf,
  adminScheduledTimeLabel,
  driverInfoLine,
  driverPhoneOf
} from '@/utils/bookingStatus'
import { paymentSummaryLabel } from '@/utils/depositDispatch'
import { getBookingStatusMeta } from '@/config/statusMeta'
import { TICKET_KEYWORD_PRESET_KEY } from '@/config/navPreset'
import { serviceTypeLabel } from '@/utils/serviceType'
import { customerPriceCell, driverPriceCell, formatCny } from '@/utils/currencyDisplay'
import { callPhone, showToast } from '@/utils/phone'
import { can } from '@/stores/auth'

export default {
  components: { AdminSectionTitle, AdminStatusBadge },
  data() {
    return {
      orderId: '',
      order: {},
      rating: null,
      loading: false,
      error: '',
      createOpen: false,
      creating: false,
      createForm: { title: '', description: '' }
    }
  },
  computed: {
    customerPhone() {
      return phoneOf(this.order.userId) || '—'
    },
    driverPhone() {
      return driverPhoneOf(this.order)
    },
    canCreateTicket() {
      return can('support_tickets', 'create')
    },
    statusMeta() {
      return getBookingStatusMeta(this.order)
    }
  },
  onLoad(query) {
    this.orderId = query.id || ''
    if (this.orderId) this.load()
  },
  methods: {
    orderDisplayNo,
    adminScheduledTimeLabel,
    driverInfoLine,
    serviceTypeLabel,
    customerPriceCell,
    driverPriceCell,
    paymentSummaryLabel,
    formatCny,
    async load() {
      this.loading = true
      this.error = ''
      try {
        const data = await fetchOrderDetail(this.orderId)
        this.order = data?.order || {}
        this.rating = data?.rating || null
      } catch (e) {
        this.error = e.message || '加载失败'
      } finally {
        this.loading = false
      }
    },
    callCustomer() {
      callPhone(phoneOf(this.order.userId))
    },
    callDriver() {
      callPhone(this.driverPhone)
    },
    goDispatch() {
      uni.switchTab({ url: '/pages/M0003_admin_dispatch' })
    },
    goTickets() {
      const kw = this.order.orderNo || this.orderId
      if (kw) uni.setStorageSync(TICKET_KEYWORD_PRESET_KEY, kw)
      uni.switchTab({ url: '/pages/M0005_admin_tickets' })
    },
    openCreateTicket() {
      this.createForm = {
        title: `订单 ${orderDisplayNo(this.order)} 客服工单`,
        description: ''
      }
      this.createOpen = true
    },
    async submitCreateTicket() {
      if (!this.createForm.title.trim()) {
        showToast('请填写标题')
        return
      }
      this.creating = true
      try {
        const data = await createSupportTicket({
          type: 'complaint',
          priority: 'normal',
          requesterRole: 'customer',
          requesterPhone: phoneOf(this.order.userId),
          orderId: this.orderId,
          title: this.createForm.title.trim(),
          description: this.createForm.description.trim()
        })
        const ticket = data?.ticket
        this.createOpen = false
        showToast('工单已创建', 'success')
        if (ticket?._id) {
          uni.navigateTo({ url: `/pages/M0006_admin_ticket_detail?id=${ticket._id}` })
        }
      } catch (e) {
        showToast(e.message || '创建失败')
      } finally {
        this.creating = false
      }
    }
  }
}
</script>

<style scoped lang="scss">
@import '../styles/theme.scss';

.page { height: 100vh; }
.pad { padding: $admin-page-pad; padding-bottom: 120rpx; }
.head-card {
  display: flex; justify-content: space-between; align-items: center;
  background: #fff; border-radius: $admin-card-radius; padding: 28rpx 24rpx;
  border: 1rpx solid $admin-border; margin-bottom: 8rpx;
}
.order-no { font-size: 32rpx; font-weight: 700; color: $admin-text; }
.card {
  background: #fff; border-radius: $admin-card-radius; padding: 24rpx;
  border: 1rpx solid $admin-border; margin-bottom: 8rpx;
}
.row { display: flex; margin-bottom: 12rpx; font-size: 26rpx; }
.row.sub { margin-left: 160rpx; color: $admin-text-secondary; font-size: 24rpx; }
.dt { width: 160rpx; color: $admin-text-secondary; flex-shrink: 0; }
.dd { flex: 1; word-break: break-all; color: $admin-text; }
.price { font-weight: 600; color: $admin-primary; }
.link { color: $admin-primary; }
.route-row { display: flex; align-items: flex-start; margin-bottom: 16rpx; }
.dot {
  width: 16rpx; height: 16rpx; border-radius: 50%; margin-top: 10rpx; margin-right: 16rpx; flex-shrink: 0;
  &.start { background: $admin-primary; }
  &.end { background: $admin-success; }
}
.route-text { flex: 1; font-size: 26rpx; line-height: 1.5; color: $admin-text; }
.actions { display: flex; gap: 12rpx; flex-wrap: wrap; }
.footer-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.btn { margin: 0; font-size: 26rpx; flex: 1; border-radius: 12rpx; }
.btn.primary { background: $admin-primary; color: #fff; }
.btn.ghost { background: #fff; color: $admin-primary; border: 1rpx solid $admin-border; }
.center { text-align: center; padding: 80rpx; }
.muted { color: $admin-text-secondary; }
.error { color: $admin-danger; }
.mask {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  display: flex; align-items: center; justify-content: center; z-index: 99;
}
.modal { width: 86%; max-width: 640rpx; }
.input, .textarea {
  width: 100%; border: 1rpx solid $admin-border; border-radius: 12rpx;
  padding: 16rpx; margin-bottom: 16rpx; box-sizing: border-box; font-size: 28rpx;
}
.textarea { min-height: 160rpx; }
</style>
