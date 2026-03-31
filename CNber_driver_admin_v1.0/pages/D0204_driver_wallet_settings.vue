<template>
  <view class="wallet-page">
    <view class="title">提现账户设置</view>

    <view class="form">
      <view class="form-item">
        <text class="label">账户类型</text>
        <picker :range="methods" @change="onMethodChange">
          <view class="picker">{{ form.method || '请选择提现方式' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">账户姓名</text>
        <input v-model="form.name" placeholder="如：张三" />
      </view>

      <view class="form-item">
        <text class="label">收款账户</text>
        <input v-model="form.account" placeholder="如：支付宝/微信号/银行卡号" />
      </view>

      <button class="btn-primary" @click="save">保存设置</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0204_driver_wallet_settings',
  data() {
    return {
      form: {
        method: '',
        name: '',
        account: ''
      },
      methods: ['支付宝', '微信', '银行卡']
    };
  },
  methods: {
    onMethodChange(e) {
      this.form.method = this.methods[e.detail.value];
    },
    save() {
      const { method, name, account } = this.form;
      if (!method || !name || !account) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      // TODO: 提交接口保存账户设置
      uni.showToast({ title: '设置已保存', icon: 'success' });
      uni.navigateBack();
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.wallet-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 30rpx;

    .form-item {
      .label {
        font-size: 28rpx;
        color: $color-text-main;
        margin-bottom: 10rpx;
      }

      input,
      .picker {
        width: 100%;
        font-size: 30rpx;
        padding: 20rpx;
        background-color: white;
        border-radius: 12rpx;
        border: 1rpx solid $color-divider;
      }

      .picker {
        color: $color-text-main;
      }
    }

    .btn-primary {
      margin-top: 40rpx;
      background-color: $color-primary;
      color: white;
      font-size: 32rpx;
      padding: 24rpx 0;
      border-radius: 16rpx;
    }
  }
}
</style>
