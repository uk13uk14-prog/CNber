<template>
  <view class="loading-page">
    <image src="/static/icons/loading.gif" class="loading-img" mode="aspectFit" />
    <text class="text">加载中，请稍候...</text>
  </view>
</template>

<script>
export default {
  name: 'D0601_driver_loading'
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.loading-page {
  background-color: $color-background;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  .loading-img {
    width: 120rpx;
    height: 120rpx;
    margin-bottom: 30rpx;
  }

  .text {
    font-size: 30rpx;
    color: $color-text-light;
  }
}
</style>
