<template>
  <view class="policy-page">
    <view class="title">服务条款</view>
    <scroll-view scroll-y class="content-box">
      <view class="paragraph" v-for="(para, idx) in content" :key="idx">{{ para }}</view>
    </scroll-view>
  </view>
</template>

<script>
export default {
  name: 'D0505_driver_terms_of_service',
  data() {
    return {
      content: [
        '1. 本平台仅作为信息中介，司机需遵守当地法律及交规。',
        '2. 禁止平台外私下交易，如被发现将取消资格。',
        '3. 平台有权对评分过低、违规行为的司机进行处理。',
        '4. 所有接单数据平台保留审计权利。',
        '5. 使用本平台即表示您同意本条款。'
      ]
    };
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.policy-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 20rpx;
  }

  .content-box {
    max-height: 80vh;
    padding: 20rpx;
    background-color: white;
    border-radius: 16rpx;

    .paragraph {
      font-size: 28rpx;
      color: $color-text-main;
      margin-bottom: 24rpx;
      line-height: 1.8;
    }
  }
}
</style>
