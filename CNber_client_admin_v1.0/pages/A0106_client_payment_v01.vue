<template>
  <view class="page">
    <view class="title">立即付款</view>
    <view v-if="loading" class="muted">加载中…</view>
    <view v-else-if="err" class="err">{{ err }}</view>
    <template v-else-if="order && order._id">
      <view class="card summary">
        <view class="row">
          <text class="label">订单号</text>
          <text class="value">{{ orderDisplayNo }}</text>
        </view>
        <view class="row">
          <text class="label">应付金额</text>
          <view class="amount-col">
            <text class="value strong">{{ displayPayablePrimary }}</text>
            <text v-if="displayPayableSecondary" class="amount-sub">{{ displayPayableSecondary }}</text>
          </view>
        </view>
        <view v-if="couponApplied" class="row coupon-row">
          <text class="label">优惠</text>
          <text class="value coupon-discount">-{{ couponDiscountText }}</text>
        </view>
      </view>

      <view v-if="showForm" class="card coupon-card">
        <view class="coupon-head">优惠码</view>
        <view class="coupon-input-row">
          <input
            v-model="couponCodeInput"
            class="coupon-input"
            placeholder="输入优惠码，如 NEW100"
            :disabled="couponValidating"
          />
          <button
            class="coupon-btn"
            type="button"
            :disabled="couponValidating || !couponCodeInput.trim()"
            @click="applyCoupon"
          >
            {{ couponValidating ? '校验中' : '应用' }}
          </button>
        </view>
        <text v-if="couponError" class="coupon-err">{{ couponError }}</text>
        <text v-else-if="couponApplied" class="coupon-ok">
          已应用 {{ couponApplied.code }}，实付 {{ formatCny(couponApplied.payableAmountCny) }}
        </text>
        <button v-if="couponApplied" class="coupon-clear" type="button" @click="clearCoupon">清除优惠</button>
      </view>

      <view v-if="stateHint" class="card hint-card">{{ stateHint }}</view>

      <PaymentTransferFlow
        v-if="showForm"
        :accounts="accounts"
        :order-id="orderId"
        :order-display-no="orderDisplayNo"
        :amount="amountNum"
        :amount-cny="effectivePayableCny"
        :exchange-rate="exchangeRate"
        submit-label="提交付款信息"
        :submitting="submitting"
        @submit="onSubmit"
      />

      <view v-if="!showForm && !stateHint" class="card">
        <button class="submit-btn secondary" @click="goWait">查看订单进度</button>
      </view>
    </template>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import PaymentTransferFlow from '../components/PaymentTransferFlow.vue'
import { fetchOrderDetail, fetchPaymentAccounts, submitOrderDeposit, confirmOrderPrice, validatePublicCoupon } from '../utils/orderApi.js'
import {
  clientSecondaryAmountLine,
  customerCnyFromOrder,
  formatCny
} from '../utils/currencyDisplay.js'

const orderId = ref('')
const order = ref(null)
const accounts = ref([])
const loading = ref(true)
const err = ref('')
const submitting = ref(false)
const couponCodeInput = ref('')
const couponApplied = ref(null)
const couponError = ref('')
const couponValidating = ref(false)

const totalPrice = computed(() => {
  const o = order.value || {}
  const n = Number(o.priceBreakdown?.totalPrice ?? o.quoteBreakdown?.totalPrice ?? o.amount ?? 0)
  return Number.isFinite(n) ? n : 0
})

const amountNum = computed(() => totalPrice.value)

const amountCny = computed(() => customerCnyFromOrder(order.value) ?? 0)

const effectivePayableCny = computed(() => {
  if (couponApplied.value?.valid) return Number(couponApplied.value.payableAmountCny)
  return amountCny.value
})

const displayPayablePrimary = computed(() => formatCny(effectivePayableCny.value))

const displayPayableSecondary = computed(() => {
  if (couponApplied.value?.valid) {
    return `原价 ${formatCny(amountCny.value)}`
  }
  return clientSecondaryAmountLine(order.value)
})

const couponDiscountText = computed(() => {
  if (!couponApplied.value?.valid) return ''
  return formatCny(couponApplied.value.discountAmountCny)
})

const exchangeRate = computed(() => Number(order.value?.exchangeRate ?? 10))

const orderDisplayNo = computed(() => {
  const o = order.value
  if (o?.orderNo) return String(o.orderNo)
  const id = o?._id
  if (!id) return '—'
  const s = String(id)
  return s.length > 10 ? `${s.slice(0, 8)}…` : s
})

function depositPayStatus(o) {
  if (!o) return 'unpaid'
  if (o.payment?.depositStatus) return o.payment.depositStatus
  if (o.depositStatus === 'submitted') return 'pending'
  return o.depositStatus || 'unpaid'
}

const showForm = computed(() => {
  const o = order.value
  if (!o) return false
  const st = depositPayStatus(o)
  if (st === 'confirmed' || o.depositPaid) return false
  if (st === 'pending' || st === 'submitted') return false
  return ['unpaid', 'rejected'].includes(st)
})

