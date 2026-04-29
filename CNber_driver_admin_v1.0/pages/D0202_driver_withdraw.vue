<template>
  <view class="withdraw-page">
    <view class="title">提现中心</view>

    <view class="balance-box">
      <view class="label">可提现金额：</view>
      <view class="amount">£{{ balance }}</view>
    </view>

    <view class="form-box">
      <view class="form-item">
        <view class="label">默认收款方式</view>
        <view class="value">{{ methodLabel }}</view>
      </view>

      <view class="form-item">
        <view class="label">{{ methodLabel }}账号</view>
        <view class="value">{{ maskedAccount || '请先在设置中心完善收款资料' }}</view>
      </view>

      <view class="hint">平台将按司机默认收款方式线下打款。</view>
    </view>

    <view class="btn-box">
      <button
        class="btn-primary"
        :disabled="submitting"
        :loading="submitting"
        @click="submitWithdraw"
      >
        {{ submitting ? '提交中...' : '申请提现' }}
      </button>
    </view>
  </view>
</template>

<script>
import { request } from '../utils/request.js'
import { getDriverProfile } from '../utils/driverApi.js'

const WITHDRAWAL_RECORD_PAGE = '/pages/D0203_driver_invoice_history'

export default {
  name: 'D0202_driver_withdraw',
  data() {
    return {
      balance: 0,
      payment: {
        defaultMethod: 'alipay',
        alipayAccount: '',
        wechatAccount: ''
      },
      submitting: false
    }
  },
  computed: {
    methodLabel() {
      return this.payment.defaultMethod === 'wechat' ? '微信' : '支付宝'
    },
    activeAccount() {
      return this.payment.defaultMethod === 'wechat'
        ? this.payment.wechatAccount
        : this.payment.alipayAccount
    },
    maskedAccount() {
      const value = String(this.activeAccount || '').trim()
      if (!value) return ''
      if (value.length <= 4) return `${value[0] || ''}***`
      return `${value.slice(0, 2)}***${value.slice(-2)}`
    }
  },
  onShow() {
    this.fetchAvailableBalance()
    this.fetchPaymentProfile()
  },
  methods: {
    normalizeAmount(value) {
      const n = Number(value)
      return Number.isFinite(n) ? n : 0
    },
    async fetchAvailableBalance() {
      try {
        const data = await request({
          url: '/driver/income/summary',
          method: 'GET'
        })
        this.balance = this.normalizeAmount(data.availableBalance)
      } catch (error) {
        /* request 已统一提示 */
      }
    },
    async fetchPaymentProfile() {
      try {
        const data = await getDriverProfile()
        this.payment = {
          defaultMethod: data?.payment?.defaultMethod || 'alipay',
          alipayAccount: data?.payment?.alipayAccount || '',
          wechatAccount: data?.payment?.wechatAccount || ''
        }
      } catch (error) {
        /* request 已统一提示 */
      }
    },
    submitWithdraw() {
      if (this.submitting) return

      const amount = this.normalizeAmount(this.balance)
      if (!amount || amount <= 0) {
        uni.showToast({ title: '暂无可提现金额', icon: 'none' })
        return
      }
      if (!this.activeAccount) {
        uni.showToast({ title: '请先完善收款资料', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认提现',
        content: `平台将按司机默认收款方式线下打款，本次申请 £${amount}`,
        success: async res => {
          if (res.confirm) {
            await this.createWithdrawal(amount)
          }
        }
      })
    },
    async createWithdrawal(amount) {
      if (this.submitting) return

      this.submitting = true
      try {
        const data = await request({
          url: '/driver/withdrawals',
          method: 'POST',
          data: {
            amount,
            method: this.payment.defaultMethod
          }
        })

        const nextBalance = data?.balance ?? data?.availableBalance
        if (nextBalance != null) {
          this.balance = this.normalizeAmount(nextBalance)
        }

        uni.showToast({ title: '提现申请已提交', icon: 'success' })
        uni.navigateTo({
          url: WITHDRAWAL_RECORD_PAGE
        })
      } catch (error) {
        const availableBalance = error?.data?.balance ?? error?.data?.availableBalance
        if (availableBalance != null) {
          this.balance = this.normalizeAmount(availableBalance)
        }
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.withdraw-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .balance-box {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 40rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .label {
      font-size: 28rpx;
      color: $color-text-light;
    }

    .amount {
      font-size: 40rpx;
      font-weight: bold;
      color: $color-primary;
      margin-top: 10rpx;
    }
  }

  .form-box {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 40rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .form-item {
      margin-bottom: 30rpx;

      .label {
        font-size: 28rpx;
        color: $color-text-main;
        margin-bottom: 10rpx;
      }

      .value {
        font-size: 30rpx;
        color: $color-primary;
        font-weight: bold;
      }
    }

    .hint {
      font-size: 24rpx;
      color: $color-text-light;
      line-height: 1.6;
    }
  }

  .btn-box {
    display: flex;
    justify-content: center;

    .btn-primary {
      width: 90%;
      background-color: $color-primary;
      color: white;
      font-size: 32rpx;
      padding: 24rpx 0;
      border-radius: 16rpx;
    }
  }
}
</style>
