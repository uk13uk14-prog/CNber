<template>
  <view class="flow">
    <view class="banner">
      请先完成微信/支付宝转账，再填写付款流水号。提交后由后台人工核对收款记录，确认后订单才会进入下一步。截图可选。
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

    <view class="step-title">1. 选择付款方式</view>
    <view class="pay-actions">
      <button
        class="pay-btn wechat"
        :class="{ active: selectedMethod === 'wechat' }"
        :disabled="!wechatAccount"
        @click="onWechatPay"
      >
        微信支付
      </button>
      <button
        class="pay-btn alipay"
        :class="{ active: selectedMethod === 'alipay' }"
        :disabled="!alipayAccount"
        @click="onAlipayPay"
      >
        支付宝支付
      </button>
    </view>
    <view v-if="!wechatAccount && !alipayAccount" class="muted">
      暂无可用微信/支付宝收款方式，请联系客服。
    </view>
    <view v-if="selectedMethod === 'wechat'" class="hint">
      请使用微信扫码或长按识别收款码，付款备注请填写 {{ refNote }}
    </view>
    <view v-if="selectedMethod === 'alipay'" class="hint">
      请在支付宝完成付款，付款备注请填写 {{ refNote }}
    </view>

    <view v-if="wechatAccount && selectedMethod === 'wechat' && wechatQr" class="card qr-card">
      <image
        :src="wechatQr"
        class="qr-img"
        mode="aspectFit"
        @click="previewWechatQr"
        @error="onWechatQrError"
      />
      <text v-if="wechatQrLoadFailed" class="qr-fail">收款码加载失败，请检查网络或联系客服</text>
      <text class="qr-hint">点击放大收款码，或使用下方按钮保存</text>
      <button class="act-btn" size="mini" @click="saveWechatQr">保存二维码</button>
    </view>

    <view v-if="showAlipayQr" class="card qr-card">
      <view class="step-title">支付宝收款码</view>
      <image :src="alipayQr" class="qr-img" mode="aspectFit" @click="previewAlipayQr" />
      <text class="qr-hint">链接无法打开时，请扫码或长按识别，备注 {{ refNote }}</text>
      <button class="act-btn" size="mini" @click="saveAlipayQr">保存二维码</button>
    </view>

    <view class="card">
      <view class="step-title">2. 填写付款信息</view>
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
      <button class="submit-btn" :disabled="submitting || uploading" @click="onSubmit">
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
  getAlipayUrl,
  defaultTransferNote,
  orderRefNote
} from '../utils/paymentTransfer.js'
import { uploadPaymentProof } from '../utils/orderApi.js'
import { showAppOnlyToast } from '../utils/h5Native.js'

