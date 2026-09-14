import { PaymentError } from './PaymentProvider.js'

/**
 * 未来微信 App 支付。商户 API 未开通，禁止假成功。
 * TODO: 调用 POST /api/payment/wechat/create，拉起微信 SDK，等待服务端 notify 验签。
 */
export const WechatAppPayProvider = {
  id: 'wechat_app_pay',

  async preparePayment() {
    throw new PaymentError('APP_PAY_RESERVED', '微信 App 支付尚未开通，请使用查看收款码方式付款')
  },

  async launchPayment() {
    throw new PaymentError('APP_PAY_RESERVED', '微信 App 支付尚未开通，请使用查看收款码方式付款')
  },

  async handleReturn() {
    throw new PaymentError('APP_PAY_RESERVED', '微信 App 支付尚未开通')
  },

  async getPaymentStatus() {
    throw new PaymentError('APP_PAY_RESERVED', '微信 App 支付尚未开通')
  }
}
