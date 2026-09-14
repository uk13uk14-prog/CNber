/**
 * PaymentProvider 抽象。
 * 页面禁止直接散落 wechat / alipay / saveImage / launchApp。
 *
 * preparePayment(order, paymentMethod, ctx)
 * launchPayment(order, paymentMethod, ctx)
 * handleReturn(order, payload)
 * getPaymentStatus(order)
 */

export class PaymentError extends Error {
  constructor(code, userMessage) {
    super(userMessage)
    this.name = 'PaymentError'
    this.code = code
    this.userMessage = userMessage
  }
}

export function paymentUserMessage(err, fallback) {
  if (!err) return fallback || '支付操作失败'
  return err.userMessage || err.message || fallback || '支付操作失败'
}

export const PAYMENT_MODES = {
  MANUAL_QR: 'manual_qr',
  WECHAT_APP_PAY: 'wechat_app_pay',
  ALIPAY_APP_PAY: 'alipay_app_pay'
}