const props = defineProps({
  accounts: { type: Array, default: () => [] },
  orderId: { type: String, required: true },
  orderDisplayNo: { type: String, default: '' },
  amount: { type: Number, default: 0 },
  amountCny: { type: Number, default: 0 },
  exchangeRate: { type: Number, default: 10 },
  submitLabel: { type: String, default: '提交付款信息' },
  submitting: { type: Boolean, default: false }
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
const showAlipayQr = ref(false)
const wechatQrLoadFailed = ref(false)

const wechatAccount = computed(() => findWechatAccount(props.accounts))
const alipayAccount = computed(() => findAlipayAccount(props.accounts))

const wechatQr = computed(() => getPaymentQr(wechatAccount.value))
const alipayQr = computed(() => getPaymentQr(alipayAccount.value))

const refNote = computed(() => orderRefNote(props.orderDisplayNo))

const receiverName = computed(() => {
  const w = wechatAccount.value?.accountName
  const a = alipayAccount.value?.accountName
  if (selectedMethod.value === 'wechat' && w) return w
  if (selectedMethod.value === 'alipay' && a) return a
  return w || a || '—'
})

const notePlaceholder = computed(() => {
  const no = props.orderDisplayNo || ''
  return no ? `建议填写：已通过 XX 转账，备注 CNBER-${no}` : '请填写付款渠道与订单号'
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
  () => props.accounts,
  (list) => {
    const w = findWechatAccount(list)
    const a = findAlipayAccount(list)
    console.log('[PaymentTransferFlow] paymentAccount wechat', w)
    console.log('[PaymentTransferFlow] paymentAccount alipay', a)
    console.log('[PaymentTransferFlow] wechatQr resolved', getPaymentQr(w))
    console.log('[PaymentTransferFlow] alipayQr resolved', getPaymentQr(a))
    wechatQrLoadFailed.value = false
  },
  { immediate: true, deep: true }
)

watch(wechatQr, () => {
  wechatQrLoadFailed.value = false
})

function onWechatQrError(e) {
  wechatQrLoadFailed.value = true
  console.log('[PaymentTransferFlow] wechat QR image error', wechatQr.value, e)
}

function selectAccount(acc, method) {
  if (!acc?._id) return
  selectedId.value = acc._id
  selectedMethod.value = method
  if (!note.value.trim()) note.value = defaultTransferNote(props.orderDisplayNo, method)
}

function copyRefNote() {
  uni.setClipboardData({
    data: refNote.value,
    success: () => uni.showToast({ title: '已复制备注', icon: 'none' })
  })
}

function onWechatPay() {
  const acc = wechatAccount.value
  if (!acc) {
    uni.showToast({ title: '微信收款未配置，请联系客服', icon: 'none' })
    return
  }
  selectAccount(acc, 'wechat')
  showAlipayQr.value = false
  const qr = wechatQr.value
  if (!qr) {
    uni.showToast({ title: '微信收款码未配置，请联系客服', icon: 'none' })
    return
  }
  uni.previewImage({ urls: [qr] })
}

function previewWechatQr() {
  if (!wechatQr.value) return
  uni.previewImage({ urls: [wechatQr.value] })
}

function previewAlipayQr() {
  if (!alipayQr.value) return
  uni.previewImage({ urls: [alipayQr.value] })
}

function saveImageToAlbum(url) {
  if (!url) return
  // #ifdef H5
  showAppOnlyToast()
  return
  // #endif
  // #ifndef H5
  uni.showLoading({ title: '保存中' })
  uni.downloadFile({
    url,
    success: (res) => {
      if (res.statusCode === 200) {
        uni.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: () => uni.showToast({ title: '已保存到相册', icon: 'success' }),
          fail: () => uni.showToast({ title: '保存失败，请长按图片', icon: 'none' })
        })
      } else {
        uni.showToast({ title: '下载失败', icon: 'none' })
      }
    },
    fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
    complete: () => uni.hideLoading()
  })
  // #endif
}

function saveWechatQr() {
  saveImageToAlbum(wechatQr.value)
}

function saveAlipayQr() {
  saveImageToAlbum(alipayQr.value)
}

function showAlipayQrFallback() {
  showAlipayQr.value = true
  if (alipayQr.value) {
    uni.previewImage({ urls: [alipayQr.value] })
  } else {
    uni.showToast({ title: '支付宝链接与二维码均未配置，请联系客服', icon: 'none' })
  }
}

function openAlipayUrl(url) {
  const u = String(url || '').trim()
  if (!u) {
    showAlipayQrFallback()
    return
  }
  // #ifdef H5
  // 不在 H5 自动拉起支付宝 App；提示使用原生 App，并展示二维码兜底
  showAppOnlyToast()
  showAlipayQrFallback()
  // #endif
  // #ifdef APP-PLUS
  try {
    plus.runtime.openURL(
      u,
      () => {
        showAlipayQrFallback()
      },
      () => {}
    )
  } catch (e) {
    showAlipayQrFallback()
  }
  // #endif
  // #ifndef H5
  // #ifndef APP-PLUS
  uni.setClipboardData({
    data: u,
    success: () => {
      uni.showToast({ title: '链接已复制，请在浏览器打开', icon: 'none' })
      showAlipayQrFallback()
    }
  })
  // #endif
  // #endif
}

function onAlipayPay() {
  const acc = alipayAccount.value
  if (!acc) {
    uni.showToast({ title: '支付宝收款未配置，请联系客服', icon: 'none' })
    return
  }
  selectAccount(acc, 'alipay')
  const url = getAlipayUrl(acc)
  if (url) {
    showAlipayQr.value = false
    openAlipayUrl(url)
  } else {
    showAlipayQrFallback()
  }
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
.step-title {
  font-size: 30rpx;
  font-weight: 600;
  margin: 16rpx 0 12rpx;
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
.qr-card {
  text-align: center;
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
.input {
  width: 100%;
  border: 1rpx solid #cbd5e1;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  box-sizing: border-box;
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
