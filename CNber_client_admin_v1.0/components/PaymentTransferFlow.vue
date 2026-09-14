<template>
  <view class="flow">
    <view class="banner">
      {{ noticeText }}
    </view>

    <view class="card amount-hero">
      <text class="amount-label">订单金额</text>
      <text class="amount-value">{{ amountText }}</text>
      <text class="amount-sub">请选择支付方式</text>
    </view>

    <view class="pay-actions">
      <button
        class="pay-btn wechat"
        :class="{ active: selectedMethod === 'wechat' }"
        :disabled="!wechatEnabled || launching"
        @click="onWechatPay"
      >
        微信支付
      </button>
      <button
        class="pay-btn alipay"
        :class="{ active: selectedMethod === 'alipay' }"
        :disabled="!alipayEnabled || launching"
        @click="onAlipayPay"
      >
        支付宝支付
      </button>
    </view>
    <view v-if="!wechatEnabled && !alipayEnabled" class="muted">
      暂无可用微信/支付宝收款方式，请联系客服。
    </view>
    <view v-if="lastLaunchHint" class="hint launch-hint">{{ lastLaunchHint }}</view>
    <view v-else class="hint">
      点击后将自动保存收款码到相册并打开对应 App。请在 App 内使用扫一扫 → 相册选择刚保存的二维码完成付款。无法自动让微信/支付宝直接识别图片。
    </view>

    <view class="fallback-toggle" @click="qrPanelOpen = !qrPanelOpen">
      {{ qrPanelOpen ? '收起收款码' : '查看收款码' }}
    </view>

    <view v-if="qrPanelOpen" class="card qr-card">
      <view v-if="showWechatQrPanel">
        <view v-if="!wechatEnabled" class="qr-fail">微信支付已停用</view>
        <view v-else-if="!wechatQr" class="qr-fail">暂无微信收款码，请联系客服</view>
        <image
          v-else
          :src="wechatQr"
          class="qr-img"
          mode="aspectFit"
          @click="previewQr(wechatQr)"
          @error="onWechatQrError"
        />
        <text v-if="wechatQrLoadFailed" class="qr-fail">收款码加载失败，请检查网络或联系客服</text>
        <text v-if="wechatQr" class="qr-hint">点击放大收款码，或使用下方按钮手动保存</text>
        <button v-if="wechatQr" class="act-btn" size="mini" :disabled="launching" @click="saveWechatQr">
          保存微信二维码
        </button>
      </view>
      <view v-if="showAlipayQrPanel" :class="{ 'qr-second': showWechatQrPanel }">
        <view v-if="!alipayEnabled" class="qr-fail">支付宝支付已停用</view>
        <view v-else-if="!alipayQr" class="qr-fail">暂无支付宝收款码，请联系客服</view>
        <image
          v-else
          :src="alipayQr"
          class="qr-img"
          mode="aspectFit"
          @click="previewQr(alipayQr)"
          @error="onAlipayQrError"
        />
        <text v-if="alipayQrLoadFailed" class="qr-fail">收款码加载失败，请检查网络或联系客服</text>
        <text v-if="alipayQr" class="qr-hint">点击放大收款码，或使用下方按钮手动保存</text>
        <button v-if="alipayQr" class="act-btn" size="mini" :disabled="launching" @click="saveAlipayQr">
          保存支付宝二维码
        </button>
      </view>
    </view>

    <view class="card pay-info">
      <view class="info-row">
        <text class="info-label">收款人</text>
        <text class="info-value">{{ receiverName }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">订单备注</text>
        <text class="info-value strong ref-note">{{ refNote }}</text>
      </view>
      <button class="act-btn copy-btn" size="mini" @click="copyRefNote">复制备注</button>
    </view>

    <view class="card">
      <view class="step-title">付款完成后，请填写并提交</view>
      <view class="field">
        <text class="label">付款人姓名</text>
        <input v-model="payerName" class="pay-input" placeholder="必填" />
      </view>
      <view class="field">
        <text class="label">付款金额（¥）</text>
        <input v-model="paidAmount" class="pay-input" type="digit" placeholder="必填" />
      </view>
      <view class="field">
        <text class="label">付款流水号</text>
        <input
          v-model="transactionRef"
          class="pay-input"
          placeholder="必填，微信/支付宝转账单号"
        />
      </view>
      <view class="field">
        <text class="label">付款备注</text>
        <textarea
          v-model="note"
          class="pay-textarea"
          :placeholder="notePlaceholder"
          auto-height
          maxlength="200"
        />
      </view>
      <view class="proof-row">
        <text class="proof-label">付款截图（可选）</text>
        <image v-if="proofPreview" :src="proofPreview" class="proof-preview" mode="aspectFill" />
        <button class="act-btn" size="mini" :disabled="uploading" @click="chooseProof">
          {{ proofPreview ? '重新选择截图' : '上传截图（可选）' }}
        </button>
      </view>
      <button class="submit-btn" :disabled="submitting || uploading || launching" @click="onSubmit">
        {{ submitting ? '提交中…' : submitLabel }}
      </button>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import {
  findWechatAccount,
  findAlipayAccount,
  getPaymentQr,
  resolvePaymentAssetUrl,
  defaultTransferNote,
  orderRefNote
} from '../utils/paymentTransfer.js'
import { uploadPaymentProof } from '../utils/orderApi.js'
import {
  launchPayment,
  saveQrImageToAlbum,
  paymentUserMessage
} from '../utils/payment/paymentService.js'

const props = defineProps({
  accounts: { type: Array, default: () => [] },
  orderId: { type: String, required: true },
  orderDisplayNo: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  amountCny: { type: Number, default: 0 },
  exchangeRate: { type: Number, default: 10 },
  submitLabel: { type: String, default: '提交付款信息' },
  submitting: { type: Boolean, default: false },
  paymentConfig: { type: Object, default: null }
})

const emit = defineEmits(['submit'])

const selectedId = ref('')
const selectedMethod = ref('')
const payerName = ref('')
const paidAmount = ref('')
const transactionRef = ref('')
const note = ref('')
const proofUrl = ref('')
const proofPreview = ref('')
const uploading = ref(false)
const launching = ref(false)
const qrPanelOpen = ref(false)
const lastLaunchHint = ref('')
const wechatQrLoadFailed = ref(false)
const alipayQrLoadFailed = ref(false)

function accountById(id) {
  if (!id) return null
  return (props.accounts || []).find((a) => String(a._id) === String(id)) || null
}

const wechatAccount = computed(() => {
  const fromConfig = accountById(props.paymentConfig?.wechat?.paymentAccountId)
  return fromConfig || findWechatAccount(props.accounts)
})
const alipayAccount = computed(() => {
  const fromConfig = accountById(props.paymentConfig?.alipay?.paymentAccountId)
  return fromConfig || findAlipayAccount(props.accounts)
})

const wechatEnabled = computed(() => {
  if (props.paymentConfig?.wechat) return props.paymentConfig.wechat.enabled !== false
  return Boolean(wechatAccount.value)
})
const alipayEnabled = computed(() => {
  if (props.paymentConfig?.alipay) return props.paymentConfig.alipay.enabled !== false
  return Boolean(alipayAccount.value)
})

const wechatQr = computed(() => {
  const fromConfig = props.paymentConfig?.wechat?.qrUrl
  if (fromConfig) return resolvePaymentAssetUrl(fromConfig)
  return getPaymentQr(wechatAccount.value)
})
const alipayQr = computed(() => {
  const fromConfig = props.paymentConfig?.alipay?.qrUrl
  if (fromConfig) return resolvePaymentAssetUrl(fromConfig)
  return getPaymentQr(alipayAccount.value)
})

const noticeText = computed(() => {
  const n = String(props.paymentConfig?.paymentNotice || '').trim()
  return (
    n ||
    '请先完成微信/支付宝转账，再填写付款流水号。提交后由后台人工核对收款记录，确认后订单才会进入下一步。截图可选。'
  )
})

const amountText = computed(() => {
  const n = Number(props.amountCny || props.amount || 0)
  return Number.isFinite(n) && n > 0 ? `¥${n.toFixed(2)}` : '—'
})

const refNote = computed(() => orderRefNote(props.orderDisplayNo))

const receiverName = computed(() => {
  if (selectedMethod.value === 'wechat') {
    return props.paymentConfig?.wechat?.accountName || wechatAccount.value?.accountName || '—'
  }
  if (selectedMethod.value === 'alipay') {
    return props.paymentConfig?.alipay?.accountName || alipayAccount.value?.accountName || '—'
  }
  return (
    props.paymentConfig?.wechat?.accountName ||
    props.paymentConfig?.alipay?.accountName ||
    wechatAccount.value?.accountName ||
    alipayAccount.value?.accountName ||
    '—'
  )
})

const notePlaceholder = computed(() => {
  const no = props.orderDisplayNo || ''
  return no ? `建议填写：已通过 XX 转账，备注 CNBER-${no}` : '请填写付款渠道与订单号'
})

const showWechatQrPanel = computed(() => {
  if (selectedMethod.value === 'alipay') return false
  return selectedMethod.value === 'wechat' || !selectedMethod.value
})

const showAlipayQrPanel = computed(() => {
  if (selectedMethod.value === 'wechat') return false
  return selectedMethod.value === 'alipay' || !selectedMethod.value
})

watch(
  () => props.amountCny || props.amount,
  (v) => {
    const n = Number(v)
    if (n > 0 && !paidAmount.value) paidAmount.value = String(n.toFixed(2))
  },
  { immediate: true }
)

watch(
  () => [props.accounts, props.paymentConfig],
  () => {
    wechatQrLoadFailed.value = false
    alipayQrLoadFailed.value = false
  },
  { immediate: true, deep: true }
)

watch(wechatQr, () => {
  wechatQrLoadFailed.value = false
})

watch(alipayQr, () => {
  alipayQrLoadFailed.value = false
})

function onWechatQrError() {
  wechatQrLoadFailed.value = true
}

function onAlipayQrError() {
  alipayQrLoadFailed.value = true
}

function selectChannel(method) {
  selectedMethod.value = method
  const acc = method === 'wechat' ? wechatAccount.value : alipayAccount.value
  selectedId.value =
    (acc && acc._id) || props.paymentConfig?.[method]?.paymentAccountId || ''
  if (!note.value.trim()) note.value = defaultTransferNote(props.orderDisplayNo, method)
}

function copyRefNote() {
  uni.setClipboardData({
    data: refNote.value,
    success: () => uni.showToast({ title: '已复制备注', icon: 'none' })
  })
}

async function runQuickPay(method) {
  if (launching.value) return
  launching.value = true
  lastLaunchHint.value = ''
  try {
    const result = await launchPayment(
      { _id: props.orderId, orderNo: props.orderDisplayNo },
      method,
      { paymentConfig: props.paymentConfig, orderId: props.orderId }
    )
    const hint = result?.hint || ''
    lastLaunchHint.value = hint
    if (hint) {
      uni.showModal({
        title: '请完成付款',
        content: hint,
        showCancel: false
      })
    }
  } catch (e) {
    const msg = paymentUserMessage(e, '支付操作失败')
    lastLaunchHint.value = e?.savedToAlbum
      ? `收款码已保存到相册。${msg}`
      : msg
    uni.showModal({
      title: '无法完成快捷支付',
      content: lastLaunchHint.value,
      showCancel: false
    })
  } finally {
    launching.value = false
  }
}

function onWechatPay() {
  if (!wechatEnabled.value) {
    uni.showToast({ title: '微信支付未启用', icon: 'none' })
    return
  }
  selectChannel('wechat')
  runQuickPay('wechat')
}

function onAlipayPay() {
  if (!alipayEnabled.value) {
    uni.showToast({ title: '支付宝支付未启用', icon: 'none' })
    return
  }
  selectChannel('alipay')
  runQuickPay('alipay')
}

function previewQr(url) {
  if (!url) return
  uni.previewImage({ urls: [url] })
}

async function saveQrFallback(url) {
  if (!url) {
    uni.showToast({ title: '暂无收款码', icon: 'none' })
    return
  }
  uni.showLoading({ title: '保存中', mask: true })
  try {
    await saveQrImageToAlbum(url)
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (e) {
    uni.showToast({
      title: paymentUserMessage(e, '保存失败'),
      icon: 'none'
    })
  } finally {
    uni.hideLoading()
  }
}

function saveWechatQr() {
  saveQrFallback(wechatQr.value)
}

function saveAlipayQr() {
  saveQrFallback(alipayQr.value)
}

async function chooseProof() {
  if (!props.orderId) {
    uni.showToast({ title: '缺少订单', icon: 'none' })
    return
  }
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      const path = res.tempFilePaths && res.tempFilePaths[0]
      if (!path) return
      proofPreview.value = path
      uploading.value = true
      try {
        const data = await uploadPaymentProof(props.orderId, { filePath: path })
        proofUrl.value = data.url || data.path || ''
        if (!proofUrl.value) throw new Error('上传失败')
        uni.showToast({ title: '截图已上传', icon: 'success' })
      } catch (e) {
        proofPreview.value = ''
        proofUrl.value = ''
        uni.showToast({ title: (e && e.message) || '上传失败', icon: 'none' })
      } finally {
        uploading.value = false
      }
    }
  })
}

