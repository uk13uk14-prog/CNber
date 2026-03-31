<template>
  <view class="feedback-page">
    <view class="title">意见反馈</view>

    <view class="form-box">
      <view class="form-item">
        <view class="label">反馈内容</view>
        <textarea v-model="feedback" placeholder="请输入您要反馈的问题、建议或意见" rows="5" />
      </view>

      <view class="form-item">
        <view class="label">联系方式（选填）</view>
        <input v-model="contact" placeholder="手机号或微信号" />
      </view>
    </view>

    <view class="btn-box">
      <button class="btn-primary" @click="submit">提交反馈</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0506_driver_feedback',
  data() {
    return {
      feedback: '',
      contact: ''
    }
  },
  methods: {
    submit() {
      if (!this.feedback.trim()) {
        uni.showToast({ title: '请输入反馈内容', icon: 'none' });
        return;
      }

      // TODO: 实际接口提交逻辑
      uni.showToast({ title: '感谢您的反馈', icon: 'success' });

      // 清空表单
      this.feedback = '';
      this.contact = '';
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.feedback-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .form-box {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 50rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);

    .form-item {
      margin-bottom: 40rpx;

      .label {
        font-size: 28rpx;
        color: $color-text-main;
        margin-bottom: 12rpx;
      }

      input,
      textarea {
        width: 100%;
        font-size: 30rpx;
        padding: 20rpx;
        border-radius: 12rpx;
        border: 1rpx solid $color-divider;
        background-color: #f9f9f9;
      }

      textarea {
        min-height: 160rpx;
      }
    }
  }

  .btn-box {
    display: flex;
    justify-content: center;

    .btn-primary {
      width: 90%;
      font-size: 32rpx;
      padding: 24rpx 0;
      border-radius: 16rpx;
      background-color: $color-primary;
      color: white;
    }
  }
}
</style>
