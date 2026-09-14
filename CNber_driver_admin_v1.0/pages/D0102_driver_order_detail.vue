<template>
  <view class="order-detail-page">
    <view v-if="loading" class="state-card">加载中…</view>
    <view v-else-if="err" class="state-card err">{{ err }}</view>
    <template v-else-if="order._id">
      <view class="card status-card">
        <view class="status-col">
          <text class="field-label">订单状态</text>
          <text class="status-text" :class="statusTone">{{ formatStatus(order.status) }}</text>
        </view>
        <view class="orderno-col">
          <text class="field-label">订单号</text>
          <text class="orderno-text">{{ displayOrderNo }}</text>
        </view>
      </view>
      <view v-if="isAssignedToMe" class="assign-hint">平台已派发，请确认收到任务</view>

      <view v-if="pendingCancel" class="assign-hint pending-cancel">
        取消申请已发送，等待乘客确认。在客户批准前，请继续保留该订单。
      </view>

      <view class="card info-card">
        <view class="info-row">
          <view class="icon-dot icon-phone">客</view>
          <view class="info-body">
            <text class="field-label">乘客手机</text>
            <text class="field-value">{{ passengerPhone }}</text>
          </view>
        </view>
        <view class="info-row">
          <view class="icon-dot icon-from">起</view>
          <view class="info-body">
            <text class="field-label">出发地点</text>
            <text class="field-value wrap">{{ displayText(order.pickup) }}</text>
          </view>
        </view>
        <view class="info-row">
          <view class="icon-dot icon-to">终</view>
          <view class="info-body">
            <text class="field-label">目的地点</text>
            <text class="field-value wrap">{{ displayText(order.destination) }}</text>
          </view>
        </view>
        <view class="info-row">
          <view class="icon-dot icon-car">车</view>
          <view class="info-body">
            <text class="field-label">车型</text>
            <text class="field-value wrap">{{ displayText(order.vehicleLabel) }}</text>
          </view>
        </view>
        <view class="info-row last">
          <view class="icon-dot icon-time">时</view>
          <view class="info-body">
            <text class="field-label">下单时间</text>
            <text class="field-value">{{ formatTime(order.createdAt) }}</text>
          </view>
        </view>
      </view>

      <view class="card amount-card">
        <text class="field-label">订单金额</text>
        <text class="amount-gbp">{{ orderAmountText }}</text>
        <text class="amount-cny">司机结算 {{ settlementAmountText }}</text>
      </view>

      <view class="card pay-card">
        <view class="pay-row">
          <text class="pay-label">支付状态</text>
          <text class="pay-value" :class="paymentTone">{{ formatPaymentStatus(order.paymentStatus) }}</text>
        </view>
        <view class="pay-row">
          <text class="pay-label">客户定金</text>
          <text class="pay-value" :class="depositTone">{{ depositLine }}</text>
        </view>
        <view class="pay-row">
          <text class="pay-label">客户尾款</text>
          <text class="pay-value" :class="balanceTone">{{ balanceLine }}</text>
        </view>
        <view class="pay-row last">
          <text class="pay-label">司机结算</text>
          <text class="pay-value" :class="settlementTone">{{ settlementLine }}</text>
        </view>
      </view>

      <view class="card note-card">
        <text class="note-title">订单备注</text>
        <text class="note-line">乘客备注：{{ passengerRemark }}</text>
        <text class="note-line">内部备注：{{ internalRemark }}</text>
      </view>
    </template>

    <view v-if="order._id && !loading && !err" class="action-bar">
      <view class="action-row">
        <button class="btn-ghost" @click="contact">联系乘客</button>
        <button
          v-if="isAssignedToMe"
          class="btn-ghost"
          :disabled="acting"
          @click="doReject"
        >
          拒单
        </button>
        <button
          v-if="canRequestCancel"
          class="btn-ghost"
          :disabled="acting"
          @click="openCancelSheet"
        >
          取消订单
        </button>
      </view>
      <button
        v-if="isAssignedToMe"
        class="btn-main"
        :disabled="acting"
        @click="doAccept"
      >
        确认收到任务
      </button>
      <button
        v-else-if="normalizedOrderStatus === 'accepted'"
        class="btn-main"
        :disabled="acting || order.paymentStatus !== 'paid'"
        @click="doStart"
      >
        开始行程
      </button>
      <button
        v-else-if="normalizedOrderStatus === 'started'"
        class="btn-main"
        :disabled="acting"
        @click="doComplete"
      >
        完成订单
      </button>
    </view>

    <view v-if="cancelSheet.open" class="cancel-mask" @click="closeCancelSheet">
      <view class="cancel-sheet" @click.stop>
        <text class="cancel-title">请选择取消原因</text>
        <view
          v-for="item in cancelReasons"
          :key="item"
          class="reason-item"
          :class="{ on: cancelSheet.reason === item }"
          @click="cancelSheet.reason = item"
        >
          {{ item }}
        </view>
        <textarea
          v-model="cancelSheet.note"
          class="cancel-note"
          placeholder="备注（选填；选其他时必填）"
          maxlength="120"
        />
        <text v-if="cancelSheet.needsApproval" class="cancel-warn">
          该订单距离出发不足24小时。司机不能直接取消，需要乘客批准。
        </text>
        <text v-else class="cancel-warn">
          取消后订单将退回客服重新派单，是否确认？
        </text>
        <view class="cancel-actions">
          <button class="btn-ghost" @click="closeCancelSheet">
            {{ cancelSheet.needsApproval ? '返回' : '暂不取消' }}
          </button>
          <button class="btn-main" :disabled="acting" @click="submitCancel">
            {{ cancelSheet.needsApproval ? '提交取消申请' : '确认取消' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'
import { formatDriverOrderStatus, normalizeDriverOrderStatus } from '../utils/orderStatus.js'
import {
  formatCny,
  customerOrderAmountCny,
  settlementDisplayText
} from '../utils/driverCurrencyDisplay.js'

function asDisplayText(value) {
  if (value == null) return '无'
  const s = String(value).trim()
  if (!s || s === 'undefined' || s === 'null' || s === '—') return '无'
  return s
}

function latestNote(list) {
  if (!Array.isArray(list) || !list.length) return ''
  const last = list[list.length - 1]
  if (last == null) return ''
  if (typeof last === 'string') return last
  return last.content || last.message || last.note || ''
}

function toneForPay(text) {
  const s = String(text || '')
  if (s === '—' || s === '无') return 'tone-muted'
  if (s.includes('已收') || s.includes('已支付') || s.includes('已结算')) return 'tone-ok'
  if (s.includes('取消') || s.includes('退款') || s.includes('拒绝') || s.includes('异常')) return 'tone-bad'
  if (s.includes('待') || s.includes('未')) return 'tone-wait'
  return 'tone-muted'
}

export default {
  name: 'D0102_driver_order_detail',
  data() {
    return {
      orderId: '',
      order: {},
      loading: false,
      err: '',
      acting: false,
      myUserId: '',
      cancelReasons: ['车辆故障', '身体原因', '时间冲突', '突发情况', '其他'],
      cancelSheet: {
        open: false,
        reason: '',
        note: '',
        needsApproval: false
      }
    }
  },
  computed: {
    passengerPhone() {
      const u = this.order.userId
      if (u && typeof u === 'object' && u.phone) return u.phone
      return '—'
    },
    displayOrderNo() {
      return this.order.orderNo || '—'
    },
    orderAmountText() {
      const n = customerOrderAmountCny(this.order)
      return n == null ? '待确认' : formatCny(n)
    },
    settlementAmountText() {
      return settlementDisplayText(this.order)
    },
    passengerRemark() {
      const o = this.order || {}
      return asDisplayText(o.remarks || o.remark || o.note || o.customerNote)
    },
    internalRemark() {
      const o = this.order || {}
      return asDisplayText(
        latestNote(o.internalNotes) ||
          latestNote(o.followUpNotes) ||
          o.exceptionNotes ||
          o.internalNote
      )
    },
    statusTone() {
      const label = this.formatStatus(this.order.status)
      if (label === '已取消') return 'tone-bad'
      if (label === '已完成') return 'tone-ok'
      return 'tone-wait'
    },
    paymentTone() {
      return toneForPay(this.formatPaymentStatus(this.order.paymentStatus))
    },
    depositTone() {
      return toneForPay(this.depositLine)
    },
    balanceTone() {
      return toneForPay(this.balanceLine)
    },
    settlementTone() {
      return toneForPay(this.settlementLine)
    },
    normalizedOrderStatus() {
      return normalizeDriverOrderStatus(this.order.status)
    },
    isAssignedToMe() {
      const status = normalizeDriverOrderStatus(
        String(this.order.dispatchStatus || this.order.status || '')
      )
      if (status !== 'assigned' || !this.myUserId) return false
      const d = this.order.driverId
      if (!d) return false
      const id = typeof d === 'object' && d._id != null ? String(d._id) : String(d)
      return id === this.myUserId
    },
    pendingCancel() {
      return this.order && this.order.pendingDriverCancellation
    },
    canRequestCancel() {
      if (this.pendingCancel) return false
      return this.normalizedOrderStatus === 'accepted'
    },
    depositLine() {
      const o = this.order
      if (!o || !o._id) return '—'
      if (o.depositStatus === 'confirmed' || o.depositPaid) return '已收'
      if (o.depositStatus === 'submitted') return '待平台确认'
      return '未收'
    },
    balanceLine() {
      const o = this.order
      if (!o || !o._id) return '—'
      if (o.balanceStatus === 'confirmed' || o.remainingPaid) return '已收'
      if (o.paymentStage === 'balance_submitted') return '待平台确认'
      if (o.paymentStage === 'balance_pending') return '待客户支付'
      return '—'
    },
    settlementLine() {
      const o = this.order
      if (!o || !o._id) return '—'
      const s = o.driverSettlementStatus || 'not_required'
      if (s === 'paid') return '已结算'
      if (s === 'pending') return '待结算'
      return '—'
    }
  },
  onLoad(query) {
    this.orderId = query.id ? String(query.id) : ''
    this.readMyId()
  },
  onShow() {
    this.readMyId()
    if (this.orderId) this.loadOrder()
  },
  methods: {
    displayText(value) {
      if (value == null) return '—'
      const s = String(value).trim()
      if (!s || s === 'undefined' || s === 'null') return '—'
      return s
    },
    readMyId() {
      try {
        const u = uni.getStorageSync('user')
        if (u && u._id) this.myUserId = String(u._id)
      } catch (e) {
        this.myUserId = ''
      }
    },
    formatStatus(s) {
      return formatDriverOrderStatus(s)
    },
    formatTime(iso) {
      if (!iso) return '—'
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return '—'
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const hh = String(d.getHours()).padStart(2, '0')
      const mm = String(d.getMinutes()).padStart(2, '0')
      const ss = String(d.getSeconds()).padStart(2, '0')
      return `${y}-${m}-${day} ${hh}:${mm}:${ss}`
    },
    formatPaymentStatus(status) {
      const map = {
        unpaid: '待支付',
        pending: '待支付',
        paid: '已支付',
        refunded: '已退款'
      }
      return map[status || 'unpaid'] || status
    },
    async loadOrder() {
      this.loading = true
      this.err = ''
      try {
        const data = await request({
          url: `/order/detail/${this.orderId}`,
          method: 'GET'
        })
        this.order = data.order || {}
      } catch (e) {
        this.err = (e && e.message) || '加载失败'
        this.order = {}
      } finally {
        this.loading = false
      }
    },
    contact() {
      const p = this.passengerPhone
      if (p && p !== '—') {
        uni.showModal({
          title: '联系乘客',
          content: `请拨打：${p}`,
          showCancel: false
        })
      } else {
        uni.showToast({ title: '暂无号码', icon: 'none' })
      }
    },
    async doAccept() {
      await this.runAction('/order/accept', '接单成功')
    },
    async doStart() {
      if (this.order.paymentStatus !== 'paid') {
        uni.showToast({ title: '用户未支付，不能开始行程', icon: 'none' })
        return
      }
      await this.runAction('/order/start', '行程已开始')
    },
    async doComplete() {
      await this.runAction('/order/complete', '订单已完成')
    },
    async doReject() {
      uni.showModal({
        title: '确认拒单',
        content: '拒单后订单将回到可接单池',
        success: async (res) => {
          if (res.confirm) {
            await this.runAction('/order/reject', '已拒单', true)
          }
        }
      })
    },
    openCancelSheet() {
      this.cancelSheet = {
        open: true,
        reason: '',
        note: '',
        needsApproval: this.order.requiresCustomerApproval !== false
      }
    },
    closeCancelSheet() {
      this.cancelSheet.open = false
    },
    async submitCancel() {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      if (!this.cancelSheet.reason) {
        uni.showToast({ title: '请选择取消原因', icon: 'none' })
        return
      }
      this.acting = true
      try {
        const data = await request({
          url: '/order/cancel',
          method: 'POST',
          data: {
            orderId: this.orderId,
            reason: this.cancelSheet.reason,
            note: this.cancelSheet.note
          }
        })
        this.closeCancelSheet()
        if (data && data.requiresCustomerApproval) {
          uni.showModal({
            title: '申请已发送',
            content: '取消申请已发送，等待乘客确认。在客户批准前，请继续保留该订单。',
            showCancel: false
          })
          await this.loadOrder()
        } else {
          uni.showToast({ title: '已退回客服重新派单', icon: 'success' })
          this.backToList()
        }
      } catch (e) {
        /* request 已 toast */
      } finally {
        this.acting = false
      }
    },
    backToList() {
      const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
      if (pages.length > 1) {
        uni.navigateBack({ delta: 1 })
      } else {
        uni.redirectTo({ url: '/pages/D0101_driver_order_list' })
      }
    },
    async runAction(path, okText, backAfterSuccess = false) {
      const token = uni.getStorageSync('token')
      if (!token) {
        uni.showToast({ title: '请先登录', icon: 'none' })
        return
      }
      this.acting = true
      try {
        await request({
          url: path,
          method: 'POST',
          data: { orderId: this.orderId }
        })
        uni.showToast({ title: okText, icon: 'success' })
        if (backAfterSuccess) {
          this.backToList()
        } else {
          await this.loadOrder()
        }
      } catch (e) {
        /* request 已 toast */
      } finally {
        this.acting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.order-detail-page {
  min-height: 100vh;
  box-sizing: border-box;
  background: linear-gradient(180deg, #2f6fc2 0%, #2463b5 100%);
  padding: 24rpx 24rpx 480rpx;
  padding-bottom: calc(480rpx + env(safe-area-inset-bottom));
}

.state-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  color: #111827;
  font-size: 28rpx;
}

.state-card.err {
  color: #dc2626;
}

.card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 8rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(15, 23, 42, 0.08);
}

.status-card {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24rpx;
  padding-bottom: 28rpx;
}

.status-col,
.orderno-col {
  flex: 1;
  min-width: 0;
}

.orderno-col {
  text-align: right;
}

.field-label {
  display: block;
  font-size: 24rpx;
  color: #4b5563;
  line-height: 1.4;
}

.status-text {
  display: block;
  margin-top: 8rpx;
  font-size: 40rpx;
  font-weight: 700;
  line-height: 1.2;
}

.orderno-text {
  display: block;
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #111827;
  word-break: break-all;
}

.assign-hint {
  margin: -8rpx 0 20rpx;
  padding: 12rpx 20rpx;
  color: #fff7ed;
  font-size: 24rpx;
}

.pending-cancel {
  background: rgba(234, 88, 12, 0.35);
  border-radius: 12rpx;
  color: #fff7ed;
}

.info-card {
  padding-bottom: 8rpx;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #e5e7eb;
}

.info-row.last {
  border-bottom: none;
}

.icon-dot {
  width: 44rpx;
  height: 44rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  margin-top: 6rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
  color: #ffffff;
}

.icon-phone {
  background: #1265d8;
}
.icon-from {
  background: #16a34a;
}
.icon-to {
  background: #f97316;
}
.icon-car {
  background: #4b5563;
}
.icon-time {
  background: #6b7280;
}

.info-body {
  flex: 1;
  min-width: 0;
}

.field-value {
  display: block;
  margin-top: 6rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #111827;
  line-height: 1.45;
}

.field-value.wrap {
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: normal;
}

.amount-card {
  padding: 28rpx;
}

.amount-gbp {
  display: block;
  margin-top: 8rpx;
  font-size: 56rpx;
  font-weight: 700;
  color: #f97316;
  line-height: 1.2;
}

.amount-cny {
  display: block;
  margin-top: 6rpx;
  font-size: 26rpx;
  color: #6b7280;
}

.pay-card {
  padding-bottom: 12rpx;
}

.pay-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24rpx;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #e5e7eb;
}

.pay-row.last {
  border-bottom: none;
}

.pay-label {
  font-size: 26rpx;
  color: #4b5563;
}

.pay-value {
  font-size: 28rpx;
  font-weight: 700;
  text-align: right;
}

.tone-wait {
  color: #1265d8;
}
.tone-ok {
  color: #16a34a;
}
.tone-bad {
  color: #dc2626;
}
.tone-muted {
  color: #6b7280;
}

.note-card {
  padding: 28rpx;
}

.note-title {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #111827;
  margin-bottom: 16rpx;
}

.note-line {
  display: block;
  font-size: 26rpx;
  color: #111827;
  line-height: 1.6;
  word-break: break-word;
}

.action-bar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 20;
  background: #ffffff;
  padding: 16rpx 24rpx 36rpx;
  padding-bottom: calc(36rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -8rpx 24rpx rgba(15, 23, 42, 0.08);
}

.action-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.btn-ghost,
.btn-main {
  margin: 0;
  min-height: 96rpx;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 700;
  padding: 0 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-ghost {
  flex: 1;
  background: #ffffff;
  color: #1265d8;
  border: 2rpx solid #1265d8;
}

.btn-main {
  width: 100%;
  background: #ff7a00;
  color: #ffffff;
  border: none;
}

.btn-ghost[disabled],
.btn-main[disabled] {
  opacity: 0.45;
}

button::after {
  border: none;
}

.cancel-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 40;
  background: rgba(15, 23, 42, 0.45);
  display: flex;
  align-items: flex-end;
}

.cancel-sheet {
  width: 100%;
  background: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx 28rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.cancel-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #111827;
  margin-bottom: 20rpx;
}

.reason-item {
  padding: 20rpx 16rpx;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
  font-size: 28rpx;
  color: #111827;
}

.reason-item.on {
  border-color: #1265d8;
  color: #1265d8;
  font-weight: 700;
}

.cancel-note {
  width: 100%;
  min-height: 120rpx;
  margin: 8rpx 0 16rpx;
  padding: 16rpx;
  box-sizing: border-box;
  border: 2rpx solid #e5e7eb;
  border-radius: 12rpx;
  font-size: 26rpx;
}

.cancel-warn {
  display: block;
  color: #c2410c;
  font-size: 26rpx;
  line-height: 1.5;
  margin-bottom: 16rpx;
}

.cancel-actions {
  display: flex;
  gap: 16rpx;
}

</style>

<style>
page {
  background-color: #2463b5;
}
</style>