function onSubmit() {
  if (!selectedId.value) {
    uni.showToast({ title: '请先选择微信或支付宝付款', icon: 'none' })
    return
  }
  const name = String(payerName.value || '').trim()
  const amt = Number(paidAmount.value)
  const txRef = String(transactionRef.value || '').trim()
  const noteStr = String(note.value || '').trim()
  if (!name) {
    uni.showToast({ title: '请填写付款人姓名', icon: 'none' })
    return
  }
  if (!Number.isFinite(amt) || amt <= 0) {
    uni.showToast({ title: '请填写有效金额', icon: 'none' })
    return
  }
  if (!txRef && !noteStr) {
    uni.showToast({ title: '请填写付款流水号或备注', icon: 'none' })
    return
  }
  const acc =
    selectedMethod.value === 'wechat'
      ? wechatAccount.value
      : selectedMethod.value === 'alipay'
        ? alipayAccount.value
        : null
  emit('submit', {
    payerName: name,
    paidAmount: amt,
    transactionRef: txRef,
    note: noteStr,
    proofImage: proofUrl.value || '',
    paymentAccountId: selectedId.value,
    paymentMethod: acc ? acc.paymentType || acc.method : selectedMethod.value
  })
}
</script>

<style scoped>
.flow {
  width: 100%;
}
.banner {
  background: #fff7ed;
  color: #9a3412;
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
  margin-bottom: 24rpx;
}
.amount-hero {
  text-align: center;
  padding: 32rpx 24rpx;
}
.amount-label {
  display: block;
  font-size: 26rpx;
  color: #64748b;
}
.amount-value {
  display: block;
  margin: 8rpx 0 12rpx;
  font-size: 56rpx;
  font-weight: 700;
  color: #0f172a;
}
.amount-sub {
  display: block;
  font-size: 28rpx;
  color: #334155;
  font-weight: 600;
}
.step-title {
  font-size: 30rpx;
  font-weight: 600;
  margin: 0 0 16rpx;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
}
.pay-info .info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
  gap: 16rpx;
}
.info-label {
  font-size: 26rpx;
  color: #64748b;
  flex-shrink: 0;
}
.info-value {
  font-size: 28rpx;
  color: #0f172a;
  text-align: right;
  word-break: break-all;
}
.info-value.strong {
  font-weight: 600;
  color: #2563eb;
}
.ref-note {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.copy-btn {
  margin-top: 8rpx;
}
.pay-actions {
  display: flex;
  gap: 20rpx;
  margin-bottom: 12rpx;
}
.pay-btn {
  flex: 1;
  margin: 0;
  border-radius: 16rpx;
  font-size: 30rpx;
  font-weight: 600;
  border: 2rpx solid #cbd5e1;
  background: #fff;
  color: #334155;
}
.pay-btn.wechat.active {
  border-color: #16a34a;
  background: #f0fdf4;
  color: #15803d;
}
.pay-btn.alipay.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #1d4ed8;
}
.pay-btn[disabled] {
  opacity: 0.45;
}
.hint {
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.5;
  margin-bottom: 16rpx;
}
.launch-hint {
  color: #9a3412;
  background: #fff7ed;
  padding: 16rpx;
  border-radius: 12rpx;
}
.fallback-toggle {
  text-align: center;
  color: #2563eb;
  font-size: 26rpx;
  padding: 8rpx 0 20rpx;
}
.qr-card {
  text-align: center;
}
.qr-second {
  margin-top: 32rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #e2e8f0;
}
.qr-img {
  width: 360rpx;
  height: 360rpx;
  border: 1rpx solid #e2e8f0;
  border-radius: 12rpx;
}
.qr-hint {
  display: block;
  font-size: 22rpx;
  color: #64748b;
  margin: 12rpx 0;
}
.qr-fail {
  display: block;
  font-size: 24rpx;
  color: #dc2626;
  margin-bottom: 12rpx;
}
.act-btn {
  margin: 0;
  font-size: 24rpx;
}
.field {
  margin-bottom: 20rpx;
}
.field .label {
  display: block;
  margin-bottom: 8rpx;
  font-size: 26rpx;
  color: #64748b;
}
.pay-input,
.pay-textarea {
  width: 100%;
  box-sizing: border-box;
  border: 1rpx solid #cbd5e1;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #0f172a;
  background: #fff;
}
.pay-input {
  height: 88rpx;
  min-height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
}
.pay-textarea {
  min-height: 120rpx;
  line-height: 1.5;
  padding: 20rpx 24rpx;
  overflow: hidden;
  word-break: break-all;
}
.proof-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.proof-label {
  font-size: 26rpx;
  color: #64748b;
}
.proof-preview {
  width: 200rpx;
  height: 200rpx;
  border-radius: 12rpx;
  border: 1rpx solid #e2e8f0;
}
.submit-btn {
  width: 100%;
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 999rpx;
  padding: 22rpx;
  font-size: 30rpx;
  margin-top: 8rpx;
}
.muted {
  color: #94a3b8;
  font-size: 26rpx;
  padding: 8rpx 0 16rpx;
}
</style>
