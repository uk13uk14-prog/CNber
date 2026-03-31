<template>
  <view class="edit-order-page">
    <view class="title">修改订单信息</view>

    <view class="form">
      <view class="form-item">
        <text class="label">预计出发时间</text>
        <input v-model="order.time" placeholder="例如：2025-05-22 14:00" />
      </view>

      <view class="form-item">
        <text class="label">备注</text>
        <textarea v-model="order.note" placeholder="请输入备注，例如带婴儿/需携带行李" />
      </view>

      <button class="btn-primary" @click="submit">保存修改</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0105_driver_edit_order',
  data() {
    return {
      order: {
        time: '',
        note: ''
      }
    };
  },
  methods: {
    submit() {
      uni.showToast({ title: '订单信息已更新', icon: 'success' });
      // TODO: 实际提交逻辑
      uni.navigateBack();
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.edit-order-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 40rpx;
  }

  .form {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    display: flex;
    flex-direction: column;
    gap: 30rpx;

    .form-item {
      display: flex;
      flex-direction: column;

      .label {
        font-size: 28rpx;
        color: $color-text-main;
        margin-bottom: 10rpx;
      }

      input, textarea {
        border: 1rpx solid $color-divider;
        border-radius: 12rpx;
        padding: 20rpx;
        font-size: 30rpx;
        background-color: #f8f8f8;
      }

      textarea {
        min-height: 120rpx;
      }
    }

    .btn-primary {
      background-color: $color-primary;
      color: white;
      font-size: 32rpx;
      padding: 24rpx 0;
      border-radius: 16rpx;
    }
  }
}
</style>
