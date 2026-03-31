<template>
  <view class="transfer-page">
    <view class="title">私单转派</view>

    <view class="form">
      <view class="form-item">
        <text class="label">出发地</text>
        <input v-model="form.pickup" placeholder="如：伦敦市中心" />
      </view>

      <view class="form-item">
        <text class="label">目的地</text>
        <input v-model="form.dropoff" placeholder="如：剑桥大学" />
      </view>

      <view class="form-item">
        <text class="label">出发时间</text>
        <input v-model="form.time" placeholder="2025-05-23 14:00" />
      </view>

      <view class="form-item">
        <text class="label">订单金额 (£)</text>
        <input v-model="form.price" type="digit" placeholder="如：80" />
      </view>

      <view class="form-item">
        <text class="label">转派原因</text>
        <picker :range="reasons" @change="onReasonChange">
          <view class="picker">{{ form.reason || '请选择原因' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label">备注说明</text>
        <textarea v-model="form.note" placeholder="如：个人原因临时取消、推荐靠谱司机等" />
      </view>

      <view class="tip-box">
        💡 为保障乘客权益，转派订单费用将进入平台托管账户，待完成后结算给新司机。
      </view>

      <button class="btn-primary" @click="submit">确认转派</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0703_driver_internal_orders',
  data() {
    return {
      form: {
        pickup: '',
        dropoff: '',
        time: '',
        price: '',
        reason: '',
        note: ''
      },
      reasons: ['临时有事', '身体不适', '订单冲突', '车辆故障', '其他原因']
    };
  },
  methods: {
    onReasonChange(e) {
      this.form.reason = this.reasons[e.detail.value];
    },
    submit() {
      const { pickup, dropoff, time, price, reason } = this.form;
      if (!pickup || !dropoff || !time || !price || !reason) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }

      // TODO: 提交到私单转派接口
      uni.showToast({ title: '转派请求已提交', icon: 'success' });
      uni.navigateBack();
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.transfer-page {
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
      textarea,
      .picker {
        width: 100%;
        font-size: 30rpx;
        padding: 20rpx;
        background-color: white;
        border-radius: 12rpx;
        border: 1rpx solid $color-divider;
      }

      textarea {
        min-height: 120rpx;
      }

      .picker {
        color: $color-text-main;
      }
    }

    .tip-box {
      font-size: 26rpx;
      background-color: #fff8e1;
      color: #d48806;
      padding: 20rpx;
      border-radius: 12rpx;
      margin-top: 10rpx;
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
