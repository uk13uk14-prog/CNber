/**
 * 支付方式运行时模式。
 * manual_qr：当前正式路径（保存收款码 + 人工确认）
 * wechat_app_pay / alipay_app_pay：预留，商户 API 开通前不得启用成功支付
 */
const PAYMENT_MODES = {
  MANUAL_QR: 'manual_qr',
  WECHAT_APP_PAY: 'wechat_app_pay',
  ALIPAY_APP_PAY: 'alipay_app_pay'
}

function normalizePaymentMode(channel, raw) {
  const v = String(raw || '').trim()
  if (channel === 'wechat' && v === PAYMENT_MODES.WECHAT_APP_PAY) {
    return PAYMENT_MODES.WECHAT_APP_PAY
  }
  if (channel === 'alipay' && v === PAYMENT_MODES.ALIPAY_APP_PAY) {
    return PAYMENT_MODES.ALIPAY_APP_PAY
  }
  return PAYMENT_MODES.MANUAL_QR
}

module.exports = {
  PAYMENT_MODES,
  normalizePaymentMode
}
