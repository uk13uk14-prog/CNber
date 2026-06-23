/** P0 预约制运营：异常类型、客服状态、结算状态 */
const EXCEPTION_TYPES = [
  'cancelled_by_customer',
  'cancelled_by_admin',
  'driver_rejected',
  'driver_timeout',
  'price_changed',
  'refund_pending',
  'refunded',
  'dispute_open',
  'dispute_closed'
]

const SERVICE_STATUSES = ['active', 'on_hold', 'exception', 'dispute', 'closed']

const SETTLEMENT_STATUSES = ['unsettled', 'partially_settled', 'settled']

const PAYMENT_REVIEW_STATUSES = ['unpaid', 'submitted', 'confirmed', 'rejected', 'refunded']

const DRIVER_VERIFICATION_STATUSES = ['pending', 'approved', 'rejected', 'suspended']

module.exports = {
  EXCEPTION_TYPES,
  SERVICE_STATUSES,
  SETTLEMENT_STATUSES,
  PAYMENT_REVIEW_STATUSES,
  DRIVER_VERIFICATION_STATUSES
}
