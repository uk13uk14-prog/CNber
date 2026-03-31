<template>
  <view class="notifications-page">
    <view class="title">通知中心</view>

    <view v-if="messages.length > 0">
      <view v-for="(item, index) in messages" :key="index" class="msg-card" @click="readMessage(item)">
        <view class="msg-title">{{ item.title }}</view>
        <view class="msg-content">{{ item.content }}</view>
        <view class="msg-time">{{ item.time }}</view>
      </view>
    </view>

    <view v-else class="empty">暂无通知</view>
  </view>
</template>

<script>
export default {
  name: 'D0501_driver_notifications',
  data() {
    return {
      messages: [
        {
          id: 1,
          title: '系统公告：版本更新提醒',
          content: '新版本已上线，增加了暗黑主题和节假日换肤功能。',
          time: '2025-05-19 10:15'
        },
        {
          id: 2,
          title: '订单提醒：新订单待接',
          content: '来自李同学的订单已发布，点击进入接单中心查看。',
          time: '2025-05-18 18:05'
        }
      ]
    }
  },
  methods: {
    readMessage(msg) {
      uni.showToast({
        title: '点击查看详情（功能预留）',
        icon: 'none'
      });
      // TODO: 可跳转消息详情页
    }
  }
}
</script>

<style lang="scss" scoped>
@import '@/styles/tokens.scss';

.notifications-page {
  background-color: $color-background;
  min-height: 100vh;
  padding: 30rpx;

  .title {
    font-size: 36rpx;
    font-weight: bold;
    color: $color-primary;
    margin-bottom: 30rpx;
  }

  .msg-card {
    background-color: white;
    border-radius: 16rpx;
    padding: 30rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.05);
    border: 1rpx solid $color-divider;

    .msg-title {
      font-size: 30rpx;
      font-weight: bold;
      color: $color-text-main;
      margin-bottom: 12rpx;
    }

    .msg-content {
      font-size: 28rpx;
      color: $color-text-light;
      margin-bottom: 14rpx;
    }

    .msg-time {
      font-size: 24rpx;
      color: $color-text-light;
      text-align: right;
    }
  }

  .empty {
    text-align: center;
    color: $color-text-light;
    margin-top: 100rpx;
    font-size: 30rpx;
  }
}
</style>
