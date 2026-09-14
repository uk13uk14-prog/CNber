<template>
  <view class="page">
    <view class="title">支付尾款</view>
    <view v-if="loading" class="muted">加载中…</view>
    <view v-else-if="err" class="err">{{ err }}</view>
    <template v-else-if="order && order._id">
      <view class="card summary">
        <view class="row">
          <text class="label">订单号</text>
          <text class="value">{{ orderDisplayNo }}</text>
        </view>
        <view class="row">
          <text class="label">尾款金额</text>
          <text class="value strong">¥{{ amountNum.toFixed(2) }}</text>
        </view>
      </view>

      <view v-if="stateHint" class="card hint-card">{{ stateHint }}</view>

      <PaymentTransferFlow
        v-if="showForm"
        :accounts="accounts"
        :payment-config="paymentConfig"
        :order-id="orderId"
        :order-display-no="orderDisplayNo"
        :amount="amountNum"
        :amount-cny="amountNum"
        submit-label="提交尾款信息"
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
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import PaymentTransferFlow from '../components/PaymentTransferFlow.vue'
import { fetchOrderDetail, fetchPaymentAccounts, fetchPaymentConfig, submitOrderBalance } from '../utils/orderApi.js'
import { customerCnyFromOrder } from '../utils/currencyDisplay.js'

const orderId = ref('')
const order = ref(null)
const accounts = ref([])
const paymentConfig = ref(null)
const loading = ref(true)
const err = ref('')
const submitting = ref(false)

const totalPrice = computed(() => {
  const n = Number(customerCnyFromOrder(order.value) || 0)
  return Number.isFinite(n) ? n : 0
})

const amountNum = computed(() => {
  const o = order.value || {}
  const displayRem = Number(o.displayRemainingDueCny)
  if (Number.isFinite(displayRem) && displayRem >= 0) return displayRem
  const total = totalPrice.value
  const paid = Number(o.paidAmount)
  if (total > 0 && Number.isFinite(paid) && paid >= total * 0.05) {
    return Math.max(0, Math.round((total - paid) * 100) / 100)
  }
  return Math.max(0, Math.round(total * 0.9 * 100) / 100)
})

const orderDisplayNo = computed(() => {
  const o = order.value
  if (o?.orderNo) return String(o.orderNo)
  const id = o?._id
  if (!id) return '—'
  const s = String(id)
  return s.length > 10 ? `${s.slice(0, 8)}…` : s
})

function balancePayStatus(o) {
  if (!o) return 'unpaid'
  if (o.payment?.balanceStatus) return o.payment.balanceStatus
  if (o.balanceStatus === 'submitted') return 'pending'
  return o.balanceStatus || 'unpaid'
}

const showForm = computed(() => {
  const o = order.value
  if (!o) return false
  if (o.paymentStage !== 'balance_pending' && o.paymentStage !== 'balance_submitted') {
    return false
  }
  const st = balancePayStatus(o)
  if (st === 'confirmed' || o.remainingPaid) return false
  if (st === 'pending' || st === 'submitted') return false
  return ['unpaid', 'rejected'].includes(st)
})

const stateHint = computed(() => {
  const o = order.value
  if (!o) return ''
  if (o.paymentStage !== 'balance_pending' && o.paymentStage !== 'balance_submitted') {
    if (o.paymentStage === 'balance_confirmed' || o.remainingPaid) return '尾款已确认。'
    return '当前无需支付尾款，请等待客服发起尾款收款。'
  }
  const st = balancePayStatus(o)
  if (st === 'confirmed' || o.remainingPaid) return '尾款已确认。'
  if (st === 'pending' || st === 'submitted') return '您已提交尾款信息，请等待平台确认到账。'
  return ''
})

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
    const [accData, cfg] = await Promise.all([
      fetchPaymentAccounts(),
      fetchPaymentConfig()
    ])
    accounts.value = Array.isArray(accData?.accounts) ? accData.accounts : []
    paymentConfig.value = cfg || null
  } catch (e) {
    err.value = (e && e.message) || '加载失败'
  } finally {
    loading.value = false
  }
}

async function onSubmit(payload) {
  submitting.value = true
  try {
    await submitOrderBalance(orderId.value, payload)
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

onShow(() => {
  if (orderId.value) loadAll()
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
  margin-bottom: 12rpx;
  font-size: 28rpx;
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
</style>
