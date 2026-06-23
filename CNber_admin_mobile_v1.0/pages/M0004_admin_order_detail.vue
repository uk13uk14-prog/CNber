<template>
  <view class="page">
    <view v-if="loading" class="center muted">加载中…</view>
    <view v-else-if="error" class="center error">{{ error }}</view>
    <template v-else-if="order._id">
      <view class="card">
        <view class="title">基本信息</view>
        <view class="row"><text class="dt">订单号</text><text class="dd">{{ orderDisplayNo(order) }}</text></view>
        <view class="row"><text class="dt">状态</text><text class="dd">{{ orderStatusDisplayLabel(order.status, order) }}</text></view>
        <view class="row"><text class="dt">客户手机</text><text class="dd link" @click="callCustomer">{{ customerPhone }}</text></view>
        <view class="row"><text class="dt">服务类型</text><text class="dd">{{ serviceTypeLabel(order.serviceType) }}</text></view>
        <view v-if="order.vehicleLabel" class="row"><text class="dt">车型</text><text class="dd">{{ order.vehicleLabel }}</text></view>
        <view class="row"><text class="dt">预约时间</text><text class="dd">{{ adminScheduledTimeLabel(order) }}</text></view>
      </view>

      <view class="card">
        <view class="title">路线</view>
        <view class="row"><text class="dt">起点</text><text class="dd">{{ order.pickup || '—' }}</text></view>
        <view class="row"><text class="dt">终点</text><text class="dd">{{ order.destination || '—' }}</text></view>
      </view>

      <view class="card">
        <view class="title">价格</view>
        <view class="row"><text class="dt">客户价 CNY</text><text class="dd">{{ customerPriceCell(order).main }}</text></view>
        <view v-if="customerPriceCell(order).sub" class="row sub"><text class="dd">{{ customerPriceCell(order).sub }}</text></view>
        <view class="row"><text class="dt">司机价 GBP</text><text class="dd">{{ driverPriceCell(order).main }}</text></view>
        <view v-if="order.couponCode" class="row"><text class="dt">优惠券</text><text class="dd">{{ order.couponCode }} -{{ formatCny(order.discountAmountCny) }}</text></view>
        <view class="row"><text class="dt">付款状态</text><text class="dd">{{ paymentSummaryLabel(order) }}</text></view>
      </view>

      <view class="card">
        <view class="title">司机</view>
        <view class="row"><text class="dt">司机信息</text><text class="dd">{{ driverInfoLine(order) }}</text></view>
        <button v-if="driverPhone" class="btn" size="mini" @click="callDriver">联系司机</button>
      </view>

      <view v-if="rating" class="card">
        <view class="title">乘客评价</view>
        <view class="row"><text class="dt">司机评分</text><text class="dd">{{ rating.driverStars }} / 5</text></view>
        <view class="row"><text class="dt">服务评分</text><text class="dd">{{ rating.serviceStars }} / 5</text></view>
        <view v-if="rating.comment" class="row"><text class="dt">评价</text><text class="dd">{{ rating.comment }}</text></view>
      </view>

      <view class="card">
        <view class="title">客服工单</view>
        <view class="actions">
          <button class="btn" size="mini" @click="goTickets">查看工单</button>
          <button v-if="canCreateTicket" class="btn primary" size="mini" @click="openCreateTicket">创建工单</button>
        </view>
      </view>

      <view class="footer-actions">
        <button class="btn" @click="callCustomer">拨打客户</button>
        <button class="btn" @click="goDispatch">返回调度中心</button>
      </view>
    </template>

    <view v-if="createOpen" class="mask" @click.self="createOpen = false">
      <view class="modal card">
        <view class="title">创建工单</view>
        <input v-model="createForm.title" class="input" placeholder="标题" />
        <textarea v-model="createForm.description" class="textarea" placeholder="问题描述" />
        <view class="actions">
          <button class="btn" size="mini" @click="createOpen = false">取消</button>
          <button class="btn primary" size="mini" :loading="creating" @click="submitCreateTicket">提交</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { fetchOrderDetail, createSupportTicket } from '@/services/adminApi'
import {
  orderDisplayNo,
  phoneOf,
  adminScheduledTimeLabel,
  driverInfoLine,
  driverPhoneOf
} from '@/utils/bookingStatus'
import { orderStatusDisplayLabel, paymentSummaryLabel } from '@/utils/depositDispatch'
import { serviceTypeLabel } from '@/utils/serviceType'
import { customerPriceCell, driverPriceCell, formatCny } from '@/utils/currencyDisplay'
import { callPhone, showToast } from '@/utils/phone'
import { can } from '@/stores/auth'

export default {
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
    orderStatusDisplayLabel,
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
      uni.navigateTo({ url: '/pages/M0003_admin_dispatch' })
    },
    goTickets() {
      const kw = this.order.orderNo || this.orderId
      uni.navigateTo({ url: `/pages/M0005_admin_tickets?keyword=${encodeURIComponent(kw)}` })
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

<style scoped>
.page { padding: 24rpx; padding-bottom: 120rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 20rpx; }
.title { font-weight: 600; font-size: 30rpx; margin-bottom: 16rpx; }
.row { display: flex; margin-bottom: 12rpx; font-size: 26rpx; }
.row.sub { margin-left: 120rpx; color: #6b7280; font-size: 24rpx; }
.dt { width: 160rpx; color: #6b7280; flex-shrink: 0; }
.dd { flex: 1; word-break: break-all; }
.link { color: #1a5cff; }
.actions { display: flex; gap: 12rpx; flex-wrap: wrap; }
.footer-actions { display: flex; gap: 16rpx; margin-top: 24rpx; }
.btn { margin: 0; font-size: 26rpx; flex: 1; }
.btn.primary { background: #1a5cff; color: #fff; }
.center { text-align: center; padding: 80rpx; }
.muted { color: #6b7280; }
.error { color: #e11; }
.mask { position: fixed; inset: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 99; }
.modal { width: 86%; max-width: 640rpx; }
.input, .textarea { width: 100%; border: 1px solid #e5e7eb; border-radius: 12rpx; padding: 16rpx; margin-bottom: 16rpx; box-sizing: border-box; font-size: 28rpx; }
.textarea { min-height: 160rpx; }
</style>