const stateHint = computed(() => {
  const o = order.value
  if (!o) return ''
  const st = depositPayStatus(o)
  if (st === 'confirmed' || o.depositPaid) return '付款已确认，平台将为您安排司机。'
  if (st === 'pending' || st === 'submitted') return '您已提交付款信息，请等待平台确认到账。'
  return ''
})

async function applyCoupon() {
  const code = String(couponCodeInput.value || '').trim().toUpperCase()
  if (!code) return
  couponValidating.value = true
  couponError.value = ''
  try {
    const o = order.value || {}
    const data = await validatePublicCoupon({
      code,
      serviceType: o.serviceType || '',
      vehicleClass: o.vehicleClass || '',
      amountCny: amountCny.value
    })
    if (data?.valid) {
      couponApplied.value = {
        valid: true,
        code: data.code || code,
        discountAmountCny: data.discountAmountCny,
        payableAmountCny: data.payableAmountCny
      }
      couponCodeInput.value = data.code || code
    } else {
      couponApplied.value = null
      couponError.value = data?.reason || '优惠码不可用'
    }
  } catch (e) {
    couponApplied.value = null
    couponError.value = (e && e.message) || '校验失败'
  } finally {
    couponValidating.value = false
  }
}

function clearCoupon() {
  couponApplied.value = null
  couponCodeInput.value = ''
  couponError.value = ''
}

function restoreCouponFromOrder(o) {
  if (!o?.couponCode || o.payableAmountCny == null) return
  couponCodeInput.value = o.couponCode
  couponApplied.value = {
    valid: true,
    code: o.couponCode,
    discountAmountCny: Number(o.discountAmountCny || 0),
    payableAmountCny: Number(o.payableAmountCny)
  }
}

async function loadAll() {
  loading.value = true
  err.value = ''
  if (!orderId.value) {
    err.value = '缺少订单参数'
    loading.value = false
    return
  }
  try {
    const data = await fetchOrderDetail(orderId.value)
    order.value = data?.order || null
    if (!order.value?._id) {
      err.value = '订单不存在'
      return
    }
    if (order.value.priceStatus === 'quoted') {
      try {
        const confirmed = await confirmOrderPrice(orderId.value)
        order.value = confirmed?.order || order.value
      } catch (e) {
        /* 报价确认失败时仍允许查看金额 */
      }
    }
    const accData = await fetchPaymentAccounts()
    accounts.value = Array.isArray(accData?.accounts) ? accData.accounts : []
    restoreCouponFromOrder(order.value)
  } catch (e) {
    err.value = (e && e.message) || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onSubmit(payload) {
  submitting.value = true
  try {
    const body = { ...payload }
    if (couponApplied.value?.valid && couponApplied.value.code) {
      body.couponCode = couponApplied.value.code
    }
    await submitOrderDeposit(orderId.value, body)
    uni.showToast({ title: '已提交', icon: 'success' })
    setTimeout(() => {
      uni.redirectTo({ url: '/pages/A0107_client_wait_driver_v01' })
    }, 800)
  } catch (e) {
    /* request 已 toast */
  } finally {
    submitting.value = false
  }
}

function goWait() {
  uni.redirectTo({ url: '/pages/A0107_client_wait_driver_v01' })
}

onLoad((q) => {
  orderId.value = String((q && q.orderId) || '').trim()
})

onMounted(() => {
  loadAll()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 24rpx 32rpx 48rpx;
  background: #f5f7fa;
}
.title {
  font-size: 40rpx;
  font-weight: 700;
  margin-bottom: 24rpx;
  text-align: center;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.summary .row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
  font-size: 28rpx;
}
.amount-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6rpx;
}
.amount-sub {
  font-size: 22rpx;
  color: #64748b;
  font-weight: 400;
}
.label {
  color: #64748b;
}
.value {
  color: #0f172a;
}
.strong {
  font-weight: 700;
  color: #dc2626;
}
.hint-card {
  font-size: 26rpx;
  color: #0369a1;
  background: #e0f2fe;
}
.submit-btn {
  width: 100%;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 999rpx;
  padding: 22rpx;
  font-size: 30rpx;
}
.submit-btn.secondary {
  background: #64748b;
}
.muted {
  color: #94a3b8;
  text-align: center;
  padding: 40rpx;
}
.err {
  color: #dc2626;
  padding: 24rpx;
}
.coupon-card {
  padding: 24rpx 28rpx;
}
.coupon-head {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}
.coupon-input-row {
  display: flex;
  gap: 16rpx;
  align-items: center;
}
.coupon-input {
  flex: 1;
  height: 72rpx;
  border: 1rpx solid #cbd5e1;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.coupon-btn {
  margin: 0;
  font-size: 26rpx;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 12rpx;
  padding: 0 24rpx;
  height: 72rpx;
  line-height: 72rpx;
}
.coupon-err {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #dc2626;
}
.coupon-ok {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #15803d;
}
.coupon-clear {
  margin: 12rpx 0 0;
  padding: 0;
  font-size: 24rpx;
  color: #64748b;
  background: transparent;
  border: none;
}
.coupon-row .coupon-discount {
  color: #15803d;
  font-weight: 600;
}
</style>
