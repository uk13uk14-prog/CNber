<template>
  <view class="withdraw-page">
    <view class="title">提现中心</view>

    <view class="balance-box">
      <view class="label">可提现金额：</view>
      <view class="amount">£{{ balance }}</view>
    </view>

    <view class="form-box">
      <view class="form-item">
        <view class="label">提现金额</view>
        <input v-model="amount" type="digit" placeholder="请输入提现金额" />
      </view>

      <view class="form-item">
        <view class="label">提现方式</view>
        <radio-group v-model="method" class="method-select">
          <label class="radio-option">
            <radio value="alipay" /><text>支付宝</text>
          </label>
          <label class="radio-option">
            <radio value="wechat" /><text>微信</text>
          </label>
        </radio-group>
      </view>
    </view>

    <view class="btn-box">
      <button class="btn-primary" @click="submitWithdraw">确认提现</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0202_driver_withdraw',
  data() {
    return {
      balance: 650,
      amount: '',
      method: 'alipay'
    }
  },
  methods: {
    submitWithdraw() {
      if (!this.amount || isNaN(this.amount) || Number(this.amount) <= 0) {
        uni.showToast({ title: '请输入有效金额', icon: 'none' })
        return
      }
      if (Number(this.amount) > this.balance) {
        uni.showToast({ title: '金额超出余额', icon: 'none' })
        return
      }
      uni.showModal({
        title: '确认提现',
        content: `将通过 ${this.method === 'alipay' ? '支付宝' : '微信'} 提现 £${this.amount}`,
        success: res => {
          if (res.confirm) {
            uni.showToast({ title: '提现成功', icon: 'success' })
            // TODO: 发起接口调用
          }
        }
      })
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

      input {
        width: 100%;
        border: 1rpx solid $color-divider;
        border-radius: 12rpx;
        padding: 20rpx;
        font-size: 30rpx;
        background-color: #f8f8f8;
      }

      .method-select {
        margin-top: 10rpx;
        display: flex;
        gap: 60rpx;
        .radio-option {
          display: flex;
          align-items: center;
          font-size: 28rpx;
        }
      }
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
