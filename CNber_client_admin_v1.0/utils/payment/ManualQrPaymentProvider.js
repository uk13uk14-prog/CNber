import { PaymentError } from './PaymentProvider.js'
import { resolvePaymentAssetUrl } from '../paymentTransfer.js'
import { saveRemoteImageToAlbum } from './saveQrToAlbum.js'
import { launchPayApp, payAppName } from './launchPayApp.js'

function qrUrlFromConfig(paymentConfig, paymentMethod) {
  const channel = paymentMethod === 'alipay' ? 'alipay' : 'wechat'
  return resolvePaymentAssetUrl(paymentConfig?.[channel]?.qrUrl || '')
}

function manualHint(paymentMethod) {
  const app = payAppName(paymentMethod)
  return `收款码已保存，请在${app}扫一扫 → 相册中选择刚保存的二维码完成付款`
}

export const ManualQrPaymentProvider = {
  id: 'manual_qr',

  async preparePayment(order, paymentMethod, ctx) {
    const qrUrl = qrUrlFromConfig(ctx?.paymentConfig, paymentMethod)
    if (!qrUrl) {
      throw new PaymentError('QR_MISSING', '收款码未配置，请联系客服')
    }
    return {
      paymentMethod,
      qrUrl,
      orderId: order?._id || order?.id || ctx?.orderId || ''
    }
  },

  async launchPayment(order, paymentMethod, ctx) {
    const prepared = await this.preparePayment(order, paymentMethod, ctx)
    uni.showLoading({ title: '正在保存收款码…', mask: true })
    try {
      await saveRemoteImageToAlbum(prepared.qrUrl)
    } finally {
      uni.hideLoading()
    }
    try {
      await launchPayApp(paymentMethod)
    } catch (e) {
      if (e) e.savedToAlbum = true
      throw e
    }
    return {
      ok: true,
      paymentMethod,
      hint: manualHint(paymentMethod)
    }
  },

  async handleReturn() {
    return { pending: true, note: '请填写付款流水号，由后台确认到账' }
  },

  async getPaymentStatus() {
    throw new PaymentError(
      'MANUAL_PENDING',
      '请返回后填写付款流水号并提交，到账由后台人工确认'
    )
  }
}
