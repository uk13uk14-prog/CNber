const mongoose = require('mongoose')

const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected'
}

const WithdrawalSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: [
      WITHDRAWAL_STATUS.PENDING,
      WITHDRAWAL_STATUS.APPROVED,
      WITHDRAWAL_STATUS.REJECTED
    ],
    default: WITHDRAWAL_STATUS.PENDING,
    index: true
  },
  createdAt: { type: Date, default: Date.now, index: true }
})

const Withdrawal = mongoose.model('Withdrawal', WithdrawalSchema)

module.exports = Withdrawal
module.exports.WITHDRAWAL_STATUS = WITHDRAWAL_STATUS
