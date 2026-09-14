import { PaymentError } from './PaymentProvider.js'

/**
 * 未来支付宝 App 支付。商户 API 未开通，禁止假成功。
 * TODO: 调用 POST /api/payment/alipay/create，拉起支付宝 SDK，等待服务端 notify 验签。
 */
export const AlipayAppPayProvider = {
  id: 'alipay_app_pay',

  async preparePayment() {
    throw new PaymentError('APP_PAY_RESERVED', '支付宝 App 支付尚未开通，请使用查看收款码方式付款')
  },

  async launchPayment() {
    throw new PaymentError('APP_PAY_RESERVED', '支付宝 App 支付尚未开通，请使用查看收款码方式付款')
  },

  async handleReturn() {
    throw new PaymentError('APP_PAY_RESERVED', '支付宝 App 支付尚未开通')
  },

  async getPaymentStatus() {
    throw new PaymentError('APP_PAY_RESERVED', '支付宝 App 支付尚未开通')
  }
}
