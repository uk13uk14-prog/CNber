import { ManualQrPaymentProvider } from './ManualQrPaymentProvider.js'
import { WechatAppPayProvider } from './WechatAppPayProvider.js'
import { AlipayAppPayProvider } from './AlipayAppPayProvider.js'
import { PAYMENT_MODES, paymentUserMessage } from './PaymentProvider.js'
import { saveRemoteImageToAlbum } from './saveQrToAlbum.js'

export function resolvePaymentProvider(paymentMethod, paymentConfig) {
  const channel = paymentMethod === 'alipay' ? 'alipay' : 'wechat'
  const mode = String(paymentConfig?.[channel]?.paymentMode || PAYMENT_MODES.MANUAL_QR).trim()
  if (channel === 'wechat' && mode === PAYMENT_MODES.WECHAT_APP_PAY) {
    return WechatAppPayProvider
  }
  if (channel === 'alipay' && mode === PAYMENT_MODES.ALIPAY_APP_PAY) {
    return AlipayAppPayProvider
  }
  return ManualQrPaymentProvider
}

export async function preparePayment(order, paymentMethod, ctx) {
  const provider = resolvePaymentProvider(paymentMethod, ctx?.paymentConfig)
  return provider.preparePayment(order, paymentMethod, ctx)
}

export async function launchPayment(order, paymentMethod, ctx) {
  const provider = resolvePaymentProvider(paymentMethod, ctx?.paymentConfig)
  return provider.launchPayment(order, paymentMethod, ctx)
}

export async function handlePaymentReturn(order, paymentMethod, payload, ctx) {
  const provider = resolvePaymentProvider(paymentMethod, ctx?.paymentConfig)
  return provider.handleReturn(order, payload, ctx)
}

export async function getPaymentStatus(order, paymentMethod, ctx) {
  const provider = resolvePaymentProvider(paymentMethod, ctx?.paymentConfig)
  return provider.getPaymentStatus(order, ctx)
}

export async function saveQrImageToAlbum(url) {
  return saveRemoteImageToAlbum(url)
}

export { paymentUserMessage, PAYMENT_MODES }
