<template>
  <view class="complete-page">
    <view class="title">完善资料</view>

    <view class="form">
      <input v-model="name" placeholder="请输入真实姓名" />
      <input v-model="carNumber" placeholder="请输入车牌号" />
      <button class="btn-primary" @click="submit">保存</button>
    </view>
  </view>
</template>

<script>
export default {
  name: 'D0006_driver_profile_complete',
  data() {
    return {
      name: '',
      carNumber: ''
    }
  },
  methods: {
    submit() {
      if (!this.name || !this.carNumber) {
        uni.showToast({ title: '请填写完整信息', icon: 'none' });
        return;
      }
      // TODO: 接入接口保存
      uni.showToast({ title: '资料已保存', icon: 'success' });
      uni.navigateBack();
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.complete-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    color: $color-primary;
    font-weight: bold;
    margin-bottom: 40rpx;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 30rpx;

    input {
      background-color: white;
      padding: 20rpx;
      border-radius: 12rpx;
      font-size: 30rpx;
      border: 1rpx solid $color-divider;
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
