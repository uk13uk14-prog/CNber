/**
 * 未来微信/支付宝 App 支付预留接口。
 * 禁止返回假的 payment success；商户 API 未开通前一律 501，不改订单。
 */
function reserved(feature, requiredMode) {
  return async (_req, res) => {
    res.status(501).json({
      code: 501,
      message: `${feature} 尚未开通。当前仅支持 manual_qr 人工转账，到账须后台确认。`,
      data: {
        available: false,
        paymentModeRequired: requiredMode,
        todo: '待商户号与服务端回调验签就绪后再实现，禁止 Client 自行标记 paid'
      }
    })
  }
}

/** POST /api/payment/wechat/create */
exports.createWechatAppPay = reserved('微信 App 支付下单', 'wechat_app_pay')

/** POST /api/payment/alipay/create */
exports.createAlipayAppPay = reserved('支付宝 App 支付下单', 'alipay_app_pay')

/** POST /api/payment/wechat/notify — 未来服务端回调验签 */
exports.notifyWechatAppPay = reserved('微信 App 支付回调', 'wechat_app_pay')

/** POST /api/payment/alipay/notify — 未来服务端回调验签 */
exports.notifyAlipayAppPay = reserved('支付宝 App 支付回调', 'alipay_app_pay')
